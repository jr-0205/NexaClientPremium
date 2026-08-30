package com.nexoclient.ingame;

import com.nexoclient.ingame.core.modules.NexaModuleCatalog;
import com.nexoclient.ingame.core.modules.NexaModuleCategory;
import com.nexoclient.ingame.modules.NexoModule;
import com.nexoclient.ingame.modules.NexoModuleRegistry;
import com.nexoclient.ingame.performance.NexoPerformanceController;
import com.nexoclient.ingame.performance.NexoPerformancePreset;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.text.Text;

import java.util.ArrayList;
import java.util.List;

/**
 * NEXA Control Center.
 *
 * The composition is inspired by the information architecture expected from a
 * competitive Minecraft client (top navigation, category filters, module
 * cards and explicit enabled/disabled state), while the visual system remains
 * original to NEXA Nordic Atelier.
 */
public final class NexoMenuScreen extends Screen {
    private static final int BG = 0xF205080D;
    private static final int HEADER = 0xF20A0F16;
    private static final int RAIL = 0xED090E15;
    private static final int PANEL = 0xE8141B24;
    private static final int PANEL_HOVER = 0xF01A2532;
    private static final int BORDER = 0xFF2B394B;
    private static final int BORDER_ACTIVE = 0xFF4B7BC2;
    private static final int TEXT = 0xFFE8EEF7;
    private static final int SECONDARY = 0xFFAAB6C7;
    private static final int MUTED = 0xFF6F7E91;
    private static final int BLUE = 0xFF7FAEFF;
    private static final int BLUE_STRONG = 0xFF477FE8;
    private static final int GREEN = 0xFF24A866;
    private static final int RED = 0xFFB7284F;
    private static final int DISABLED = 0xFF495465;

    private static final int HEADER_H = 58;
    private static final int RAIL_W = 184;
    private static final String[] CATEGORY_LABELS = { "ALL", "HUD", "PVP", "VISUAL", "UTILITY", "WORLD" };
    private static final NexaModuleCategory[] CATEGORY_VALUES = {
        null,
        NexaModuleCategory.HUD,
        NexaModuleCategory.PVP,
        NexaModuleCategory.VISUAL,
        NexaModuleCategory.UTILITY,
        NexaModuleCategory.WORLD
    };

    private final Screen parent;
    private final NexoModuleRegistry modules;
    private final NexoPerformanceController performance;
    private NexaModuleCategory selectedCategory;
    private int page;

    public NexoMenuScreen(Screen parent, NexoModuleRegistry modules, NexoPerformanceController performance) {
        super(Text.literal("NEXA Client"));
        this.parent = parent;
        this.modules = modules;
        this.performance = performance;
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        // Avoid Screen#renderBackground to prevent double-blur conflicts with
        // Sodium/other UI mods on 1.21.x.
        context.fill(0, 0, width, height, BG);
        context.fill(0, 0, width, HEADER_H, HEADER);
        context.fill(0, HEADER_H, RAIL_W, height, RAIL);
        context.fill(RAIL_W - 1, HEADER_H, RAIL_W, height, 0xFF1D2938);
        context.fill(0, HEADER_H - 1, width, HEADER_H, 0xFF243142);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        renderHeader(context, mouseX, mouseY);
        renderPerformanceRail(context, mouseX, mouseY);
        renderCategories(context, mouseX, mouseY);
        renderModuleGrid(context, mouseX, mouseY);
        renderFooter(context, mouseX, mouseY);
    }

    private void renderHeader(DrawContext context, int mouseX, int mouseY) {
        drawNexaMark(context, 15, 13, 30);
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA"), 54, 17, TEXT);
        context.drawTextWithShadow(textRenderer, Text.literal("CLIENT"), 54, 31, BLUE);

        int tabX = 212;
        drawTopTab(context, mouseX, mouseY, tabX, "MODS", true);
        drawTopTab(context, mouseX, mouseY, tabX + 92, "HUD", selectedCategory == NexaModuleCategory.HUD);
        drawTopTab(context, mouseX, mouseY, tabX + 184, "PERFORMANCE", false);

        int closeX = width - 43;
        boolean closeHover = inside(mouseX, mouseY, closeX, 12, 30, 30);
        context.fill(closeX, 12, closeX + 30, 42, closeHover ? 0xFF263548 : 0xFF151D27);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("×"), closeX + 15, 22, closeHover ? 0xFFFFFFFF : SECONDARY);
    }

    private void drawTopTab(DrawContext context, int mouseX, int mouseY, int x, String label, boolean active) {
        int w = label.equals("PERFORMANCE") ? 118 : 78;
        boolean hover = inside(mouseX, mouseY, x, 12, w, 32);
        int border = active ? BORDER_ACTIVE : BORDER;
        context.fill(x, 12, x + w, 44, border);
        context.fill(x + 1, 13, x + w - 1, 43, active ? 0xFF18283E : (hover ? PANEL_HOVER : 0xFF111820));
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(label), x + w / 2, 24, active ? 0xFFFFFFFF : SECONDARY);
    }

    private void renderPerformanceRail(DrawContext context, int mouseX, int mouseY) {
        int x = 12;
        int y = 78;
        context.drawTextWithShadow(textRenderer, Text.literal("PERFORMANCE"), x, y, BLUE);
        context.drawTextWithShadow(textRenderer, Text.literal("Perfil gráfico de NEXA"), x, y + 13, MUTED);

        y += 34;
        for (NexoPerformancePreset preset : NexoPerformancePreset.values()) {
            boolean active = performance.selected() == preset;
            boolean hover = inside(mouseX, mouseY, 10, y, RAIL_W - 20, 30);
            context.fill(10, y, RAIL_W - 10, y + 30, active ? BORDER_ACTIVE : (hover ? BORDER : 0xFF151E29));
            context.fill(11, y + 1, RAIL_W - 11, y + 29, active ? 0xFF162943 : (hover ? 0xFF121C28 : 0xFF0E151E));
            context.drawTextWithShadow(textRenderer, Text.literal(preset.displayName()), 19, y + 6, active ? TEXT : SECONDARY);
            if (active) context.fill(RAIL_W - 18, y + 11, RAIL_W - 13, y + 16, BLUE);
            y += 35;
        }

        int infoY = Math.max(y + 20, height - 116);
        context.drawTextWithShadow(textRenderer, Text.literal("CONTROL CENTER"), x, infoY, BLUE);
        context.drawTextWithShadow(textRenderer, Text.literal("Right Shift"), x, infoY + 16, TEXT);
        context.drawTextWithShadow(textRenderer, Text.literal("No pausa la partida"), x, infoY + 30, MUTED);
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA Core · 1.21.1"), x, height - 18, 0xFF526175);
    }

    private void renderCategories(DrawContext context, int mouseX, int mouseY) {
        int x = RAIL_W + 18;
        int y = HEADER_H + 17;
        context.drawTextWithShadow(textRenderer, Text.literal("MODULE LIBRARY"), x, y, TEXT);
        context.drawTextWithShadow(textRenderer, Text.literal("Activa sólo lo que necesitas"), x + 104, y, MUTED);
        y += 22;

        for (int index = 0; index < CATEGORY_LABELS.length; index++) {
            String label = CATEGORY_LABELS[index];
            int w = 48 + Math.max(0, label.length() - 3) * 6;
            boolean active = selectedCategory == CATEGORY_VALUES[index];
            boolean hover = inside(mouseX, mouseY, x, y, w, 24);
            context.fill(x, y, x + w, y + 24, active ? BLUE_STRONG : (hover ? BORDER : 0xFF1A2330));
            context.drawCenteredTextWithShadow(textRenderer, Text.literal(label), x + w / 2, y + 8, active ? 0xFFFFFFFF : SECONDARY);
            x += w + 7;
        }
    }

    private void renderModuleGrid(DrawContext context, int mouseX, int mouseY) {
        List<NexoModule> filtered = filteredModules();
        int gridX = RAIL_W + 18;
        int gridY = HEADER_H + 74;
        int usableWidth = Math.max(220, width - gridX - 18);
        int columns = usableWidth >= 790 ? 3 : (usableWidth >= 510 ? 2 : 1);
        int gap = 12;
        int cardWidth = (usableWidth - (columns - 1) * gap) / columns;
        int availableHeight = Math.max(210, height - gridY - 48);
        int cardHeight = Math.max(116, Math.min(178, (availableHeight - gap) / 2));
        int cardsPerPage = columns * 2;
        int pages = Math.max(1, (filtered.size() + cardsPerPage - 1) / cardsPerPage);
        if (page >= pages) page = pages - 1;

        int from = page * cardsPerPage;
        int to = Math.min(filtered.size(), from + cardsPerPage);
        for (int local = 0; from + local < to; local++) {
            NexoModule module = filtered.get(from + local);
            int column = local % columns;
            int row = local / columns;
            int x = gridX + column * (cardWidth + gap);
            int y = gridY + row * (cardHeight + gap);
            drawModuleCard(context, mouseX, mouseY, module, x, y, cardWidth, cardHeight);
        }

        if (filtered.isEmpty()) {
            int centerX = gridX + usableWidth / 2;
            context.drawCenteredTextWithShadow(textRenderer, Text.literal("No hay módulos en esta categoría."), centerX, gridY + 58, SECONDARY);
        }

        if (pages > 1) {
            int navY = height - 31;
            int centerX = gridX + usableWidth / 2;
            drawPager(context, mouseX, mouseY, centerX - 78, navY, "‹", page > 0);
            context.drawCenteredTextWithShadow(textRenderer, Text.literal((page + 1) + " / " + pages), centerX, navY + 7, MUTED);
            drawPager(context, mouseX, mouseY, centerX + 54, navY, "›", page + 1 < pages);
        }
    }

    private void drawModuleCard(DrawContext context, int mouseX, int mouseY, NexoModule module, int x, int y, int w, int h) {
        boolean hover = inside(mouseX, mouseY, x, y, w, h);
        int border = hover ? BORDER_ACTIVE : BORDER;
        context.fill(x, y, x + w, y + h, border);
        context.fill(x + 1, y + 1, x + w - 1, y + h - 1, hover ? PANEL_HOVER : PANEL);

        int badgeSize = Math.min(42, Math.max(30, h / 4));
        context.fill(x + 14, y + 14, x + 14 + badgeSize, y + 14 + badgeSize, 0xFF0A1018);
        String badge = abbreviation(module.name());
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(badge), x + 14 + badgeSize / 2, y + 14 + badgeSize / 2 - 4, module.ready() ? BLUE : MUTED);

        context.drawTextWithShadow(textRenderer, Text.literal(module.name()), x + 14, y + 22 + badgeSize, module.ready() ? TEXT : SECONDARY);
        String description = trim(module.description(), Math.max(18, (w - 28) / 7));
        context.drawTextWithShadow(textRenderer, Text.literal(description), x + 14, y + 38 + badgeSize, MUTED);

        int optionsY = y + h - 43;
        context.fill(x + 1, optionsY, x + w - 1, optionsY + 22, 0xFF17202A);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(module.ready() ? "OPTIONS" : "IN DEVELOPMENT"), x + w / 2, optionsY + 7, module.ready() ? SECONDARY : MUTED);

        int stateY = y + h - 20;
        int stateColor = !module.ready() ? DISABLED : (module.enabled() ? GREEN : RED);
        context.fill(x + 1, stateY, x + w - 1, y + h - 1, stateColor);
        String state = !module.ready() ? "COMING SOON" : (module.enabled() ? "ENABLED" : "DISABLED");
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(state), x + w / 2, stateY + 6, 0xFFFFFFFF);
    }

    private void renderFooter(DrawContext context, int mouseX, int mouseY) {
        int count = filteredModules().size();
        String label = count + (count == 1 ? " module" : " modules");
        int x = width - textRenderer.getWidth(label) - 14;
        context.drawTextWithShadow(textRenderer, Text.literal(label), x, height - 18, 0xFF5D6D81);
    }

    private void drawPager(DrawContext context, int mouseX, int mouseY, int x, int y, String label, boolean active) {
        boolean hover = active && inside(mouseX, mouseY, x, y, 24, 22);
        context.fill(x, y, x + 24, y + 22, active ? (hover ? BORDER_ACTIVE : BORDER) : 0xFF151B23);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(label), x + 12, y + 7, active ? TEXT : 0xFF465365);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0) return super.mouseClicked(mouseX, mouseY, button);

        if (inside(mouseX, mouseY, width - 43, 12, 30, 30)) {
            close();
            return true;
        }

        // Top tabs.
        if (inside(mouseX, mouseY, 212, 12, 78, 32)) {
            selectedCategory = null;
            page = 0;
            return true;
        }
        if (inside(mouseX, mouseY, 304, 12, 78, 32)) {
            selectedCategory = NexaModuleCategory.HUD;
            page = 0;
            return true;
        }

        // Performance presets in left rail.
        int presetY = 112;
        for (NexoPerformancePreset preset : NexoPerformancePreset.values()) {
            if (inside(mouseX, mouseY, 10, presetY, RAIL_W - 20, 30)) {
                if (client != null) performance.applyNow(client, preset);
                else performance.select(preset);
                return true;
            }
            presetY += 35;
        }

        // Category chips.
        int categoryX = RAIL_W + 18;
        int categoryY = HEADER_H + 39;
        for (int index = 0; index < CATEGORY_LABELS.length; index++) {
            String label = CATEGORY_LABELS[index];
            int w = 48 + Math.max(0, label.length() - 3) * 6;
            if (inside(mouseX, mouseY, categoryX, categoryY, w, 24)) {
                selectedCategory = CATEGORY_VALUES[index];
                page = 0;
                return true;
            }
            categoryX += w + 7;
        }

        // Module cards and pagination.
        List<NexoModule> filtered = filteredModules();
        int gridX = RAIL_W + 18;
        int gridY = HEADER_H + 74;
        int usableWidth = Math.max(220, width - gridX - 18);
        int columns = usableWidth >= 790 ? 3 : (usableWidth >= 510 ? 2 : 1);
        int gap = 12;
        int cardWidth = (usableWidth - (columns - 1) * gap) / columns;
        int availableHeight = Math.max(210, height - gridY - 48);
        int cardHeight = Math.max(116, Math.min(178, (availableHeight - gap) / 2));
        int cardsPerPage = columns * 2;
        int pages = Math.max(1, (filtered.size() + cardsPerPage - 1) / cardsPerPage);
        int from = page * cardsPerPage;
        int to = Math.min(filtered.size(), from + cardsPerPage);

        for (int local = 0; from + local < to; local++) {
            int column = local % columns;
            int row = local / columns;
            int x = gridX + column * (cardWidth + gap);
            int y = gridY + row * (cardHeight + gap);
            if (!inside(mouseX, mouseY, x, y, cardWidth, cardHeight)) continue;
            NexoModule module = filtered.get(from + local);
            if (module.ready()) module.toggle();
            return true;
        }

        if (pages > 1) {
            int navY = height - 31;
            int centerX = gridX + usableWidth / 2;
            if (page > 0 && inside(mouseX, mouseY, centerX - 78, navY, 24, 22)) {
                page--;
                return true;
            }
            if (page + 1 < pages && inside(mouseX, mouseY, centerX + 54, navY, 24, 22)) {
                page++;
                return true;
            }
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private List<NexoModule> filteredModules() {
        if (selectedCategory == null) return modules.all();
        List<NexoModule> result = new ArrayList<>();
        for (NexoModule module : modules.all()) {
            var spec = NexaModuleCatalog.find(module.id());
            if (spec != null && spec.category() == selectedCategory) result.add(module);
        }
        return result;
    }

    private static String abbreviation(String name) {
        String compact = name.replace("/", " ").replace("-", " ").trim();
        String[] parts = compact.split("\\s+");
        if (parts.length >= 2) return (parts[0].substring(0, 1) + parts[1].substring(0, 1)).toUpperCase();
        return compact.substring(0, Math.min(3, compact.length())).toUpperCase();
    }

    private static String trim(String value, int max) {
        if (value == null || value.length() <= max) return value == null ? "" : value;
        return value.substring(0, Math.max(1, max - 1)) + "…";
    }

    private static void drawNexaMark(DrawContext context, int x, int y, int size) {
        int t = Math.max(3, size / 9);
        context.fill(x, y, x + t, y + size, BLUE);
        context.fill(x + size - t, y, x + size, y + size, BLUE);
        int usable = size - t;
        int steps = Math.max(6, usable / Math.max(2, t / 2));
        for (int i = 0; i <= steps; i++) {
            int px = x + (usable * i) / steps;
            int py = y + (usable * i) / steps;
            context.fill(px, py, Math.min(x + size, px + t), Math.min(y + size, py + t), BLUE);
        }
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int w, int h) {
        return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
    }

    @Override
    public void close() {
        if (client != null) client.setScreen(parent);
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
