package com.nexoclient.ingame;

import com.nexoclient.ingame.core.hud.NexaHudAnchor;
import com.nexoclient.ingame.modules.NexoModule;
import com.nexoclient.ingame.modules.NexoModuleRegistry;
import net.minecraft.client.MinecraftClient;
import net.minecraft.client.gui.DrawContext;

import java.util.Locale;

final class NexoHudOverlay {
    private NexoHudOverlay() { }

    static void render(MinecraftClient client, DrawContext context, NexoModuleRegistry modules) {
        if (client.player == null || client.textRenderer == null) return;
        NexaTheme theme = NexaTheme.current();

        NexoModule fpsModule = modules.get("fps");
        if (fpsModule != null && fpsModule.enabled()) {
            int fps = Math.max(1, client.getCurrentFps());
            double frameMs = 1000.0d / fps;
            String text = String.format(Locale.ROOT, "NEXA · %d FPS · %.1f ms", fps, frameMs);
            drawModuleText(client, context, fpsModule, text, theme.text);
        }

        NexoModule coordinatesModule = modules.get("coordinates");
        if (coordinatesModule != null && coordinatesModule.enabled()) {
            String text = String.format(Locale.ROOT, "XYZ %.1f / %.1f / %.1f",
                client.player.getX(), client.player.getY(), client.player.getZ());
            drawModuleText(client, context, coordinatesModule, text, theme.text);
        }
    }

    static int previewWidth(MinecraftClient client, NexoModule module) {
        if (client.textRenderer == null) return 80;
        return client.textRenderer.getWidth(previewText(module));
    }

    static String previewText(NexoModule module) {
        return switch (module.id()) {
            case "fps" -> "NEXA · 144 FPS · 6.9 ms";
            case "coordinates" -> "XYZ 120.0 / 64.0 / -240.0";
            default -> module.name();
        };
    }

    static double[] topLeft(NexoModule module, int screenWidth, int screenHeight, int unscaledWidth, int unscaledHeight) {
        var placement = module.placement();
        double scale = placement.scale();
        double width = unscaledWidth * scale;
        double height = unscaledHeight * scale;
        double baseX = switch (placement.anchor()) {
            case TOP_LEFT, CENTER_LEFT, BOTTOM_LEFT -> 0;
            case TOP_CENTER, CENTER, BOTTOM_CENTER -> (screenWidth - width) / 2.0d;
            case TOP_RIGHT, CENTER_RIGHT, BOTTOM_RIGHT -> screenWidth - width;
        };
        double baseY = switch (placement.anchor()) {
            case TOP_LEFT, TOP_CENTER, TOP_RIGHT -> 0;
            case CENTER_LEFT, CENTER, CENTER_RIGHT -> (screenHeight - height) / 2.0d;
            case BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT -> screenHeight - height;
        };
        return new double[] { baseX + placement.offsetX(), baseY + placement.offsetY() };
    }

    static NexaHudAnchor closestAnchor(double centerX, double centerY, int screenWidth, int screenHeight) {
        int horizontal = centerX < screenWidth / 3.0d ? 0 : centerX > screenWidth * 2.0d / 3.0d ? 2 : 1;
        int vertical = centerY < screenHeight / 3.0d ? 0 : centerY > screenHeight * 2.0d / 3.0d ? 2 : 1;
        return switch (vertical * 3 + horizontal) {
            case 0 -> NexaHudAnchor.TOP_LEFT;
            case 1 -> NexaHudAnchor.TOP_CENTER;
            case 2 -> NexaHudAnchor.TOP_RIGHT;
            case 3 -> NexaHudAnchor.CENTER_LEFT;
            case 4 -> NexaHudAnchor.CENTER;
            case 5 -> NexaHudAnchor.CENTER_RIGHT;
            case 6 -> NexaHudAnchor.BOTTOM_LEFT;
            case 7 -> NexaHudAnchor.BOTTOM_CENTER;
            default -> NexaHudAnchor.BOTTOM_RIGHT;
        };
    }

    static double[] offsetsForTopLeft(NexaHudAnchor anchor, double x, double y, int screenWidth, int screenHeight, double scaledWidth, double scaledHeight) {
        double baseX = switch (anchor) {
            case TOP_LEFT, CENTER_LEFT, BOTTOM_LEFT -> 0;
            case TOP_CENTER, CENTER, BOTTOM_CENTER -> (screenWidth - scaledWidth) / 2.0d;
            case TOP_RIGHT, CENTER_RIGHT, BOTTOM_RIGHT -> screenWidth - scaledWidth;
        };
        double baseY = switch (anchor) {
            case TOP_LEFT, TOP_CENTER, TOP_RIGHT -> 0;
            case CENTER_LEFT, CENTER, CENTER_RIGHT -> (screenHeight - scaledHeight) / 2.0d;
            case BOTTOM_LEFT, BOTTOM_CENTER, BOTTOM_RIGHT -> screenHeight - scaledHeight;
        };
        return new double[] { x - baseX, y - baseY };
    }

    private static void drawModuleText(MinecraftClient client, DrawContext context, NexoModule module, String text, int color) {
        int width = client.textRenderer.getWidth(text);
        int height = 9;
        double[] position = topLeft(module, client.getWindow().getScaledWidth(), client.getWindow().getScaledHeight(), width, height);
        float scale = (float) module.placement().scale();

        NexaGuiTransforms.push(context);
        try {
            NexaGuiTransforms.translate(context, (float) position[0], (float) position[1]);
            NexaGuiTransforms.scale(context, scale);
            context.drawTextWithShadow(client.textRenderer, text, 0, 0, color);
        }
        finally {
            NexaGuiTransforms.pop(context);
        }
    }
}
