'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

export function LineDrawingCanvas({
  videoName,
  videoFile,
  videoSavedPath,
  onLineDraw,
  onSkip,
  initialLine = null,
  isReadOnly = false,
  showMinimalHeader = false,
}: {
  videoName: string;
  videoFile: File | null;
  videoSavedPath: string | null;
  onLineDraw?: (
    start: [number, number],
    end: [number, number],
    videoW: number,
    videoH: number,
  ) => void;
  onSkip?: () => void;
  initialLine?: {
    start: [number, number];
    end: [number, number];
    resolution: { width: number; height: number };
  } | null;
  isReadOnly?: boolean;
  showMinimalHeader?: boolean;
}) {
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [endPoint, setEndPoint] = useState<{ x: number; y: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [videoResolution, setVideoResolution] = useState({ width: 1280, height: 720 });
  const [loaded, setLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [showTutorial, setShowTutorial] = useState(!isReadOnly);
  const [countdown, setCountdown] = useState(5);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Sync video source URL
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      const t = setTimeout(() => setVideoUrl(url), 0);
      return () => {
        clearTimeout(t);
        URL.revokeObjectURL(url);
      };
    } else if (videoSavedPath) {
      const normalizedPath = videoSavedPath.replace(/\\/g, '/');
      const t = setTimeout(() => setVideoUrl(`${BACKEND_URL}/${normalizedPath}`), 0);
      return () => clearTimeout(t);
    }
  }, [videoFile, videoSavedPath]);

  // Tutorial countdown
  useEffect(() => {
    if (!showTutorial || isReadOnly) return;
    if (countdown <= 0) {
      const t = setTimeout(() => setShowTutorial(false), 0);
      return () => clearTimeout(t);
    }
    const timer = setTimeout(() => {
      setCountdown((c) => c - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown, showTutorial, isReadOnly]);

  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (startPoint) {
      // Draw Start Point (P1)
      ctx.shadowColor = '#3B82F6';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 8, 0, 2 * Math.PI);
      ctx.fillStyle = '#3B82F6';
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(startPoint.x, startPoint.y, 3.5, 0, 2 * Math.PI);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Label for Start Point
      ctx.font = 'bold 10px Inter, sans-serif';
      ctx.fillStyle = '#93C5FD';
      ctx.fillText('P1 Start', startPoint.x - 18, startPoint.y - 12);

      if (endPoint) {
        const isComplete = !isDrawing;
        const lineColor = isComplete ? '#10B981' : '#3B82F6';

        // Draw Line
        ctx.shadowColor = lineColor;
        ctx.shadowBlur = 10;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Draw End Point (P2)
        ctx.shadowColor = '#10B981';
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#10B981';
        ctx.fill();
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(endPoint.x, endPoint.y, 3.5, 0, 2 * Math.PI);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Label for End Point
        ctx.font = 'bold 10px Inter, sans-serif';
        ctx.fillStyle = '#A7F3D0';
        ctx.fillText('P2 End', endPoint.x - 16, endPoint.y - 12);

        // Calculate Perpendicular Vector for Entry / Exit Direction
        const dx = endPoint.x - startPoint.x;
        const dy = endPoint.y - startPoint.y;
        const len = Math.sqrt(dx * dx + dy * dy);

        if (len > 15) {
          // Normal vector pointing to ENTRY (+normal) side
          const nx = -dy / len;
          const ny = dx / len;
          const midX = (startPoint.x + endPoint.x) / 2;
          const midY = (startPoint.y + endPoint.y) / 2;

          // Helper to draw directional arrow
          const drawArrow = (fromX: number, fromY: number, toX: number, toY: number, color: string) => {
            const headLen = 8;
            const angle = Math.atan2(toY - fromY, toX - fromX);
            ctx.strokeStyle = color;
            ctx.fillStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(fromX, fromY);
            ctx.lineTo(toX, toY);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(toX, toY);
            ctx.lineTo(toX - headLen * Math.cos(angle - Math.PI / 6), toY - headLen * Math.sin(angle - Math.PI / 6));
            ctx.lineTo(toX - headLen * Math.cos(angle + Math.PI / 6), toY - headLen * Math.sin(angle + Math.PI / 6));
            ctx.closePath();
            ctx.fill();
          };

          // Helper to draw pill badge with background
          const drawBadge = (centerX: number, centerY: number, text: string, bgColor: string, textColor: string, borderColor: string) => {
            ctx.font = 'bold 11px Inter, sans-serif';
            const metrics = ctx.measureText(text);
            const padX = 8;
            const padY = 4;
            const width = metrics.width + padX * 2;
            const height = 18;
            const x = centerX - width / 2;
            const y = centerY - height / 2;

            ctx.fillStyle = bgColor;
            ctx.strokeStyle = borderColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.roundRect(x, y, width, height, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = textColor;
            ctx.textBaseline = 'middle';
            ctx.textAlign = 'center';
            ctx.fillText(text, centerX, centerY);
            ctx.textAlign = 'start';
            ctx.textBaseline = 'alphabetic';
          };

          // 1. Draw ENTRY (IN) Direction (+Normal Side)
          const inArrowDist = 32;
          drawArrow(midX, midY, midX + nx * inArrowDist, midY + ny * inArrowDist, '#10B981');
          drawBadge(midX + nx * 50, midY + ny * 50, '🟢 ENTRY (IN)', 'rgba(6, 78, 59, 0.9)', '#6EE7B7', '#10B981');

          // 2. Draw EXIT (OUT) Direction (-Normal Side)
          const outArrowDist = 32;
          drawArrow(midX, midY, midX - nx * outArrowDist, midY - ny * outArrowDist, '#EF4444');
          drawBadge(midX - nx * 50, midY - ny * 50, '🔴 EXIT (OUT)', 'rgba(127, 29, 29, 0.9)', '#FCA5A5', '#EF4444');
        }
      }
    }
  }, [startPoint, endPoint, isDrawing]);

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  const handleClear = () => {
    setStartPoint(null);
    setEndPoint(null);
    setIsDrawing(false);
  };

  const handleSwapDirection = () => {
    if (!startPoint || !endPoint) return;
    const temp = { ...startPoint };
    setStartPoint({ ...endPoint });
    setEndPoint(temp);

    if (canvasSize) {
      const scaleX = videoResolution.width / canvasSize.width;
      const scaleY = videoResolution.height / canvasSize.height;
      const vStartX = Math.round(endPoint.x * scaleX);
      const vStartY = Math.round(endPoint.y * scaleY);
      const vEndX = Math.round(startPoint.x * scaleX);
      const vEndY = Math.round(startPoint.y * scaleY);
      onLineDraw?.([vStartX, vStartY], [vEndX, vEndY], videoResolution.width, videoResolution.height);
      toast.success('Inverted Entry ⇄ Exit direction');
    }
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setStartPoint({ x, y });
    setEndPoint({ x, y });
    setIsDrawing(true);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isReadOnly || !isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setEndPoint({ x, y });
  };

  const handleMouseUp = () => {
    if (isReadOnly || !isDrawing) return;
    setIsDrawing(false);
    if (startPoint && endPoint && canvasSize) {
      const scaleX = videoResolution.width / canvasSize.width;
      const scaleY = videoResolution.height / canvasSize.height;

      const vStartX = Math.round(startPoint.x * scaleX);
      const vStartY = Math.round(startPoint.y * scaleY);
      const vEndX = Math.round(endPoint.x * scaleX);
      const vEndY = Math.round(endPoint.y * scaleY);

      onLineDraw?.([vStartX, vStartY], [vEndX, vEndY], videoResolution.width, videoResolution.height);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full rounded-2xl border border-border bg-card p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between text-xs">
        <span className="font-bold text-foreground flex items-center gap-1.5">
          <span>Doorway / Gate Counting Threshold Line</span>
        </span>
        <div className="flex items-center gap-2">
          {startPoint && endPoint && !isReadOnly && (
            <button
              type="button"
              onClick={handleSwapDirection}
              className="rounded-md border border-primary/40 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary hover:bg-primary/20 transition-colors cursor-pointer"
            >
              ⇄ Swap Entry / Exit
            </button>
          )}
          {!isReadOnly && (
            <button
              type="button"
              onClick={handleClear}
              className="rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:bg-accent cursor-pointer"
            >
              Clear Line
            </button>
          )}
          {onSkip && (
            <button
              type="button"
              onClick={onSkip}
              className="text-[11px] text-muted-foreground hover:text-foreground underline cursor-pointer"
            >
              Skip Gate Line
            </button>
          )}
        </div>
      </div>

      <div className="relative h-80 w-full overflow-hidden rounded-xl border border-border bg-black flex items-center justify-center">
        {videoUrl ? (
          <video
            src={videoUrl}
            onLoadedMetadata={(e) => {
              const v = e.currentTarget;
              setVideoResolution({ width: v.videoWidth, height: v.videoHeight });
              setLoaded(true);
            }}
            className="h-full w-full object-contain pointer-events-none"
          />
        ) : (
          <div className="text-center text-xs text-muted-foreground p-4">
            Video preview will load here once footage is selected
          </div>
        )}

        {/* Overlay Canvas */}
        <canvas
          ref={canvasRef}
          width={canvasSize?.width || 600}
          height={canvasSize?.height || 320}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className="absolute inset-0 h-full w-full cursor-crosshair"
        />
      </div>

      {/* Legend & Direction Guidance */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-accent/20 px-3 py-2 text-[11px] text-muted-foreground border border-border/60">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span> 🟢 ENTRY (IN Side)
          </span>
          <span className="flex items-center gap-1 font-semibold text-rose-400">
            <span className="h-2 w-2 rounded-full bg-rose-500"></span> 🔴 EXIT (OUT Side)
          </span>
        </div>
        <span>Click & drag across doorway threshold. Use &quot;⇄ Swap Entry / Exit&quot; if inverted.</span>
      </div>
    </div>
  );
}
