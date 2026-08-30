package com.nexoclient.ingame.modules;

import com.nexoclient.ingame.core.hud.NexaHudAnchor;
import com.nexoclient.ingame.core.hud.NexaHudPlacement;
import com.nexoclient.ingame.core.modules.NexaModuleCatalog;
import com.nexoclient.ingame.core.modules.NexaModuleCategory;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Adaptador 1.21 del catálogo común de módulos NEXA.
 * El core define identidad, categoría, copy y defaults. Este adaptador decide
 * qué módulos ya tienen implementación real para esta familia de Minecraft.
 */
public final class NexoModuleRegistry {
    private static final Set<String> READY_ON_1_21 = Set.of("fps", "coordinates", "nexa_home");

    private final Map<String, NexoModule> modules = new LinkedHashMap<>();

    public NexoModuleRegistry() {
        for (var spec : NexaModuleCatalog.defaults()) {
            var ready = READY_ON_1_21.contains(spec.id());
            register(new NexoModule(
                spec.id(),
                spec.name(),
                spec.description(),
                spec.category(),
                spec.hudModule(),
                ready,
                ready && spec.enabledByDefault(),
                defaultPlacement(spec.id())
            ));
        }
    }

    private static NexaHudPlacement defaultPlacement(String id) {
        return switch (id) {
            case "fps" -> new NexaHudPlacement(NexaHudAnchor.TOP_LEFT, 8, 8, 1.0d);
            case "coordinates" -> new NexaHudPlacement(NexaHudAnchor.TOP_LEFT, 8, 23, 1.0d);
            default -> NexaHudPlacement.defaults();
        };
    }

    private void register(NexoModule module) {
        modules.put(module.id(), module);
    }

    public List<NexoModule> all() {
        return List.copyOf(modules.values());
    }

    public List<NexoModule> byCategory(NexaModuleCategory category) {
        return modules.values().stream().filter(module -> module.category() == category).toList();
    }

    public List<NexoModule> hudModules() {
        return modules.values().stream().filter(NexoModule::hudModule).toList();
    }

    public NexoModule get(String id) {
        return modules.get(id);
    }

    public boolean enabled(String id) {
        var module = modules.get(id);
        return module != null && module.enabled();
    }
}
