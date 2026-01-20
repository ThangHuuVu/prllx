"use client";

import { ParallaxScene, type LayerItem } from "@/components/ParallaxScene";
import type { StoredScene } from "@/lib/kv";

type ShareViewerProps = {
  scene: StoredScene;
  variant: "full" | "embed";
};

export function ShareViewer({ scene, variant }: ShareViewerProps) {
  const layers: LayerItem[] = scene.layers.map((layer) => ({
    id: layer.id,
    name: layer.name,
    url: layer.url,
    order: layer.order,
    visible: layer.visible,
    gapAfter: layer.gapAfter,
    rotation: layer.rotation,
  }));

  if (variant === "embed") {
    return (
      <div className="h-screen w-screen bg-black">
        <ParallaxScene
          className="absolute inset-0"
          layers={layers}
          orbitSpanDegrees={scene.orbitSpan}
          zoomLocked={scene.zoomLocked}
          environmentUrl={scene.envUrl}
          environmentType={scene.envType}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8f5ef] p-4 sm:p-6">
      <div className="mx-auto max-w-5xl">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-[#1e1b16] sm:text-2xl">
              {scene.title || "Untitled Scene"}
            </h1>
            <p className="text-xs text-[#6f6458] sm:text-sm">
              prllx - 3D Parallax Viewer
            </p>
          </div>
          <a
            href="/"
            className="rounded-full border border-black/10 px-4 py-2 text-xs font-medium text-[#5e554a] transition hover:border-black/30 sm:text-sm"
          >
            Create your own
          </a>
        </header>
        <div className="relative aspect-[16/10] overflow-hidden rounded-[24px] border border-black/10 bg-white/60 shadow-[var(--shadow)] sm:rounded-[32px]">
          <ParallaxScene
            className="absolute inset-0"
            layers={layers}
            orbitSpanDegrees={scene.orbitSpan}
            zoomLocked={scene.zoomLocked}
            environmentUrl={scene.envUrl}
            environmentType={scene.envType}
          />
          <div className="pointer-events-none absolute inset-x-4 top-4 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-[#8b7c6a] sm:inset-x-6 sm:top-6 sm:gap-3 sm:text-xs">
            <span>Drag to orbit</span>
            <span>Scroll to zoom</span>
          </div>
        </div>
        <footer className="mt-4 flex items-center justify-between text-xs text-[#9b8f84]">
          <span>{scene.viewCount} view{scene.viewCount === 1 ? "" : "s"}</span>
          <span>{layers.length} layer{layers.length === 1 ? "" : "s"}</span>
        </footer>
      </div>
    </div>
  );
}
