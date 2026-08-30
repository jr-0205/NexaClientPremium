package com.nexoclient.ingame;

import com.nexoclient.ingame.core.hud.NexaHudAnchor;
import com.nexoclient.ingame.core.hud.NexaHudPlacement;
import com.nexoclient.ingame.modules.NexoModuleRegistry;

import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.Locale;
import java.util.Properties;

final class NexaInGameSettings {
    private static final String FILE_NAME = "nexa-ingame.properties";

    private NexaInGameSettings() { }

    static void load(NexoModuleRegistry modules) {
        Path path = settingsPath();
        if (!Files.isRegularFile(path)) return;

        Properties properties = new Properties();
        try (InputStream stream = Files.newInputStream(path)) {
            properties.load(stream);
        } catch (IOException exception) {
            report("leer", exception);
            return;
        }

        for (var module : modules.all()) {
            String prefix = "module." + module.id() + ".";
            String enabled = properties.getProperty(prefix + "enabled");
            if (enabled != null) module.setEnabled(Boolean.parseBoolean(enabled));

            if (!module.hudModule()) continue;
            NexaHudPlacement current = module.placement();
            NexaHudAnchor anchor = parseAnchor(properties.getProperty(prefix + "anchor"), current.anchor());
            double offsetX = parseDouble(properties.getProperty(prefix + "x"), current.offsetX());
            double offsetY = parseDouble(properties.getProperty(prefix + "y"), current.offsetY());
            double scale = parseDouble(properties.getProperty(prefix + "scale"), current.scale());
            module.setPlacement(new NexaHudPlacement(anchor, offsetX, offsetY, scale));
        }
    }

    static void save(NexoModuleRegistry modules) {
        Path path = settingsPath();
        Properties properties = new Properties();
        properties.setProperty("format", "1");

        for (var module : modules.all()) {
            String prefix = "module." + module.id() + ".";
            properties.setProperty(prefix + "enabled", Boolean.toString(module.enabled()));
            if (!module.hudModule()) continue;
            var placement = module.placement();
            properties.setProperty(prefix + "anchor", placement.anchor().name());
            properties.setProperty(prefix + "x", format(placement.offsetX()));
            properties.setProperty(prefix + "y", format(placement.offsetY()));
            properties.setProperty(prefix + "scale", format(placement.scale()));
        }

        try {
            Files.createDirectories(path.getParent());
            Path temporary = path.resolveSibling(path.getFileName() + ".tmp");
            try (OutputStream stream = Files.newOutputStream(temporary)) {
                properties.store(stream, "NEXA In-Game settings");
            }
            try {
                Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
            } catch (IOException atomicFailure) {
                Files.move(temporary, path, StandardCopyOption.REPLACE_EXISTING);
            }
        } catch (IOException exception) {
            report("guardar", exception);
        }
    }

    private static Path settingsPath() {
        return Path.of(System.getProperty("user.dir", ".")).toAbsolutePath().normalize().resolve("config").resolve(FILE_NAME);
    }

    private static NexaHudAnchor parseAnchor(String value, NexaHudAnchor fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return NexaHudAnchor.valueOf(value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ignored) {
            return fallback;
        }
    }

    private static double parseDouble(String value, double fallback) {
        if (value == null || value.isBlank()) return fallback;
        try {
            return Double.parseDouble(value.trim());
        } catch (NumberFormatException ignored) {
            return fallback;
        }
    }

    private static String format(double value) {
        return String.format(Locale.ROOT, "%.3f", value);
    }

    private static void report(String action, Exception exception) {
        System.err.println("[NEXA In-Game] No se pudo " + action + " la configuración local: " + exception.getMessage());
    }
}
