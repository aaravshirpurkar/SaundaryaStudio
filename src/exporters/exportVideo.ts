"use client";

export interface VideoExportOptions {
  canvas: HTMLCanvasElement;
  seconds: number;
  onProgress?: (fraction: number) => void;
}

export function exportVideo({ canvas, seconds, onProgress }: VideoExportOptions): Promise<Blob> {
  return new Promise((resolve, reject) => {
    if (typeof MediaRecorder === "undefined") {
      reject(new Error("MediaRecorder is not supported in this browser."));
      return;
    }
    const mime =
      MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : MediaRecorder.isTypeSupported("video/webm;codecs=vp8")
          ? "video/webm;codecs=vp8"
          : "video/webm";
    let stream: MediaStream;
    try {
      stream = canvas.captureStream(60);
    } catch {
      reject(new Error("Canvas captureStream failed."));
      return;
    }
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12_000_000 });
    const chunks: BlobPart[] = [];
    const started = performance.now();
    let timer = 0;

    rec.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
      onProgress?.(Math.min(1, (performance.now() - started) / (seconds * 1000)));
    };
    rec.onerror = () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      reject(new Error("MediaRecorder failed during capture."));
    };
    rec.onstop = () => {
      window.clearInterval(timer);
      stream.getTracks().forEach((t) => t.stop());
      onProgress?.(1);
      resolve(new Blob(chunks, { type: "video/webm" }));
    };

    rec.start(250);
    timer = window.setInterval(() => {
      const fraction = Math.min(1, (performance.now() - started) / (seconds * 1000));
      onProgress?.(fraction);
      if (fraction >= 1 && rec.state !== "inactive") rec.stop();
    }, 100);
  });
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}