"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { ParallaxScene, type LayerItem } from "@/components/ParallaxScene";

const parseLayerOrder = (name: string) => {
  const match = name.match(/\d+/);
  if (!match) {
    return Number.MAX_SAFE_INTEGER;
  }
  const value = Number.parseInt(match[0], 10);
  return Number.isNaN(value) ? Number.MAX_SAFE_INTEGER : value;
};

const sortLayers = (items: LayerItem[]) =>
  [...items].sort((a, b) => {
    if (a.order === b.order) {
      return a.name.localeCompare(b.name);
    }
    return a.order - b.order;
  });

const DEFAULT_LAYER_GAP = 0.02;
const DEFAULT_LAYER_ROTATION = { x: 0, y: 0, z: 0 };
const clampOrbitSpan = (value: number) => Math.min(Math.max(value, 10), 360);
const clampRotation = (value: number) => Math.min(Math.max(value, -180), 180);

export default function Home() {
  const [layers, setLayers] = useState<LayerItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [orbitSpan, setOrbitSpan] = useState(30);
  const [orbitSpanInput, setOrbitSpanInput] = useState(String(orbitSpan));
  const [isEditingOrbitSpan, setIsEditingOrbitSpan] = useState(false);
  const [zoomLocked, setZoomLocked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlayControls, setShowOverlayControls] = useState(true);
  const [environment, setEnvironment] = useState<{
    name: string;
    url: string;
    type: "hdr" | "ldr";
  } | null>(null);
  const [editingRotation, setEditingRotation] = useState<{
    id: string;
    axis: "x" | "y" | "z";
  } | null>(null);
  const [rotationInput, setRotationInput] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const layersRef = useRef<LayerItem[]>([]);
  const orbitInputRef = useRef<HTMLInputElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  const orderedLayers = useMemo(() => sortLayers(layers), [layers]);

  useEffect(() => {
    layersRef.current = layers;
  }, [layers]);

  useEffect(() => {
    return () => {
      layersRef.current.forEach((layer) => URL.revokeObjectURL(layer.url));
    };
  }, []);

  useEffect(() => {
    return () => {
      if (environment) {
        URL.revokeObjectURL(environment.url);
      }
    };
  }, [environment]);

  useEffect(() => {
    if (isEditingOrbitSpan) {
      orbitInputRef.current?.focus();
      orbitInputRef.current?.select();
    }
  }, [isEditingOrbitSpan]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const active = document.fullscreenElement === viewerRef.current;
      setIsFullscreen(active);
      if (!active) {
        setShowOverlayControls(true);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const addFiles = (files: FileList | null) => {
    if (!files || files.length === 0) {
      return;
    }

    const nextLayers = Array.from(files)
      .filter((file) => file.type === "image/png")
      .map((file) => ({
        id: crypto.randomUUID(),
        name: file.name,
        url: URL.createObjectURL(file),
        order: parseLayerOrder(file.name),
        visible: true,
        gapAfter: DEFAULT_LAYER_GAP,
        rotation: { ...DEFAULT_LAYER_ROTATION },
      }));

    if (!nextLayers.length) {
      return;
    }

    setLayers((prev) => sortLayers([...prev, ...nextLayers]));
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    addFiles(event.target.files);
    event.target.value = "";
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  };

  const handleEnvironmentChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }
    const lowerName = file.name.toLowerCase();
    const match = lowerName.match(/\.(hdr|png|jpe?g)$/);
    if (!match) {
      event.target.value = "";
      return;
    }
    if (environment) {
      URL.revokeObjectURL(environment.url);
    }
    const envType: "hdr" | "ldr" = match[1] === "hdr" ? "hdr" : "ldr";
    const nextEnv = {
      name: file.name,
      url: URL.createObjectURL(file),
      type: envType,
    };
    setEnvironment(nextEnv);
    event.target.value = "";
  };

  const clearEnvironment = () => {
    if (environment) {
      URL.revokeObjectURL(environment.url);
    }
    setEnvironment(null);
  };

  const removeLayer = (id: string) => {
    setLayers((prev) => {
      const target = prev.find((layer) => layer.id === id);
      if (target) {
        URL.revokeObjectURL(target.url);
      }
      return prev.filter((layer) => layer.id !== id);
    });
  };

  const toggleLayer = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id ? { ...layer, visible: !layer.visible } : layer
      )
    );
  };

  const updateGapAfter = (id: string, gapAfter: number) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? { ...layer, gapAfter: Math.max(0.02, gapAfter) }
          : layer
      )
    );
  };

  const updateRotation = (
    id: string,
    axis: "x" | "y" | "z",
    value: number
  ) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? {
              ...layer,
              rotation: { ...layer.rotation, [axis]: clampRotation(value) },
            }
          : layer
      )
    );
  };

  const resetRotation = (id: string) => {
    setLayers((prev) =>
      prev.map((layer) =>
        layer.id === id
          ? { ...layer, rotation: { ...DEFAULT_LAYER_ROTATION } }
          : layer
      )
    );
    if (editingRotation?.id === id) {
      setEditingRotation(null);
      setRotationInput("");
    }
  };

  const startRotationEdit = (
    id: string,
    axis: "x" | "y" | "z",
    value: number
  ) => {
    setEditingRotation({ id, axis });
    setRotationInput(String(value));
  };

  const commitRotationInput = (fallback: number) => {
    if (!editingRotation) {
      return;
    }
    const parsed = Number.parseFloat(rotationInput);
    const nextValue = Number.isNaN(parsed)
      ? fallback
      : clampRotation(parsed);
    updateRotation(editingRotation.id, editingRotation.axis, nextValue);
    setEditingRotation(null);
    setRotationInput("");
  };

  const commitOrbitSpan = (fallback: number) => {
    const parsed = Number.parseFloat(orbitSpanInput);
    const nextValue = Number.isNaN(parsed)
      ? fallback
      : clampOrbitSpan(parsed);
    setOrbitSpan(nextValue);
    setOrbitSpanInput(String(nextValue));
    setIsEditingOrbitSpan(false);
  };

  const toggleFullscreen = async () => {
    if (!viewerRef.current) {
      return;
    }
    if (document.fullscreenElement === viewerRef.current) {
      await document.exitFullscreen();
      return;
    }
    await viewerRef.current.requestFullscreen();
    setShowOverlayControls(true);
  };

  const clearLayers = () => {
    layers.forEach((layer) => URL.revokeObjectURL(layer.url));
    setLayers([]);
  };

  const renderControlsPanel = (
    panelClassName: string,
    scrollClassName: string
  ) => (
    <section
      className={`flex flex-shrink-0 flex-col overflow-hidden rounded-[28px] border border-black/10 bg-[var(--panel)] shadow-[var(--shadow)] backdrop-blur ${panelClassName}`}
    >
      <div
        className={`flex flex-col gap-6 overflow-y-auto pr-2 ${scrollClassName}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="space-y-2 px-6 pt-6">
          <p className="text-xs uppercase tracking-[0.32em] text-[#8b7c6a]">
            prllx
          </p>
          <h1 className="text-3xl font-semibold leading-tight text-[#1e1b16]">
            Layered PNG viewer
          </h1>
          <p className="text-sm leading-relaxed text-[#6f6458]">
            Upload PNGs named 1..n. We stack them in order and let you orbit
            through the depth.
          </p>
        </div>

        <div
          className={`mx-6 rounded-2xl border border-dashed px-5 py-6 text-sm transition ${
            isDragging
              ? "border-[#e2793a] bg-[#fff3e7] text-[#a34a20]"
              : "border-black/10 bg-white/60 text-[#6f6458]"
          }`}
        >
          <p className="font-medium">Drop your PNG layers here</p>
          <p className="mt-1 text-xs">
            or click the button below. Only PNGs are accepted.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 px-6">
          <input
            ref={inputRef}
            type="file"
            accept="image/png"
            multiple
            className="hidden"
            onChange={handleInputChange}
          />
          <button
            type="button"
            className="rounded-full bg-[#1e1b16] px-5 py-2 text-sm font-medium text-[#fdf6ed] transition hover:bg-[#2b2722]"
            onClick={() => inputRef.current?.click()}
          >
            Add layers
          </button>
          <button
            type="button"
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-[#5e554a] transition hover:border-black/30 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={clearLayers}
            disabled={!layers.length}
          >
            Clear all
          </button>
          <span className="text-xs text-[#8b7c6a]">
            {layers.length} layer{layers.length === 1 ? "" : "s"}
          </span>
        </div>

        <div className="px-6">
          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#8b7c6a]">
              <span>Orbit lock</span>
              {isEditingOrbitSpan ? (
                <input
                  ref={orbitInputRef}
                  type="number"
                  min={10}
                  max={360}
                  value={orbitSpanInput}
                  onChange={(event) => setOrbitSpanInput(event.target.value)}
                  onBlur={() => commitOrbitSpan(orbitSpan)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      commitOrbitSpan(orbitSpan);
                    }
                    if (event.key === "Escape") {
                      setIsEditingOrbitSpan(false);
                      setOrbitSpanInput(String(orbitSpan));
                    }
                  }}
                  className="w-14 rounded-md border border-black/10 bg-white/90 px-2 py-1 text-right font-mono text-[11px] text-[#6f6458]"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setOrbitSpanInput(String(orbitSpan));
                    setIsEditingOrbitSpan(true);
                  }}
                  className="rounded-md px-2 py-1 font-mono text-[11px] text-[#6f6458] transition hover:text-[#1e1b16]"
                >
                  {orbitSpan}°
                </button>
              )}
            </div>
            <input
              type="range"
              min={10}
              max={360}
              step={5}
              value={orbitSpan}
              onChange={(event) => {
                const nextValue = Number.parseInt(event.target.value, 10);
                setOrbitSpan(nextValue);
                if (!isEditingOrbitSpan) {
                  setOrbitSpanInput(String(nextValue));
                }
              }}
              className="mt-3 w-full accent-[#e2793a]"
            />
            <div className="mt-3 flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#8b7c6a]">
              <span>Zoom</span>
              <button
                type="button"
                aria-pressed={zoomLocked}
                onClick={() => setZoomLocked((prev) => !prev)}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold tracking-[0.2em] transition ${
                  zoomLocked
                    ? "border-[#e2793a] text-[#b04a1f]"
                    : "border-[#e7dbcb] text-[#6f6458] hover:border-[#bfae99]"
                }`}
              >
                {zoomLocked ? "Locked" : "Free"}
              </button>
            </div>
          </div>
        </div>

        <div className="px-6">
          <div className="rounded-2xl border border-black/10 bg-white/70 px-4 py-3">
            <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#8b7c6a]">
              <span>Environment</span>
              {environment ? (
                <button
                  type="button"
                  onClick={clearEnvironment}
                  className="rounded-full border border-[#e7dbcb] px-3 py-1 text-[11px] font-semibold tracking-[0.2em] text-[#5e554a] transition hover:border-[#bfae99]"
                >
                  Clear
                </button>
              ) : null}
            </div>
            <div className="mt-3 flex items-center gap-3 text-xs text-[#6f6458]">
              <label className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#5e554a] transition hover:border-black/20">
                Upload env
                <input
                  type="file"
                  accept=".hdr,.png,.jpg,.jpeg"
                  onChange={handleEnvironmentChange}
                  className="hidden"
                />
              </label>
              <span className="truncate text-[11px] text-[#8b7c6a]">
                {environment ? environment.name : "No environment loaded"}
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-3 px-6 pb-6">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.24em] text-[#8b7c6a]">
            <span>Layer stack</span>
            <span className="font-mono text-[10px]">Ordered by filename</span>
          </div>
          <ol className="space-y-2">
            {orderedLayers.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-black/10 px-4 py-5 text-xs text-[#9b8f84]">
                No layers yet. Add some PNGs to begin.
              </li>
            ) : (
              orderedLayers.map((layer, index) => {
                const orderLabel = Number.isFinite(layer.order)
                  ? String(layer.order).padStart(2, "0")
                  : "--";
                const isLast = index === orderedLayers.length - 1;
                return (
                  <li
                    key={layer.id}
                    className={`flex flex-col gap-3 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm ${
                      layer.visible ? "text-[#2f2a24]" : "text-[#9b8f84]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="rounded-full bg-[#f2e8da] px-2 py-1 text-xs font-semibold text-[#a24a21]">
                          {orderLabel}
                        </span>
                        <span className="truncate">
                          {layer.name}
                          {!layer.visible ? " (hidden)" : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-xs font-semibold">
                        <button
                          type="button"
                          className={`rounded-full border px-3 py-1 transition ${
                            layer.visible
                              ? "border-[#e7dbcb] text-[#5e554a] hover:border-[#bfae99]"
                              : "border-[#e2793a] text-[#b04a1f] hover:border-[#b04a1f]"
                          }`}
                          onClick={() => toggleLayer(layer.id)}
                        >
                          {layer.visible ? "Hide" : "Show"}
                        </button>
                        <button
                          type="button"
                          className="rounded-full border border-[#e7dbcb] px-3 py-1 text-[#5e554a] transition hover:border-[#bfae99]"
                          onClick={() => resetRotation(layer.id)}
                        >
                          Reset
                        </button>
                        <button
                          type="button"
                          className="text-[#b04a1f] transition hover:text-[#7f3212]"
                          onClick={() => removeLayer(layer.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2 rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#8b7c6a]">
                        <span>Gap to next</span>
                        <span className="font-mono">
                          {isLast ? "--" : layer.gapAfter.toFixed(2)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={0.02}
                        max={1.2}
                        step={0.02}
                        value={layer.gapAfter}
                        disabled={isLast}
                        onChange={(event) =>
                          updateGapAfter(
                            layer.id,
                            Number.parseFloat(event.target.value)
                          )
                        }
                        className="w-full accent-[#e2793a] disabled:cursor-not-allowed"
                      />
                    </div>
                    <div className="space-y-2 rounded-2xl border border-black/5 bg-white/70 px-3 py-2">
                      <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-[#8b7c6a]">
                        <span>Rotate</span>
                        <span className="font-mono text-[10px]">
                          {layer.rotation.x.toFixed(0)}° ·{" "}
                          {layer.rotation.y.toFixed(0)}° ·{" "}
                          {layer.rotation.z.toFixed(0)}°
                        </span>
                      </div>
                      {(["x", "y", "z"] as const).map((axis) => (
                        <div
                          key={axis}
                          className="flex items-center gap-3 text-xs text-[#8b7c6a]"
                        >
                          <span className="w-3 font-mono uppercase">
                            {axis}
                          </span>
                          <input
                            type="range"
                            min={-180}
                            max={180}
                            step={1}
                            value={layer.rotation[axis]}
                            onChange={(event) =>
                              updateRotation(
                                layer.id,
                                axis,
                                Number.parseFloat(event.target.value)
                              )
                            }
                            aria-label={`Rotate ${layer.name} on ${axis}`}
                            className="w-full accent-[#1e1b16]"
                          />
                          {editingRotation?.id === layer.id &&
                          editingRotation.axis === axis ? (
                            <input
                              type="number"
                              min={-180}
                              max={180}
                              value={rotationInput}
                              onChange={(event) =>
                                setRotationInput(event.target.value)
                              }
                              onBlur={() =>
                                commitRotationInput(layer.rotation[axis])
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  commitRotationInput(layer.rotation[axis]);
                                }
                                if (event.key === "Escape") {
                                  setEditingRotation(null);
                                  setRotationInput("");
                                }
                              }}
                              autoFocus
                              className="w-14 rounded-md border border-black/10 bg-white/90 px-2 py-1 text-right font-mono text-[10px] text-[#6f6458]"
                            />
                          ) : (
                            <button
                              type="button"
                              onClick={() =>
                                startRotationEdit(
                                  layer.id,
                                  axis,
                                  layer.rotation[axis]
                                )
                              }
                              className="w-14 rounded-md px-2 py-1 text-right font-mono text-[10px] text-[#6f6458] transition hover:text-[#1e1b16]"
                            >
                              {layer.rotation[axis].toFixed(0)}°
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </li>
                );
              })
            )}
          </ol>
        </div>
      </div>
    </section>
  );

  return (
    <div className="min-h-screen px-6 py-10">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <section
          ref={viewerRef}
          className="order-1 relative flex min-h-[60vh] flex-1 flex-col overflow-hidden rounded-[32px] border border-black/10 bg-white/60 shadow-[var(--shadow)] lg:order-none"
        >
          <ParallaxScene
            className="absolute inset-0"
            layers={orderedLayers}
            orbitSpanDegrees={orbitSpan}
            zoomLocked={zoomLocked}
            environmentUrl={environment?.url ?? null}
            environmentType={environment?.type ?? null}
          />
          <div className="absolute right-6 top-6 z-20 flex flex-col items-end gap-2">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#5e554a] transition hover:border-black/20"
            >
              {isFullscreen ? "Exit full screen" : "Full screen"}
            </button>
            {isFullscreen ? (
              <button
                type="button"
                onClick={() => setShowOverlayControls((prev) => !prev)}
                className="rounded-full border border-black/10 bg-white/80 px-3 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#5e554a] transition hover:border-black/20"
              >
                {showOverlayControls ? "Hide controls" : "Show controls"}
              </button>
            ) : null}
            {isFullscreen && showOverlayControls
              ? renderControlsPanel(
                  "hidden sm:flex w-[400px] max-w-[55vw]",
                  "max-h-[calc(100vh-140px)]"
                )
              : null}
          </div>
          {isFullscreen ? (
            <>
              <div className="absolute inset-x-4 bottom-6 z-20 sm:hidden">
                {showOverlayControls
                  ? renderControlsPanel(
                      "w-full",
                      "max-h-[calc(100vh-260px)]"
                    )
                  : null}
              </div>
            </>
          ) : null}
          <div className="pointer-events-none absolute inset-x-6 top-6 flex flex-wrap items-center gap-3 text-xs uppercase tracking-[0.24em] text-[#8b7c6a]">
            <span>Drag to orbit</span>
            <span>Scroll to zoom</span>
          </div>
          {orderedLayers.length === 0 ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="rounded-2xl border border-dashed border-black/10 bg-white/80 px-6 py-4 text-center text-sm text-[#6f6458]">
                Upload layers to see the parallax stack.
              </div>
            </div>
          ) : null}
          <div className="pointer-events-none absolute inset-x-6 bottom-6 flex items-center justify-between text-xs text-[#8b7c6a]">
            <span className="font-mono">Scene ready</span>
            <span>
              {orderedLayers.filter((layer) => layer.visible).length} planes
            </span>
          </div>
        </section>

        {!isFullscreen &&
          renderControlsPanel(
            "w-full order-2 self-start lg:order-none lg:w-[400px]",
            "max-h-[calc(100vh-80px)]"
          )}
      </main>
    </div>
  );
}
