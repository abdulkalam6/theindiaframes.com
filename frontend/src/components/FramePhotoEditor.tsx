"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { CartCustomPhoto } from "@/stores/cart";
import {
  Check,
  FlipHorizontal2,
  ImagePlus,
  Loader2,
  Move,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  ShoppingCart,
  Sliders,
  Sparkles,
  Sun,
  ZoomIn,
} from "lucide-react";

interface FramePhotoEditorProps {
  productName: string;
  variantLabel: string;
  sku: string;
  quantity: number;
  disabled?: boolean;
  onPhotoAddedToCart: (photo: CartCustomPhoto) => void;
}

type Orientation = "portrait" | "landscape";
type MatColor = "none" | "white" | "cream";
type ColorPreset = "original" | "vivid" | "warm" | "bw";

interface FrameStyleConfig {
  outerColor: string;
  innerTrim: string;
  borderPx: number;
}

function parseAspectRatio(variantLabel: string): [number, number] {
  const lower = variantLabel.toLowerCase();
  if (lower.includes("a4")) return [8.3, 11.7];
  const m = lower.match(/(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/);
  if (m) {
    const a = parseFloat(m[1]);
    const b = parseFloat(m[2]);
    if (a > 0 && b > 0) {
      return a <= b ? [a, b] : [b, a];
    }
  }
  return [2, 3];
}

function getFrameStyle(productName: string): FrameStyleConfig {
  const lower = productName.toLowerCase();
  if (lower.includes("black")) {
    return { outerColor: "#14181F", innerTrim: "#334155", borderPx: 24 };
  }
  if (lower.includes("teak") || lower.includes("gold") || lower.includes("wood")) {
    return { outerColor: "#5A371E", innerTrim: "#C69A48", borderPx: 26 };
  }
  return { outerColor: "#3B2718", innerTrim: "#C69A48", borderPx: 24 };
}

function getPresetCssFilter(
  preset: ColorPreset,
  brightness: number,
  contrast: number
): string {
  const parts = [`brightness(${brightness}%)`, `contrast(${contrast}%)`];
  if (preset === "bw") parts.push("grayscale(100%)");
  if (preset === "vivid") parts.push("saturate(135%)");
  if (preset === "warm") parts.push("sepia(25%) saturate(115%)");
  return parts.join(" ");
}

export function FramePhotoEditor({
  productName,
  variantLabel,
  sku,
  quantity,
  disabled = false,
  onPhotoAddedToCart,
}: FramePhotoEditorProps) {
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>("");

  // Edit controls
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0); // normalized -1..1
  const [panY, setPanY] = useState<number>(0);
  const [rotation90, setRotation90] = useState<number>(0);
  const [straighten, setStraighten] = useState<number>(0);
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [matColor, setMatColor] = useState<MatColor>("white");
  const [preset, setPreset] = useState<ColorPreset>("original");

  // Pointer drag state
  const dragStateRef = useRef<{
    dragging: boolean;
    startX: number;
    startY: number;
    origPanX: number;
    origPanY: number;
  }>({ dragging: false, startX: 0, startY: 0, origPanX: 0, origPanY: 0 });

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [baseW, baseH] = parseAspectRatio(variantLabel);
  const ratioW = orientation === "portrait" ? baseW : baseH;
  const ratioH = orientation === "portrait" ? baseH : baseW;
  const frameStyle = getFrameStyle(productName);

  const renderComposition = useCallback(
    (
      canvas: HTMLCanvasElement,
      img: HTMLImageElement,
      targetW: number,
      targetH: number,
      includeFrameChrome: boolean
    ) => {
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, targetW, targetH);

      // Optional outer frame moulding for screen preview / cart thumbnail
      const frameBorder = includeFrameChrome
        ? Math.round(Math.min(targetW, targetH) * 0.065)
        : 0;

      if (includeFrameChrome) {
        ctx.fillStyle = frameStyle.outerColor;
        ctx.fillRect(0, 0, targetW, targetH);

        // Subtle bevel / gold trim line
        const trimPad = Math.max(2, Math.round(frameBorder * 0.72));
        ctx.strokeStyle = frameStyle.innerTrim;
        ctx.lineWidth = Math.max(2, Math.round(frameBorder * 0.14));
        ctx.strokeRect(
          trimPad,
          trimPad,
          targetW - trimPad * 2,
          targetH - trimPad * 2
        );
      }

      const innerX = frameBorder;
      const innerY = frameBorder;
      const innerW = targetW - frameBorder * 2;
      const innerH = targetH - frameBorder * 2;

      // Mat background
      const matPx =
        matColor === "none" ? 0 : Math.round(Math.min(innerW, innerH) * 0.06);
      ctx.fillStyle =
        matColor === "cream"
          ? "#F5EFE0"
          : matColor === "white"
          ? "#FFFFFF"
          : "#0B1726";
      ctx.fillRect(innerX, innerY, innerW, innerH);

      // Photo aperture
      const photoX = innerX + matPx;
      const photoY = innerY + matPx;
      const photoW = innerW - matPx * 2;
      const photoH = innerH - matPx * 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(photoX, photoY, photoW, photoH);
      ctx.clip();

      ctx.fillStyle = "#0F172A";
      ctx.fillRect(photoX, photoY, photoW, photoH);

      // Base cover scale so image fills aperture cleanly at zoom=1
      const totalDeg = rotation90 + straighten;
      const rad = (totalDeg * Math.PI) / 180;
      const swapped = Math.abs(rotation90 % 180) === 90;
      const effImgW = swapped ? img.naturalHeight : img.naturalWidth;
      const effImgH = swapped ? img.naturalWidth : img.naturalHeight;

      const coverScale = Math.max(photoW / effImgW, photoH / effImgH);
      const drawW = img.naturalWidth * coverScale * zoom;
      const drawH = img.naturalHeight * coverScale * zoom;

      const centerX = photoX + photoW / 2 + panX * photoW * 0.5;
      const centerY = photoY + photoH / 2 + panY * photoH * 0.5;

      ctx.translate(centerX, centerY);
      ctx.rotate(rad);
      ctx.filter = getPresetCssFilter(preset, brightness, contrast);
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      if (matPx > 0) {
        ctx.strokeStyle = "rgba(15, 23, 42, 0.18)";
        ctx.lineWidth = Math.max(1, Math.round(targetW * 0.002));
        ctx.strokeRect(photoX, photoY, photoW, photoH);
      }
    },
    [
      brightness,
      contrast,
      frameStyle.innerTrim,
      frameStyle.outerColor,
      matColor,
      panX,
      panY,
      preset,
      rotation90,
      straighten,
      zoom,
    ]
  );

  // Redraw preview canvas whenever image or edit settings change
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !loadedImage) return;

    const maxPreview = 440;
    const scale = maxPreview / Math.max(ratioW, ratioH);
    const w = Math.round(ratioW * scale);
    const h = Math.round(ratioH * scale);
    renderComposition(canvas, loadedImage, w, h, true);
  }, [loadedImage, ratioW, ratioH, renderComposition]);

  const handleFileSelected = (file: File) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setErrorMsg("Please choose a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setErrorMsg("Photo must be under 15 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const img = new window.Image();
      img.onload = () => {
        setLoadedImage(img);
        setOriginalFilename(file.name);
        // Auto-match orientation to uploaded photo
        setOrientation(
          img.naturalWidth > img.naturalHeight ? "landscape" : "portrait"
        );
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setRotation90(0);
        setStraighten(0);
        setBrightness(100);
        setContrast(100);
        setPreset("original");
      };
      img.onerror = () => {
        setErrorMsg("Could not decode the selected image file.");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetEdits = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setRotation90(0);
    setStraighten(0);
    setBrightness(100);
    setContrast(100);
    setPreset("original");
    setMatColor("white");
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loadedImage) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origPanX: panX,
      origPanY: panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!dragStateRef.current.dragging) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dx = ((e.clientX - dragStateRef.current.startX) / rect.width) * 2;
    const dy = ((e.clientY - dragStateRef.current.startY) / rect.height) * 2;
    setPanX(Math.max(-1.5, Math.min(1.5, dragStateRef.current.origPanX + dx)));
    setPanY(Math.max(-1.5, Math.min(1.5, dragStateRef.current.origPanY + dy)));
  };

  const handlePointerUp = () => {
    dragStateRef.current.dragging = false;
  };

  const handleSaveAndAddToCart = async () => {
    if (!loadedImage || disabled) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Export high-res PRINT-READY canvas (no screen frame chrome, exact crop/mat/edits)
      const printLongEdge = 1800;
      const printScale = printLongEdge / Math.max(ratioW, ratioH);
      const printW = Math.round(ratioW * printScale);
      const printH = Math.round(ratioH * printScale);

      const printCanvas = document.createElement("canvas");
      renderComposition(printCanvas, loadedImage, printW, printH, false);

      const blob = await new Promise<Blob | null>((resolve) =>
        printCanvas.toBlob(resolve, "image/jpeg", 0.92)
      );
      if (!blob) {
        throw new Error("Failed to export edited image.");
      }

      // 2. Export compact framed thumbnail (~15KB) for localStorage Cart & Checkout preview
      const thumbCanvas = document.createElement("canvas");
      const thumbScale = 260 / Math.max(ratioW, ratioH);
      renderComposition(
        thumbCanvas,
        loadedImage,
        Math.round(ratioW * thumbScale),
        Math.round(ratioH * thumbScale),
        true
      );
      const previewDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.78);

      // 3. Upload print-ready edited image to private backend storage
      const editSettings = {
        variantLabel,
        sku,
        orientation,
        zoom: Number(zoom.toFixed(2)),
        panX: Number(panX.toFixed(3)),
        panY: Number(panY.toFixed(3)),
        rotation: rotation90 + straighten,
        brightness,
        contrast,
        matColor,
        preset,
        printWidthPx: printW,
        printHeightPx: printH,
      };

      const baseName = originalFilename.replace(/\.[^.]+$/, "") || "framed-photo";
      const uploadName = `${baseName}-edited.jpg`;
      const formData = new FormData();
      formData.append("photo", blob, uploadName);
      formData.append("edit_settings", JSON.stringify(editSettings));

      const response = await fetch(
        `${API_BASE_URL.replace(/\/$/, "")}/custom-photos/upload`,
        {
          method: "POST",
          body: formData,
          credentials: "include",
        }
      );

      const json = (await response.json()) as {
        data?: { asset_id: string; original_filename: string };
        error?: { message?: string };
        detail?: string;
      };

      if (!response.ok || !json.data) {
        setErrorMsg(
          json.error?.message || json.detail || "Photo upload failed."
        );
        return;
      }

      const summaryParts = [
        orientation === "portrait" ? "Portrait" : "Landscape",
        matColor === "none"
          ? "No Mat"
          : matColor === "white"
          ? "White Mat"
          : "Cream Mat",
        `${Math.round(zoom * 100)}% zoom`,
      ];
      if (preset !== "original") summaryParts.push(preset.toUpperCase());

      onPhotoAddedToCart({
        assetId: json.data.asset_id,
        originalFilename: json.data.original_filename,
        previewDataUrl,
        editSummary: summaryParts.join(" · "),
      });
      setSuccessMsg(
        `Edited photo uploaded & added to cart (${quantity} × ${variantLabel}).`
      );
    } catch {
      setErrorMsg("Failed to upload edited photo. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section
      id="photo-editor"
      className="rounded-2xl bg-[#080f1d] border border-[#C69A48]/35 p-5 sm:p-6 space-y-5"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-[#E3C27B]">
            <Sparkles className="w-3.5 h-3.5 text-[#C69A48]" /> Custom Photo
            Frame Studio
          </span>
          <h2 className="text-lg font-serif font-bold text-white mt-0.5">
            Upload &amp; Edit Your Photo for {variantLabel}
          </h2>
          <p className="text-xs text-slate-400">
            Crop, zoom, rotate, adjust lighting, choose a mat border, and send
            your print-ready photo directly to our framing workshop.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFileSelected(f);
          }}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C69A48]/20 hover:bg-[#C69A48]/30 border border-[#C69A48]/50 text-[#E3C27B] font-semibold text-xs transition-colors shrink-0"
        >
          <ImagePlus className="w-4 h-4" />
          {loadedImage ? "Change Photo" : "Upload Your Photo"}
        </button>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-300 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-xs text-emerald-300 flex items-center justify-between gap-3">
          <span className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            {successMsg}
          </span>
          <a
            href="/cart"
            className="underline font-semibold text-white shrink-0"
          >
            View Cart →
          </a>
        </div>
      )}

      {!loadedImage ? (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f) handleFileSelected(f);
          }}
          onClick={() => fileInputRef.current?.click()}
          className="cursor-pointer rounded-xl border-2 border-dashed border-slate-700 hover:border-[#C69A48] bg-[#071421] p-10 text-center space-y-3 transition-colors"
        >
          <div className="w-14 h-14 rounded-2xl bg-[#C69A48]/15 border border-[#C69A48]/30 mx-auto flex items-center justify-center text-[#E3C27B]">
            <ImagePlus className="w-7 h-7" />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">
              Click or drag &amp; drop your photo here
            </p>
            <p className="text-xs text-slate-400 mt-1">
              Supports JPG, PNG, or WebP (up to 15 MB). Stored privately for
              your order only.
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Interactive Framed Preview Canvas */}
          <div className="lg:col-span-7 flex flex-col items-center gap-3 bg-[#060e1a] border border-slate-800 rounded-xl p-5">
            <canvas
              ref={previewCanvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              className="max-w-full max-h-[420px] rounded shadow-2xl cursor-grab active:cursor-grabbing touch-none"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#C69A48]" />
              Drag photo inside the frame to adjust crop position ·{" "}
              <span className="text-slate-300 font-medium">
                {originalFilename}
              </span>
            </p>
          </div>

          {/* Editing Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Orientation & Rotate */}
            <div className="p-3.5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                  <FlipHorizontal2 className="w-3.5 h-3.5 text-[#C69A48]" />
                  Frame Orientation &amp; Rotate
                </span>
                <button
                  type="button"
                  onClick={resetEdits}
                  className="text-[11px] text-slate-400 hover:text-[#E3C27B]"
                >
                  Reset
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {(["portrait", "landscape"] as const).map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() => setOrientation(o)}
                    className={`py-1.5 rounded-lg capitalize border transition-colors ${
                      orientation === o
                        ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {o}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRotation90((r) => (r - 90 + 360) % 360)}
                  className="py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Rotate Left
                </button>
                <button
                  type="button"
                  onClick={() => setRotation90((r) => (r + 90) % 360)}
                  className="py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-200 inline-flex items-center justify-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5" /> Rotate Right
                </button>
              </div>
            </div>

            {/* Zoom & Straighten */}
            <div className="p-3.5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <ZoomIn className="w-3.5 h-3.5 text-[#C69A48]" /> Zoom
                  </span>
                  <span className="font-mono text-[#E3C27B]">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={3}
                  step={0.05}
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full accent-[#C69A48]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#C69A48]" />{" "}
                    Straighten
                  </span>
                  <span className="font-mono text-[#E3C27B]">
                    {straighten}°
                  </span>
                </div>
                <input
                  type="range"
                  min={-30}
                  max={30}
                  step={1}
                  value={straighten}
                  onChange={(e) => setStraighten(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C69A48]"
                />
              </div>
            </div>

            {/* Lighting & Filter Presets */}
            <div className="p-3.5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Sun className="w-3.5 h-3.5 text-[#C69A48]" /> Brightness
                  </span>
                  <span className="font-mono text-slate-400">
                    {brightness}%
                  </span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={140}
                  step={2}
                  value={brightness}
                  onChange={(e) => setBrightness(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C69A48]"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Contrast</span>
                  <span className="font-mono text-slate-400">{contrast}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={140}
                  step={2}
                  value={contrast}
                  onChange={(e) => setContrast(parseInt(e.target.value, 10))}
                  className="w-full accent-[#C69A48]"
                />
              </div>

              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {(
                  [
                    { id: "original", label: "Original" },
                    { id: "vivid", label: "Vivid" },
                    { id: "warm", label: "Warm" },
                    { id: "bw", label: "B&W" },
                  ] as const
                ).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setPreset(p.id)}
                    className={`py-1.5 rounded-md border text-[11px] transition-colors ${
                      preset === p.id
                        ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inner Mat Border */}
            <div className="p-3.5 rounded-xl bg-[#0b1726] border border-slate-800 space-y-2">
              <span className="text-slate-300 font-semibold block">
                Inner Mat Border
              </span>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { id: "none", label: "No Mat" },
                    { id: "white", label: "White Mat" },
                    { id: "cream", label: "Cream Mat" },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMatColor(m.id)}
                    className={`py-1.5 rounded-lg border text-[11px] transition-colors ${
                      matColor === m.id
                        ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Primary Save & Add to Cart Button */}
            <button
              type="button"
              disabled={uploading || disabled}
              onClick={handleSaveAndAddToCart}
              className="w-full py-3.5 rounded-xl bg-[#C69A48] hover:bg-[#b58a3a] disabled:opacity-50 text-black font-semibold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading Print-Ready Photo…
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4" />
                  Save Edited Photo &amp; Add Frame to Cart
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
