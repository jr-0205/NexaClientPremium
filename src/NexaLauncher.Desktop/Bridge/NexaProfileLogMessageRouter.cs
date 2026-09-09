using System.Diagnostics;
using System.Text;
using System.Text.Json;
using Microsoft.Web.WebView2.Core;
using NexoLauncher.Application.Instances;
using NexoLauncher.Core.Installation;
using NexoLauncher.Domain.Instances;
using NexoLauncher.Infrastructure.Instances;

namespace NexaLauncher.Desktop;

/// <summary>
/// Expone recursos acotados de una instancia a React. Todas las rutas solicitadas
/// se resuelven dentro del directorio Game del perfil: la UI no obtiene acceso
/// arbitrario al sistema de archivos.
/// </summary>
internal sealed class NexaProfileLogMessageRouter
{
    private const int MaximumReadBytes = 384 * 1024;
    private const int MaximumDirectoryEntries = 500;
    private readonly NexoPaths paths;
    private readonly CoreWebView2 webView;
    private readonly JsonInstanceRepository instances;
    private readonly InstanceManager instanceManager;
    private readonly JsonSerializerOptions json = new(JsonSerializerDefaults.Web);

    public NexaProfileLogMessageRouter(NexoPaths paths, CoreWebView2 webView)
    {
        this.paths = paths;
        this.webView = webView;
        instances = new JsonInstanceRepository(paths.Instances);
        instanceManager = new InstanceManager(instances);
    }

    public async Task<bool> TryHandleAsync(CoreWebView2WebMessageReceivedEventArgs eventArgs)
    {
        RequestEnvelope? request;
        try
        {
            request = JsonSerializer.Deserialize<RequestEnvelope>(eventArgs.WebMessageAsJson, json);
        }
        catch (JsonException)
        {
            return false;
        }

        if (request is null || string.IsNullOrWhiteSpace(request.Method) ||
            !request.Method.StartsWith("profiles.", StringComparison.Ordinal)) return false;

        if (request.Method is not ("profiles.liveLogs" or "profiles.files.list" or "profiles.files.open" or "profiles.worlds.list" or "profiles.worlds.open"))
            return false;

        try
        {
            object result = request.Method switch
            {
                "profiles.liveLogs" => await ReadLogsAsync(request.Payload),
                "profiles.files.list" => await ListFilesAsync(request.Payload),
                "profiles.files.open" => await OpenFileAsync(request.Payload),
                "profiles.worlds.list" => await ListWorldsAsync(request.Payload),
                "profiles.worlds.open" => await OpenWorldAsync(request.Payload),
                _ => throw new NotSupportedException()
            };
            Post(new ResponseEnvelope(request.Id, true, result, null));
        }
        catch (Exception exception)
        {
            Post(new ResponseEnvelope(request.Id, false, null, exception.Message));
        }
        return true;
    }

    private async Task<object> ReadLogsAsync(JsonElement payload)
    {
        var context = await ResolveProfileAsync(payload);
        var gameLogPath = Path.Combine(context.Game, "logs", "latest.log");
        var launcherLogPath = FindLatestLauncherLog(context.Profile.MinecraftVersion);
        var crashReportPath = FindNewestFile(Path.Combine(context.Game, "crash-reports"), "*.txt");

        var gameLog = ReadTail(gameLogPath);
        var launcherLog = ReadTail(launcherLogPath);
        var crashReport = ReadTail(crashReportPath);

        return new
        {
            profileId = context.Id.ToString(),
            capturedAt = DateTimeOffset.UtcNow,
            game = Snapshot(gameLogPath, gameLog),
            launcher = Snapshot(launcherLogPath, launcherLog),
            crash = Snapshot(crashReportPath, crashReport)
        };
    }

    private async Task<object> ListFilesAsync(JsonElement payload)
    {
        var request = Read<ProfilePathRequest>(payload);
        var context = await ResolveProfileAsync(request.Id);
        Directory.CreateDirectory(context.Game);
        var directory = ResolveInside(context.Game, request.Path, requireExisting: true);
        if (!Directory.Exists(directory)) throw new InvalidOperationException("La ruta solicitada no es una carpeta.");

        var entries = Directory.EnumerateFileSystemEntries(directory, "*", SearchOption.TopDirectoryOnly)
            .Take(MaximumDirectoryEntries + 1)
            .Select(path => FileEntry(context.Game, path))
            .ToArray();
        var truncated = entries.Length > MaximumDirectoryEntries;
        if (truncated) entries = entries.Take(MaximumDirectoryEntries).ToArray();

        entries = entries
            .OrderByDescending(entry => entry.IsDirectory)
            .ThenBy(entry => entry.Name, StringComparer.OrdinalIgnoreCase)
            .ToArray();

        return new
        {
            profileId = context.Id.ToString(),
            path = NormalizeRelative(context.Game, directory),
            entries,
            truncated
        };
    }

    private async Task<object> OpenFileAsync(JsonElement payload)
    {
        var request = Read<ProfilePathRequest>(payload);
        var context = await ResolveProfileAsync(request.Id);
        var target = ResolveInside(context.Game, request.Path, requireExisting: true);
        OpenInExplorer(target);
        return new { opened = true };
    }

    private async Task<object> ListWorldsAsync(JsonElement payload)
    {
        var context = await ResolveProfileAsync(payload);
        var saves = Path.Combine(context.Game, "saves");
        var worlds = !Directory.Exists(saves)
            ? Array.Empty<WorldEntry>()
            : Directory.EnumerateDirectories(saves, "*", SearchOption.TopDirectoryOnly)
                .Select(World)
                .OrderByDescending(world => world.ModifiedAt)
                .ToArray();

        return new
        {
            profileId = context.Id.ToString(),
            worlds,
            serversConfigured = File.Exists(Path.Combine(context.Game, "servers.dat"))
        };
    }

    private async Task<object> OpenWorldAsync(JsonElement payload)
    {
        var request = Read<ProfilePathRequest>(payload);
        var context = await ResolveProfileAsync(request.Id);
        var saves = Path.Combine(context.Game, "saves");
        Directory.CreateDirectory(saves);
        var target = ResolveInside(saves, request.Path, requireExisting: true);
        if (!Directory.Exists(target)) throw new InvalidOperationException("El mundo solicitado ya no existe.");
        OpenInExplorer(target);
        return new { opened = true };
    }

    private async Task<ProfileContext> ResolveProfileAsync(JsonElement payload)
    {
        var request = Read<ProfileRequest>(payload);
        return await ResolveProfileAsync(request.Id);
    }

    private async Task<ProfileContext> ResolveProfileAsync(string idValue)
    {
        var id = InstanceId.Parse(idValue);
        var profile = await instanceManager.GetAsync(id)
                      ?? throw new InvalidOperationException("El perfil ya no existe.");
        return new ProfileContext(id, profile, instances.GetPaths(id).Game);
    }

    private T Read<T>(JsonElement payload)
        => payload.Deserialize<T>(json) ?? throw new InvalidDataException("No se pudo interpretar la solicitud del perfil.");

    private static FileEntry FileEntry(string root, string path)
    {
        if (Directory.Exists(path))
        {
            var info = new DirectoryInfo(path);
            return new FileEntry(info.Name, NormalizeRelative(root, path), true, 0, info.CreationTimeUtc, info.LastWriteTimeUtc);
        }

        var file = new FileInfo(path);
        return new FileEntry(file.Name, NormalizeRelative(root, path), false, file.Exists ? file.Length : 0, file.CreationTimeUtc, file.LastWriteTimeUtc);
    }

    private static WorldEntry World(string path)
    {
        var info = new DirectoryInfo(path);
        return new WorldEntry(
            info.Name,
            info.Name,
            TryDirectorySize(path),
            info.CreationTimeUtc,
            info.LastWriteTimeUtc,
            File.Exists(Path.Combine(path, "session.lock")));
    }

    private static long TryDirectorySize(string directory)
    {
        try
        {
            long total = 0;
            var count = 0;
            foreach (var file in Directory.EnumerateFiles(directory, "*", SearchOption.AllDirectories))
            {
                if (++count > 20000) break;
                try { total += new FileInfo(file).Length; }
                catch (IOException) { }
                catch (UnauthorizedAccessException) { }
            }
            return total;
        }
        catch (IOException) { return 0; }
        catch (UnauthorizedAccessException) { return 0; }
    }

    private static string ResolveInside(string root, string? relativePath, bool requireExisting)
    {
        var fullRoot = Path.GetFullPath(root).TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var value = (relativePath ?? string.Empty).Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
        var candidate = Path.GetFullPath(Path.Combine(fullRoot, value));
        var prefix = fullRoot + Path.DirectorySeparatorChar;
        if (!string.Equals(candidate, fullRoot, StringComparison.OrdinalIgnoreCase) &&
            !candidate.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            throw new InvalidOperationException("La ruta solicitada está fuera de la instancia.");
        if (requireExisting && !File.Exists(candidate) && !Directory.Exists(candidate))
            throw new FileNotFoundException("El recurso solicitado ya no existe.");
        return candidate;
    }

    private static string NormalizeRelative(string root, string path)
    {
        var relative = Path.GetRelativePath(Path.GetFullPath(root), Path.GetFullPath(path));
        return relative == "." ? string.Empty : relative.Replace(Path.DirectorySeparatorChar, '/');
    }

    private static void OpenInExplorer(string target)
    {
        var arguments = File.Exists(target) ? $"/select,\"{target}\"" : $"\"{target}\"";
        Process.Start(new ProcessStartInfo("explorer.exe", arguments) { UseShellExecute = true });
    }

    private string? FindLatestLauncherLog(string minecraftVersion)
    {
        if (!Directory.Exists(paths.Logs)) return null;
        var prefix = $"minecraft-{SafeFileName(minecraftVersion)}-";
        try
        {
            return Directory.EnumerateFiles(paths.Logs, "minecraft-*.log", SearchOption.TopDirectoryOnly)
                .Where(path => Path.GetFileName(path).StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault();
        }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }

    private static string? FindNewestFile(string directory, string pattern)
    {
        if (!Directory.Exists(directory)) return null;
        try
        {
            return Directory.EnumerateFiles(directory, pattern, SearchOption.TopDirectoryOnly)
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault();
        }
        catch (IOException) { return null; }
        catch (UnauthorizedAccessException) { return null; }
    }

    private static object Snapshot(string? path, string text)
    {
        DateTimeOffset? updatedAt = null;
        long sizeBytes = 0;
        if (!string.IsNullOrWhiteSpace(path) && File.Exists(path))
        {
            try
            {
                var info = new FileInfo(path);
                updatedAt = info.LastWriteTimeUtc;
                sizeBytes = info.Length;
            }
            catch (IOException) { }
            catch (UnauthorizedAccessException) { }
        }
        return new
        {
            available = !string.IsNullOrWhiteSpace(path) && File.Exists(path),
            path,
            text,
            updatedAt,
            sizeBytes
        };
    }

    private static string ReadTail(string? path)
    {
        if (string.IsNullOrWhiteSpace(path) || !File.Exists(path)) return string.Empty;
        try
        {
            using var stream = new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.ReadWrite | FileShare.Delete);
            var start = Math.Max(0, stream.Length - MaximumReadBytes);
            stream.Seek(start, SeekOrigin.Begin);
            using var reader = new StreamReader(stream, Encoding.UTF8, detectEncodingFromByteOrderMarks: true, bufferSize: 16 * 1024, leaveOpen: false);
            if (start > 0) _ = reader.ReadLine();
            return reader.ReadToEnd();
        }
        catch (IOException) { return string.Empty; }
        catch (UnauthorizedAccessException) { return string.Empty; }
    }

    private static string SafeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var result = new string(value.Select(character => invalid.Contains(character) ? '-' : character).ToArray());
        return string.IsNullOrWhiteSpace(result) ? "minecraft" : result;
    }

    private void Post(object value) => webView.PostWebMessageAsJson(JsonSerializer.Serialize(value, json));

    private sealed record RequestEnvelope(string Id, string Method, JsonElement Payload);
    private sealed record ResponseEnvelope(string Id, bool Ok, object? Result, string? Error);
    private sealed record ProfileRequest(string Id);
    private sealed record ProfilePathRequest(string Id, string? Path = null);
    private sealed record ProfileContext(InstanceId Id, GameInstance Profile, string Game);
    private sealed record FileEntry(string Name, string RelativePath, bool IsDirectory, long SizeBytes, DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt);
    private sealed record WorldEntry(string Name, string RelativePath, long SizeBytes, DateTimeOffset CreatedAt, DateTimeOffset ModifiedAt, bool Locked);
}
