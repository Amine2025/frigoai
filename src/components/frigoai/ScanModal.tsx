"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Camera,
  X,
  ScanLine,
  ImageIcon,
  Check,
  CheckCircle2,
  Loader2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { useFrigoStore } from "@/store/frigo-store";
import { cn } from "@/lib/utils";
import type { ScannedItem } from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const MAX_DIMENSION = 1280; // downscale before sending

/** Downscale an image data URL to keep payloads reasonable. */
function downscaleDataUrl(
  dataUrl: string,
  maxDim = MAX_DIMENSION
): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      let { width, height } = img;
      if (width <= maxDim && height <= maxDim) {
        resolve(dataUrl);
        return;
      }
      const scale = Math.min(maxDim / width, maxDim / height);
      width = Math.round(width * scale);
      height = Math.round(height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      // JPEG at 0.85 quality keeps size low for photos
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/* ------------------------------------------------------------------ */
/*  Camera hook                                                        */
/* ------------------------------------------------------------------ */

function useCameraStream() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const stop = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraReady(false);
  }, []);

  const start = useCallback(async () => {
    setCameraError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Caméra non disponible sur cet appareil.");
        return false;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      setCameraReady(true);
      return true;
    } catch (err) {
      const e = err as DOMException;
      if (e?.name === "NotAllowedError") {
        setCameraError("Accès caméra refusé. Autorisez la caméra ou uploadez une photo.");
      } else if (e?.name === "NotFoundError") {
        setCameraError("Aucune caméra détectée. Uploadez une photo à la place.");
      } else {
        setCameraError("Impossible d'accéder à la caméra.");
      }
      return false;
    }
  }, []);

  const capture = useCallback((): string | null => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return null;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.9);
  }, []);

  useEffect(() => () => stop(), [stop]);

  return { videoRef, cameraReady, cameraError, start, stop, capture };
}

/* ------------------------------------------------------------------ */
/*  Result row                                                         */
/* ------------------------------------------------------------------ */

function ScanResultRow({
  item,
  index,
  selected,
  onToggle,
}: {
  item: ScannedItem;
  index: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const confPct = Math.round(item.confidence * 100);
  const confColor =
    item.confidence >= 0.7
      ? "text-[#00C16E]"
      : item.confidence >= 0.4
      ? "text-yellow-400"
      : "text-orange-400";

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.3) }}
      onClick={onToggle}
      className={cn(
        "tap w-full text-left rounded-2xl p-3 flex items-center gap-3 border transition-all",
        selected
          ? "glass-panel-emerald border-[#00C16E]/40"
          : "glass-panel border-white/10 hover:border-white/20"
      )}
    >
      {/* checkbox */}
      <span
        className={cn(
          "w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
          selected
            ? "bg-[#00C16E] border-[#00C16E]"
            : "border-white/30"
        )}
      >
        {selected && <Check className="w-3.5 h-3.5 text-black" strokeWidth={3} />}
      </span>

      {/* emoji */}
      <span className="text-2xl shrink-0 w-10 text-center" aria-hidden>
        {item.emoji}
      </span>

      {/* info */}
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white text-sm truncate">
          {item.name}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5 truncate">
          {item.category} · {item.quantity} {item.unit} · expire dans{" "}
          {item.estimatedExpirationDays}j
        </p>
      </div>

      {/* confidence */}
      <span className={cn("text-[10px] font-bold shrink-0", confColor)}>
        {confPct}%
      </span>
    </motion.button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main modal                                                         */
/* ------------------------------------------------------------------ */

type Phase = "capture" | "analyzing" | "results";

export function ScanModal() {
  const isOpen = useFrigoStore((s) => s.isScanModalOpen);
  const setOpen = useFrigoStore((s) => s.setScanModalOpen);
  const scanning = useFrigoStore((s) => s.scanning);
  const scanError = useFrigoStore((s) => s.scanError);
  const results = useFrigoStore((s) => s.scanResults);
  const scanImage = useFrigoStore((s) => s.scanImage);
  const addScannedItems = useFrigoStore((s) => s.addScannedItems);
  const resetScan = useFrigoStore((s) => s.resetScan);

  const { videoRef, cameraReady, cameraError, start, stop, capture } =
    useCameraStream();

  const [phase, setPhase] = useState<Phase>("capture");
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Start camera when modal opens; stop when it closes
  useEffect(() => {
    if (isOpen) {
      setPhase("capture");
      setCapturedUrl(null);
      setSelected(new Set());
      resetScan();
      // attempt to start camera (non-blocking; user can fallback to upload)
      void start();
    } else {
      stop();
    }
  }, [isOpen, start, stop, resetScan]);

  // When results arrive, switch to results phase and select all by default
  useEffect(() => {
    if (!scanning && results.length > 0 && phase === "analyzing") {
      setPhase("results");
      setSelected(new Set(results.map((_, i) => i)));
    }
    if (!scanning && scanError && phase === "analyzing") {
      setPhase("capture");
      setCapturedUrl(null);
    }
  }, [scanning, results, scanError, phase]);

  const handleClose = () => {
    stop();
    setOpen(false);
  };

  const handleCapture = async () => {
    const dataUrl = capture();
    if (!dataUrl) {
      toast.error("Capture impossible. Réessayez ou uploadez une photo.");
      return;
    }
    setCapturedUrl(dataUrl);
    await runScan(dataUrl);
  };

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image.");
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    setCapturedUrl(dataUrl);
    await runScan(dataUrl);
  };

  const runScan = async (rawDataUrl: string) => {
    setPhase("analyzing");
    const small = await downscaleDataUrl(rawDataUrl).catch(() => rawDataUrl);
    const ok = await scanImage(small);
    if (!ok) {
      // scanError already set in store; the effect will reset to capture
      toast.error(scanError || "Échec de l'analyse IA.");
    }
  };

  const handleRetake = () => {
    resetScan();
    setCapturedUrl(null);
    setPhase("capture");
    setSelected(new Set());
    // restart camera if it was stopped
    if (!cameraReady) void start();
  };

  const toggleSelected = (i: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleAddSelected = async () => {
    const chosen = results.filter((_, i) => selected.has(i));
    if (chosen.length === 0) {
      toast.error("Sélectionnez au moins un produit.");
      return;
    }
    setAdding(true);
    try {
      const added = await addScannedItems(chosen);
      toast.success(`✓ ${added} produit${added > 1 ? "s" : ""} ajouté${added > 1 ? "s" : ""} au frigo`, {
        description: chosen.map((c) => `${c.emoji} ${c.name}`).join(", "),
      });
      handleClose();
    } finally {
      setAdding(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={handleClose}
        >
          <motion.div
            initial={{ y: "100%", opacity: 0.6 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0.4 }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md glass-strong border border-white/15 rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[94dvh] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl glass-panel-emerald flex items-center justify-center">
                  <ScanLine className="w-4 h-4 text-[#00C16E]" strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-white leading-none">
                    Scanner le frigo
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Photo → IA identifie vos produits
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Fermer"
                className="tap w-8 h-8 rounded-xl glass-pill flex items-center justify-center text-gray-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto slim-scroll p-5">
              {/* ===== CAPTURE PHASE ===== */}
              {phase === "capture" && (
                <div className="space-y-4">
                  {/* Camera viewport */}
                  <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-black/60 border border-white/10">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className={cn(
                        "w-full h-full object-cover",
                        !cameraReady && "opacity-0"
                      )}
                    />

                    {/* Scanner overlay frame */}
                    {cameraReady && (
                      <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                        <div className="relative w-[78%] h-[60%]">
                          {/* corner brackets */}
                          {[
                            "top-0 left-0 border-t-2 border-l-2",
                            "top-0 right-0 border-t-2 border-r-2",
                            "bottom-0 left-0 border-b-2 border-l-2",
                            "bottom-0 right-0 border-b-2 border-r-2",
                          ].map((c) => (
                            <span
                              key={c}
                              className={cn(
                                "absolute w-6 h-6 border-[#00C16E] rounded-sm",
                                c
                              )}
                            />
                          ))}
                          {/* scan line */}
                          <motion.div
                            initial={{ top: "0%" }}
                            animate={{ top: ["0%", "100%", "0%"] }}
                            transition={{
                              duration: 2.4,
                              repeat: Infinity,
                              ease: "easeInOut",
                            }}
                            className="absolute left-0 right-0 h-0.5 bg-[#00C16E] shadow-[0_0_12px_2px_rgba(0,193,110,0.6)]"
                          />
                        </div>
                      </div>
                    )}

                    {/* Camera not ready / error overlay */}
                    {!cameraReady && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center p-6">
                        {cameraError ? (
                          <>
                            <AlertTriangle className="w-8 h-8 text-orange-400" />
                            <p className="text-xs text-gray-300 max-w-[260px]">
                              {cameraError}
                            </p>
                          </>
                        ) : (
                          <>
                            <Loader2 className="w-7 h-7 text-[#00C16E] animate-spin" />
                            <p className="text-xs text-gray-400">
                              Activation de la caméra…
                            </p>
                          </>
                        )}
                      </div>
                    )}

                    {/* Top-left hint badge */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-[10px] font-semibold text-[#00C16E] flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      IA Vision FrigoAi
                    </div>
                  </div>

                  {/* Primary actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleCapture}
                      disabled={!cameraReady}
                      className="tap col-span-2 glass-panel-emerald rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <Camera className="w-5 h-5" strokeWidth={2.4} />
                      Prendre une photo
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="tap glass-pill rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-semibold text-gray-200 border border-white/10"
                    >
                      <ImageIcon className="w-4 h-4" />
                      Uploader une photo
                    </button>
                    {cameraError && (
                      <button
                        onClick={() => void start()}
                        className="tap glass-pill rounded-2xl py-3 flex items-center justify-center gap-2 text-xs font-semibold text-gray-200 border border-white/10"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Réessayer caméra
                      </button>
                    )}
                  </div>

                  {/* Tips */}
                  <div className="glass-pill rounded-2xl p-3 text-[11px] text-gray-400 space-y-1">
                    <p className="font-semibold text-gray-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#00C16E]" />
                      Astuces pour une bonne reconnaissance
                    </p>
                    <ul className="space-y-0.5 pl-5 list-disc">
                      <li>Cadrez 1 à 8 produits visibles</li>
                      <li>Bonne luminosité, fond contrasté</li>
                      <li>Évitez les emballages qui cachent le contenu</li>
                    </ul>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void handleUpload(f);
                      e.target.value = "";
                    }}
                  />
                </div>
              )}

              {/* ===== ANALYZING PHASE ===== */}
              {phase === "analyzing" && (
                <div className="flex flex-col items-center justify-center text-center py-8">
                  {capturedUrl && (
                    <div className="relative w-40 h-40 rounded-2xl overflow-hidden border border-white/10 mb-5">
                      <img
                        src={capturedUrl}
                        alt="Aperçu capture"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                      {/* scanning line over preview */}
                      <motion.div
                        initial={{ top: "0%" }}
                        animate={{ top: ["0%", "100%", "0%"] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute left-0 right-0 h-0.5 bg-[#00C16E] shadow-[0_0_12px_2px_rgba(0,193,110,0.6)]"
                      />
                    </div>
                  )}
                  <Loader2 className="w-8 h-8 text-[#00C16E] animate-spin mb-3" />
                  <h4 className="font-display font-bold text-white text-base">
                    Analyse IA en cours…
                  </h4>
                  <p className="text-xs text-gray-400 mt-1.5 max-w-[280px]">
                    FrigoAi identifie les produits, estime leur fraîcheur et propose
                    une date de péremption pour chacun.
                  </p>
                </div>
              )}

              {/* ===== RESULTS PHASE ===== */}
              {phase === "results" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-bold text-white text-base flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-[#00C16E]" />
                        {results.length} produit{results.length > 1 ? "s" : ""} détecté
                        {results.length > 1 ? "s" : ""}
                      </h4>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Décochez les faux positifs, puis ajoutez.
                      </p>
                    </div>
                    <button
                      onClick={handleRetake}
                      className="tap glass-pill rounded-full px-3 py-2 flex items-center gap-1.5 text-[11px] font-semibold text-gray-200 border border-white/10"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Refaire
                    </button>
                  </div>

                  {capturedUrl && (
                    <div className="w-full h-24 rounded-2xl overflow-hidden border border-white/10 relative">
                      <img
                        src={capturedUrl}
                        alt="Photo scannée"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-white bg-black/40 px-2 py-1 rounded-full">
                        📸 Photo analysée
                      </span>
                    </div>
                  )}

                  <div className="space-y-2">
                    {results.map((item, i) => (
                      <ScanResultRow
                        key={`${item.name}-${i}`}
                        item={item}
                        index={i}
                        selected={selected.has(i)}
                        onToggle={() => toggleSelected(i)}
                      />
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-[11px] text-gray-400">
                      {selected.size} sélectionné{selected.size > 1 ? "s" : ""}
                    </span>
                    {selected.size > 0 && (
                      <button
                        onClick={() => setSelected(new Set())}
                        className="tap text-[11px] text-gray-400 hover:text-white flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Tout décocher
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Error fallback (if scan failed) */}
              {phase === "capture" && scanError && (
                <div className="mt-4 glass-pill rounded-2xl p-3 border border-orange-500/30 text-[11px] text-orange-300 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Analyse échouée</p>
                    <p className="text-orange-200/80 mt-0.5">{scanError}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer (only on results) */}
            {phase === "results" && (
              <div className="px-5 py-4 border-t border-white/10 shrink-0 safe-bottom">
                <button
                  onClick={handleAddSelected}
                  disabled={adding || selected.size === 0}
                  className="tap w-full glass-panel-emerald rounded-2xl py-3.5 flex items-center justify-center gap-2 text-sm font-bold text-white disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {adding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Ajout en cours…
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" strokeWidth={3} />
                      Ajouter {selected.size} produit{selected.size > 1 ? "s" : ""} au frigo
                    </>
                  )}
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
