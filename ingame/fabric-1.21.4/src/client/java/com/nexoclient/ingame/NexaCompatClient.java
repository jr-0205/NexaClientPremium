package com.nexoclient.ingame;

import net.fabricmc.api.ClientModInitializer;

/** Dedicated Minecraft 1.21.4 Fabric adapter. */
public final class NexaCompatClient implements ClientModInitializer {
    public static final String MINECRAFT_TARGET = "1.21.4";

    @Override
    public void onInitializeClient() {
        System.out.println("[NEXA In-Game] Fabric adapter ready for Minecraft " + MINECRAFT_TARGET);
    }
}
