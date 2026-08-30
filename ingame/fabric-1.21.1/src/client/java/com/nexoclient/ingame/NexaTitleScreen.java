package com.nexoclient.ingame;

import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.text.Text;

/**
 * NEXA main menu for Minecraft 1.21.1.
 *
 * The background is intentionally procedural for now. It keeps the Nordic
 * Atelier language in place while the final shader-style voxel artwork is
 * selected, without coupling the menu layout to a temporary wallpaper.
 */
public final class NexaTitleScreen extends Screen {
    private static final int BG = 0xFF05080D;
    private static final int PANEL = 0xE30A1018;
    private static final int PANEL_HOVER = 0xF0152231;
    private static final int BORDER = 0xFF27384D;
    private static final int SILVER = 0xFFE8EEF7;
    private static final int MUTED = 0xFF8C9BB0;
    private static final int BLUE = 0xFF86B6FF;
    private static final int BLUE_STRONG = 0xFF4F86F7;

    private int menuX;
    private int menuY;
    private int menuWidth;
    private int buttonHeight;
    private int buttonGap;

    public NexaTitleScreen() {
        super(Text.literal("NEXA Client"));
    }

    @Override
    protected void init() {
        menuWidth = Math.min(300, Math.max(210, width / 4));
        buttonHeight = 34;
        buttonGap = 8;
        menuX = Math.max(34, width / 12);
        menuY = Math.max(126, height / 2 - 52);
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        context.fill(0, 0, width, height, BG);

        // Layered night sky.
        context.fill(0, 0, width, height / 3, 0xFF07101A);
        context.fill(0, height / 3, width, (height * 2) / 3, 0xFF08111A);
        context.fill(0, (height * 2) / 3, width, height, 0xFF060A10);

        // Cold horizon glow.
        int horizonY = (int)(height * 0.58F);
        context.fill(0, horizonY - 2, width, horizonY + 2, 0x332F73DA);
        context.fill(0, horizonY + 2, width, horizonY + 6, 0x182F73DA);

        // Procedural voxel skyline. This is deliberately abstract; final art can
        // replace only this layer later without moving the UI.
        int block = Math.max(18, width / 64);
        for (int x = 0; x < width; x += block) {
            int seed = Math.abs((x / block) * 37 + 17);
            int columns = 2 + seed % 8;
            int top = height - columns * block;
            int tone = (seed % 3 == 0) ? 0xFF0B1620 : (seed % 3 == 1 ? 0xFF0A131C : 0xFF0C1823);
            context.fill(x, top, Math.min(width, x + block + 1), height, tone);
            if (seed % 5 == 0) {
                context.fill(x + 2, top + 2, Math.min(width, x + block - 2), top + Math.max(4, block / 5), 0x221E86FF);
            }
        }

        // Dark readability veil.
        context.fill(0, 0, Math.min(width, menuX + menuWidth + 110), height, 0x8803070C);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);

        drawNexaMark(context, menuX, 35, 46);
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA"), menuX + 62, 42, SILVER);
        context.drawTextWithShadow(textRenderer, Text.literal("CLIENT"), menuX + 62, 57, BLUE);
        context.drawTextWithShadow(textRenderer, Text.literal("MINECRAFT · NORDIC EDITION"), menuX, 96, BLUE);
        context.drawTextWithShadow(textRenderer, Text.literal("Tu instancia. Tu mundo. Sin ruido."), menuX, 109, MUTED);

        String[] labels = { "JUGAR UN JUGADOR", "MULTIJUGADOR", "OPCIONES", "SALIR" };
        String[] hints = { "Mundos locales", "Servidores", "Minecraft + NEXA", "Cerrar juego" };
        for (int index = 0; index < labels.length; index++) {
            int y = menuY + index * (buttonHeight + buttonGap);
            drawMenuButton(context, mouseX, mouseY, menuX, y, menuWidth, buttonHeight, labels[index], hints[index], index == 0);
        }

        int rightX = Math.max(menuX + menuWidth + 70, (int)(width * 0.65F));
        int markSize = Math.min(180, Math.max(94, width / 8));
        drawNexaMark(context, Math.min(width - markSize - 42, rightX), Math.max(70, height / 4), markSize);
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA IN-GAME"), Math.min(width - 150, rightX), Math.max(70, height / 4) + markSize + 24, SILVER);
        context.drawTextWithShadow(textRenderer, Text.literal("RIGHT SHIFT · CONTROL CENTER"), Math.min(width - 210, rightX), Math.max(70, height / 4) + markSize + 40, MUTED);

        context.drawTextWithShadow(textRenderer, Text.literal("NEXA Client · Fabric 1.21.1"), 14, height - 20, 0xFF66768B);
        context.drawTextWithShadow(textRenderer, Text.literal("La portada final podrá usar el fondo voxel/shader elegido sin cambiar este layout."), 14, height - 9, 0xFF465466);
    }

    private void drawMenuButton(DrawContext context, int mouseX, int mouseY, int x, int y, int w, int h, String label, String hint, boolean primary) {
        boolean hover = inside(mouseX, mouseY, x, y, w, h);
        int outer = primary ? (hover ? BLUE : BLUE_STRONG) : BORDER;
        int inner = primary ? 0xFF10203A : (hover ? PANEL_HOVER : PANEL);
        context.fill(x, y, x + w, y + h, outer);
        context.fill(x + 1, y + 1, x + w - 1, y + h - 1, inner);
        context.drawTextWithShadow(textRenderer, Text.literal(label), x + 12, y + 8, primary ? 0xFFFFFFFF : SILVER);
        int hintWidth = textRenderer.getWidth(hint);
        context.drawTextWithShadow(textRenderer, Text.literal(hint), x + w - hintWidth - 12, y + 8, primary ? 0xFFC4D8FF : MUTED);
    }

    /** Draws the NEXA N as a geometric mark so the Minecraft menu can use the
     * brand even before the final raster asset is wired into every adapter. */
    private static void drawNexaMark(DrawContext context, int x, int y, int size) {
        int t = Math.max(3, size / 9);
        int color = BLUE;
        context.fill(x, y, x + t, y + size, color);
        context.fill(x + size - t, y, x + size, y + size, color);
        int usable = size - t;
        int steps = Math.max(6, usable / Math.max(2, t / 2));
        for (int i = 0; i <= steps; i++) {
            int px = x + (usable * i) / steps;
            int py = y + (usable * i) / steps;
            context.fill(px, py, Math.min(x + size, px + t), Math.min(y + size, py + t), color);
        }
        int floatSize = Math.max(3, t / 2);
        context.fill(x + size - floatSize, y - floatSize * 2, x + size, y - floatSize, 0xFFB7D2FF);
        context.fill(x - floatSize, y + size + floatSize, x, y + size + floatSize * 2, 0xFF5C91F7);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0 || client == null) return super.mouseClicked(mouseX, mouseY, button);
        for (int index = 0; index < 4; index++) {
            int y = menuY + index * (buttonHeight + buttonGap);
            if (!inside(mouseX, mouseY, menuX, y, menuWidth, buttonHeight)) continue;
            switch (index) {
                case 0 -> client.setScreen(new SelectWorldScreen(this));
                case 1 -> client.setScreen(new MultiplayerScreen(this));
                case 2 -> client.setScreen(new OptionsScreen(this, client.options));
                case 3 -> client.scheduleStop();
                default -> { }
            }
            return true;
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int w, int h) {
        return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
