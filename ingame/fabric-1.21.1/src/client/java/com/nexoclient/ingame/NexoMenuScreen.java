package com.nexoclient.ingame;

import com.nexoclient.ingame.core.hud.NexaHudPlacement;
import com.nexoclient.ingame.core.modules.NexaModuleCategory;
import com.nexoclient.ingame.modules.NexoModule;
import com.nexoclient.ingame.modules.NexoModuleRegistry;
import com.nexoclient.ingame.performance.NexoPerformanceController;
import com.nexoclient.ingame.performance.NexoPerformancePreset;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.EnumMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public final class NexoMenuScreen extends Screen {
    private static final NexaModuleCategory[] CATEGORIES = {
        NexaModuleCategory.HUD,
        NexaModuleCategory.PVP,
        NexaModuleCategory.VISUAL,
        NexaModuleCategory.UTILITY,
        NexaModuleCategory.WORLD,
        NexaModuleCategory.PERFORMANCE
    };

    private final Screen parent;
    private final NexoModuleRegistry modules;
    private final NexoPerformanceController performance;
    private final Map<NexaModuleCategory, Rect> categoryRects = new EnumMap<>(NexaModuleCategory.class);
    private final Map<String, Rect> moduleToggleRects = new LinkedHashMap<>();
    private final Map<String, Rect> moduleSettingsRects = new LinkedHashMap<>();
    private final Map<NexoPerformancePreset, Rect> presetRects = new EnumMap<>(NexoPerformancePreset.class);

    private NexaModuleCategory category = NexaModuleCategory.HUD;
    private NexoModule selectedModule;
    private Rect hudEditorRect;
    private Rect closeRect;

    public NexoMenuScreen(Screen parent, NexoModuleRegistry modules, NexoPerformanceController performance) {
        super(Text.literal("NEXA Control Center"));
        this.parent = parent;
        this.modules = modules;
        this.performance = performance;
        this.selectedModule = firstReady(modules.byCategory(category));
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // image-1.png will be wired here once the final art is supplied.
        // Until then NEXA intentionally uses a neutral, high-contrast backdrop.
        context.fill(0, 0, width, height, NexaTheme.current().backdrop);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        NexaTheme theme = NexaTheme.current();
        Panel panel = panel();

        categoryRects.clear();
        moduleToggleRects.clear();
        moduleSettingsRects.clear();
        presetRects.clear();
        hudEditorRect = null;

        drawPanel(context, panel, theme);
        drawCategoryRail(context, panel, theme, mouseX, mouseY);
        drawHeader(context, panel, theme);

        if (category == NexaModuleCategory.PERFORMANCE) {
            drawPerformance(context, panel, theme, mouseX, mouseY);
        } else {
            drawModules(context, panel, theme, mouseX, mouseY);
        }

        drawDetails(context, panel, theme, mouseX, mouseY);
        super.render(context, mouseX, mouseY, delta);
    }

    private Panel panel() {
        int panelWidth = Math.min(930, Math.max(570, width - 52));
        int panelHeight = Math.min(520, Math.max(360, height - 44));
        return new Panel((width - panelWidth) / 2, (height - panelHeight) / 2, panelWidth, panelHeight);
    }

    private void drawPanel(DrawContext context, Panel panel, NexaTheme theme) {
        context.fill(panel.x, panel.y, panel.right(), panel.bottom(), 0xF00B0F15);
        drawBorder(context, panel.x, panel.y, panel.width, panel.height, 0xFF2E3744);
        context.fill(panel.x + 61, panel.y, panel.x + 62, panel.bottom(), 0xFF222A35);
        context.fill(panel.x + 62, panel.y + 49, panel.right(), panel.y + 50, 0xFF222A35);
        context.fill(panel.x, panel.y, panel.x + 2, panel.bottom(), theme.accent);
    }

    private void drawHeader(DrawContext context, Panel panel, NexaTheme theme) {
        int x = panel.x + 78;
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA"), x, panel.y + 12, theme.text);
        context.drawTextWithShadow(textRenderer, Text.literal("CONTROL CENTER"), x + 34, panel.y + 12, theme.accent);
        context.drawTextWithShadow(textRenderer, Text.literal(categoryLabel(category) + " · " + categoryDescription(category)), x, panel.y + 28, theme.secondary);

        closeRect = new Rect(panel.right() - 32, panel.y + 10, 20, 20);
        boolean hover = closeRect.contains(lastMouseX(), lastMouseY());
        context.fill(closeRect.x, closeRect.y, closeRect.right(), closeRect.bottom(), hover ? 0xFF272F3B : 0xFF171D26);
        drawBorder(context, closeRect.x, closeRect.y, closeRect.width, closeRect.height, 0xFF333E4D);
        context.drawTextWithShadow(textRenderer, Text.literal("×"), closeRect.x + 7, closeRect.y + 5, hover ? theme.text : theme.muted);
    }

    private void drawCategoryRail(DrawContext context, Panel panel, NexaTheme theme, int mouseX, int mouseY) {
        int x = panel.x + 13;
        int y = panel.y + 62;
        for (NexaModuleCategory item : CATEGORIES) {
            Rect rect = new Rect(x, y, 36, 36);
            categoryRects.put(item, rect);
            boolean active = item == category;
            boolean hover = rect.contains(mouseX, mouseY);
            int fill = active ? theme.accentMuted : hover ? 0xFF171E28 : 0x00111111;
            if ((fill >>> 24) != 0) context.fill(rect.x, rect.y, rect.right(), rect.bottom(), fill);
            if (active) drawBorder(context, rect.x, rect.y, rect.width, rect.height, theme.withAlpha(theme.accent, 150));
            drawCategoryIcon(context, item, rect.x + 18, rect.y + 18, active ? theme.accentSoft : hover ? theme.text : theme.muted);
            y += 45;
        }

        if (category == NexaModuleCategory.HUD) {
            hudEditorRect = new Rect(x, panel.bottom() - 50, 36, 36);
            boolean hover = hudEditorRect.contains(mouseX, mouseY);
            context.fill(hudEditorRect.x, hudEditorRect.y, hudEditorRect.right(), hudEditorRect.bottom(), hover ? theme.accentMuted : 0xFF141A22);
            drawBorder(context, hudEditorRect.x, hudEditorRect.y, hudEditorRect.width, hudEditorRect.height, hover ? theme.withAlpha(theme.accent, 150) : 0xFF303A48);
            drawMoveIcon(context, hudEditorRect.x + 18, hudEditorRect.y + 18, hover ? theme.accentSoft : theme.secondary);
        }
    }

    private void drawModules(DrawContext context, Panel panel, NexaTheme theme, int mouseX, int mouseY) {
        int contentLeft = panel.x + 78;
        int detailsWidth = panel.width >= 760 ? 245 : 0;
        int contentRight = panel.right() - 16 - detailsWidth - (detailsWidth > 0 ? 13 : 0);
        int available = contentRight - contentLeft;
        int columns = available >= 440 ? 2 : 1;
        int gap = 9;
        int cardWidth = columns == 2 ? (available - gap) / 2 : available;
        int cardHeight = 58;
        int startY = panel.y + 66;

        List<NexoModule> items = modules.byCategory(category);
        for (int i = 0; i < items.size(); i++) {
            NexoModule module = items.get(i);
            int column = columns == 2 ? i % 2 : 0;
            int row = columns == 2 ? i / 2 : i;
            int x = contentLeft + column * (cardWidth + gap);
            int y = startY + row * (cardHeight + 8);
            if (y + cardHeight > panel.bottom() - 18) break;
            drawModuleCard(context, module, new Rect(x, y, cardWidth, cardHeight), theme, mouseX, mouseY);
        }
    }

    private void drawModuleCard(DrawContext context, NexoModule module, Rect rect, NexaTheme theme, int mouseX, int mouseY) {
        boolean selected = selectedModule == module;
        int fill = selected ? 0xFF171E28 : 0xFF121820;
        context.fill(rect.x, rect.y, rect.right(), rect.bottom(), fill);
        drawBorder(context, rect.x, rect.y, rect.width, rect.height, selected ? theme.withAlpha(theme.accent, 125) : 0xFF29333F);

        context.drawTextWithShadow(textRenderer, Text.literal(module.name()), rect.x + 10, rect.y + 10, module.ready() ? theme.text : theme.muted);
        String description = ellipsize(module.description(), Math.max(18, (rect.width - 92) / 6));
        context.drawTextWithShadow(textRenderer, Text.literal(description), rect.x + 10, rect.y + 27, module.ready() ? theme.secondary : 0xFF536071);
        if (!module.ready()) context.drawTextWithShadow(textRenderer, Text.literal("PRÓXIMAMENTE"), rect.x + 10, rect.y + 42, 0xFF596779);

        Rect toggle = new Rect(rect.right() - 51, rect.y + 10, 35, 17);
        moduleToggleRects.put(module.id(), toggle);
        drawToggle(context, toggle, module.enabled(), module.ready(), theme, toggle.contains(mouseX, mouseY));

        Rect settings = new Rect(rect.right() - 29, rect.bottom() - 25, 18, 18);
        moduleSettingsRects.put(module.id(), settings);
        if (module.ready()) {
            boolean hover = settings.contains(mouseX, mouseY);
            context.fill(settings.x, settings.y, settings.right(), settings.bottom(), hover ? 0xFF252E3A : 0xFF181F29);
            drawSettingsIcon(context, settings.x + 9, settings.y + 9, hover ? theme.accentSoft : theme.muted);
        }
    }

    private void drawPerformance(DrawContext context, Panel panel, NexaTheme theme, int mouseX, int mouseY) {
        int left = panel.x + 78;
        int detailsWidth = panel.width >= 760 ? 245 : 0;
        int right = panel.right() - 16 - detailsWidth - (detailsWidth > 0 ? 13 : 0);
        int widthAvailable = right - left;
        int columns = widthAvailable >= 430 ? 2 : 1;
        int gap = 9;
        int cardWidth = columns == 2 ? (widthAvailable - gap) / 2 : widthAvailable;
        int y0 = panel.y + 66;

        NexoPerformancePreset[] presets = NexoPerformancePreset.values();
        for (int i = 0; i < presets.length; i++) {
            NexoPerformancePreset preset = presets[i];
            int column = columns == 2 ? i % 2 : 0;
            int row = columns == 2 ? i / 2 : i;
            Rect rect = new Rect(left + column * (cardWidth + gap), y0 + row * 66, cardWidth, 57);
            presetRects.put(preset, rect);
            boolean active = performance.selected() == preset;
            boolean hover = rect.contains(mouseX, mouseY);
            context.fill(rect.x, rect.y, rect.right(), rect.bottom(), active ? theme.accentMuted : hover ? 0xFF171E28 : 0xFF121820);
            drawBorder(context, rect.x, rect.y, rect.width, rect.height, active ? theme.withAlpha(theme.accent, 145) : 0xFF29333F);
            context.drawTextWithShadow(textRenderer, Text.literal(preset.displayName()), rect.x + 10, rect.y + 10, active ? theme.accentSoft : theme.text);
            context.drawTextWithShadow(textRenderer, Text.literal(ellipsize(preset.description(), Math.max(20, (rect.width - 20) / 6))), rect.x + 10, rect.y + 27, theme.secondary);
            context.drawTextWithShadow(textRenderer, Text.literal(active ? "ACTIVO" : "APLICAR"), rect.x + 10, rect.y + 42, active ? theme.accent : theme.muted);
        }
    }

    private void drawDetails(DrawContext context, Panel panel, NexaTheme theme, int mouseX, int mouseY) {
        if (panel.width < 760) return;
        int width = 245;
        int x = panel.right() - 16 - width;
        int y = panel.y + 66;
        int h = panel.height - 82;
        context.fill(x, y, x + width, y + h, 0xFF0F141B);
        drawBorder(context, x, y, width, h, 0xFF29333F);

        if (category == NexaModuleCategory.PERFORMANCE) {
            context.drawTextWithShadow(textRenderer, Text.literal("RENDIMIENTO"), x + 13, y + 13, theme.accent);
            context.drawTextWithShadow(textRenderer, Text.literal(performance.selected().displayName()), x + 13, y + 33, theme.text);
            drawWrapped(context, performance.selected().description(), x + 13, y + 51, width - 26, theme.secondary);
            context.drawTextWithShadow(textRenderer, Text.literal("Los presets se aplican al instante y NEXA conserva Minecraft operativo si un ajuste no es compatible."), x + 13, y + 105, theme.muted);
            return;
        }

        NexoModule module = selectedModule;
        if (module == null || module.category() != category) module = firstReady(modules.byCategory(category));
        if (module == null) {
            context.drawTextWithShadow(textRenderer, Text.literal("SIN MÓDULOS"), x + 13, y + 13, theme.muted);
            context.drawTextWithShadow(textRenderer, Text.literal("Esta categoría se irá habilitando por adaptador."), x + 13, y + 33, theme.secondary);
            return;
        }

        context.drawTextWithShadow(textRenderer, Text.literal("AJUSTES"), x + 13, y + 13, theme.accent);
        context.drawTextWithShadow(textRenderer, Text.literal(module.name()), x + 13, y + 33, theme.text);
        drawWrapped(context, module.description(), x + 13, y + 51, width - 26, theme.secondary);

        int rowY = y + 103;
        drawDetailRow(context, x + 13, rowY, width - 26, "Estado", module.ready() ? module.enabled() ? "Activo" : "Inactivo" : "Próximamente", theme);
        rowY += 28;
        drawDetailRow(context, x + 13, rowY, width - 26, "Categoría", categoryLabel(module.category()), theme);
        rowY += 28;
        drawDetailRow(context, x + 13, rowY, width - 26, "HUD", module.hudModule() ? "Posicionable" : "No", theme);

        if (module.hudModule() && module.ready()) {
            var placement = module.placement();
            rowY += 39;
            context.drawTextWithShadow(textRenderer, Text.literal("POSICIÓN"), x + 13, rowY, theme.muted);
            context.drawTextWithShadow(textRenderer, Text.literal(anchorLabel(placement)), x + 13, rowY + 14, theme.secondary);
            Rect editor = new Rect(x + 13, y + h - 42, width - 26, 28);
            boolean hover = editor.contains(mouseX, mouseY);
            context.fill(editor.x, editor.y, editor.right(), editor.bottom(), hover ? theme.accentMuted : 0xFF171E28);
            drawBorder(context, editor.x, editor.y, editor.width, editor.height, hover ? theme.withAlpha(theme.accent, 150) : 0xFF303A48);
            drawMoveIcon(context, editor.x + 16, editor.y + 14, hover ? theme.accentSoft : theme.secondary);
            context.drawTextWithShadow(textRenderer, Text.literal("EDITAR HUD"), editor.x + 31, editor.y + 10, hover ? theme.text : theme.secondary);
            moduleSettingsRects.put("__hud_editor", editor);
        }
    }

    private void drawDetailRow(DrawContext context, int x, int y, int width, String label, String value, NexaTheme theme) {
        context.fill(x, y, x + width, y + 23, 0xFF141A22);
        context.drawTextWithShadow(textRenderer, Text.literal(label), x + 7, y + 8, theme.muted);
        int valueWidth = textRenderer.getWidth(value);
        context.drawTextWithShadow(textRenderer, Text.literal(value), x + width - valueWidth - 7, y + 8, theme.secondary);
    }

    private void drawToggle(DrawContext context, Rect rect, boolean enabled, boolean ready, NexaTheme theme, boolean hover) {
        int fill = !ready ? 0xFF1A2029 : enabled ? theme.accent : hover ? 0xFF303947 : 0xFF252D38;
        context.fill(rect.x, rect.y, rect.right(), rect.bottom(), fill);
        int knob = enabled && ready ? rect.right() - 14 : rect.x + 3;
        context.fill(knob, rect.y + 3, knob + 11, rect.bottom() - 3, ready ? 0xFFF4F7FC : 0xFF667284);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0) return super.mouseClicked(mouseX, mouseY, button);
        if (closeRect != null && closeRect.contains(mouseX, mouseY)) { close(); return true; }

        for (var entry : categoryRects.entrySet()) {
            if (entry.getValue().contains(mouseX, mouseY)) {
                category = entry.getKey();
                selectedModule = firstReady(modules.byCategory(category));
                return true;
            }
        }

        if (hudEditorRect != null && hudEditorRect.contains(mouseX, mouseY)) {
            openHudEditor();
            return true;
        }

        Rect detailEditor = moduleSettingsRects.get("__hud_editor");
        if (detailEditor != null && detailEditor.contains(mouseX, mouseY)) {
            openHudEditor();
            return true;
        }

        for (var entry : moduleSettingsRects.entrySet()) {
            if (entry.getKey().startsWith("__")) continue;
            if (!entry.getValue().contains(mouseX, mouseY)) continue;
            NexoModule module = modules.get(entry.getKey());
            if (module != null && module.ready()) selectedModule = module;
            return true;
        }

        for (var entry : moduleToggleRects.entrySet()) {
            if (!entry.getValue().contains(mouseX, mouseY)) continue;
            NexoModule module = modules.get(entry.getKey());
            if (module != null && module.ready()) {
                module.toggle();
                selectedModule = module;
                NexaInGameSettings.save(modules);
            }
            return true;
        }

        for (var entry : presetRects.entrySet()) {
            if (!entry.getValue().contains(mouseX, mouseY)) continue;
            if (client != null) performance.applyNow(client, entry.getKey());
            else performance.select(entry.getKey());
            return true;
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void openHudEditor() {
        if (client != null) client.setScreen(new NexaHudEditorScreen(this, modules));
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

    private int lastMouseX() { return 0; }
    private int lastMouseY() { return 0; }

    private static NexoModule firstReady(List<NexoModule> items) {
        for (NexoModule item : items) if (item.ready()) return item;
        return items.isEmpty() ? null : items.get(0);
    }

    private static String categoryLabel(NexaModuleCategory category) {
        return switch (category) {
            case HUD -> "HUD";
            case PVP -> "PVP";
            case VISUAL -> "VISUAL";
            case UTILITY -> "UTILIDAD";
            case WORLD -> "MUNDO";
            case PERFORMANCE -> "RENDIMIENTO";
        };
    }

    private static String categoryDescription(NexaModuleCategory category) {
        return switch (category) {
            case HUD -> "información y overlays";
            case PVP -> "combate y respuesta";
            case VISUAL -> "presentación y cámara";
            case UTILITY -> "herramientas de juego";
            case WORLD -> "navegación y mundo";
            case PERFORMANCE -> "presets y optimización";
        };
    }

    private static String anchorLabel(NexaHudPlacement placement) {
        return placement.anchor().name().replace('_', ' ') + " · " + Math.round(placement.scale() * 100) + "%";
    }

    private static String ellipsize(String value, int max) {
        if (value == null) return "";
        if (value.length() <= max) return value;
        return value.substring(0, Math.max(1, max - 1)) + "…";
    }

    private void drawWrapped(DrawContext context, String value, int x, int y, int maxWidth, int color) {
        List<net.minecraft.text.OrderedText> lines = textRenderer.wrapLines(Text.literal(value), maxWidth);
        int lineY = y;
        for (int i = 0; i < Math.min(lines.size(), 3); i++) {
            context.drawTextWithShadow(textRenderer, lines.get(i), x, lineY, color);
            lineY += 11;
        }
    }

    private static void drawBorder(DrawContext context, int x, int y, int w, int h, int color) {
        context.fill(x, y, x + w, y + 1, color);
        context.fill(x, y + h - 1, x + w, y + h, color);
        context.fill(x, y, x + 1, y + h, color);
        context.fill(x + w - 1, y, x + w, y + h, color);
    }

    private static void drawCategoryIcon(DrawContext context, NexaModuleCategory category, int cx, int cy, int color) {
        switch (category) {
            case HUD -> {
                context.fill(cx - 7, cy - 5, cx + 8, cy - 4, color);
                context.fill(cx - 7, cy + 5, cx + 8, cy + 6, color);
                context.fill(cx - 7, cy - 5, cx - 6, cy + 6, color);
                context.fill(cx + 7, cy - 5, cx + 8, cy + 6, color);
                context.fill(cx - 3, cy, cx + 4, cy + 1, color);
            }
            case PVP -> {
                context.fill(cx - 8, cy, cx - 2, cy + 1, color);
                context.fill(cx + 3, cy, cx + 9, cy + 1, color);
                context.fill(cx, cy - 8, cx + 1, cy - 2, color);
                context.fill(cx, cy + 3, cx + 1, cy + 9, color);
                context.fill(cx - 2, cy - 2, cx + 3, cy + 3, color);
            }
            case VISUAL -> {
                context.fill(cx - 8, cy, cx - 4, cy + 1, color);
                context.fill(cx + 5, cy, cx + 9, cy + 1, color);
                context.fill(cx - 5, cy - 3, cx + 6, cy - 2, color);
                context.fill(cx - 5, cy + 3, cx + 6, cy + 4, color);
                context.fill(cx, cy - 1, cx + 2, cy + 2, color);
            }
            case UTILITY -> {
                context.fill(cx - 8, cy - 5, cx + 9, cy - 4, color);
                context.fill(cx - 8, cy, cx + 9, cy + 1, color);
                context.fill(cx - 8, cy + 5, cx + 9, cy + 6, color);
                context.fill(cx - 3, cy - 7, cx - 1, cy - 2, color);
                context.fill(cx + 3, cy - 2, cx + 5, cy + 3, color);
                context.fill(cx - 1, cy + 3, cx + 1, cy + 8, color);
            }
            case WORLD -> {
                context.fill(cx - 1, cy - 8, cx + 2, cy + 8, color);
                context.fill(cx - 5, cy - 5, cx + 6, cy + 6, 0x00000000);
                context.fill(cx - 4, cy - 4, cx + 5, cy - 3, color);
                context.fill(cx - 4, cy + 3, cx + 5, cy + 4, color);
                context.fill(cx - 4, cy - 4, cx - 3, cy + 4, color);
                context.fill(cx + 4, cy - 4, cx + 5, cy + 4, color);
            }
            case PERFORMANCE -> {
                context.fill(cx - 7, cy + 2, cx - 4, cy + 7, color);
                context.fill(cx - 1, cy - 2, cx + 2, cy + 7, color);
                context.fill(cx + 5, cy - 7, cx + 8, cy + 7, color);
            }
        }
    }

    private static void drawSettingsIcon(DrawContext context, int cx, int cy, int color) {
        context.fill(cx - 1, cy - 6, cx + 2, cy + 7, color);
        context.fill(cx - 6, cy - 1, cx + 7, cy + 2, color);
        context.fill(cx - 4, cy - 4, cx - 2, cy - 2, color);
        context.fill(cx + 3, cy - 4, cx + 5, cy - 2, color);
        context.fill(cx - 4, cy + 3, cx - 2, cy + 5, color);
        context.fill(cx + 3, cy + 3, cx + 5, cy + 5, color);
        context.fill(cx - 1, cy - 1, cx + 2, cy + 2, 0xFF11161E);
    }

    private static void drawMoveIcon(DrawContext context, int cx, int cy, int color) {
        context.fill(cx - 7, cy, cx + 8, cy + 1, color);
        context.fill(cx, cy - 7, cx + 1, cy + 8, color);
        context.fill(cx - 7, cy - 2, cx - 4, cy + 3, color);
        context.fill(cx + 5, cy - 2, cx + 8, cy + 3, color);
        context.fill(cx - 2, cy - 7, cx + 3, cy - 4, color);
        context.fill(cx - 2, cy + 5, cx + 3, cy + 8, color);
    }

    private record Panel(int x, int y, int width, int height) {
        int right() { return x + width; }
        int bottom() { return y + height; }
    }

    private record Rect(int x, int y, int width, int height) {
        int right() { return x + width; }
        int bottom() { return y + height; }
        boolean contains(double px, double py) { return px >= x && px <= right() && py >= y && py <= bottom(); }
    }
}
