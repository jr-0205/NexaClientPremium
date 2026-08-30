using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using NexoLauncher.Core.Installation;
using NexoLauncher.Infrastructure.Configuration;

namespace NexaLauncher.Desktop;

/// <summary>
/// Owns non-sensitive UI preferences that must survive WebView storage resets and
/// be inherited by child Minecraft processes. No account credentials cross this boundary.
/// </summary>
internal sealed class NexaUiSettingsMessageRouter
{
    private const string AccentEnvironmentVariable = "NEXA_ACCENT_THEME";
    private static readonly HashSet<string> AllowedThemes = new(StringComparer.OrdinalIgnoreCase)
    {
        "nexa", "violet", "emerald", "amber", "crimson", "cyan"
    };

    private readonly CoreWebView2 webView;
    private readonly JsonLauncherSettingsStore settings;
    private readonly JsonSerializerOptions json = new(JsonSerializerDefaults.Web);

    public NexaUiSettingsMessageRouter(NexoPaths paths, CoreWebView2 webView)
    {
        this.webView = webView;
        settings = new JsonLauncherSettingsStore(Path.Combine(paths.Root, "settings.json"));
    }

    public async Task InitializeAsync()
    {
        var current = await settings.LoadAsync();
        ApplyProcessTheme(current.AccentTheme);
    }

    public async Task<bool> TryHandleAsync(CoreWebView2WebMessageReceivedEventArgs eventArgs)
    {
        UiRequest? request;
        try
        {
            request = JsonSerializer.Deserialize<UiRequest>(eventArgs.WebMessageAsJson, json);
        }
        catch (JsonException)
        {
            return false;
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Method) || !request.Method.StartsWith("ui.theme.", StringComparison.Ordinal))
            return false;

        try
        {
            object result = request.Method switch
            {
                "ui.theme.status" => await StatusAsync(),
                "ui.theme.update" => await UpdateAsync(request.Payload),
                _ => throw new NotSupportedException($"El método '{request.Method}' no está disponible en NEXA UI.")
            };
            Post(new UiResponse(request.Id, true, result, null));
        }
        catch (Exception exception) when (exception is not OperationCanceledException)
        {
            Post(new UiResponse(request.Id, false, null, exception.Message));
        }
        catch (OperationCanceledException)
        {
            Post(new UiResponse(request.Id, false, null, "La operación fue cancelada."));
        }

        return true;
    }

    private async Task<object> StatusAsync()
    {
        var current = await settings.LoadAsync();
        ApplyProcessTheme(current.AccentTheme);
        return new { theme = current.AccentTheme };
    }

    private async Task<object> UpdateAsync(JsonElement payload)
    {
        var request = payload.ValueKind is JsonValueKind.Undefined or JsonValueKind.Null
            ? throw new InvalidDataException("Falta el color base de NEXA.")
            : JsonSerializer.Deserialize<ThemeRequest>(payload.GetRawText(), json)
              ?? throw new InvalidDataException("No se pudo interpretar el color base de NEXA.");

        var theme = NormalizeTheme(request.Theme);
        var current = await settings.LoadAsync();
        var updated = (current with { AccentTheme = theme }).Normalize();
        await settings.SaveAsync(updated);
        ApplyProcessTheme(updated.AccentTheme);
        return new { theme = updated.AccentTheme };
    }

    private static string NormalizeTheme(string? value)
    {
        var theme = string.IsNullOrWhiteSpace(value) ? "nexa" : value.Trim().ToLowerInvariant();
        if (!AllowedThemes.Contains(theme)) throw new ArgumentException("El color base solicitado no está disponible en NEXA.");
        return theme;
    }

    private static void ApplyProcessTheme(string theme)
        => Environment.SetEnvironmentVariable(AccentEnvironmentVariable, NormalizeTheme(theme), EnvironmentVariableTarget.Process);

    private void Post(UiResponse response)
        => webView.PostWebMessageAsJson(JsonSerializer.Serialize(response, json));

    private sealed record UiRequest(string Id, string Method, JsonElement Payload);
    private sealed record UiResponse(string Id, bool Ok, object? Result, string? Error);
    private sealed record ThemeRequest(string Theme);
}
