package com.nexoclient.ingame;

import net.fabricmc.api.ClientModInitializer;

/**
 * Minecraft 1.20.6 adapter.
 *
 * Keep this class intentionally independent from 1.20.4/1.21.x sources.
 * Version-specific UI/HUD hooks must be implemented here or in this target's
 * own package only after they are verified against Yarn 1.20.6 mappings.
 */
public final class NexaCompatClient implements ClientModInitializer {
    public static final String MINECRAFT_TARGET = "1.20.6";

    @Override
    public void onInitializeClient() {
        System.out.println("[NEXA In-Game] Fabric adapter ready for Minecraft " + MINECRAFT_TARGET);
    }
}
