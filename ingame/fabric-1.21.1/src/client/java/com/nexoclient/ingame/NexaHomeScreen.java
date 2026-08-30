package com.nexoclient.ingame;

import com.nexoclient.ingame.modules.NexoModuleRegistry;
import com.nexoclient.ingame.performance.NexoPerformanceController;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.text.Text;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Minimal NEXA replacement for Minecraft's title screen.
 *
 * This is an original NEXA implementation inspired by the compact launcher/client
 * navigation pattern: one clear focal point, few primary actions and direct access
 * to the Control Center. No third-party code or assets are used.
 */
public final class NexaHomeScreen extends Screen {
    private final Screen vanillaParent;
    private final NexoModuleRegistry modules;
    private final NexoPerformanceController performance;
    private final Map<Action, Rect> actions = new LinkedHashMap<>();

    private Rect controlCenterRect;
    private Rect settingsRect;
    private Rect quitRect;

    public NexaHomeScreen(Screen vanillaParent, NexoModuleRegistry modules, NexoPerformanceController performance) {
        super(Text.literal("NEXA Client"));
        this.vanillaParent = vanillaParent;
        this.modules = modules;
        this.performance = performance;
    }

    @Override
    protected void init() {
        actions.clear();
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // Reserved background slot: image-1 will replace this neutral composition once
        // the final artwork is supplied. The dark overlay is intentionally retained so
        // text and controls remain readable regardless of the selected artwork.
        context.fill(0, 0, width, height, 0xFF070A0F);
        context.fill(0, 0, width, height, 0x98070A0F);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        NexaTheme theme = NexaTheme.current();

        int cardWidth = Math.min(340, Math.max(270, width / 3));
        int centerX = width / 2;
        int top = Math.max(54, height / 2 - 118);

        drawBrand(context, centerX, top - 53, theme);

        actions.clear();
        int y = top;
        drawAction(context, Action.SINGLEPLAYER, new Rect(centerX - cardWidth / 2, y, cardWidth, 31), theme, mouseX, mouseY);
        y += 37;
        drawAction(context, Action.MULTIPLAYER, new Rect(centerX - cardWidth / 2, y, cardWidth, 31), theme, mouseX, mouseY);
        y += 42;

        int gap = 7;
        int half = (cardWidth - gap) / 2;
        drawAction(context, Action.CONTROL_CENTER, new Rect(centerX - cardWidth / 2, y, half, 29), theme, mouseX, mouseY);
        drawAction(context, Action.OPTIONS, new Rect(centerX - cardWidth / 2 + half + gap, y, half, 29), theme, mouseX, mouseY);

        controlCenterRect = actions.get(Action.CONTROL_CENTER);
        settingsRect = actions.get(Action.OPTIONS);

        quitRect = new Rect(width - 41, 13, 28, 28);
        boolean quitHover = quitRect.contains(mouseX, mouseY);
        context.fill(quitRect.x, quitRect.y, quitRect.right(), quitRect.bottom(), quitHover ? 0xFF2A3039 : 0xD912161D);
        drawBorder(context, quitRect, quitHover ? theme.withAlpha(theme.accent, 150) : 0xFF303946);
        drawCloseIcon(context, quitRect.x + 14, quitRect.y + 14, quitHover ? theme.text : theme.secondary);

        drawStatus(context, theme);
        super.render(context, mouseX, mouseY, delta);
    }

    private void drawBrand(DrawContext context, int centerX, int y, NexaTheme theme) {
        int markW = 52;
        int markH = 30;
        int x = centerX - markW / 2;
        context.fill(x + 8, y + 4, x + 44, y + 6, theme.accentSoft);
        context.fill(x + 4, y + 8, x + 8, y + 24, theme.accentSoft);
        context.fill(x + 44, y + 8, x + 48, y + 24, theme.accentSoft);
        context.fill(x + 10, y + 24, x + 42, y + 26, theme.accentSoft);
        context.fill(centerX - 3, y + 10, centerX + 3, y + 21, theme.text);
        context.fill(centerX - 10, y + 15, centerX + 10, y + 17, theme.text);

        String brand = "NEXA CLIENT";
        int textWidth = textRenderer.getWidth(brand);
        context.drawTextWithShadow(textRenderer, Text.literal(brand), centerX - textWidth / 2, y + 35, theme.text);
    }

    private void drawAction(DrawContext context, Action action, Rect rect, NexaTheme theme, int mouseX, int mouseY) {
        actions.put(action, rect);
        boolean hover = rect.contains(mouseX, mouseY);
        boolean primary = action == Action.SINGLEPLAYER || action == Action.MULTIPLAYER;
        int fill = hover ? theme.accentMuted : primary ? 0xE9141921 : 0xD912161D;
        context.fill(rect.x, rect.y, rect.right(), rect.bottom(), fill);
        drawBorder(context, rect, hover ? theme.withAlpha(theme.accent, 160) : 0xFF2F3845);
        if (hover) context.fill(rect.x, rect.y, rect.x + 2, rect.bottom(), theme.accent);

        int iconX = rect.x + 18;
        int iconY = rect.y + rect.height / 2;
        drawActionIcon(context, action, iconX, iconY, hover ? theme.accentSoft : theme.secondary);

        int color = hover ? theme.text : primary ? 0xFFE7EDF6 : theme.secondary;
        context.drawTextWithShadow(textRenderer, Text.literal(action.label), rect.x + 34, rect.y + (rect.height - 8) / 2, color);
    }

    private void drawStatus(DrawContext context, NexaTheme theme) {
        String version = "NEXA In-Game";
        context.drawTextWithShadow(textRenderer, Text.literal(version), 12, height - 18, theme.muted);

        String hint = "Right Shift · Control Center";
        int width = textRenderer.getWidth(hint);
        context.drawTextWithShadow(textRenderer, Text.literal(hint), this.width - width - 12, height - 18, theme.muted);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0) return super.mouseClicked(mouseX, mouseY, button);

        if (quitRect != null && quitRect.contains(mouseX, mouseY)) {
            if (client != null) client.scheduleStop();
            return true;
        }

        for (var entry : actions.entrySet()) {
            if (!entry.getValue().contains(mouseX, mouseY)) continue;
            activate(entry.getKey());
            return true;
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void activate(Action action) {
        if (client == null) return;
        switch (action) {
            case SINGLEPLAYER -> client.setScreen(new SelectWorldScreen(this));
            case MULTIPLAYER -> client.setScreen(new MultiplayerScreen(this));
            case CONTROL_CENTER -> client.setScreen(new NexoMenuScreen(this, modules, performance));
            case OPTIONS -> client.setScreen(new OptionsScreen(this, client.options));
        }
    }

    @Override
    public void close() {
        // A title/home screen has no previous gameplay screen to return to.
        // If Minecraft supplied a vanilla title parent, returning to it would cause
        // the NEXA replacement hook to immediately reopen this screen, so close is a no-op.
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private static void drawBorder(DrawContext context, Rect rect, int color) {
        context.fill(rect.x, rect.y, rect.right(), rect.y + 1, color);
        context.fill(rect.x, rect.bottom() - 1, rect.right(), rect.bottom(), color);
        context.fill(rect.x, rect.y, rect.x + 1, rect.bottom(), color);
        context.fill(rect.right() - 1, rect.y, rect.right(), rect.bottom(), color);
    }

    private static void drawActionIcon(DrawContext context, Action action, int cx, int cy, int color) {
        switch (action) {
            case SINGLEPLAYER -> {
                context.fill(cx - 5, cy - 5, cx + 5, cy + 5, color);
                context.fill(cx - 3, cy - 7, cx + 3, cy + 7, color);
            }
            case MULTIPLAYER -> {
                context.fill(cx - 7, cy - 4, cx - 2, cy + 4, color);
                context.fill(cx + 2, cy - 4, cx + 7, cy + 4, color);
                context.fill(cx - 4, cy + 4, cx + 4, cy + 6, color);
            }
            case CONTROL_CENTER -> {
                context.fill(cx - 6, cy - 5, cx + 7, cy - 3, color);
                context.fill(cx - 6, cy - 1, cx + 7, cy + 1, color);
                context.fill(cx - 6, cy + 3, cx + 7, cy + 5, color);
            }
            case OPTIONS -> {
                context.fill(cx - 6, cy - 1, cx + 7, cy + 2, color);
                context.fill(cx - 1, cy - 6, cx + 2, cy + 7, color);
                context.fill(cx - 3, cy - 3, cx + 4, cy + 4, color);
            }
        }
    }

    private static void drawCloseIcon(DrawContext context, int cx, int cy, int color) {
        for (int i = -4; i <= 4; i++) {
            context.fill(cx + i, cy + i, cx + i + 1, cy + i + 1, color);
            context.fill(cx + i, cy - i, cx + i + 1, cy - i + 1, color);
        }
    }

    private enum Action {
        SINGLEPLAYER("Un jugador"),
        MULTIPLAYER("Multijugador"),
        CONTROL_CENTER("NEXA"),
        OPTIONS("Opciones");

        private final String label;

        Action(String label) {
            this.label = label;
        }
    }

    private record Rect(int x, int y, int width, int height) {
        int right() { return x + width; }
        int bottom() { return y + height; }
        boolean contains(double px, double py) { return px >= x && px < right() && py >= y && py < bottom(); }
    }
}
