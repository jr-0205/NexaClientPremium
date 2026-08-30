package com.nexoclient.ingame.modules;

import com.nexoclient.ingame.core.hud.NexaHudPlacement;
import com.nexoclient.ingame.core.modules.NexaModuleCategory;

public final class NexoModule {
    private final String id;
    private final String name;
    private final String description;
    private final NexaModuleCategory category;
    private final boolean hudModule;
    private final boolean ready;
    private boolean enabled;
    private NexaHudPlacement placement;

    public NexoModule(
        String id,
        String name,
        String description,
        NexaModuleCategory category,
        boolean hudModule,
        boolean ready,
        boolean enabled,
        NexaHudPlacement placement
    ) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.category = category;
        this.hudModule = hudModule;
        this.ready = ready;
        this.enabled = ready && enabled;
        this.placement = placement == null ? NexaHudPlacement.defaults() : placement;
    }

    public String id() { return id; }
    public String name() { return name; }
    public String description() { return description; }
    public NexaModuleCategory category() { return category; }
    public boolean hudModule() { return hudModule; }
    public boolean ready() { return ready; }
    public boolean enabled() { return enabled; }
    public NexaHudPlacement placement() { return placement; }

    public void toggle() {
        if (ready) enabled = !enabled;
    }

    public void setEnabled(boolean value) {
        enabled = ready && value;
    }

    public void setPlacement(NexaHudPlacement value) {
        if (hudModule && value != null) placement = value;
    }
}
