package com.nexoclient.ingame;

import net.minecraft.client.gui.DrawContext;

import java.lang.reflect.InvocationTargetException;
import java.lang.reflect.Method;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Compatibilidad de transformaciones GUI entre Minecraft 1.21.1 y 1.21.8.
 *
 * 1.21.1 expone MatrixStack (push/pop + transformaciones 3D), mientras que
 * 1.21.8 usa Matrix3x2fStack (pushMatrix/popMatrix + transformaciones 2D).
 * Mantener esta diferencia detrás de una única capa evita duplicar todo el
 * Control Center y el editor HUD por cada revisión de Minecraft.
 */
final class NexaGuiTransforms {
    private static final ConcurrentHashMap<Class<?>, Accessor> ACCESSORS = new ConcurrentHashMap<>();

    private NexaGuiTransforms() { }

    static void push(DrawContext context) {
        Object matrices = context.getMatrices();
        accessor(matrices).invoke(accessor(matrices).push, matrices);
    }

    static void pop(DrawContext context) {
        Object matrices = context.getMatrices();
        accessor(matrices).invoke(accessor(matrices).pop, matrices);
    }

    static void translate(DrawContext context, float x, float y) {
        Object matrices = context.getMatrices();
        Accessor accessor = accessor(matrices);
        if (accessor.translate2d != null) {
            accessor.invoke(accessor.translate2d, matrices, x, y);
            return;
        }
        accessor.invoke(accessor.translate3d, matrices, (double) x, (double) y, 0.0d);
    }

    static void scale(DrawContext context, float factor) {
        Object matrices = context.getMatrices();
        Accessor accessor = accessor(matrices);
        if (accessor.scale2d != null) {
            accessor.invoke(accessor.scale2d, matrices, factor, factor);
            return;
        }
        accessor.invoke(accessor.scale3d, matrices, factor, factor, 1.0f);
    }

    private static Accessor accessor(Object matrices) {
        if (matrices == null) throw new IllegalStateException("DrawContext no expuso una pila de matrices GUI.");
        return ACCESSORS.computeIfAbsent(matrices.getClass(), Accessor::new);
    }

    private static final class Accessor {
        private final Method push;
        private final Method pop;
        private final Method translate2d;
        private final Method translate3d;
        private final Method scale2d;
        private final Method scale3d;

        private Accessor(Class<?> type) {
            push = first(type, signature("push"), signature("pushMatrix"));
            pop = first(type, signature("pop"), signature("popMatrix"));
            translate2d = optional(type, "translate", float.class, float.class);
            translate3d = optional(type, "translate", double.class, double.class, double.class);
            scale2d = optional(type, "scale", float.class, float.class);
            scale3d = optional(type, "scale", float.class, float.class, float.class);

            if (push == null || pop == null || (translate2d == null && translate3d == null) || (scale2d == null && scale3d == null)) {
                throw new IllegalStateException("Pila GUI no compatible con NEXA: " + type.getName());
            }
        }

        private void invoke(Method method, Object target, Object... args) {
            if (method == null) throw new IllegalStateException("Transformación GUI no disponible.");
            try {
                method.invoke(target, args);
            }
            catch (IllegalAccessException exception) {
                throw new IllegalStateException("NEXA no pudo acceder a la transformación GUI.", exception);
            }
            catch (InvocationTargetException exception) {
                Throwable cause = exception.getCause();
                if (cause instanceof RuntimeException runtime) throw runtime;
                if (cause instanceof Error error) throw error;
                throw new IllegalStateException("Falló una transformación GUI de NEXA.", cause);
            }
        }

        private static Method first(Class<?> type, MethodSignature... signatures) {
            for (MethodSignature signature : signatures) {
                Method resolved = optional(type, signature.name, signature.parameters);
                if (resolved != null) return resolved;
            }
            return null;
        }

        private static Method optional(Class<?> type, String name, Class<?>... parameters) {
            try {
                return type.getMethod(name, parameters);
            }
            catch (NoSuchMethodException ignored) {
                return null;
            }
        }

        private static MethodSignature signature(String name, Class<?>... parameters) {
            return new MethodSignature(name, parameters);
        }
    }

    private record MethodSignature(String name, Class<?>[] parameters) { }
}
