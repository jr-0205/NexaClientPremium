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

/** NEXA main menu for Minecraft 1.21.1. */
public final class NexaTitleScreen extends Screen {
    private static final Identifier NEXA_MARK = Identifier.of("nexo_ingame", "textures/gui/nexa_mark.png");
    private static final Identifier NEXA_BACKGROUND = Identifier.of("nexo_ingame", "textures/gui/nexa_background.png");
    private static final int MARK_TEXTURE_WIDTH = 1199;
    private static final int MARK_TEXTURE_HEIGHT = 1312;
    private static final int BACKGROUND_TEXTURE_WIDTH = 1648;
    private static final int BACKGROUND_TEXTURE_HEIGHT = 928;
    private static final String GITHUB_URL = "https://github.com/jr-0205/NexaClientPremium";

    private static final int PANEL = 0xB80A1118;
    private static final int PANEL_HOVER = 0xD914202A;
    private static final int PANEL_ACTIVE = 0xE21A2731;
    private static final int BORDER = 0x9A748694;
    private static final int BORDER_SOFT = 0x665C6C78;
    private static final int TEXT = 0xFFF3F6F8;
    private static final int MUTED = 0xFFA1ADB6;
    private static final int ICE = 0xFFD2DEE5;
    private static final int STATUS = 0xFFA7C7D9;

    private int centerX;
    private int mainX;
    private int mainY;
    private int mainWidth;
    private int mainHeight;
    private int mainGap;
    private int dockY;
    private int dockItemWidth;
    private int dockItemHeight;
    private int dockGap;
    private long noticeUntil;
    private String notice;

    public NexaTitleScreen() {
        super(Text.literal("NEXA Client"));
    }

    @Override
    protected void init() {
        centerX = width / 2;
        mainWidth = Math.min(330, Math.max(260, width / 4));
        mainHeight = 30;
        mainGap = 8;
        mainX = centerX - mainWidth / 2;
        mainY = Math.max(210, Math.min(height / 2 - 4, height - 196));
        dockItemWidth = Math.min(104, Math.max(88, width / 14));
        dockItemHeight = 38;
        dockGap = 8;
        dockY = height - 58;
    }

    @Override
    public void renderBackground(DrawContext context, int mouseX, int mouseY, float delta) {
        drawBackgroundCover(context);
        context.fill(0, 0, width, height, 0x3A02070B);
        context.fill(0, 0, width, Math.max(48, height / 8), 0x36000000);
        context.fill(0, height - Math.max(82, height / 7), width, height, 0x52000000);
        context.fill(0, 0, Math.max(58, width / 11), height, 0x22000000);
        context.fill(width - Math.max(58, width / 11), 0, width, height, 0x22000000);
    }

    private void drawBackgroundCover(DrawContext context) {
        float screenRatio = width / (float)Math.max(1, height);
        float textureRatio = BACKGROUND_TEXTURE_WIDTH / (float)BACKGROUND_TEXTURE_HEIGHT;
        int sourceX = 0;
        int sourceY = 0;
        int sourceWidth = BACKGROUND_TEXTURE_WIDTH;
        int sourceHeight = BACKGROUND_TEXTURE_HEIGHT;

        if (screenRatio > textureRatio) {
            sourceHeight = Math.max(1, Math.round(BACKGROUND_TEXTURE_WIDTH / screenRatio));
            sourceY = Math.max(0, (BACKGROUND_TEXTURE_HEIGHT - sourceHeight) / 2);
        }
        else if (screenRatio < textureRatio) {
            sourceWidth = Math.max(1, Math.round(BACKGROUND_TEXTURE_HEIGHT * screenRatio));
            sourceX = Math.max(0, (BACKGROUND_TEXTURE_WIDTH - sourceWidth) / 2);
        }

        context.drawTexture(
            NEXA_BACKGROUND,
            0,
            0,
            width,
            height,
            sourceX,
            sourceY,
            sourceWidth,
            sourceHeight,
            BACKGROUND_TEXTURE_WIDTH,
            BACKGROUND_TEXTURE_HEIGHT
        );
    }

    @Override
    public void render(DrawContext context, int mouseX, int mouseY, float delta) {
        renderBackground(context, mouseX, mouseY, delta);
        drawAccountPreview(context, mouseX, mouseY);
        drawCloseButton(context, mouseX, mouseY);
        drawCenteredBrand(context);
        drawMainButton(context, mouseX, mouseY, 0, "UN JUGADOR");
        drawMainButton(context, mouseX, mouseY, 1, "MULTIJUGADOR");
        drawMainButton(context, mouseX, mouseY, 2, "PROYECTO NEXA EN GITHUB");
        drawDock(context, mouseX, mouseY);
        context.drawTextWithShadow(textRenderer, Text.literal("NEXA Client · Fabric 1.21.1"), 12, height - 16, 0xFF6E7A83);

        if (notice != null && System.currentTimeMillis() < noticeUntil) {
            int noticeWidth = Math.min(width - 32, textRenderer.getWidth(notice) + 22);
            int x = centerX - noticeWidth / 2;
            int y = dockY - 31;
            context.fill(x, y, x + noticeWidth, y + 20, 0xE3090F14);
            context.fill(x, y, x + noticeWidth, y + 1, BORDER);
            context.drawCenteredTextWithShadow(textRenderer, Text.literal(notice), centerX, y + 6, TEXT);
        }
    }

    private void drawAccountPreview(DrawContext context, int mouseX, int mouseY) {
        int x = 12;
        int y = 12;
        int w = Math.min(244, Math.max(202, width / 6));
        int h = 58;
        boolean hover = inside(mouseX, mouseY, x, y, w, h);
        context.fill(x, y, x + w, y + h, hover ? PANEL_HOVER : PANEL);
        context.fill(x, y, x + w, y + 1, hover ? BORDER : BORDER_SOFT);
        context.fill(x, y, x + 1, y + h, BORDER_SOFT);
        drawNexaMark(context, x + 9, y + 12, 30);

        String username = "NEXA USER";
        String status = "MODO LOCAL";
        String detail = "MINECRAFT SERVICES · ID PENDIENTE";
        if (client != null && client.getSession() != null) {
            username = client.getSession().getUsername();
            if (client.getSession().getClientId().isPresent()) {
                status = "CUENTA MICROSOFT";
                detail = "SESIÓN DE MINECRAFT ACTIVA";
            }
        }

        context.drawTextWithShadow(textRenderer, Text.literal(username), x + 48, y + 9, TEXT);
        context.drawTextWithShadow(textRenderer, Text.literal(status), x + 48, y + 24, STATUS);
        context.drawTextWithShadow(textRenderer, Text.literal(detail), x + 48, y + 39, MUTED);
    }

    private void drawCloseButton(DrawContext context, int mouseX, int mouseY) {
        int size = 28;
        int x = width - size - 12;
        int y = 12;
        boolean hover = inside(mouseX, mouseY, x, y, size, size);
        context.fill(x, y, x + size, y + size, hover ? 0xD83A4248 : 0xA8151C22);
        context.fill(x, y, x + size, y + 1, hover ? 0xFFC4D0D8 : BORDER_SOFT);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("X"), x + size / 2, y + 10, TEXT);
    }

    private void drawCenteredBrand(DrawContext context) {
        int markHeight = Math.min(92, Math.max(70, height / 8));
        int markWidth = Math.max(1, Math.round(markHeight * (MARK_TEXTURE_WIDTH / (float)MARK_TEXTURE_HEIGHT)));
        int markX = centerX - markWidth / 2;
        int markY = Math.max(54, mainY - 154);
        drawNexaMark(context, markX, markY, markHeight);
        int titleY = markY + markHeight + 9;
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("N E X A   C L I E N T"), centerX, titleY, TEXT);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal("MINECRAFT JAVA"), centerX, titleY + 16, MUTED);
    }

    private void drawMainButton(DrawContext context, int mouseX, int mouseY, int index, String label) {
        int y = mainY + index * (mainHeight + mainGap);
        boolean hover = inside(mouseX, mouseY, mainX, y, mainWidth, mainHeight);
        context.fill(mainX, y, mainX + mainWidth, y + mainHeight, hover ? BORDER : BORDER_SOFT);
        context.fill(mainX + 1, y + 1, mainX + mainWidth - 1, y + mainHeight - 1, hover ? PANEL_HOVER : PANEL);
        if (hover) context.fill(mainX + 1, y + mainHeight - 2, mainX + mainWidth - 1, y + mainHeight - 1, ICE);
        context.drawCenteredTextWithShadow(textRenderer, Text.literal(label), centerX, y + 11, hover ? TEXT : ICE);
    }

    private void drawDock(DrawContext context, int mouseX, int mouseY) {
        int totalWidth = dockItemWidth * 3 + dockGap * 2;
        int startX = centerX - totalWidth / 2;
        String[] labels = { "NEXA MODS", "MODS", "OPCIONES" };

        for (int i = 0; i < 3; i++) {
            int x = startX + i * (dockItemWidth + dockGap);
            boolean hover = inside(mouseX, mouseY, x, dockY, dockItemWidth, dockItemHeight);
            context.fill(x, dockY, x + dockItemWidth, dockY + dockItemHeight, hover ? BORDER : BORDER_SOFT);
            context.fill(x + 1, dockY + 1, x + dockItemWidth - 1, dockY + dockItemHeight - 1, hover ? PANEL_ACTIVE : PANEL);

            if (i == 0) {
                drawNexaMark(context, x + 11, dockY + 8, 22);
            }
            else if (i == 1) {
                drawDockGrid(context, x + 10, dockY + 8, 22);
            }
            else {
                drawDockSliders(context, x + 10, dockY + 8, 22);
            }

            context.drawTextWithShadow(textRenderer, Text.literal(labels[i]), x + 39, dockY + 15, hover ? TEXT : ICE);
        }
    }

    private void drawDockGrid(DrawContext context, int x, int y, int size) {
        int s = 5;
        int gap = 3;
        int left = x + 2;
        int top = y + 2;
        context.fill(left, top, left + s, top + s, ICE);
        context.fill(left + s + gap, top, left + s * 2 + gap, top + s, ICE);
        context.fill(left, top + s + gap, left + s, top + s * 2 + gap, ICE);
        context.fill(left + s + gap, top + s + gap, left + s * 2 + gap, top + s * 2 + gap, ICE);
    }

    private void drawDockSliders(DrawContext context, int x, int y, int size) {
        int left = x + 1;
        int right = x + size - 2;
        int y1 = y + 4;
        int y2 = y + 10;
        int y3 = y + 16;
        context.fill(left, y1, right, y1 + 1, ICE);
        context.fill(left, y2, right, y2 + 1, ICE);
        context.fill(left, y3, right, y3 + 1, ICE);
        context.fill(left + 5, y1 - 2, left + 7, y1 + 3, TEXT);
        context.fill(right - 7, y2 - 2, right - 5, y2 + 3, TEXT);
        context.fill(left + 9, y3 - 2, left + 11, y3 + 3, TEXT);
    }

    private static void drawNexaMark(DrawContext context, int x, int y, int height) {
        int drawWidth = Math.max(1, Math.round(height * (MARK_TEXTURE_WIDTH / (float)MARK_TEXTURE_HEIGHT)));
        context.drawTexture(NEXA_MARK, x, y, drawWidth, height, 0.0F, 0.0F,
            MARK_TEXTURE_WIDTH, MARK_TEXTURE_HEIGHT, MARK_TEXTURE_WIDTH, MARK_TEXTURE_HEIGHT);
    }

    @Override
    public boolean mouseClicked(double mouseX, double mouseY, int button) {
        if (button != 0 || client == null) return super.mouseClicked(mouseX, mouseY, button);

        int accountWidth = Math.min(244, Math.max(202, width / 6));
        if (inside(mouseX, mouseY, 12, 12, accountWidth, 58)) {
            showNotice(client.getSession().getClientId().isPresent()
                ? "Cuenta Microsoft detectada"
                : "Microsoft/Xbox listo · Minecraft Services pendiente");
            return true;
        }

        int closeSize = 28;
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

        int totalWidth = dockItemWidth * 3 + dockGap * 2;
        int startX = centerX - totalWidth / 2;
        for (int index = 0; index < 3; index++) {
            int x = startX + index * (dockItemWidth + dockGap);
            if (!inside(mouseX, mouseY, x, dockY, dockItemWidth, dockItemHeight)) continue;
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
            if (screen instanceof Screen minecraftScreen) client.setScreen(minecraftScreen);
            else showNotice("Mod Menu no expuso una pantalla compatible");
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
