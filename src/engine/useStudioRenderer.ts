"use client";

import { useEffect, type RefObject } from "react";
import type { MediaSource } from "@/types/studio";
import { useStudioStore } from "@/store/useStudioStore";
import { StudioRenderer, setRendererHandle } from "./StudioRenderer";

export function useStudioRenderer(canvasRef: RefObject<HTMLCanvasElement>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let renderer: StudioRenderer;
    try {
      renderer = new StudioRenderer(canvas);
    } catch (err) {
      useStudioStore.getState().setNotice(err instanceof Error ? err.message : "WebGL2 unavailable");
      return;
    }
    setRendererHandle(renderer);

    const parent = canvas.parentElement!;
    const ro = new ResizeObserver(() => {
      const r = parent.getBoundingClientRect();
      renderer.resize(r.width, r.height);
    });
    ro.observe(parent);
    const r0 = parent.getBoundingClientRect();
    renderer.resize(r0.width, r0.height);

    let loadToken = 0;
    let activeVideo: HTMLVideoElement | null = null;

    const stopVideo = () => {
      if (!activeVideo) return;
      activeVideo.pause();
      if (activeVideo.srcObject) {
        (activeVideo.srcObject as MediaStream).getTracks().forEach((t) => t.stop());
        activeVideo.srcObject = null;
      }
      activeVideo.removeAttribute("src");
      activeVideo.load();
      activeVideo = null;
    };

    const fallback = (media: MediaSource, token: number) => {
      if (token !== loadToken) return;
      renderer.setProcedural(media.generatorId ?? "abstract-fallback");
    };

    const loadMedia = (media: MediaSource | null) => {
      const token = ++loadToken;
      stopVideo();
      if (!media) return;
      if (media.kind === "procedural") {
        renderer.setProcedural(media.generatorId ?? "abstract-fallback");
        return;
      }
      if (media.kind === "image" && media.url) {
        // Render the procedural stand-in immediately so the canvas is never
        // blank while the remote image downloads; swap to it once loaded.
        renderer.setProcedural(media.generatorId ?? "abstract-fallback");
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => { if (token === loadToken) renderer.setImage(img); };
        img.onerror = () => fallback(media, token);
        img.src = media.url;
        return;
      }
      if (media.kind === "video" && media.url) {
        renderer.setProcedural(media.generatorId ?? "abstract-fallback");
        const video = document.createElement("video");
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.loop = true;
        video.playsInline = true;
        activeVideo = video;
        video.onloadeddata = () => {
          if (token !== loadToken) return;
          renderer.setVideo(video);
          if (useStudioStore.getState().playback.playing) video.play().catch(() => {});
        };
        video.onerror = () => fallback(media, token);
        video.src = media.url;
        return;
      }
      if (media.kind === "webcam") {
        navigator.mediaDevices
          ?.getUserMedia({ video: { width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false })
          .then((stream) => {
            if (token !== loadToken) {
              stream.getTracks().forEach((t) => t.stop());
              return;
            }
            const video = document.createElement("video");
            video.muted = true;
            video.playsInline = true;
            video.srcObject = stream;
            activeVideo = video;
            video.onloadeddata = () => {
              if (token !== loadToken) return;
              renderer.setVideo(video, true);
              video.play().catch(() => {});
            };
          })
          .catch(() => {
            if (token !== loadToken) return;
            useStudioStore.getState().setNotice("Webcam unavailable — loaded CRT fallback");
            renderer.setProcedural("crt-static");
          });
      }
    };

    loadMedia(useStudioStore.getState().media);

    const unsub = useStudioStore.subscribe((s, prev) => {
      if (s.media !== prev.media) loadMedia(s.media);
      if (s.paramsRevision !== prev.paramsRevision) renderer.onParamsChanged();
      if (s.playback.playing !== prev.playback.playing) {
        if (s.playback.playing) renderer.play();
        else renderer.pause();
      }
    });

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      renderer.setMouse(e.clientX - r.left, e.clientY - r.top);
    };
    parent.addEventListener("pointermove", onMove);

    return () => {
      unsub();
      ro.disconnect();
      parent.removeEventListener("pointermove", onMove);
      loadToken++;
      stopVideo();
      setRendererHandle(null);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}