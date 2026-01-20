"use client";

import { useState } from "react";
import type { LayerItem } from "@/components/ParallaxScene";

type ExportDialogProps = {
  open: boolean;
  onClose: () => void;
  layers: LayerItem[];
  orbitSpan: number;
  zoomLocked: boolean;
  environment: { name: string; url: string; type: "hdr" | "ldr" } | null;
};

type ExportResult = {
  shareUrl: string;
  embedUrl: string;
  embedCode: string;
};

export function ExportDialog({
  open,
  onClose,
  layers,
  orbitSpan,
  zoomLocked,
  environment,
}: ExportDialogProps) {
  const [title, setTitle] = useState("");
  const [expiration, setExpiration] = useState<"never" | "7d" | "30d" | "custom">("never");
  const [customDate, setCustomDate] = useState("");
  const [embedRestriction, setEmbedRestriction] = useState<"all" | "none" | "custom">("all");
  const [allowedDomains, setAllowedDomains] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ExportResult | null>(null);
  const [copied, setCopied] = useState<"share" | "embed" | null>(null);

  if (!open) return null;

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    // Calculate expiration date
    let expiresAt: string | null = null;
    if (expiration === "7d") {
      expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiration === "30d") {
      expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (expiration === "custom" && customDate) {
      expiresAt = new Date(customDate).toISOString();
    }

    // Parse allowed domains
    let parsedAllowedDomains: string[] | null = null;
    if (embedRestriction === "none") {
      parsedAllowedDomains = []; // Empty array = same origin only
    } else if (embedRestriction === "custom" && allowedDomains.trim()) {
      parsedAllowedDomains = allowedDomains
        .split(",")
        .map((d) => d.trim())
        .filter(Boolean);
    }
    // null = allow all

    // Build FormData
    const formData = new FormData();
    formData.append(
      "metadata",
      JSON.stringify({
        title: title || null,
        orbitSpan,
        zoomLocked,
        envType: environment?.type || null,
        expiresAt,
        allowedDomains: parsedAllowedDomains,
        layers: layers.map((l) => ({
          name: l.name,
          order: l.order,
          visible: l.visible,
          gapAfter: l.gapAfter,
          rotation: l.rotation,
        })),
      })
    );

    try {
      // Fetch blob data and append as files
      for (const layer of layers) {
        const response = await fetch(layer.url);
        const blob = await response.blob();
        formData.append("layers", blob, layer.name);
      }

      if (environment) {
        const response = await fetch(environment.url);
        const blob = await response.blob();
        formData.append("environment", blob, environment.name);
      }

      const res = await fetch("/api/export", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Export failed");
      }

      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const copyToClipboard = async (text: string, type: "share" | "embed") => {
    await navigator.clipboard.writeText(text);
    setCopied(type);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleClose = () => {
    setTitle("");
    setExpiration("never");
    setCustomDate("");
    setEmbedRestriction("all");
    setAllowedDomains("");
    setError(null);
    setResult(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-black/10 bg-[#fdf6ed] p-6 shadow-xl">
        <h2 className="text-lg font-semibold text-[#1e1b16]">Export Scene</h2>

        {result ? (
          <div className="mt-4 space-y-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#6f6458]">
                Share URL
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={result.shareUrl}
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.shareUrl, "share")}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-[#5e554a] transition hover:border-black/30"
                >
                  {copied === "share" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#6f6458]">
                Embed Code
              </label>
              <div className="mt-1 flex gap-2">
                <textarea
                  readOnly
                  value={result.embedCode}
                  rows={2}
                  className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(result.embedCode, "embed")}
                  className="rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium text-[#5e554a] transition hover:border-black/30"
                >
                  {copied === "embed" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-full bg-[#1e1b16] py-2.5 text-sm font-medium text-[#fdf6ed] transition hover:bg-[#2b2722]"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {error && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#6f6458]">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Scene"
                className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm placeholder:text-[#bfae99]"
              />
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#6f6458]">
                Expiration
              </label>
              <select
                value={expiration}
                onChange={(e) => setExpiration(e.target.value as typeof expiration)}
                className="mt-1 w-full appearance-none rounded-lg border border-black/10 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236f6458%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat px-3 py-2 pr-10 text-sm"
              >
                <option value="never">Never</option>
                <option value="7d">7 days</option>
                <option value="30d">30 days</option>
                <option value="custom">Custom date</option>
              </select>
              {expiration === "custom" && (
                <input
                  type="date"
                  value={customDate}
                  onChange={(e) => setCustomDate(e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm"
                />
              )}
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wider text-[#6f6458]">
                Embed Restrictions
              </label>
              <select
                value={embedRestriction}
                onChange={(e) => setEmbedRestriction(e.target.value as typeof embedRestriction)}
                className="mt-1 w-full appearance-none rounded-lg border border-black/10 bg-white bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2216%22%20height%3D%2216%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%236f6458%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpath%20d%3D%22m6%209%206%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:16px_16px] bg-[right_12px_center] bg-no-repeat px-3 py-2 pr-10 text-sm"
              >
                <option value="all">Allow all domains</option>
                <option value="none">Same origin only</option>
                <option value="custom">Specific domains</option>
              </select>
              {embedRestriction === "custom" && (
                <input
                  type="text"
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="example.com, *.mysite.com"
                  className="mt-2 w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-sm placeholder:text-[#bfae99]"
                />
              )}
              <p className="mt-1 text-[10px] text-[#9b8f84]">
                {embedRestriction === "all" && "Anyone can embed this scene"}
                {embedRestriction === "none" && "Only embeddable on your own domain"}
                {embedRestriction === "custom" && "Comma-separated list of allowed domains"}
              </p>
            </div>
            <div className="text-xs text-[#9b8f84]">
              {layers.length} layer{layers.length !== 1 ? "s" : ""} will be exported
              {environment ? ` with environment` : ""}
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 rounded-full border border-black/10 py-2.5 text-sm font-medium text-[#5e554a] transition hover:border-black/30"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={isExporting || layers.length === 0}
                className="flex-1 rounded-full bg-[#1e1b16] py-2.5 text-sm font-medium text-[#fdf6ed] transition hover:bg-[#2b2722] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isExporting ? "Exporting..." : "Export"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
