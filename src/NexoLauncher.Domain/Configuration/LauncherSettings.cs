namespace NexoLauncher.Domain.Configuration;

public sealed record LauncherSettings(
    int MemoryMiB = 4096,
    string? JavaPath = null,
    string Username = "Player",
    bool CloseLauncherOnGameStart = true,
    string AccentTheme = "nexa")
{
    private static readonly HashSet<string> AllowedAccentThemes = new(StringComparer.OrdinalIgnoreCase)
    {
        "nexa", "violet", "emerald", "amber", "crimson", "cyan"
    };

    public LauncherSettings Normalize()
    {
        var username = string.IsNullOrWhiteSpace(Username) ? "Player" : Username.Trim();
        if (username.Length > 16) username = username[..16];

        var accentTheme = string.IsNullOrWhiteSpace(AccentTheme) ? "nexa" : AccentTheme.Trim().ToLowerInvariant();
        if (!AllowedAccentThemes.Contains(accentTheme)) accentTheme = "nexa";

        return this with
        {
            MemoryMiB = Math.Clamp(MemoryMiB, 1024, 32768),
            JavaPath = string.IsNullOrWhiteSpace(JavaPath) ? null : JavaPath.Trim(),
            Username = username,
            AccentTheme = accentTheme
        };
    }
}
