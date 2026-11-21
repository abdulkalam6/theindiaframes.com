"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { API_BASE_URL } from "@/lib/api";
import type { CartCustomPhoto } from "@/stores/cart";
import {
  AlignCenter,
  Bold,
  Check,
  Copy,
  Crop,
  FlipHorizontal2,
  FlipVertical2,
  Frame,
  ImagePlus,
  Italic,
  Loader2,
  Move,
  Palette,
  Plus,
  RotateCcw,
  RotateCw,
  ShieldAlert,
  ShoppingCart,
  Sliders,
  Sparkles,
  Trash2,
  Type,
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

type EditorTab = "crop" | "adjust" | "text" | "mat";
type Orientation = "portrait" | "landscape";
type FitMode = "cover" | "contain";
type MatWidth = "none" | "thin" | "medium" | "wide";
type CornerAccent = "none" | "gold_corners" | "double_border";
type ColorPreset =
  | "original"
  | "vivid"
  | "warm"
  | "bw"
  | "vintage"
  | "cool"
  | "dramatic";
type FramePreviewStyle = "auto" | "teak_gold" | "matte_black" | "walnut" | "royal_gold";

interface TextLayer {
  id: string;
  text: string;
  x: number; // normalized 0..1 across inner canvas
  y: number; // normalized 0..1 across inner canvas
  fontFamily: string;
  fontSize: number; // relative size (16..96 on 1000px base)
  color: string;
  bold: boolean;
  italic: boolean;
  shadow: boolean;
  bgPill: boolean;
  rotation: number;
  opacity: number;
}

interface FrameStyleConfig {
  outerColor: string;
  innerTrim: string;
}

const FONT_OPTIONS = [
  { label: "Classic Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Modern Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Elegant Script", value: "'Brush Script MT', 'Segoe Script', cursive" },
  { label: "Bold Display", value: "Impact, 'Arial Black', sans-serif" },
  { label: "Typewriter", value: "'Courier New', Courier, monospace" },
];

const TEXT_SWATCHES = [
  "#FFFFFF",
  "#E3C27B",
  "#111827",
  "#071421",
  "#F43F5E",
  "#FEF3C7",
  "#38BDF8",
];

const MAT_SWATCHES = [
  { label: "White", color: "#FFFFFF" },
  { label: "Warm Cream", color: "#F5EFE0" },
  { label: "Jet Black", color: "#111827" },
  { label: "Royal Navy", color: "#0B1726" },
  { label: "Champagne", color: "#E9DEC8" },
];

const QUICK_CAPTIONS = [
  "Forever & Always",
  "Happy Birthday",
  "Best Memories",
  "Family First",
  "Est. 2026",
];

const PRESET_LIST: Array<{ id: ColorPreset; label: string }> = [
  { id: "original", label: "Original" },
  { id: "vivid", label: "Vivid" },
  { id: "warm", label: "Warm" },
  { id: "bw", label: "B&W" },
  { id: "vintage", label: "Vintage" },
  { id: "cool", label: "Cool" },
  { id: "dramatic", label: "Dramatic" },
];

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

function getFrameStyle(
  productName: string,
  previewOverride: FramePreviewStyle
): FrameStyleConfig {
  if (previewOverride === "matte_black") {
    return { outerColor: "#14181F", innerTrim: "#334155" };
  }
  if (previewOverride === "teak_gold") {
    return { outerColor: "#5A371E", innerTrim: "#C69A48" };
  }
  if (previewOverride === "walnut") {
    return { outerColor: "#3D2414", innerTrim: "#7C4D2B" };
  }
  if (previewOverride === "royal_gold") {
    return { outerColor: "#9A742B", innerTrim: "#F3DCA0" };
  }
  const lower = productName.toLowerCase();
  if (lower.includes("black")) {
    return { outerColor: "#14181F", innerTrim: "#334155" };
  }
  return { outerColor: "#5A371E", innerTrim: "#C69A48" };
}

function buildCssFilter(
  preset: ColorPreset,
  brightness: number,
  contrast: number,
  saturation: number,
  sepia: number
): string {
  const parts = [
    `brightness(${brightness}%)`,
    `contrast(${contrast}%)`,
    `saturate(${saturation}%)`,
  ];
  if (sepia > 0) parts.push(`sepia(${sepia}%)`);

  if (preset === "bw") parts.push("grayscale(100%)");
  else if (preset === "vivid") parts.push("saturate(135%) contrast(106%)");
  else if (preset === "warm") parts.push("sepia(24%) saturate(118%)");
  else if (preset === "vintage")
    parts.push("sepia(45%) contrast(92%) brightness(104%)");
  else if (preset === "cool") parts.push("hue-rotate(12deg) saturate(108%)");
  else if (preset === "dramatic")
    parts.push("contrast(128%) saturate(85%) brightness(95%)");

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

  const [activeTab, setActiveTab] = useState<EditorTab>("crop");
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);
  const [originalFilename, setOriginalFilename] = useState<string>("");

  // Crop & Transform
  const [orientation, setOrientation] = useState<Orientation>("portrait");
  const [fitMode, setFitMode] = useState<FitMode>("cover");
  const [zoom, setZoom] = useState<number>(1);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [rotation90, setRotation90] = useState<number>(0);
  const [straighten, setStraighten] = useState<number>(0);
  const [flipH, setFlipH] = useState<boolean>(false);
  const [flipV, setFlipV] = useState<boolean>(false);

  // Adjust & Filters
  const [preset, setPreset] = useState<ColorPreset>("original");
  const [brightness, setBrightness] = useState<number>(100);
  const [contrast, setContrast] = useState<number>(100);
  const [saturation, setSaturation] = useState<number>(100);
  const [sepia, setSepia] = useState<number>(0);
  const [vignette, setVignette] = useState<number>(0);

  // Mat & Frame
  const [matWidth, setMatWidth] = useState<MatWidth>("medium");
  const [matColor, setMatColor] = useState<string>("#FFFFFF");
  const [goldLine, setGoldLine] = useState<boolean>(true);
  const [cornerAccent, setCornerAccent] = useState<CornerAccent>("none");
  const [framePreview, setFramePreview] = useState<FramePreviewStyle>("auto");

  // Multi-layer Text Overlays
  const [textLayers, setTextLayers] = useState<TextLayer[]>([]);
  const [selectedTextId, setSelectedTextId] = useState<string | null>(null);

  // Dragging (either photo pan OR dragging the selected text layer!)
  const dragRef = useRef<{
    mode: "none" | "photo" | "text";
    textId: string | null;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  }>({
    mode: "none",
    textId: null,
    startX: 0,
    startY: 0,
    origX: 0,
    origY: 0,
  });

  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [baseW, baseH] = parseAspectRatio(variantLabel);
  const ratioW = orientation === "portrait" ? baseW : baseH;
  const ratioH = orientation === "portrait" ? baseH : baseW;
  const frameStyle = getFrameStyle(productName, framePreview);

  const selectedText =
    textLayers.find((t) => t.id === selectedTextId) ?? null;

  const renderComposition = useCallback(
    (
      canvas: HTMLCanvasElement,
      img: HTMLImageElement,
      targetW: number,
      targetH: number,
      includeFrameChrome: boolean,
      showSelectionGuides: boolean
    ) => {
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, targetW, targetH);

      const frameBorder = includeFrameChrome
        ? Math.round(Math.min(targetW, targetH) * 0.065)
        : 0;

      if (includeFrameChrome) {
        ctx.fillStyle = frameStyle.outerColor;
        ctx.fillRect(0, 0, targetW, targetH);

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

      // Mat border sizing
      const matFactor =
        matWidth === "none"
          ? 0
          : matWidth === "thin"
          ? 0.04
          : matWidth === "medium"
          ? 0.075
          : 0.115;
      const matPx = Math.round(Math.min(innerW, innerH) * matFactor);

      ctx.fillStyle = matWidth === "none" ? "#0B1726" : matColor;
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

      ctx.fillStyle = matWidth === "none" ? "#0B1726" : matColor;
      ctx.fillRect(photoX, photoY, photoW, photoH);

      const totalDeg = rotation90 + straighten;
      const rad = (totalDeg * Math.PI) / 180;
      const swapped = Math.abs(rotation90 % 180) === 90;
      const effImgW = swapped ? img.naturalHeight : img.naturalWidth;
      const effImgH = swapped ? img.naturalWidth : img.naturalHeight;

      const baseScale =
        fitMode === "cover"
          ? Math.max(photoW / effImgW, photoH / effImgH)
          : Math.min(photoW / effImgW, photoH / effImgH);

      const drawW = img.naturalWidth * baseScale * zoom;
      const drawH = img.naturalHeight * baseScale * zoom;

      const centerX = photoX + photoW / 2 + panX * photoW * 0.5;
      const centerY = photoY + photoH / 2 + panY * photoH * 0.5;

      ctx.translate(centerX, centerY);
      ctx.rotate(rad);
      ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
      ctx.filter = buildCssFilter(
        preset,
        brightness,
        contrast,
        saturation,
        sepia
      );
      ctx.drawImage(img, -drawW / 2, -drawH / 2, drawW, drawH);
      ctx.restore();

      // Optional Studio Vignette
      if (vignette > 0) {
        ctx.save();
        ctx.beginPath();
        ctx.rect(photoX, photoY, photoW, photoH);
        ctx.clip();
        const cx = photoX + photoW / 2;
        const cy = photoY + photoH / 2;
        const outerR = Math.hypot(photoW / 2, photoH / 2);
        const grad = ctx.createRadialGradient(
          cx,
          cy,
          outerR * 0.35,
          cx,
          cy,
          outerR * 1.02
        );
        grad.addColorStop(0, "rgba(0,0,0,0)");
        grad.addColorStop(1, `rgba(0,0,0,${(vignette / 100) * 0.85})`);
        ctx.fillStyle = grad;
        ctx.fillRect(photoX, photoY, photoW, photoH);
        ctx.restore();
      }

      // Aperture hairline & decorative borders
      if (matPx > 0) {
        ctx.strokeStyle = goldLine ? "#C69A48" : "rgba(15, 23, 42, 0.22)";
        ctx.lineWidth = Math.max(
          1,
          Math.round(Math.min(innerW, innerH) * (goldLine ? 0.004 : 0.0025))
        );
        ctx.strokeRect(photoX, photoY, photoW, photoH);
      }

      if (cornerAccent === "double_border") {
        const inset = Math.max(4, Math.round(Math.min(photoW, photoH) * 0.03));
        ctx.strokeStyle = "#E3C27B";
        ctx.lineWidth = Math.max(1.5, Math.round(innerW * 0.003));
        ctx.strokeRect(
          photoX + inset,
          photoY + inset,
          photoW - inset * 2,
          photoH - inset * 2
        );
      } else if (cornerAccent === "gold_corners") {
        const inset = Math.max(6, Math.round(Math.min(photoW, photoH) * 0.035));
        const arm = Math.max(12, Math.round(Math.min(photoW, photoH) * 0.09));
        ctx.strokeStyle = "#E3C27B";
        ctx.lineWidth = Math.max(2, Math.round(innerW * 0.0045));
        const x1 = photoX + inset;
        const y1 = photoY + inset;
        const x2 = photoX + photoW - inset;
        const y2 = photoY + photoH - inset;
        ctx.beginPath();
        // Top-left
        ctx.moveTo(x1, y1 + arm);
        ctx.lineTo(x1, y1);
        ctx.lineTo(x1 + arm, y1);
        // Top-right
        ctx.moveTo(x2 - arm, y1);
        ctx.lineTo(x2, y1);
        ctx.lineTo(x2, y1 + arm);
        // Bottom-left
        ctx.moveTo(x1, y2 - arm);
        ctx.lineTo(x1, y2);
        ctx.lineTo(x1 + arm, y2);
        // Bottom-right
        ctx.moveTo(x2 - arm, y2);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x2, y2 - arm);
        ctx.stroke();
      }

      // Render Multi-Layer Custom Text Overlays
      const scaleFactor = Math.min(innerW, innerH) / 500;
      for (const layer of textLayers) {
        if (!layer.text.trim()) continue;
        const tx = innerX + layer.x * innerW;
        const ty = innerY + layer.y * innerH;
        const pxSize = Math.max(10, Math.round(layer.fontSize * scaleFactor));
        const lines = layer.text.split("\n");
        const lineHeight = pxSize * 1.22;

        ctx.save();
        ctx.translate(tx, ty);
        ctx.rotate((layer.rotation * Math.PI) / 180);
        ctx.globalAlpha = layer.opacity / 100;
        ctx.font = `${layer.italic ? "italic " : ""}${
          layer.bold ? "bold " : ""
        }${pxSize}px ${layer.fontFamily}`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const maxLineW = Math.max(
          ...lines.map((ln) => ctx.measureText(ln).width)
        );
        const totalH = lines.length * lineHeight;
        const padX = pxSize * 0.45;
        const padY = pxSize * 0.28;

        if (layer.bgPill) {
          ctx.fillStyle = "rgba(7, 20, 33, 0.72)";
          const rx = -maxLineW / 2 - padX;
          const ry = -totalH / 2 - padY;
          const rw = maxLineW + padX * 2;
          const rh = totalH + padY * 2;
          ctx.beginPath();
          ctx.roundRect(rx, ry, rw, rh, pxSize * 0.25);
          ctx.fill();
        }

        if (layer.shadow) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
          ctx.shadowBlur = Math.max(4, pxSize * 0.22);
          ctx.shadowOffsetX = Math.max(1, pxSize * 0.04);
          ctx.shadowOffsetY = Math.max(1, pxSize * 0.06);
        }

        ctx.fillStyle = layer.color;
        lines.forEach((ln, idx) => {
          const offsetY = (idx - (lines.length - 1) / 2) * lineHeight;
          ctx.fillText(ln, 0, offsetY);
        });

        // Subtle dashed highlight box on selected text in preview mode only
        if (showSelectionGuides && layer.id === selectedTextId) {
          ctx.shadowColor = "transparent";
          ctx.strokeStyle = "#E3C27B";
          ctx.lineWidth = 1.5;
          ctx.setLineDash([4, 3]);
          ctx.strokeRect(
            -maxLineW / 2 - padX,
            -totalH / 2 - padY,
            maxLineW + padX * 2,
            totalH + padY * 2
          );
        }

        ctx.restore();
      }
    },
    [
      brightness,
      contrast,
      cornerAccent,
      fitMode,
      flipH,
      flipV,
      frameStyle.innerTrim,
      frameStyle.outerColor,
      goldLine,
      matColor,
      matWidth,
      panX,
      panY,
      preset,
      rotation90,
      saturation,
      selectedTextId,
      sepia,
      straighten,
      textLayers,
      vignette,
      zoom,
    ]
  );

  // Redraw preview canvas
  useEffect(() => {
    const canvas = previewCanvasRef.current;
    if (!canvas || !loadedImage) return;

    const maxPreview = 460;
    const scale = maxPreview / Math.max(ratioW, ratioH);
    const w = Math.round(ratioW * scale);
    const h = Math.round(ratioH * scale);
    renderComposition(canvas, loadedImage, w, h, true, true);
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
        setOrientation(
          img.naturalWidth > img.naturalHeight ? "landscape" : "portrait"
        );
        setZoom(1);
        setPanX(0);
        setPanY(0);
        setRotation90(0);
        setStraighten(0);
        setFlipH(false);
        setFlipV(false);
      };
      img.onerror = () => {
        setErrorMsg("Could not decode the selected image file.");
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const resetAllEdits = () => {
    setFitMode("cover");
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setRotation90(0);
    setStraighten(0);
    setFlipH(false);
    setFlipV(false);
    setPreset("original");
    setBrightness(100);
    setContrast(100);
    setSaturation(100);
    setSepia(0);
    setVignette(0);
    setMatWidth("medium");
    setMatColor("#FFFFFF");
    setGoldLine(true);
    setCornerAccent("none");
    setTextLayers([]);
    setSelectedTextId(null);
  };

  // Text Layer CRUD
  const addTextLayer = (initialText = "Your Custom Text") => {
    const id = `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newLayer: TextLayer = {
      id,
      text: initialText,
      x: 0.5,
      y: matWidth !== "none" ? 0.94 : 0.85,
      fontFamily: FONT_OPTIONS[0].value,
      fontSize: 28,
      color: matWidth !== "none" && matColor === "#FFFFFF" ? "#111827" : "#FFFFFF",
      bold: true,
      italic: false,
      shadow: matWidth === "none",
      bgPill: false,
      rotation: 0,
      opacity: 100,
    };
    setTextLayers((prev) => [...prev, newLayer]);
    setSelectedTextId(id);
    setActiveTab("text");
  };

  const updateSelectedText = (patch: Partial<TextLayer>) => {
    if (!selectedTextId) return;
    setTextLayers((prev) =>
      prev.map((t) => (t.id === selectedTextId ? { ...t, ...patch } : t))
    );
  };

  const deleteTextLayer = (id: string) => {
    setTextLayers((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (selectedTextId === id) {
        setSelectedTextId(next[0]?.id ?? null);
      }
      return next;
    });
  };

  const duplicateSelectedText = () => {
    if (!selectedText) return;
    const copy: TextLayer = {
      ...selectedText,
      id: `txt-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      y: Math.min(0.95, selectedText.y + 0.08),
    };
    setTextLayers((prev) => [...prev, copy]);
    setSelectedTextId(copy.id);
  };

  // Smart Pointer Handling: hit-test text layers first so users can drag text directly!
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!loadedImage) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const normX = (e.clientX - rect.left) / rect.width;
    const normY = (e.clientY - rect.top) / rect.height;

    e.currentTarget.setPointerCapture(e.pointerId);

    // Hit-test text layers (topmost first)
    for (let i = textLayers.length - 1; i >= 0; i--) {
      const t = textLayers[i];
      if (Math.abs(normX - t.x) < 0.22 && Math.abs(normY - t.y) < 0.09) {
        setSelectedTextId(t.id);
        setActiveTab("text");
        dragRef.current = {
          mode: "text",
          textId: t.id,
          startX: e.clientX,
          startY: e.clientY,
          origX: t.x,
          origY: t.y,
        };
        return;
      }
    }

    dragRef.current = {
      mode: "photo",
      textId: null,
      startX: e.clientX,
      startY: e.clientY,
      origX: panX,
      origY: panY,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (dragRef.current.mode === "none") return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();

    if (dragRef.current.mode === "text" && dragRef.current.textId) {
      const dx = (e.clientX - dragRef.current.startX) / rect.width;
      const dy = (e.clientY - dragRef.current.startY) / rect.height;
      const nx = Math.max(0.06, Math.min(0.94, dragRef.current.origX + dx));
      const ny = Math.max(0.05, Math.min(0.96, dragRef.current.origY + dy));
      const tid = dragRef.current.textId;
      setTextLayers((prev) =>
        prev.map((t) => (t.id === tid ? { ...t, x: nx, y: ny } : t))
      );
      return;
    }

    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 2;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 2;
    setPanX(Math.max(-1.5, Math.min(1.5, dragRef.current.origX + dx)));
    setPanY(Math.max(-1.5, Math.min(1.5, dragRef.current.origY + dy)));
  };

  const handlePointerUp = () => {
    dragRef.current.mode = "none";
  };

  const handleSaveAndAddToCart = async () => {
    if (!loadedImage || disabled) return;
    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // 1. Export high-res PRINT-READY canvas (no screen frame chrome, no selection guides)
      const printLongEdge = 1800;
      const printScale = printLongEdge / Math.max(ratioW, ratioH);
      const printW = Math.round(ratioW * printScale);
      const printH = Math.round(ratioH * printScale);

      const printCanvas = document.createElement("canvas");
      renderComposition(printCanvas, loadedImage, printW, printH, false, false);

      const blob = await new Promise<Blob | null>((resolve) =>
        printCanvas.toBlob(resolve, "image/jpeg", 0.93)
      );
      if (!blob) throw new Error("Failed to export edited image.");

      // 2. Compact framed thumbnail for Cart & Checkout
      const thumbCanvas = document.createElement("canvas");
      const thumbScale = 260 / Math.max(ratioW, ratioH);
      renderComposition(
        thumbCanvas,
        loadedImage,
        Math.round(ratioW * thumbScale),
        Math.round(ratioH * thumbScale),
        true,
        false
      );
      const previewDataUrl = thumbCanvas.toDataURL("image/jpeg", 0.78);

      // 3. Upload print-ready image to private backend storage
      const nonEmptyTexts = textLayers
        .filter((t) => t.text.trim())
        .map((t) => t.text.trim());

      const editSettings = {
        variantLabel,
        sku,
        orientation,
        fitMode,
        zoom: Number(zoom.toFixed(2)),
        rotation: rotation90 + straighten,
        flipH,
        flipV,
        preset,
        brightness,
        contrast,
        saturation,
        sepia,
        vignette,
        matWidth,
        matColor: matWidth === "none" ? "none" : matColor,
        cornerAccent,
        textCount: nonEmptyTexts.length,
        texts: nonEmptyTexts.join(" | "),
        printWidthPx: printW,
        printHeightPx: printH,
      };

      const baseName =
        originalFilename.replace(/\.[^.]+$/, "") || "framed-photo";
      const formData = new FormData();
      formData.append("photo", blob, `${baseName}-print-ready.jpg`);
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
        matWidth === "none" ? "No Mat" : `${matWidth} mat`,
        `${Math.round(zoom * 100)}% zoom`,
      ];
      if (preset !== "original") summaryParts.push(preset.toUpperCase());
      if (nonEmptyTexts.length > 0) {
        summaryParts.push(
          `${nonEmptyTexts.length} text${nonEmptyTexts.length > 1 ? "s" : ""}`
        );
      }

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
      {/* Header */}
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
            Crop, rotate, flip, add custom text captions, apply studio filters,
            vignette, and mat borders before sending to our workshop.
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
        <div className="flex items-center gap-2 shrink-0">
          {loadedImage && (
            <button
              type="button"
              onClick={resetAllEdits}
              className="px-3 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
            >
              Reset All
            </button>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#C69A48]/20 hover:bg-[#C69A48]/30 border border-[#C69A48]/50 text-[#E3C27B] font-semibold text-xs transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
            {loadedImage ? "Change Photo" : "Upload Your Photo"}
          </button>
        </div>
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
              Supports JPG, PNG, or WebP (up to 15 MB). Crop, add text, apply
              filters &amp; mats right here.
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
              className="max-w-full max-h-[450px] rounded shadow-2xl cursor-grab active:cursor-grabbing touch-none"
            />
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5 text-center">
              <Move className="w-3.5 h-3.5 text-[#C69A48] shrink-0" />
              Drag photo to pan · Click &amp; drag any text directly to
              reposition ·{" "}
              <span className="text-slate-300 font-medium">
                {originalFilename}
              </span>
            </p>
          </div>

          {/* Studio Tool Tabs & Controls */}
          <div className="lg:col-span-5 space-y-4 text-xs">
            {/* Tab Bar */}
            <div className="grid grid-cols-4 gap-1.5 p-1 rounded-xl bg-[#060e1a] border border-slate-800">
              {(
                [
                  { id: "crop", label: "Crop", icon: Crop },
                  { id: "adjust", label: "Filters", icon: Palette },
                  { id: "text", label: "Text", icon: Type },
                  { id: "mat", label: "Mat", icon: Frame },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 rounded-lg flex flex-col items-center gap-1 text-[11px] transition-colors ${
                    activeTab === tab.id
                      ? "bg-[#C69A48] text-black font-semibold"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  <span>
                    {tab.label}
                    {tab.id === "text" && textLayers.length > 0
                      ? ` (${textLayers.length})`
                      : ""}
                  </span>
                </button>
              ))}
            </div>

            {/* TAB 1: CROP & TRANSFORM */}
            {activeTab === "crop" && (
              <div className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  {(["portrait", "landscape"] as const).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOrientation(o)}
                      className={`py-2 rounded-lg capitalize border transition-colors ${
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
                  {(
                    [
                      { id: "cover", label: "Fill Frame" },
                      { id: "contain", label: "Fit Full Photo" },
                    ] as const
                  ).map((fm) => (
                    <button
                      key={fm.id}
                      type="button"
                      onClick={() => {
                        setFitMode(fm.id);
                        setZoom(1);
                        setPanX(0);
                        setPanY(0);
                      }}
                      className={`py-1.5 rounded-lg border text-[11px] transition-colors ${
                        fitMode === fm.id
                          ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                          : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                      }`}
                    >
                      {fm.label}
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
                  <button
                    type="button"
                    onClick={() => setFlipH((v) => !v)}
                    className={`py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 ${
                      flipH
                        ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                        : "bg-slate-900 border-slate-700 text-slate-200"
                    }`}
                  >
                    <FlipHorizontal2 className="w-3.5 h-3.5" /> Flip H
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlipV((v) => !v)}
                    className={`py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 ${
                      flipV
                        ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                        : "bg-slate-900 border-slate-700 text-slate-200"
                    }`}
                  >
                    <FlipVertical2 className="w-3.5 h-3.5" /> Flip V
                  </button>
                </div>

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
                    min={0.5}
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
                    min={-45}
                    max={45}
                    step={1}
                    value={straighten}
                    onChange={(e) =>
                      setStraighten(parseInt(e.target.value, 10))
                    }
                    className="w-full accent-[#C69A48]"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setPanX(0);
                    setPanY(0);
                  }}
                  className="w-full py-1.5 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 text-slate-300 text-[11px]"
                >
                  Center Photo Position
                </button>
              </div>
            )}

            {/* TAB 2: ADJUST & FILTERS */}
            {activeTab === "adjust" && (
              <div className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 space-y-4">
                <div>
                  <span className="text-slate-400 block mb-2">
                    Studio Filter Presets
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {PRESET_LIST.map((p) => (
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

                {[
                  {
                    label: "Brightness",
                    val: brightness,
                    set: setBrightness,
                    min: 50,
                    max: 150,
                    unit: "%",
                  },
                  {
                    label: "Contrast",
                    val: contrast,
                    set: setContrast,
                    min: 50,
                    max: 150,
                    unit: "%",
                  },
                  {
                    label: "Saturation",
                    val: saturation,
                    set: setSaturation,
                    min: 0,
                    max: 200,
                    unit: "%",
                  },
                  {
                    label: "Warmth / Sepia",
                    val: sepia,
                    set: setSepia,
                    min: 0,
                    max: 100,
                    unit: "%",
                  },
                  {
                    label: "Studio Vignette",
                    val: vignette,
                    set: setVignette,
                    min: 0,
                    max: 80,
                    unit: "%",
                  },
                ].map((ctrl) => (
                  <div key={ctrl.label} className="space-y-1">
                    <div className="flex justify-between text-slate-300">
                      <span>{ctrl.label}</span>
                      <span className="font-mono text-slate-400">
                        {ctrl.val}
                        {ctrl.unit}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={ctrl.min}
                      max={ctrl.max}
                      step={2}
                      value={ctrl.val}
                      onChange={(e) => ctrl.set(parseInt(e.target.value, 10))}
                      className="w-full accent-[#C69A48]"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* TAB 3: TEXT & CAPTIONS */}
            {activeTab === "text" && (
              <div className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-slate-200 font-semibold">
                    Custom Text Overlays
                  </span>
                  <button
                    type="button"
                    onClick={() => addTextLayer()}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#C69A48] hover:bg-[#b58a3a] text-black font-semibold text-[11px]"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Text
                  </button>
                </div>

                {/* Quick Caption Templates */}
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_CAPTIONS.map((cap) => (
                    <button
                      key={cap}
                      type="button"
                      onClick={() => addTextLayer(cap)}
                      className="px-2 py-1 rounded bg-slate-900 border border-slate-700 hover:border-[#C69A48] text-[10px] text-slate-300"
                    >
                      + {cap}
                    </button>
                  ))}
                </div>

                {/* Layer Selector Pills */}
                {textLayers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1 border-t border-slate-800">
                    {textLayers.map((t, idx) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSelectedTextId(t.id)}
                        className={`px-2.5 py-1 rounded-md text-[11px] max-w-[140px] truncate border ${
                          t.id === selectedTextId
                            ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                            : "bg-slate-900 border-slate-700 text-slate-400"
                        }`}
                      >
                        #{idx + 1}: {t.text || "(empty)"}
                      </button>
                    ))}
                  </div>
                )}

                {selectedText ? (
                  <div className="space-y-3 pt-2 border-t border-slate-800">
                    <textarea
                      rows={2}
                      value={selectedText.text}
                      onChange={(e) =>
                        updateSelectedText({ text: e.target.value })
                      }
                      placeholder="Type your caption, name, date, or wish..."
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-slate-100 focus:outline-none focus:border-[#C69A48]"
                    />

                    {/* Font & Style Row */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <select
                        value={selectedText.fontFamily}
                        onChange={(e) =>
                          updateSelectedText({ fontFamily: e.target.value })
                        }
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-2 text-slate-200"
                      >
                        {FONT_OPTIONS.map((f) => (
                          <option key={f.label} value={f.value}>
                            {f.label}
                          </option>
                        ))}
                      </select>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedText({ bold: !selectedText.bold })
                          }
                          title="Bold"
                          className={`flex-1 py-2 rounded-lg border flex justify-center ${
                            selectedText.bold
                              ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          <Bold className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedText({ italic: !selectedText.italic })
                          }
                          title="Italic"
                          className={`flex-1 py-2 rounded-lg border flex justify-center ${
                            selectedText.italic
                              ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          <Italic className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedText({ shadow: !selectedText.shadow })
                          }
                          className={`flex-1 py-2 rounded-lg border text-[10px] ${
                            selectedText.shadow
                              ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          Shadow
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            updateSelectedText({ bgPill: !selectedText.bgPill })
                          }
                          className={`flex-1 py-2 rounded-lg border text-[10px] ${
                            selectedText.bgPill
                              ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B]"
                              : "bg-slate-900 border-slate-700 text-slate-400"
                          }`}
                        >
                          Badge
                        </button>
                      </div>
                    </div>

                    {/* Text Color */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-400">Color:</span>
                      {TEXT_SWATCHES.map((hex) => (
                        <button
                          key={hex}
                          type="button"
                          onClick={() => updateSelectedText({ color: hex })}
                          style={{ backgroundColor: hex }}
                          aria-label={`Color ${hex}`}
                          className={`w-5 h-5 rounded-full border-2 ${
                            selectedText.color === hex
                              ? "border-[#C69A48] scale-110"
                              : "border-slate-600"
                          }`}
                        />
                      ))}
                      <input
                        type="color"
                        value={selectedText.color}
                        onChange={(e) =>
                          updateSelectedText({ color: e.target.value })
                        }
                        aria-label="Custom text color"
                        className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                      />
                    </div>

                    {/* Size, Rotation & Opacity */}
                    <div className="space-y-2">
                      <div>
                        <div className="flex justify-between text-slate-400">
                          <span>Font Size</span>
                          <span className="font-mono">
                            {selectedText.fontSize}px
                          </span>
                        </div>
                        <input
                          type="range"
                          min={14}
                          max={84}
                          value={selectedText.fontSize}
                          onChange={(e) =>
                            updateSelectedText({
                              fontSize: parseInt(e.target.value, 10),
                            })
                          }
                          className="w-full accent-[#C69A48]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-slate-400">
                            <span>Tilt</span>
                            <span className="font-mono">
                              {selectedText.rotation}°
                            </span>
                          </div>
                          <input
                            type="range"
                            min={-45}
                            max={45}
                            value={selectedText.rotation}
                            onChange={(e) =>
                              updateSelectedText({
                                rotation: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-[#C69A48]"
                          />
                        </div>
                        <div>
                          <div className="flex justify-between text-slate-400">
                            <span>Opacity</span>
                            <span className="font-mono">
                              {selectedText.opacity}%
                            </span>
                          </div>
                          <input
                            type="range"
                            min={20}
                            max={100}
                            value={selectedText.opacity}
                            onChange={(e) =>
                              updateSelectedText({
                                opacity: parseInt(e.target.value, 10),
                              })
                            }
                            className="w-full accent-[#C69A48]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Placement & Layer Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => updateSelectedText({ x: 0.5, y: 0.12 })}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                        >
                          Top
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedText({ x: 0.5, y: 0.5 })}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300 inline-flex items-center gap-1"
                        >
                          <AlignCenter className="w-3 h-3" /> Center
                        </button>
                        <button
                          type="button"
                          onClick={() => updateSelectedText({ x: 0.5, y: 0.94 })}
                          className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-[10px] text-slate-300"
                        >
                          Bottom
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={duplicateSelectedText}
                          title="Duplicate text"
                          className="p-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteTextLayer(selectedText.id)}
                          title="Delete text"
                          className="p-1.5 rounded bg-red-950/60 border border-red-800 text-red-400 hover:text-red-300"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-slate-500 text-[11px]">
                    Click <strong>Add Text</strong> or any quick caption above
                    to add names, dates, or quotes onto your frame.
                  </p>
                )}
              </div>
            )}

            {/* TAB 4: MAT, BORDERS & FRAME PREVIEW */}
            {activeTab === "mat" && (
              <div className="p-4 rounded-xl bg-[#0b1726] border border-slate-800 space-y-4">
                <div>
                  <span className="text-slate-300 font-semibold block mb-2">
                    Inner Mat Width
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(["none", "thin", "medium", "wide"] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setMatWidth(w)}
                        className={`py-1.5 rounded-lg border capitalize text-[11px] ${
                          matWidth === w
                            ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>

                {matWidth !== "none" && (
                  <div className="space-y-2">
                    <span className="text-slate-300 font-semibold block">
                      Mat Color
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {MAT_SWATCHES.map((m) => (
                        <button
                          key={m.label}
                          type="button"
                          onClick={() => setMatColor(m.color)}
                          className={`px-2.5 py-1 rounded-md border text-[11px] flex items-center gap-1.5 ${
                            matColor === m.color
                              ? "border-[#C69A48] text-[#E3C27B] bg-[#C69A48]/15"
                              : "border-slate-700 text-slate-300 bg-slate-900"
                          }`}
                        >
                          <span
                            className="w-3 h-3 rounded-full border border-slate-500"
                            style={{ backgroundColor: m.color }}
                          />
                          {m.label}
                        </button>
                      ))}
                      <input
                        type="color"
                        value={matColor}
                        onChange={(e) => setMatColor(e.target.value)}
                        aria-label="Custom mat color"
                        className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                      />
                    </div>

                    <label className="flex items-center gap-2 text-slate-300 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={goldLine}
                        onChange={(e) => setGoldLine(e.target.checked)}
                        className="accent-[#C69A48]"
                      />
                      Gold inner trim hairline around photo
                    </label>
                  </div>
                )}

                <div>
                  <span className="text-slate-300 font-semibold block mb-2">
                    Decorative Inner Accent
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {(
                      [
                        { id: "none", label: "None" },
                        { id: "gold_corners", label: "Gold Corners" },
                        { id: "double_border", label: "Double Line" },
                      ] as const
                    ).map((ac) => (
                      <button
                        key={ac.id}
                        type="button"
                        onClick={() => setCornerAccent(ac.id)}
                        className={`py-1.5 rounded-lg border text-[11px] ${
                          cornerAccent === ac.id
                            ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {ac.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <span className="text-slate-300 font-semibold block mb-2">
                    Moulding Preview Style
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: "auto", label: "Product Default" },
                        { id: "teak_gold", label: "Teak & Gold" },
                        { id: "matte_black", label: "Matte Black" },
                        { id: "walnut", label: "Classic Walnut" },
                        { id: "royal_gold", label: "Royal Gold" },
                      ] as const
                    ).map((fp) => (
                      <button
                        key={fp.id}
                        type="button"
                        onClick={() => setFramePreview(fp.id)}
                        className={`py-1.5 rounded-lg border text-[11px] ${
                          framePreview === fp.id
                            ? "bg-[#C69A48]/20 border-[#C69A48] text-[#E3C27B] font-semibold"
                            : "bg-slate-900 border-slate-700 text-slate-400 hover:text-white"
                        }`}
                      >
                        {fp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

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
