package com.nexoclient.ingame;

import java.util.Locale;

/** Shared visual token set for NEXA In-Game.
 * The launcher passes the selected accent as -Dnexa.accent=<id>.
 */
final class NexaTheme {
    final int accent;
    final int accentSoft;
    final int accentMuted;
    final int text;
    final int secondary;
    final int muted;
    final int panel;
    final int panelStrong;
    final int border;
    final int backdrop;

    private NexaTheme(int accent, int accentSoft, int accentMuted) {
        this.accent = accent;
        this.accentSoft = accentSoft;
        this.accentMuted = accentMuted;
        this.text = 0xFFF4F7FC;
        this.secondary = 0xFF9AA7B8;
        this.muted = 0xFF687588;
        this.panel = 0xE812161E;
        this.panelStrong = 0xF01A202B;
        this.border = 0xFF303A49;
        this.backdrop = 0xB8070A0F;
    }

    static NexaTheme current() {
        String id = System.getProperty("nexa.accent", "nexa").trim().toLowerCase(Locale.ROOT);
        return switch (id) {
            case "violet" -> new NexaTheme(0xFF8B6CFF, 0xFFAA94FF, 0x338B6CFF);
            case "emerald" -> new NexaTheme(0xFF35C990, 0xFF63DDB0, 0x3335C990);
            case "amber" -> new NexaTheme(0xFFE6A84D, 0xFFF2C271, 0x33E6A84D);
            case "crimson" -> new NexaTheme(0xFFE75C72, 0xFFF18496, 0x33E75C72);
            case "cyan" -> new NexaTheme(0xFF27B9D8, 0xFF5ED2EA, 0x3327B9D8);
            default -> new NexaTheme(0xFF4E86FF, 0xFF76A4FF, 0x334E86FF);
        };
    }

    int withAlpha(int rgb, int alpha) {
        return (alpha & 0xFF) << 24 | rgb & 0x00FFFFFF;
    }
}
