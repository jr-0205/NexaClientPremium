package com.nexoclient.ingame;

import net.fabricmc.loader.api.FabricLoader;
import net.minecraft.client.gui.DrawContext;
import net.minecraft.client.gui.screen.Screen;
import net.minecraft.client.gui.screen.multiplayer.MultiplayerScreen;
import net.minecraft.client.gui.screen.option.OptionsScreen;
import net.minecraft.client.gui.screen.world.SelectWorldScreen;
import net.minecraft.text.Text;
import net.minecraft.util.Identifier;
import net.minecraft.util.Util;

/**
 * NEXA main menu for Minecraft 1.21.1.
 *
 * This screen intentionally avoids an RGB-heavy aesthetic. Its composition is
 * minimal: account status in the top-left, exit in the top-right, a centered
 * NEXA identity block, three primary actions, and a compact utility dock.
 */
public final class NexaTitleScreen extends Screen {
    private static final Identifier NEXA_MARK = Identifier.of("nexo_ingame", "textures/gui/nexa_mark.png");
    private static final int MARK_TEXTURE_WIDTH = 1199;
    private static final int MARK_TEXTURE_HEIGHT = 1312;

    private static final String GITHUB_URL = "https://github.com/jr-0205/NexaClientPremium";

    private static final int BG = 0xFF071017;
    private static final int PANEL = 0xC7131A20;
    private static final int PANEL_HOVER = 0xE51B252D;
    private static final int PANEL_ACTIVE = 0xE524303A;
    private static final int BORDER = 0xB05E6D78;
    private static final int BORDER_SOFT = 0x70455360;
    private static final int TEXT = 0xFFF2F5F7;
    private static final int MUTED = 0xFF9AA8B3;
    private static final int DIM = 0xFF697884;
    private static final int ICE = 0xFFB8CBD8;
    private static final int STATUS = 0xFF88AFC8;

    private int centerX;
    private int mainX;
    private int mainY;
    private int mainWidth;
    private int mainHeight;
    private int mainGap;
    private int dockY;
    private int dockSize;
    private int dockGap;
    private long noticeUntil;
    private String notice;

    public NexaTitleScreen() {
        super(Text.literal("NEXA Client"));
    }

    @Override
    protected void init() {
        centerX = width / 2;
        mainWidth = Math.min(292, Math.max(224, width / 4));
        mainHeight = 24;
        mainGap = 7;
        mainX = centerX - mainWidth / 2;
        mainY = Math.max(210, height / 2 - 6);
        dockSize = 25;
        dockGap = 8;
        dockY = height - 48;
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        context.fill(0, 0, width, height, BG);

        // Abstract pre-blurred scenery placeholder. The final selected wallpaper
        // can replace only this layer without changing the UI composition.
        context.fill(0, 0, width, height / 3, 0xFF112D3B);
        context.fill(0, height / 3, width, (height * 2) / 3, 0xFF18333F);
        context.fill(0, (height * 2) / 3, width, height, 0xFF0C1820);

        drawBlurBlock(context, -80, height / 4, width / 3, height / 2, 0x77202C31);
        drawBlurBlock(context, width / 6, height / 3, width / 4, height / 3, 0x664C584F);
        drawBlurBlock(context, width * 3 / 5, height / 3, width / 5, height / 2, 0x665C5949);
        drawBlurBlock(context, width * 4 / 5, height / 5, width / 4, height / 2, 0x66434F55);

        // Soft moon / distant light, deliberately desaturated.
        int moon = Math.max(46, Math.min(86, width / 18));
        int moonX = centerX - moon / 2;
        int moonY = Math.max(40, height / 10);
        for (int i = 5; i >= 1; i--) {
            int spread = i * 9;
            int alpha = 0x08 + (6 - i) * 0x05;
            context.fill(moonX - spread, moonY - spread, moonX + moon + spread, moonY + moon + spread, (alpha << 24) | 0xD7E1E7);
        }
        context.fill(moonX, moonY, moonX + moon, moonY + moon, 0x99DCE5EA);

        // Global veil and vignette. This is the layer that gives the screenshot-
        // style blurred/diffused look without loading Minecraft's blur twice.
        context.fill(0, 0, width, height, 0x6603070A);
        context.fill(0, 0, width, Math.max(42, height / 8), 0x52000000);
        context.fill(0, height - Math.max(70, height / 7), width, height, 0x60000000);
        context.fill(0, 0, Math.max(55, width / 9), height, 0x35000000);
        context.fill(width - Math.max(55, width / 9), 0, width, height, 0x35000000);
    }

    private static void drawBlurBlock(DrawContext context, int x, int y, int w, int h, int color) {
        context.fill(x - 36, y - 36, x + w + 36, y + h + 36, color & 0x33FFFFFF);
        context.fill(x - 22, y - 22, x + w + 22, y + h + 22, color & 0x55FFFFFF);
        context.fill(x - 10, y - 10, x + w + 10, y + h + 10, color & 0x77FFFFFF);
        context.fill(x, y, x + w, y + h, color);
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);

        drawAccountPreview(context, mouseX, mouseY);
        drawCloseButton(context, mouseX, mouseY);
        drawCenteredBrand(context);

        drawMainButton(context, mouseX, mouseY, 0, "UN JUGADOR");
        drawMainButton(context, mouseX, mouseY, 1, "MULTIJUGADOR");
        drawMainButton(context, mouseX, mouseY, 2, "NEXA EN GITHUB");

        drawDock(context, mouseX, mouseY);

        context.drawTextWithShadow(textRenderer, Text.literal("NEXA Client · Fabric 1.21.1"), 12, height - 16, 0xFF6B7881);

        if (notice != null && System.currentTimeMillis() < noticeUntil) {
            int noticeWidth = textRenderer.getWidth(notice) + 20;
            int x = centerX - noticeWidth / 2;
            int y = dockY - 30;
            context.fill(x, y, x + noticeWidth, y + 20, 0xE30B1116);
            context.fill(x, y, x + noticeWidth, y + 1, BORDER);
            context.drawCenteredTextWithShadow(textRenderer, Text.literal(notice), centerX, y + 6, TEXT);
        }
    }

    private void drawAccountPreview(DrawContext context, int mouseX, int mouseY) {
        int x = 12;
        int y = 12;
        int w = Math.min(188, Math.max(148, width / 7));
        int h = 38;
        boolean hover = inside(mouseX, mouseY, x, y, w, h);

        context.fill(x, y, x + w, y + h, hover ? PANEL_HOVER : PANEL);
        context.fill(x, y, x + w, y + 1, BORDER_SOFT);
        context.fill(x, y, x + 1, y + h, BORDER_SOFT);

        drawNexaMark(context, x + 8, y + 7, 24);

        String username = "NEXA USER";
        String status = "MICROSOFT ID PENDIENTE";
        if (client != null && client.getSession() != null) {
            username = client.getSession().getUsername();
            if (client.getSession().getClientId().isPresent()) {
                status = "MICROSOFT ACTIVO";
            }
        }

        context.drawTextWithShadow(textRenderer, Text.literal(username), x + 40, y + 8, TEXT);
        context.drawTextWithShadow(textRenderer, Text.literal(status), x + 40, y + 22, status.contains("ACTIVO") ? STATUS : MUTED);
    }

    private void drawCloseButton(DrawContext context, int mouseX, int mouseY) {
        int size = 24;
        int x = width - size - 12;
        int y = 12;
        boolean hover = inside(mouseX, mouseY, x, y, size, size);
        context.fill(x, y, x + size, y + size, hover ? 0xD83A4248 : 0xA8242B30);
        context.fill(x, y, x + size, y + 1, hover ? 0xFF8D9BA6 : BORDER_SOFT);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("X"), x + size / 2, y + 8, TEXT);
    }

    private void drawCenteredBrand(DrawContext context) {
        int markHeight = Math.min(76, Math.max(58, height / 10));
        int markWidth = Math.max(1, Math.round(markHeight * (MARK_TEXTURE_WIDTH / (float)MARK_TEXTURE_HEIGHT)));
        int markX = centerX - markWidth / 2;
        int markY = Math.max(72, mainY - 132);
        drawNexaMark(context, markX, markY, markHeight);

        int titleY = markY + markHeight + 10;
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("N E X A   C L I E N T"), centerX, titleY, TEXT);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("MINECRAFT · NORDIC INTERFACE"), centerX, titleY + 15, ICE);
    }

    private void drawMainButton(DrawContext context, int mouseX, int mouseY, int index, String label) {
        int y = mainY + index * (mainHeight + mainGap);
        boolean hover = inside(mouseX, mouseY, mainX, y, mainWidth, mainHeight);
        int fill = hover ? PANEL_HOVER : PANEL;

        context.fill(mainX, y, mainX + mainWidth, y + mainHeight, BORDER_SOFT);
        context.fill(mainX + 1, y + 1, mainX + mainWidth - 1, y + mainHeight - 1, fill);
        if (hover) {
            context.fill(mainX + 1, y + mainHeight - 2, mainX + mainWidth - 1, y + mainHeight - 1, ICE);
        }
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(label), centerX, y + 8, hover ? TEXT : 0xFFD5DDE2);
    }

    private void drawDock(DrawContext context, int mouseX, int mouseY) {
        int totalWidth = dockSize * 3 + dockGap * 2;
        int startX = centerX - totalWidth / 2;
        String[] tips = { "NEXA MODS", "MODS", "OPCIONES" };

        for (int i = 0; i < 3; i++) {
            int x = startX + i * (dockSize + dockGap);
            boolean hover = inside(mouseX, mouseY, x, dockY, dockSize, dockSize);
            context.fill(x, dockY, x + dockSize, dockY + dockSize, hover ? PANEL_ACTIVE : PANEL);
            context.fill(x, dockY, x + dockSize, dockY + 1, hover ? ICE : BORDER_SOFT);
            context.fill(x, dockY, x + 1, dockY + dockSize, BORDER_SOFT);

            if (i == 0) drawDockN(context, x, dockY, dockSize);
            else if (i == 1) drawDockGrid(context, x, dockY, dockSize);
            else drawDockSliders(context, x, dockY, dockSize);

            if (hover) drawTooltip(context, tips[i], x + dockSize / 2, dockY - 18);
        }
    }

    private void drawDockN(DrawContext context, int x, int y, int size) {
        drawNexaMark(context, x + 7, y + 5, size - 10);
    }

    private void drawDockGrid(DrawContext context, int x, int y, int size) {
        int s = 5;
        int left = x + 7;
        int top = y + 7;
        int gap = 3;
        context.fill(left, top, left + s, top + s, ICE);
        context.fill(left + s + gap, top, left + s * 2 + gap, top + s, ICE);
        context.fill(left, top + s + gap, left + s, top + s * 2 + gap, ICE);
        context.fill(left + s + gap, top + s + gap, left + s * 2 + gap, top + s * 2 + gap, ICE);
    }

    private void drawDockSliders(DrawContext context, int x, int y, int size) {
        int left = x + 6;
        int right = x + size - 6;
        int y1 = y + 7;
        int y2 = y + 12;
        int y3 = y + 17;
        context.fill(left, y1, right, y1 + 1, ICE);
        context.fill(left, y2, right, y2 + 1, ICE);
        context.fill(left, y3, right, y3 + 1, ICE);
        context.fill(left + 4, y1 - 2, left + 6, y1 + 3, TEXT);
        context.fill(right - 7, y2 - 2, right - 5, y2 + 3, TEXT);
        context.fill(left + 8, y3 - 2, left + 10, y3 + 3, TEXT);
    }

    private void drawTooltip(DrawContext context, String text, int anchorX, int y) {
        int w = textRenderer.getWidth(text) + 12;
        int x = anchorX - w / 2;
        context.fill(x, y, x + w, y + 14, 0xE90A0F13);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(text), anchorX, y + 3, TEXT);
    }

    private static void drawNexaMark(DrawContext context, int x, int y, int height) {
        int drawWidth = Math.max(1, Math.round(height * (MARK_TEXTURE_WIDTH / (float)MARK_TEXTURE_HEIGHT)));
        context.drawTexture(
            NEXA_MARK,
            x,
            y,
            drawWidth,
            height,
            0.0F,
            0.0F,
            MARK_TEXTURE_WIDTH,
            MARK_TEXTURE_HEIGHT,
            MARK_TEXTURE_WIDTH,
            MARK_TEXTURE_HEIGHT
        );
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0 || client == null) return super.mouseClicked(mouseX, mouseY, button);

        int closeSize = 24;
        int closeX = width - closeSize - 12;
        if (inside(mouseX, mouseY, closeX, 12, closeSize, closeSize)) {
            client.scheduleStop();
            return true;
        }

        for (int index = 0; index < 3; index++) {
            int y = mainY + index * (mainHeight + mainGap);
            if (!inside(mouseX, mouseY, mainX, y, mainWidth, mainHeight)) continue;
            switch (index) {
                case 0 -> client.setScreen(new SelectWorldScreen(this));
                case 1 -> client.setScreen(new MultiplayerScreen(this));
                case 2 -> Util.getOperatingSystem().open(GITHUB_URL);
                default -> { }
            }
            return true;
        }

        int totalWidth = dockSize * 3 + dockGap * 2;
        int startX = centerX - totalWidth / 2;
        for (int index = 0; index < 3; index++) {
            int x = startX + index * (dockSize + dockGap);
            if (!inside(mouseX, mouseY, x, dockY, dockSize, dockSize)) continue;
            switch (index) {
                case 0 -> client.setScreen(new NexoMenuScreen(this, NexoClientMod.MODULES, NexoClientMod.PERFORMANCE));
                case 1 -> openNormalMods();
                case 2 -> client.setScreen(new OptionsScreen(this, client.options));
                default -> { }
            }
            return true;
        }

        return super.mouseClicked(mouseX, mouseY, button);
    }

    private void openNormalMods() {
        if (client == null) return;
        if (!FabricLoader.getInstance().isModLoaded("modmenu")) {
            showNotice("Mod Menu no está instalado en este perfil");
            return;
        }

        try {
            Class<?> modsScreenClass = Class.forName("com.terraformersmc.modmenu.gui.ModsScreen");
            Object screen = modsScreenClass.getConstructor(Screen.class).newInstance(this);
            if (screen instanceof Screen minecraftScreen) {
                client.setScreen(minecraftScreen);
            }
            else {
                showNotice("Mod Menu no expuso una pantalla compatible");
            }
        }
        catch (ReflectiveOperationException | LinkageError error) {
            showNotice("No se pudo abrir Mod Menu");
            System.err.println("[NEXA In-Game] Mod Menu no pudo abrirse.");
            error.printStackTrace(System.err);
        }
    }

    private void showNotice(String message) {
        notice = message;
        noticeUntil = System.currentTimeMillis() + 3200L;
    }

    private static boolean inside(double mouseX, double mouseY, int x, int y, int w, int h) {
        return mouseX >= x && mouseX < x + w && mouseY >= y && mouseY < y + h;
    }

    @Override
    public boolean shouldPause() {
        return false;
    }
}
