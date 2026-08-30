using System.Buffers.Binary;
using System.Diagnostics;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Sockets;
using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using NexoLauncher.Core.Authentication;
using NexoLauncher.Core.Installation;

namespace NexaLauncher.Desktop;

internal sealed record NexaSkinSnapshot(string Id, string Url, string Variant, bool Active);
internal sealed record NexaCapeSnapshot(string Id, string Url, string Alias, bool Active);
internal sealed record NexaPremiumAccountSnapshot(
    bool Configured,
    bool SignedIn,
    bool Premium,
    string? MinecraftId,
    string? MinecraftName,
    string? MicrosoftAccount,
    IReadOnlyList<NexaSkinSnapshot> Skins,
    IReadOnlyList<NexaCapeSnapshot> Capes,
    string? ActiveSkinUrl,
    string? ActiveSkinVariant,
    string? Message);
internal sealed record NexaLaunchIdentity(string Id, string Name, string AccessToken);

/// <summary>
/// Premium Microsoft/Xbox/Minecraft authentication for the desktop launcher.
///
/// Microsoft OAuth is intentionally implemented as Authorization Code + PKCE instead of
/// delegating the request construction to a generic OIDC helper. Xbox requires the
/// Microsoft authorization request to contain only its supported scopes, so NEXA owns
/// the exact request and never embeds a client secret.
///
/// Refresh tokens are stored in Windows Credential Manager and never cross the WebView IPC
/// boundary. React only receives sanitized account/profile information.
/// </summary>
internal sealed class NexaPremiumAccountService
{
    private const string MicrosoftAuthorizeEndpoint = "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize";
    private const string MicrosoftTokenEndpoint = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
    private const string MicrosoftScope = "XboxLive.signin XboxLive.offline_access";
    private const string XboxContractVersionHeader = "x-xbl-contract-version";
    private const string XboxContractVersion = "1";
    private const string DefaultMicrosoftClientId = "67d6a4fc-2398-47f1-8183-e60d01cfa12f";

    private static readonly TimeSpan RefreshSkew = TimeSpan.FromMinutes(2);
    private const int MaxSkinBytes = 1024 * 1024;

    private readonly HttpClient http = new() { Timeout = TimeSpan.FromSeconds(30) };
    private readonly SemaphoreSlim gate = new(1, 1);
    private readonly WindowsCredentialTokenStore tokenStore = new();
    private readonly string clientId;

    private MicrosoftToken? microsoftToken;
    private Session? current;

    public NexaPremiumAccountService(NexoPaths paths)
    {
        _ = paths;
        var configuredClientId = Environment.GetEnvironmentVariable("NEXA_MICROSOFT_CLIENT_ID");
        clientId = string.IsNullOrWhiteSpace(configuredClientId)
            ? DefaultMicrosoftClientId
            : configuredClientId.Trim();
    }

    public bool IsConfigured => Guid.TryParse(clientId, out _);

    public async Task<NexaPremiumAccountSnapshot> GetSnapshotAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try
        {
            if (!IsConfigured)
                return SignedOut("NEXA necesita un Client ID público de Microsoft válido.");

            try
            {
                var session = await EnsureSessionAsync(token);
                return session?.Snapshot ?? SignedOut(null);
            }
            catch (MicrosoftInteractionRequiredException)
            {
                current = null;
                microsoftToken = null;
                return SignedOut("La sesión de Microsoft requiere volver a iniciar sesión.");
            }
            catch (InvalidOperationException exception)
            {
                current = null;
                return SignedOut(exception.Message);
            }
            catch (Exception exception) when (exception is HttpRequestException or TaskCanceledException or InvalidDataException)
            {
                return current?.Snapshot ?? SignedOut("No se pudo validar la sesión premium en este momento.");
            }
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<NexaPremiumAccountSnapshot> SignInAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try
        {
            EnsureConfigured();

            var microsoft = await AcquireMicrosoftTokenInteractiveAsync(token);
            StoreMicrosoftToken(microsoft);

            current = await ExchangeAsync(microsoft, microsoftAccount: null, token);
            return current.Snapshot;
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<NexaPremiumAccountSnapshot> SignOutAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try
        {
            tokenStore.DeleteRefreshToken();
            microsoftToken = null;
            current = null;
            return SignedOut(null);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<NexaLaunchIdentity?> GetLaunchIdentityAsync(CancellationToken token = default)
    {
        await gate.WaitAsync(token);
        try
        {
            if (!IsConfigured) return null;
            var session = await EnsureSessionAsync(token);
            return session is null
                ? null
                : new NexaLaunchIdentity(session.Snapshot.MinecraftId!, session.Snapshot.MinecraftName!, session.MinecraftAccessToken);
        }
        finally
        {
            gate.Release();
        }
    }

    public async Task<NexaPremiumAccountSnapshot> UploadSkinAsync(string path, string variant, CancellationToken token = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        variant = NormalizeVariant(variant);
        ValidateSkinPng(path);

        await gate.WaitAsync(token);
        try
        {
            var session = await EnsureSessionAsync(token)
                ?? throw new InvalidOperationException("Inicia sesión con Microsoft antes de cambiar la skin.");

            await using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 64 * 1024, FileOptions.Asynchronous | FileOptions.SequentialScan);
            using var multipart = new MultipartFormDataContent();
            multipart.Add(new StringContent(variant), "variant");
            using var file = new StreamContent(stream);
            file.Headers.ContentType = new MediaTypeHeaderValue("image/png");
            multipart.Add(file, "file", Path.GetFileName(path));

            using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.minecraftservices.com/minecraft/profile/skins")
            {
                Content = multipart
            };
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", session.MinecraftAccessToken);
            using var response = await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
            await EnsureSuccessAsync(response, "Minecraft rechazó el cambio de skin.", token);

            var snapshot = await FetchProfileAsync(session.MinecraftAccessToken, session.MicrosoftAccount, token);
            current = session with { Snapshot = snapshot };
            return snapshot;
        }
        finally
        {
            gate.Release();
        }
    }

    private async Task<Session?> EnsureSessionAsync(CancellationToken token)
    {
        if (!IsConfigured) return null;
        if (current is not null && current.ExpiresAt > DateTimeOffset.UtcNow.Add(RefreshSkew))
            return current;

        var microsoft = microsoftToken;
        if (microsoft is null || microsoft.ExpiresAt <= DateTimeOffset.UtcNow.Add(RefreshSkew))
        {
            var refreshToken = tokenStore.ReadRefreshToken();
            if (string.IsNullOrWhiteSpace(refreshToken))
            {
                current = null;
                microsoftToken = null;
                return null;
            }

            microsoft = await RefreshMicrosoftTokenAsync(refreshToken, token)
                ?? throw new MicrosoftInteractionRequiredException();

            StoreMicrosoftToken(microsoft);
        }

        current = await ExchangeAsync(microsoft, microsoftAccount: null, token);
        return current;
    }

    private async Task<MicrosoftToken> AcquireMicrosoftTokenInteractiveAsync(CancellationToken token)
    {
        var verifier = Base64Url(RandomNumberGenerator.GetBytes(64));
        var challenge = Base64Url(SHA256.HashData(Encoding.ASCII.GetBytes(verifier)));
        var state = Base64Url(RandomNumberGenerator.GetBytes(32));

        var port = ReserveEphemeralPort();
        var redirectUri = $"http://localhost:{port}/";

        using var listener = new HttpListener();
        listener.Prefixes.Add(redirectUri);
        listener.Start();

        var authorizeUri = BuildUri(MicrosoftAuthorizeEndpoint, new Dictionary<string, string>
        {
            ["client_id"] = clientId,
            ["response_type"] = "code",
            ["redirect_uri"] = redirectUri,
            ["scope"] = MicrosoftScope,
            ["response_mode"] = "query",
            ["code_challenge"] = challenge,
            ["code_challenge_method"] = "S256",
            ["state"] = state,
            ["prompt"] = "select_account"
        });

        try
        {
            Process.Start(new ProcessStartInfo(authorizeUri) { UseShellExecute = true })
                ?? throw new InvalidOperationException("Windows no pudo abrir el navegador para iniciar sesión con Microsoft.");
        }
        catch (Exception exception) when (exception is not InvalidOperationException)
        {
            throw new InvalidOperationException("Windows no pudo abrir el navegador para iniciar sesión con Microsoft.", exception);
        }

        HttpListenerContext context;
        try
        {
            context = await listener.GetContextAsync().WaitAsync(TimeSpan.FromMinutes(5), token);
        }
        catch (TimeoutException)
        {
            throw new OperationCanceledException("Microsoft no devolvió la autenticación dentro del tiempo esperado.", token);
        }

        try
        {
            var query = context.Request.QueryString;
            var returnedState = query["state"];
            if (!CryptographicEquals(state, returnedState))
                throw new InvalidDataException("Microsoft devolvió un estado OAuth inválido. Se canceló el inicio de sesión por seguridad.");

            var oauthError = query["error"];
            if (!string.IsNullOrWhiteSpace(oauthError))
            {
                var description = query["error_description"];
                throw new InvalidOperationException(string.IsNullOrWhiteSpace(description)
                    ? $"Microsoft rechazó el inicio de sesión ({oauthError})."
                    : $"Microsoft rechazó el inicio de sesión ({oauthError}): {description}");
            }

            var code = query["code"];
            if (string.IsNullOrWhiteSpace(code))
                throw new InvalidDataException("Microsoft no devolvió el código de autorización esperado.");

            var result = await RedeemAuthorizationCodeAsync(code, verifier, redirectUri, token);
            await WriteBrowserResultAsync(context.Response, success: true, token);
            return result;
        }
        catch
        {
            try
            {
                if (context.Response.OutputStream.CanWrite)
                    await WriteBrowserResultAsync(context.Response, success: false, CancellationToken.None);
            }
            catch
            {
                // The launcher error is more useful than a secondary browser-response error.
            }

            throw;
        }
        finally
        {
            listener.Stop();
        }
    }

    private async Task<MicrosoftToken> RedeemAuthorizationCodeAsync(
        string code,
        string verifier,
        string redirectUri,
        CancellationToken token)
    {
        using var response = await http.PostAsync(
            MicrosoftTokenEndpoint,
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["grant_type"] = "authorization_code",
                ["code"] = code,
                ["redirect_uri"] = redirectUri,
                ["code_verifier"] = verifier
            }),
            token);

        return await ReadMicrosoftTokenAsync(response, existingRefreshToken: null, token);
    }

    private async Task<MicrosoftToken?> RefreshMicrosoftTokenAsync(string refreshToken, CancellationToken token)
    {
        using var response = await http.PostAsync(
            MicrosoftTokenEndpoint,
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["client_id"] = clientId,
                ["grant_type"] = "refresh_token",
                ["refresh_token"] = refreshToken,
                ["scope"] = MicrosoftScope
            }),
            token);

        if (!response.IsSuccessStatusCode)
        {
            var error = await ReadOAuthErrorAsync(response, token);
            if (string.Equals(error.Code, "invalid_grant", StringComparison.OrdinalIgnoreCase)
                || string.Equals(error.Code, "interaction_required", StringComparison.OrdinalIgnoreCase))
            {
                tokenStore.DeleteRefreshToken();
                return null;
            }

            throw new InvalidOperationException(error.Message ?? $"Microsoft rechazó la renovación de sesión (HTTP {(int)response.StatusCode}).");
        }

        return await ReadMicrosoftTokenAsync(response, refreshToken, token);
    }

    private async Task<MicrosoftToken> ReadMicrosoftTokenAsync(
        HttpResponseMessage response,
        string? existingRefreshToken,
        CancellationToken token)
    {
        if (!response.IsSuccessStatusCode)
        {
            var error = await ReadOAuthErrorAsync(response, token);
            throw new InvalidOperationException(error.Message ?? $"Microsoft rechazó el intercambio OAuth (HTTP {(int)response.StatusCode}).");
        }

        using var json = await JsonDocument.ParseAsync(await response.Content.ReadAsStreamAsync(token), cancellationToken: token);
        var root = json.RootElement;

        var accessToken = RequiredString(root, "access_token");
        var refreshToken = OptionalString(root, "refresh_token") ?? existingRefreshToken;
        var scope = OptionalString(root, "scope") ?? MicrosoftScope;
        var expiresIn = root.TryGetProperty("expires_in", out var expiry) && expiry.TryGetInt32(out var seconds)
            ? Math.Max(300, seconds)
            : 3600;

        var grantedScopes = scope.Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        if (!grantedScopes.Any(value => string.Equals(value, "XboxLive.signin", StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidDataException(
                $"Microsoft inició sesión, pero el access token no contiene XboxLive.signin. Scopes concedidos: {string.Join(' ', grantedScopes)}.");
        }

        return new MicrosoftToken(
            accessToken,
            refreshToken,
            scope,
            DateTimeOffset.UtcNow.AddSeconds(expiresIn));
    }

    private void StoreMicrosoftToken(MicrosoftToken token)
    {
        microsoftToken = token;
        if (!string.IsNullOrWhiteSpace(token.RefreshToken))
            tokenStore.WriteRefreshToken(token.RefreshToken);
    }

    private async Task<Session> ExchangeAsync(MicrosoftToken microsoft, string? microsoftAccount, CancellationToken token)
    {
        var xblBody = new
        {
            Properties = new
            {
                AuthMethod = "RPS",
                SiteName = "user.auth.xboxlive.com",
                RpsTicket = "d=" + microsoft.AccessToken
            },
            RelyingParty = "http://auth.xboxlive.com",
            TokenType = "JWT"
        };

        using var xblResponse = await PostXboxJsonAsync("https://user.auth.xboxlive.com/user/authenticate", xblBody, token);
        if (!xblResponse.IsSuccessStatusCode)
            throw await CreateXboxExceptionAsync(xblResponse, "Xbox User Auth", microsoft.Scope, token);

        using var xbl = await JsonDocument.ParseAsync(
            await xblResponse.Content.ReadAsStreamAsync(token),
            cancellationToken: token);
        var userToken = RequiredString(xbl.RootElement, "Token");

        var xstsBody = new
        {
            Properties = new { SandboxId = "RETAIL", UserTokens = new[] { userToken } },
            RelyingParty = "rp://api.minecraftservices.com/",
            TokenType = "JWT"
        };

        using var xstsResponse = await PostXboxJsonAsync("https://xsts.auth.xboxlive.com/xsts/authorize", xstsBody, token);
        if (!xstsResponse.IsSuccessStatusCode)
            throw await CreateXstsExceptionAsync(xstsResponse, token);

        using var xsts = await JsonDocument.ParseAsync(
            await xstsResponse.Content.ReadAsStreamAsync(token),
            cancellationToken: token);
        var xstsToken = RequiredString(xsts.RootElement, "Token");
        var userHash = xsts.RootElement.GetProperty("DisplayClaims")
            .GetProperty("xui")[0]
            .GetProperty("uhs")
            .GetString()
            ?? throw new InvalidDataException("Xbox no devolvió el identificador de usuario esperado.");

        using var minecraftLogin = await http.PostAsJsonAsync(
            "https://api.minecraftservices.com/authentication/login_with_xbox",
            new { identityToken = $"XBL3.0 x={userHash};{xstsToken}" },
            token);

        using var minecraftJson = await ReadMinecraftLoginAsync(minecraftLogin, token);
        var minecraftToken = RequiredString(minecraftJson.RootElement, "access_token");
        var expiresIn = minecraftJson.RootElement.TryGetProperty("expires_in", out var expiry)
                        && expiry.TryGetInt32(out var seconds)
            ? Math.Max(300, seconds)
            : 86400;

        await EnsureEntitledAsync(minecraftToken, token);
        var snapshot = await FetchProfileAsync(minecraftToken, microsoftAccount, token);

        return new Session(
            minecraftToken,
            DateTimeOffset.UtcNow.AddSeconds(expiresIn),
            microsoftAccount,
            snapshot);
    }

    private async Task<HttpResponseMessage> PostXboxJsonAsync<T>(string uri, T payload, CancellationToken token)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = JsonContent.Create(payload)
        };
        request.Headers.TryAddWithoutValidation(XboxContractVersionHeader, XboxContractVersion);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));
        return await http.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
    }

    private async Task EnsureEntitledAsync(string accessToken, CancellationToken token)
    {
        using var request = Authorized(HttpMethod.Get, "https://api.minecraftservices.com/entitlements/mcstore", accessToken);
        using var response = await http.SendAsync(request, token);
        using var json = await ReadJsonAsync(response, "No se pudo comprobar la licencia de Minecraft.", token);

        if (!json.RootElement.TryGetProperty("items", out var items)
            || items.ValueKind != JsonValueKind.Array
            || items.GetArrayLength() == 0)
        {
            throw new InvalidOperationException("Esta cuenta Microsoft no tiene una licencia válida de Minecraft: Java Edition.");
        }
    }

    private async Task<NexaPremiumAccountSnapshot> FetchProfileAsync(
        string accessToken,
        string? microsoftAccount,
        CancellationToken token)
    {
        using var request = Authorized(HttpMethod.Get, "https://api.minecraftservices.com/minecraft/profile", accessToken);
        using var response = await http.SendAsync(request, token);
        using var json = await ReadJsonAsync(response, "No se pudo cargar el perfil de Minecraft.", token);

        var root = json.RootElement;
        var id = RequiredString(root, "id");
        var name = RequiredString(root, "name");

        var skins = new List<NexaSkinSnapshot>();
        if (root.TryGetProperty("skins", out var skinArray) && skinArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var skin in skinArray.EnumerateArray())
            {
                var url = SanitizeTextureUrl(OptionalString(skin, "url"));
                if (url is null) continue;

                skins.Add(new NexaSkinSnapshot(
                    OptionalString(skin, "id") ?? string.Empty,
                    url,
                    (OptionalString(skin, "variant") ?? "CLASSIC").ToUpperInvariant(),
                    string.Equals(OptionalString(skin, "state"), "ACTIVE", StringComparison.OrdinalIgnoreCase)));
            }
        }

        var capes = new List<NexaCapeSnapshot>();
        if (root.TryGetProperty("capes", out var capeArray) && capeArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var cape in capeArray.EnumerateArray())
            {
                var url = SanitizeTextureUrl(OptionalString(cape, "url"));
                if (url is null) continue;

                capes.Add(new NexaCapeSnapshot(
                    OptionalString(cape, "id") ?? string.Empty,
                    url,
                    OptionalString(cape, "alias") ?? "Minecraft Cape",
                    string.Equals(OptionalString(cape, "state"), "ACTIVE", StringComparison.OrdinalIgnoreCase)));
            }
        }

        var activeSkin = skins.FirstOrDefault(skin => skin.Active) ?? skins.FirstOrDefault();

        return new NexaPremiumAccountSnapshot(
            Configured: true,
            SignedIn: true,
            Premium: true,
            MinecraftId: id,
            MinecraftName: name,
            MicrosoftAccount: MaskAccount(microsoftAccount),
            Skins: skins,
            Capes: capes,
            ActiveSkinUrl: activeSkin?.Url,
            ActiveSkinVariant: activeSkin?.Variant,
            Message: "Cuenta Microsoft verificada · Minecraft: Java Edition disponible");
    }

    private async Task<JsonDocument> ReadMinecraftLoginAsync(HttpResponseMessage response, CancellationToken token)
    {
        if (response.StatusCode == HttpStatusCode.Forbidden)
        {
            var text = await response.Content.ReadAsStringAsync(token);
            if (text.Contains("Invalid app registration", StringComparison.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException(
                    "Microsoft y Xbox autenticaron correctamente la cuenta, pero Minecraft Services todavía no autoriza el Client ID de NEXA (HTTP 403: Invalid app registration). El registro de Entra puede estar bien configurado y aun así necesitar autorización específica de Minecraft Services.");
            }
        }

        return await ReadJsonAsync(response, BuildHttpFallback("Minecraft Services", response), token);
    }

    private static async Task<Exception> CreateXboxExceptionAsync(
        HttpResponseMessage response,
        string stage,
        string microsoftScope,
        CancellationToken token)
    {
        var (message, xerr) = await ReadXboxErrorAsync(response, token);
        var correlation = GetCorrelationId(response);
        var details = BuildDiagnosticSuffix(response, xerr, correlation);

        if (response.StatusCode == HttpStatusCode.BadRequest && string.IsNullOrWhiteSpace(message))
        {
            return new InvalidOperationException(
                $"{stage} rechazó el RPS token{details}. Microsoft OAuth sí terminó. Scopes concedidos: {microsoftScope}. El access token no se muestra por seguridad.");
        }

        return new InvalidOperationException(string.IsNullOrWhiteSpace(message)
            ? $"{stage} rechazó la solicitud{details}."
            : $"{stage} rechazó la solicitud{details}: {message}");
    }

    private static async Task<Exception> CreateXstsExceptionAsync(HttpResponseMessage response, CancellationToken token)
    {
        var (message, xerr) = await ReadXboxErrorAsync(response, token);
        var correlation = GetCorrelationId(response);
        var details = BuildDiagnosticSuffix(response, xerr, correlation);

        if (xerr is 2148916233)
            return new InvalidOperationException($"Xbox XSTS rechazó la cuenta{details}: la cuenta Microsoft todavía no tiene un perfil de Xbox Live.");
        if (xerr is 2148916238)
            return new InvalidOperationException($"Xbox XSTS rechazó la cuenta{details}: la cuenta es infantil y necesita que la familia autorice el acceso a Xbox Live.");

        return new InvalidOperationException(string.IsNullOrWhiteSpace(message)
            ? $"Xbox XSTS rechazó la cuenta{details}."
            : $"Xbox XSTS rechazó la cuenta{details}: {message}");
    }

    private static async Task<(string? Message, long? XErr)> ReadXboxErrorAsync(
        HttpResponseMessage response,
        CancellationToken token)
    {
        try
        {
            var text = await response.Content.ReadAsStringAsync(token);
            if (string.IsNullOrWhiteSpace(text)) return (null, null);

            using var json = JsonDocument.Parse(text);
            var root = json.RootElement;
            long? xerr = root.TryGetProperty("XErr", out var xerrValue) && xerrValue.TryGetInt64(out var code)
                ? code
                : null;

            var message = OptionalString(root, "errorMessage")
                ?? OptionalString(root, "Message")
                ?? OptionalString(root, "error_description");

            return (message, xerr);
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static async Task<(string? Code, string? Message)> ReadOAuthErrorAsync(
        HttpResponseMessage response,
        CancellationToken token)
    {
        try
        {
            var text = await response.Content.ReadAsStringAsync(token);
            if (string.IsNullOrWhiteSpace(text))
                return (null, null);

            using var json = JsonDocument.Parse(text);
            var root = json.RootElement;
            var code = OptionalString(root, "error");
            var description = OptionalString(root, "error_description");
            return (code, string.IsNullOrWhiteSpace(description)
                ? code
                : $"Microsoft OAuth rechazó la solicitud ({code}): {description}");
        }
        catch (JsonException)
        {
            return (null, null);
        }
    }

    private static string BuildDiagnosticSuffix(HttpResponseMessage response, long? xerr, string? correlation)
    {
        var suffix = $" (HTTP {(int)response.StatusCode} {response.StatusCode}";
        if (xerr is not null) suffix += $", XErr {xerr.Value}";
        if (!string.IsNullOrWhiteSpace(correlation)) suffix += $", Correlation ID {correlation}";
        return suffix + ")";
    }

    private static string BuildHttpFallback(string stage, HttpResponseMessage response)
        => $"{stage} rechazó la solicitud (HTTP {(int)response.StatusCode} {response.StatusCode}).";

    private static string? GetCorrelationId(HttpResponseMessage response)
    {
        foreach (var header in new[]
                 {
                     "x-xbl-correlation-id",
                     "x-ms-correlation-request-id",
                     "x-ms-request-id",
                     "request-id"
                 })
        {
            if (!response.Headers.TryGetValues(header, out var values)) continue;
            var value = values.FirstOrDefault();
            if (!string.IsNullOrWhiteSpace(value)) return value;
        }

        return null;
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response,
        string fallback,
        CancellationToken token)
    {
        if (!response.IsSuccessStatusCode)
        {
            var message = await ReadErrorMessageAsync(response, token);
            throw new InvalidOperationException(message ?? fallback);
        }

        return await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(token),
            cancellationToken: token);
    }

    private static async Task EnsureSuccessAsync(
        HttpResponseMessage response,
        string fallback,
        CancellationToken token)
    {
        if (response.IsSuccessStatusCode) return;
        var message = await ReadErrorMessageAsync(response, token);
        throw new InvalidOperationException(message ?? fallback);
    }

    private static async Task<string?> ReadErrorMessageAsync(
        HttpResponseMessage response,
        CancellationToken token)
    {
        try
        {
            var text = await response.Content.ReadAsStringAsync(token);
            if (string.IsNullOrWhiteSpace(text)) return null;

            using var json = JsonDocument.Parse(text);
            var root = json.RootElement;
            return OptionalString(root, "errorMessage")
                   ?? OptionalString(root, "Message")
                   ?? OptionalString(root, "error_description");
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private static async Task WriteBrowserResultAsync(
        HttpListenerResponse response,
        bool success,
        CancellationToken token)
    {
        response.StatusCode = 200;
        response.ContentType = "text/html; charset=utf-8";
        response.Headers["Cache-Control"] = "no-store";

        var title = success ? "Autenticación completada" : "Autenticación no completada";
        var text = success
            ? "Puedes volver a NEXA Client y cerrar esta pestaña."
            : "Vuelve a NEXA Client para consultar el error.";

        var html = $"""
                    <!doctype html>
                    <html lang="es">
                    <head>
                      <meta charset="utf-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1">
                      <title>{title}</title>
                    </head>
                    <body style="font-family:Segoe UI,Arial,sans-serif;background:#0f1724;color:#f7f9ff;padding:32px">
                      <main style="max-width:640px;margin:auto">
                        <h1>{title}</h1>
                        <p>{text}</p>
                        <p style="opacity:.72">Por seguridad, no compartas la barra de direcciones ni códigos de autenticación.</p>
                      </main>
                    </body>
                    </html>
                    """;

        var bytes = Encoding.UTF8.GetBytes(html);
        response.ContentLength64 = bytes.Length;
        await response.OutputStream.WriteAsync(bytes, token);
        response.OutputStream.Close();
    }

    private static HttpRequestMessage Authorized(HttpMethod method, string uri, string token)
    {
        var request = new HttpRequestMessage(method, uri);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token);
        return request;
    }

    private static string RequiredString(JsonElement root, string property)
        => root.TryGetProperty(property, out var value)
           && value.ValueKind == JsonValueKind.String
           && !string.IsNullOrWhiteSpace(value.GetString())
            ? value.GetString()!
            : throw new InvalidDataException($"La respuesta del servicio no contiene '{property}'.");

    private static string? OptionalString(JsonElement root, string property)
        => root.TryGetProperty(property, out var value) && value.ValueKind == JsonValueKind.String
            ? value.GetString()
            : null;

    private NexaPremiumAccountSnapshot SignedOut(string? message) => new(
        Configured: IsConfigured,
        SignedIn: false,
        Premium: false,
        MinecraftId: null,
        MinecraftName: null,
        MicrosoftAccount: null,
        Skins: [],
        Capes: [],
        ActiveSkinUrl: null,
        ActiveSkinVariant: null,
        Message: message);

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "NEXA necesita un Client ID público de Microsoft válido. No se debe configurar un client secret en el launcher.");
        }
    }

    private static int ReserveEphemeralPort()
    {
        using var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private static string BuildUri(string baseUri, IReadOnlyDictionary<string, string> parameters)
        => baseUri + "?" + string.Join("&", parameters.Select(pair =>
            $"{Uri.EscapeDataString(pair.Key)}={Uri.EscapeDataString(pair.Value)}"));

    private static string Base64Url(ReadOnlySpan<byte> bytes)
        => Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');

    private static bool CryptographicEquals(string expected, string? actual)
    {
        if (actual is null) return false;
        var expectedBytes = Encoding.UTF8.GetBytes(expected);
        var actualBytes = Encoding.UTF8.GetBytes(actual);
        return expectedBytes.Length == actualBytes.Length
               && CryptographicOperations.FixedTimeEquals(expectedBytes, actualBytes);
    }

    private static string NormalizeVariant(string value)
        => value.Trim().ToLowerInvariant() switch
        {
            "classic" => "classic",
            "slim" => "slim",
            _ => throw new InvalidDataException("El modelo de skin debe ser classic o slim.")
        };

    private static void ValidateSkinPng(string path)
    {
        var info = new FileInfo(path);
        if (!info.Exists)
            throw new FileNotFoundException("No se encontró la skin seleccionada.", path);

        if (info.Length <= 0 || info.Length > MaxSkinBytes)
            throw new InvalidDataException("La skin PNG debe pesar como máximo 1 MB.");

        Span<byte> header = stackalloc byte[24];
        using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read);
        stream.ReadExactly(header);

        ReadOnlySpan<byte> signature = [137, 80, 78, 71, 13, 10, 26, 10];
        if (!header[..8].SequenceEqual(signature) || !header.Slice(12, 4).SequenceEqual("IHDR"u8))
            throw new InvalidDataException("El archivo seleccionado no es un PNG válido.");

        var width = BinaryPrimitives.ReadInt32BigEndian(header.Slice(16, 4));
        var height = BinaryPrimitives.ReadInt32BigEndian(header.Slice(20, 4));
        if (width != 64 || (height != 64 && height != 32))
            throw new InvalidDataException("Minecraft Java requiere una skin de 64×64 (o 64×32 legacy).");
    }

    private static string? SanitizeTextureUrl(string? value)
    {
        if (!Uri.TryCreate(value, UriKind.Absolute, out var uri) || uri.Scheme != Uri.UriSchemeHttps)
            return null;
        if (!string.Equals(uri.Host, "textures.minecraft.net", StringComparison.OrdinalIgnoreCase))
            return null;
        return uri.AbsoluteUri;
    }

    private static string? MaskAccount(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        var at = value.IndexOf('@');
        if (at <= 1) return value;

        var prefix = value[..at];
        var visible = Math.Min(2, prefix.Length);
        return prefix[..visible]
               + new string('•', Math.Max(2, prefix.Length - visible))
               + value[at..];
    }

    private sealed record MicrosoftToken(
        string AccessToken,
        string? RefreshToken,
        string Scope,
        DateTimeOffset ExpiresAt);

    private sealed record Session(
        string MinecraftAccessToken,
        DateTimeOffset ExpiresAt,
        string? MicrosoftAccount,
        NexaPremiumAccountSnapshot Snapshot);

    private sealed class MicrosoftInteractionRequiredException : Exception { }
}
