'use client';

import React, { useRef, useEffect, TouchEvent, MouseEvent, useState, useCallback } from 'react';
import { MappedPixel } from '../utils/pixelation';
import { DrawingTool, GridCell, SelectionRect } from '../utils/drawingUtils';

interface PixelatedPreviewCanvasProps {
  mappedPixelData: MappedPixel[][] | null;
  gridDimensions: { N: number; M: number } | null;
  isManualColoringMode: boolean;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onInteraction: (
    clientX: number,
    clientY: number,
    pageX: number,
    pageY: number,
    isClick: boolean,
    isTouchEnd?: boolean
  ) => void;
  highlightColorKey?: string | null;
  onHighlightComplete?: () => void;
  // 绘图工具相关
  drawingTool?: DrawingTool;
  previewCells?: GridCell[];
  selectedColor?: string; // 当前选中颜色用于预览色
  onDrawStart?: (row: number, col: number) => void;
  onDrawMove?: (row: number, col: number) => void;
  onDrawEnd?: (row: number, col: number) => void;
  selectionRect?: SelectionRect | null;
}

const drawPixelatedCanvas = (
  dataToDraw: MappedPixel[][],
  canvas: HTMLCanvasElement | null,
  dims: { N: number; M: number } | null,
  highlightColorKey?: string | null,
  isHighlighting?: boolean
) => {
  if (!canvas || !dims || !dataToDraw) return;
  const pixelatedCtx = canvas.getContext('2d');
  if (!pixelatedCtx) return;

  const isDarkMode = typeof window !== 'undefined' && document.documentElement.classList.contains('dark');
  const externalBackgroundColor = isDarkMode ? '#374151' : '#F3F4F6';
  const gridLineColor = isDarkMode ? '#4B5563' : '#DDDDDD';

  const { N, M } = dims;
  const outputWidth = canvas.width;
  const outputHeight = canvas.height;
  const cellW = outputWidth / N;
  const cellH = outputHeight / M;

  pixelatedCtx.clearRect(0, 0, outputWidth, outputHeight);
  pixelatedCtx.lineWidth = 0.5;

  for (let j = 0; j < M; j++) {
    for (let i = 0; i < N; i++) {
      const cellData = dataToDraw[j]?.[i];
      if (!cellData) continue;
      const drawX = i * cellW;
      const drawY = j * cellH;

      pixelatedCtx.fillStyle = cellData.isExternal ? externalBackgroundColor : cellData.color;
      pixelatedCtx.fillRect(drawX, drawY, cellW, cellH);

      if (isHighlighting && highlightColorKey) {
        const shouldDim = cellData.isExternal || cellData.color.toUpperCase() !== highlightColorKey.toUpperCase();
        if (shouldDim) {
          pixelatedCtx.fillStyle = 'rgba(0,0,0,0.6)';
          pixelatedCtx.fillRect(drawX, drawY, cellW, cellH);
        }
      }

      pixelatedCtx.strokeStyle = gridLineColor;
      pixelatedCtx.strokeRect(drawX + 0.5, drawY + 0.5, cellW, cellH);
    }
  }
};

/** 在 overlay canvas 上渲染预览格子 */
const drawPreviewOverlay = (
  overlayCanvas: HTMLCanvasElement,
  dims: { N: number; M: number },
  cells: GridCell[],
  color: string
) => {
  const ctx = overlayCanvas.getContext('2d');
  if (!ctx) return;
  const { N, M } = dims;
  const cellW = overlayCanvas.width / N;
  const cellH = overlayCanvas.height / M;
  ctx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
  if (cells.length === 0) return;

  // 填充预览色（半透明）
  ctx.fillStyle = color.startsWith('#') ? hexToRgba(color, 0.55) : 'rgba(59,130,246,0.55)';
  for (const { row, col } of cells) {
    if (col >= 0 && col < N && row >= 0 && row < M) {
      ctx.fillRect(col * cellW, row * cellH, cellW, cellH);
    }
  }
  // 边框
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 1;
  for (const { row, col } of cells) {
    if (col >= 0 && col < N && row >= 0 && row < M) {
      ctx.strokeRect(col * cellW + 0.5, row * cellH + 0.5, cellW - 1, cellH - 1);
    }
  }
};

/** 在 overlay canvas 上渲染选区虚线框 */
const drawSelectionOverlay = (
  overlayCanvas: HTMLCanvasElement,
  dims: { N: number; M: number },
  rect: SelectionRect
) => {
  const ctx = overlayCanvas.getContext('2d');
  if (!ctx) return;
  const { N, M } = dims;
  const cellW = overlayCanvas.width / N;
  const cellH = overlayCanvas.height / M;

  const minR = Math.max(0, Math.min(rect.r1, rect.r2));
  const maxR = Math.min(M - 1, Math.max(rect.r1, rect.r2));
  const minC = Math.max(0, Math.min(rect.c1, rect.c2));
  const maxC = Math.min(N - 1, Math.max(rect.c1, rect.c2));

  const x = minC * cellW;
  const y = minR * cellH;
  const w = (maxC - minC + 1) * cellW;
  const h = (maxR - minR + 1) * cellH;

  // 半透明蓝色填充
  ctx.fillStyle = 'rgba(59,130,246,0.12)';
  ctx.fillRect(x, y, w, h);

  // 虚线边框
  ctx.save();
  ctx.strokeStyle = 'rgba(59,130,246,0.9)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 3]);
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.restore();

  // 中心辅助线（竖轴）
  const centerX = x + w / 2;
  ctx.save();
  ctx.strokeStyle = 'rgba(239,68,68,0.6)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(centerX, y);
  ctx.lineTo(centerX, y + h);
  ctx.stroke();
  // 中心辅助线（横轴）
  const centerY = y + h / 2;
  ctx.beginPath();
  ctx.moveTo(x, centerY);
  ctx.lineTo(x + w, centerY);
  ctx.stroke();
  ctx.restore();
};

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const PixelatedPreviewCanvas: React.FC<PixelatedPreviewCanvasProps> = ({
  mappedPixelData,
  gridDimensions,
  isManualColoringMode,
  canvasRef,
  onInteraction,
  highlightColorKey,
  onHighlightComplete,
  drawingTool = 'brush',
  previewCells = [],
  selectedColor = '#3b82f6',
  onDrawStart,
  onDrawMove,
  onDrawEnd,
  selectionRect,
}) => {
  const [darkModeState, setDarkModeState] = useState<boolean | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number; pageX: number; pageY: number } | null>(null);
  const touchMovedRef = useRef<boolean>(false);
  const [isHighlighting, setIsHighlighting] = useState(false);
  const overlayRef = useRef<HTMLCanvasElement | null>(null);
  const isDraggingRef = useRef(false);

  // Dark mode 检测
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const checkDarkMode = () => {
      const isDark = document.documentElement.classList.contains('dark');
      if (isDark !== darkModeState) setDarkModeState(isDark);
    };
    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [darkModeState]);

  // 重绘主画布
  useEffect(() => {
    if (mappedPixelData && gridDimensions && canvasRef.current && darkModeState !== null) {
      drawPixelatedCanvas(mappedPixelData, canvasRef.current, gridDimensions, highlightColorKey, isHighlighting);
    }
  }, [mappedPixelData, gridDimensions, canvasRef, darkModeState, highlightColorKey, isHighlighting]);

  // 同步 overlay 尺寸
  useEffect(() => {
    const main = canvasRef.current;
    const overlay = overlayRef.current;
    if (!main || !overlay) return;
    overlay.width = main.width;
    overlay.height = main.height;
  }, [canvasRef, mappedPixelData, gridDimensions]);

  // 渲染预览 overlay（绘图预览 + 选区框）
  useEffect(() => {
    const overlay = overlayRef.current;
    if (!overlay || !gridDimensions) return;
    const ctx = overlay.getContext('2d');
    ctx?.clearRect(0, 0, overlay.width, overlay.height);

    if (previewCells.length > 0) {
      drawPreviewOverlay(overlay, gridDimensions, previewCells, selectedColor);
    }
    if (selectionRect) {
      drawSelectionOverlay(overlay, gridDimensions, selectionRect);
    }
  }, [previewCells, selectedColor, gridDimensions, selectionRect]);

  // 高亮动画
  useEffect(() => {
    if (highlightColorKey && mappedPixelData && gridDimensions) {
      setIsHighlighting(true);
      const timer = setTimeout(() => {
        setIsHighlighting(false);
        onHighlightComplete?.();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [highlightColorKey, mappedPixelData, gridDimensions, onHighlightComplete]);

  /** 从鼠标事件计算网格行列 */
  const getCellFromEvent = useCallback((clientX: number, clientY: number): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas || !gridDimensions) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    const col = Math.floor(x / (canvas.width / gridDimensions.N));
    const row = Math.floor(y / (canvas.height / gridDimensions.M));
    if (col < 0 || col >= gridDimensions.N || row < 0 || row >= gridDimensions.M) return null;
    return { row, col };
  }, [canvasRef, gridDimensions]);

  // --- 鼠标事件 ---
  const handleMouseMove = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!isManualColoringMode) {
      onInteraction(event.clientX, event.clientY, event.pageX, event.pageY, false);
      return;
    }
    if (isDraggingRef.current) {
      const cell = getCellFromEvent(event.clientX, event.clientY);
      if (cell) onDrawMove?.(cell.row, cell.col);
    }
  };

  const handleMouseLeave = () => {
    onInteraction(0, 0, 0, 0, false, true);
  };

  const handleMouseDown = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!isManualColoringMode) return;
    isDraggingRef.current = true;
    const cell = getCellFromEvent(event.clientX, event.clientY);
    if (cell) {
      onDrawStart?.(cell.row, cell.col);
      onDrawMove?.(cell.row, cell.col);
    }
  };

  const handleMouseUp = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!isManualColoringMode || !isDraggingRef.current) return;
    isDraggingRef.current = false;
    const cell = getCellFromEvent(event.clientX, event.clientY);
    if (cell) {
      onDrawEnd?.(cell.row, cell.col);
    }
    // eyedropper: 用原来的 click 逻辑
    if (drawingTool === 'eyedropper') {
      onInteraction(event.clientX, event.clientY, event.pageX, event.pageY, true);
    }
  };

  const handleClick = (event: MouseEvent<HTMLCanvasElement>) => {
    if (!isManualColoringMode) {
      onInteraction(event.clientX, event.clientY, event.pageX, event.pageY, false);
    }
  };

  // --- 触摸事件 ---
  const handleTouchStart = (event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch) return;
    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY, pageX: touch.pageX, pageY: touch.pageY };
    touchMovedRef.current = false;
    if (!isManualColoringMode) {
      onInteraction(touch.clientX, touch.clientY, touch.pageX, touch.pageY, false);
      return;
    }
    isDraggingRef.current = true;
    const cell = getCellFromEvent(touch.clientX, touch.clientY);
    if (cell) { onDrawStart?.(cell.row, cell.col); onDrawMove?.(cell.row, cell.col); }
  };

  const handleTouchMove = (event: TouchEvent<HTMLCanvasElement>) => {
    const touch = event.touches[0];
    if (!touch || !touchStartPosRef.current) return;
    const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
    if (!touchMovedRef.current && (dx > 10 || dy > 10)) {
      touchMovedRef.current = true;
      if (!isManualColoringMode) { onInteraction(0, 0, 0, 0, false, true); return; }
    }
    if (isManualColoringMode && isDraggingRef.current) {
      const cell = getCellFromEvent(touch.clientX, touch.clientY);
      if (cell) onDrawMove?.(cell.row, cell.col);
    }
  };

  const handleTouchEnd = (event: TouchEvent<HTMLCanvasElement>) => {
    if (isManualColoringMode && isDraggingRef.current) {
      isDraggingRef.current = false;
      const touch = event.changedTouches[0];
      if (touch) {
        const cell = getCellFromEvent(touch.clientX, touch.clientY);
        if (cell) onDrawEnd?.(cell.row, cell.col);
      }
    }
    touchStartPosRef.current = null;
    touchMovedRef.current = false;
  };

  const cursorStyle = !isManualColoringMode ? 'cursor-grab'
    : drawingTool === 'eyedropper' ? 'cursor-crosshair'
    : drawingTool === 'brush' ? 'cursor-cell'
    : drawingTool === 'select' ? 'cursor-default'
    : 'cursor-crosshair';

  return (
    <div className="relative inline-block">
      <canvas
        ref={canvasRef}
        className={`border border-gray-300 dark:border-gray-600 max-w-full h-auto rounded block ${cursorStyle}`}
        style={{ imageRendering: 'pixelated' }}
      />
      {/* 预览 overlay */}
      <canvas
        ref={overlayRef}
        className={`absolute inset-0 max-w-full h-auto rounded ${isManualColoringMode ? 'pointer-events-auto' : 'pointer-events-none'}`}
        style={{ imageRendering: 'pixelated' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      />
    </div>
  );
};

export default PixelatedPreviewCanvas;
