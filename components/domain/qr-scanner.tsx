"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DetectedBarcode {
  rawValue: string;
}
interface BarcodeDetectorLike {
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorCtor = new (opts: { formats: string[] }) => BarcodeDetectorLike;

/**
 * Live camera QR reader. Uses the browser's built-in BarcodeDetector where it
 * exists (Chrome, Android) and falls back to decoding frames with jsQR
 * (Safari/iOS, Firefox). Reports each code once, then ignores the same code
 * for a few seconds so holding it in view doesn't fire repeatedly.
 */
export function QrScanner({ onCode, paused }: { onCode: (code: string) => void; paused: boolean }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCodeRef = useRef(onCode);
  const pausedRef = useRef(paused);
  const [active, setActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    onCodeRef.current = onCode;
    pausedRef.current = paused;
  }, [onCode, paused]);

  useEffect(() => {
    if (!active) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    let last = { code: "", at: 0 };
    let lastScanAt = 0;
    const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
    const detector = Detector ? new Detector({ formats: ["qr_code"] }) : null;

    function report(code: string) {
      const now = Date.now();
      if (code === last.code && now - last.at < 4000) return;
      last = { code, at: now };
      onCodeRef.current(code);
    }

    async function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      // ~8 scans a second is plenty and keeps phones cool.
      if (video && canvas && video.readyState >= 2 && !pausedRef.current && Date.now() - lastScanAt > 120) {
        lastScanAt = Date.now();
        try {
          if (detector) {
            const found = await detector.detect(video);
            if (found[0]?.rawValue) report(found[0].rawValue);
          } else {
            const w = video.videoWidth;
            const h = video.videoHeight;
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext("2d", { willReadFrequently: true });
            if (ctx && w && h) {
              ctx.drawImage(video, 0, 0, w, h);
              const result = jsQR(ctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: "dontInvert" });
              if (result?.data) report(result.data);
            }
          }
        } catch {
          // A frame that can't be read is fine; try the next one.
        }
      }
      frame = requestAnimationFrame(tick);
    }

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        if (stopped) return stream.getTracks().forEach((t) => t.stop());
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setError(null);
        frame = requestAnimationFrame(tick);
      } catch (err) {
        const name = err instanceof Error ? err.name : "";
        setError(
          name === "NotAllowedError"
            ? "Camera access was blocked. Allow the camera for this site in your browser settings, or type the code below."
            : name === "NotFoundError"
              ? "No camera found on this device. Use a handheld scanner or type the code below."
              : "The camera couldn't start. Use a handheld scanner or type the code below."
        );
        setActive(false);
      }
    })();

    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [active]);

  return (
    <div className="space-y-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border border-border bg-muted">
        <video
          ref={videoRef}
          className={active ? "size-full object-cover" : "hidden"}
          muted
          playsInline
          aria-label="Camera view for scanning QR codes"
        />
        {active ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="size-48 rounded-xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.25)]" />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
            <Camera className="size-8 text-muted-foreground" />
            <p className="max-w-xs text-sm text-muted-foreground">
              {error ?? "Start the camera and hold a garment's QR tag inside the frame."}
            </p>
          </div>
        )}
        <canvas ref={canvasRef} className="hidden" />
      </div>
      <Button type="button" variant={active ? "outline" : "default"} className="w-full" onClick={() => setActive((v) => !v)}>
        {active ? <CameraOff className="size-4" /> : <Camera className="size-4" />}
        {active ? "Stop Camera" : "Start Camera"}
      </Button>
    </div>
  );
}
