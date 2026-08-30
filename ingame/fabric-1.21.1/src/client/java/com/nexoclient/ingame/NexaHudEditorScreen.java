package com.nexoclient.ingame;

import com.nexoclient.ingame.core.hud.NexaHudAnchor;
import com.nexoclient.ingame.core.hud.NexaHudPlacement;
import com.nexoclient.ingame.modules.NexoModule;
import com.nexoclient.ingame.modules.NexoModuleRegistry;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.LinkedHashMap;
import java.util.Map;

final class NexaHudEditorScreen extends Screen {
    private final Screen parent;
    private final NexoModuleRegistry modules;
    private final Map<String, Rect> hitBoxes = new LinkedHashMap<>();
    private NexoModule selected;
    private NexoModule dragging;
    private double dragOffsetX;
    private double dragOffsetY;

    NexaHudEditorScreen(Screen parent, NexoModuleRegistry modules) {
        super(Text.literal("NEXA HUD Editor"));
        this.parent = parent;
        this.modules = modules;
        this.selected = modules.get("fps");
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        context.fill(0, 0, width, height, 0xD9070A0F);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        NexaTheme theme = NexaTheme.current();

        drawEditorGrid(context, theme);
        drawHeader(context, theme);
        hitBoxes.clear();

        for (NexoModule module : modules.hudModules()) {
            if (!module.ready()) continue;
            drawModulePreview(context, module, theme);
        }

        drawToolbar(context, theme);
        super.render(context, mouseX, mouseY, delta);
    }

    private void drawEditorGrid(DrawContext context, NexaTheme theme) {
        int grid = 0x24364250;
        context.fill(width / 3, 54, width / 3 + 1, height - 58, grid);
        context.fill(width * 2 / 3, 54, width * 2 / 3 + 1, height - 58, grid);
        context.fill(22, height / 3, width - 22, height / 3 + 1, grid);
        context.fill(22, height * 2 / 3, width - 22, height * 2 / 3 + 1, grid);
        context.fill(width / 2 - 2, height / 2 - 2, width / 2 + 3, height / 2 + 3, theme.accentMuted);
    }

    private void drawHeader(DrawContext context, NexaTheme theme) {
        context.fill(0, 0, width, 46, 0xE40B0F16);
        context.fill(0, 45, width, 46, theme.withAlpha(theme.accent, 80));
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA · HUD EDITOR"), 18, 13, theme.text);
        context.drawTextWithShadow(textRenderer, Text.literal("Arrastra módulos · suelta para anclar · ESC para guardar"), 18, 27, theme.secondary);
    }

    private void drawModulePreview(DrawContext context, NexoModule module, NexaTheme theme) {
        String preview = NexoHudOverlay.previewText(module);
        int textWidth = textRenderer.getWidth(preview);
        int textHeight = 9;
        double[] position = NexoHudOverlay.topLeft(module, width, height, textWidth, textHeight);
        double scale = module.placement().scale();
        int x = (int) Math.round(position[0]);
        int y = (int) Math.round(position[1]);
        int w = Math.max(38, (int) Math.ceil(textWidth * scale)) + 10;
        int h = Math.max(14, (int) Math.ceil(textHeight * scale)) + 8;
        int left = x - 5;
        int top = y - 4;

        boolean active = module == selected;
        context.fill(left, top, left + w, top + h, active ? 0xE81A202A : 0xCC11161E);
        drawBorder(context, left, top, w, h, active ? theme.accent : 0xFF364151);
        if (!module.enabled()) context.fill(left, top, left + w, top + h, 0x66000000);

        context.getMatrices().push();
        context.getMatrices().translate((float) x, (float) y, 0.0f);
        context.getMatrices().scale((float) scale, (float) scale, 1.0f);
        context.drawTextWithShadow(textRenderer, Text.literal(preview), 0, 0, module.enabled() ? theme.text : theme.muted);
        context.getMatrices().pop();

        hitBoxes.put(module.id(), new Rect(left, top, w, h));
    }

    private void drawToolbar(DrawContext context, NexaTheme theme) {
        int barWidth = 330;
        int x = (width - barWidth) / 2;
        int y = height - 43;
        context.fill(x, y, x + barWidth, y + 31, 0xEE11161E);
        drawBorder(context, x, y, barWidth, 31, 0xFF303A48);

        String name = selected == null ? "Selecciona un módulo" : selected.name();
        context.drawTextWithShadow(textRenderer, Text.literal(name), x + 10, y + 6, theme.text);
        if (selected != null) {
            String scale = Math.round(selected.placement().scale() * 100) + "%";
            context.drawTextWithShadow(textRenderer, Text.literal(scale), x + 10, y + 18, theme.secondary);
            drawToolButton(context, x + 205, y + 6, 28, 19, "−", theme);
            drawToolButton(context, x + 237, y + 6, 28, 19, "+", theme);
            drawToolButton(context, x + 269, y + 6, 51, 19, "RESET", theme);
        }
    }

    private void drawToolButton(DrawContext context, int x, int y, int w, int h, String label, NexaTheme theme) {
        context.fill(x, y, x + w, y + h, 0xFF1B222D);
        drawBorder(context, x, y, w, h, 0xFF374252);
        int tx = x + (w - textRenderer.getWidth(label)) / 2;
        context.drawTextWithShadow(textRenderer, Text.literal(label), tx, y + 5, theme.secondary);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0) return super.mouseClicked(mouseX, mouseY, button);

        if (selected != null && mouseY >= height - 37 && mouseY <= height - 18) {
            int x = (width - 330) / 2;
            if (mouseX >= x + 205 && mouseX <= x + 233) { changeScale(-0.1d); return true; }
            if (mouseX >= x + 237 && mouseX <= x + 265) { changeScale(0.1d); return true; }
            if (mouseX >= x + 269 && mouseX <= x + 320) { resetSelected(); return true; }
        }

        for (NexoModule module : modules.hudModules()) {
            Rect rect = hitBoxes.get(module.id());
            if (rect != null && rect.contains(mouseX, mouseY)) {
                selected = module;
                dragging = module;
                dragOffsetX = mouseX - rect.x - 5;
                dragOffsetY = mouseY - rect.y - 4;
                return true;
            }
        }
        return super.mouseClicked(mouseX, mouseY, button);
    }

    @Override
    public boolean mouseDragged(double mouseX, double mouseY, int button, double deltaX, double deltaY) {
        if (button != 0 || dragging == null) return super.mouseDragged(mouseX, mouseY, button, deltaX, deltaY);

        int textWidth = NexoHudOverlay.previewWidth(client, dragging);
        int textHeight = 9;
        double scale = dragging.placement().scale();
        double scaledWidth = textWidth * scale;
        double scaledHeight = textHeight * scale;
        double x = clamp(mouseX - dragOffsetX, 3, Math.max(3, width - scaledWidth - 3));
        double y = clamp(mouseY - dragOffsetY, 49, Math.max(49, height - scaledHeight - 49));
        NexaHudAnchor anchor = NexoHudOverlay.closestAnchor(x + scaledWidth / 2.0d, y + scaledHeight / 2.0d, width, height);
        double[] offsets = NexoHudOverlay.offsetsForTopLeft(anchor, x, y, width, height, scaledWidth, scaledHeight);
        dragging.setPlacement(new NexaHudPlacement(anchor, offsets[0], offsets[1], scale));
        return true;
    }

    @Override
    public boolean mouseReleased(double mouseX, double mouseY, int button) {
        if (button == 0 && dragging != null) {
            dragging = null;
            NexaInGameSettings.save(modules);
            return true;
        }
        return super.mouseReleased(mouseX, mouseY, button);
    }

    private void changeScale(double delta) {
        if (selected == null) return;
        var placement = selected.placement();
        selected.setPlacement(new NexaHudPlacement(placement.anchor(), placement.offsetX(), placement.offsetY(), placement.scale() + delta));
        NexaInGameSettings.save(modules);
    }

    private void resetSelected() {
        if (selected == null) return;
        selected.setPlacement(switch (selected.id()) {
            case "fps" -> new NexaHudPlacement(NexaHudAnchor.TOP_LEFT, 8, 8, 1.0d);
            case "coordinates" -> new NexaHudPlacement(NexaHudAnchor.TOP_LEFT, 8, 23, 1.0d);
            default -> NexaHudPlacement.defaults();
        });
        NexaInGameSettings.save(modules);
    }

    @Override
    public void close() {
        NexaInGameSettings.save(modules);
        if (client != null) client.setScreen(parent);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }

    private static void drawBorder(DrawContext context, int x, int y, int w, int h, int color) {
        context.fill(x, y, x + w, y + 1, color);
        context.fill(x, y + h - 1, x + w, y + h, color);
        context.fill(x, y, x + 1, y + h, color);
        context.fill(x + w - 1, y, x + w, y + h, color);
    }

    private static double clamp(double value, double min, double max) {
        return Math.max(min, Math.min(max, value));
    }

    private record Rect(int x, int y, int width, int height) {
        boolean contains(double px, double py) {
            return px >= x && px <= x + width && py >= y && py <= y + height;
        }
    }
}
