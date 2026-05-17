'use client';

import React from 'react';
import { DrawingTool, SelectionRect, SymmetryType } from '../utils/drawingUtils';

interface FloatingToolbarProps {
  isManualColoringMode: boolean;
  isPaletteOpen: boolean;
  onTogglePalette: () => void;
  onExitManualMode: () => void;
  onToggleMagnifier: () => void;
  isMagnifierActive: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
  onRedo?: () => void;
  canRedo?: boolean;
  // 绘图工具
  drawingTool?: DrawingTool;
  onToolChange?: (tool: DrawingTool) => void;
  brushSize?: number;
  onBrushSizeChange?: (size: number) => void;
  // 选区对称
  selectionRect?: SelectionRect | null;
  onSymmetry?: (type: SymmetryType) => void;
  onClearSelection?: () => void;
}

const TOOLS: { tool: DrawingTool; label: string; title: string; icon: React.ReactNode }[] = [
  {
    tool: 'brush',
    label: '笔',
    title: '画笔',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.71 4.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.83 1.83 2.75 2.75M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z"/>
      </svg>
    ),
  },
  {
    tool: 'eyedropper',
    label: '取色',
    title: '取色器 - 点击格子提取颜色',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M20.71 5.63l-2.34-2.34a1 1 0 0 0-1.41 0l-3.12 3.12-1.41-1.42-1.42 1.42 1.41 1.41-6.6 6.6A2 2 0 0 0 5 16v3h3a2 2 0 0 0 1.42-.59l6.6-6.6 1.41 1.42 1.42-1.42-1.42-1.41 3.12-3.12a1 1 0 0 0 .16-1.25z"/>
      </svg>
    ),
  },
  {
    tool: 'line',
    label: '线',
    title: '直线工具 - 拖拽绘制直线',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
        <line x1="3" y1="21" x2="21" y2="3"/>
      </svg>
    ),
  },
  {
    tool: 'rect',
    label: '□',
    title: '矩形边框 - 拖拽绘制矩形轮廓',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="5" width="18" height="14" rx="1"/>
      </svg>
    ),
  },
  {
    tool: 'rect-fill',
    label: '■',
    title: '矩形填充 - 拖拽绘制填充矩形',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <rect x="3" y="5" width="18" height="14" rx="1"/>
      </svg>
    ),
  },
  {
    tool: 'circle',
    label: '○',
    title: '椭圆边框 - 拖拽绘制椭圆轮廓',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <ellipse cx="12" cy="12" rx="9" ry="6"/>
      </svg>
    ),
  },
  {
    tool: 'circle-fill',
    label: '●',
    title: '椭圆填充 - 拖拽绘制填充椭圆',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <ellipse cx="12" cy="12" rx="9" ry="6"/>
      </svg>
    ),
  },
  {
    tool: 'select',
    label: '选',
    title: '框选工具 - 拖拽选定区域后进行对称操作',
    icon: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray="3 2">
        <rect x="3" y="3" width="18" height="18" rx="1"/>
      </svg>
    ),
  },
];

const BRUSH_SIZES = [1, 3, 5];

const FloatingToolbar: React.FC<FloatingToolbarProps> = ({
  isManualColoringMode,
  isPaletteOpen,
  onTogglePalette,
  onExitManualMode,
  onToggleMagnifier,
  isMagnifierActive,
  onUndo,
  canUndo = false,
  onRedo,
  canRedo = false,
  drawingTool = 'brush',
  onToolChange,
  brushSize = 1,
  onBrushSizeChange,
  selectionRect,
  onSymmetry,
  onClearSelection,
}) => {
  if (!isManualColoringMode) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">

      {/* ── 绘图工具选择面板 ── */}
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-2xl shadow-lg p-2 flex flex-col gap-1">
        <p className="text-[9px] text-center text-gray-400 dark:text-gray-500 font-medium mb-0.5">工具</p>
        <div className="grid grid-cols-2 gap-1">
          {TOOLS.map(({ tool, title, icon }) => (
            <button
              key={tool}
              onClick={() => onToolChange?.(tool)}
              title={title}
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 ${
                drawingTool === tool
                  ? 'bg-blue-500 text-white shadow-md scale-105'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-600'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>

        {/* 画笔尺寸（仅画笔工具显示） */}
        {drawingTool === 'brush' && (
          <>
            <p className="text-[9px] text-center text-gray-400 dark:text-gray-500 font-medium mt-1">笔刷大小</p>
            <div className="flex gap-1 justify-center">
              {BRUSH_SIZES.map(s => (
                <button
                  key={s}
                  onClick={() => onBrushSizeChange?.(s)}
                  title={`笔刷 ${s}×${s}`}
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold transition-all ${
                    brushSize === s
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-blue-100 dark:hover:bg-gray-600'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── 对称操作面板（选区工具且有选区时显示） ── */}
      {drawingTool === 'select' && selectionRect && (
        <div className="bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-600 rounded-2xl shadow-lg p-2 flex flex-col gap-1">
          <p className="text-[9px] text-center text-blue-500 dark:text-blue-400 font-semibold mb-0.5">对称</p>
          <div className="grid grid-cols-2 gap-1">
            <button
              onClick={() => onSymmetry?.('left-right')}
              title="以选区中心为轴，左→右对称"
              className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all text-[9px] font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M5 8l4 4-4 4M19 8l-4 4 4 4"/>
              </svg>
              左→右
            </button>
            <button
              onClick={() => onSymmetry?.('right-left')}
              title="以选区中心为轴，右→左对称"
              className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all text-[9px] font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v18M19 8l-4 4 4 4M5 8l4 4-4 4"/>
              </svg>
              右→左
            </button>
            <button
              onClick={() => onSymmetry?.('top-bottom')}
              title="以选区中心为轴，上→下对称"
              className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all text-[9px] font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M8 5l4 4 4-4M8 19l4-4 4 4"/>
              </svg>
              上→下
            </button>
            <button
              onClick={() => onSymmetry?.('bottom-top')}
              title="以选区中心为轴，下→上对称"
              className="w-10 h-10 rounded-xl flex flex-col items-center justify-center gap-0.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-800/40 transition-all text-[9px] font-medium"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 12h18M8 19l4-4 4 4M8 5l4 4 4-4"/>
              </svg>
              下→上
            </button>
          </div>
          <button
            onClick={onClearSelection}
            className="mt-0.5 text-[9px] text-gray-400 dark:text-gray-500 hover:text-red-400 transition-colors text-center"
          >
            ✕ 取消选区
          </button>
        </div>
      )}

      {/* ── 调色盘 ── */}
      <button
        onClick={onTogglePalette}
        className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isPaletteOpen
            ? 'bg-blue-500 text-white hover:bg-blue-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
        }`}
        title={isPaletteOpen ? '关闭调色盘' : '打开调色盘'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
        </svg>
      </button>

      {/* ── 放大镜 ── */}
      <button
        onClick={onToggleMagnifier}
        className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
          isMagnifierActive
            ? 'bg-green-500 text-white hover:bg-green-600'
            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-600'
        }`}
        title={isMagnifierActive ? '关闭放大镜' : '打开放大镜'}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* ── 撤销 ── */}
      {onUndo && (
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
            canUndo
              ? 'bg-orange-500 text-white hover:bg-orange-600'
              : 'bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-gray-600 cursor-not-allowed'
          }`}
          title={canUndo ? '撤销 (Ctrl+Z)' : '没有可撤销的操作'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </button>
      )}

      {/* ── 重做 ── */}
      {onRedo && (
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`w-12 h-12 rounded-full shadow-lg transition-all duration-200 flex items-center justify-center ${
            canRedo
              ? 'bg-purple-500 text-white hover:bg-purple-600'
              : 'bg-white dark:bg-gray-800 text-gray-300 dark:text-gray-600 border border-gray-200 dark:border-gray-600 cursor-not-allowed'
          }`}
          title={canRedo ? '重做 (Ctrl+Y)' : '没有可重做的操作'}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
          </svg>
        </button>
      )}

      {/* ── 退出 ── */}
      <button
        onClick={onExitManualMode}
        className="w-12 h-12 rounded-full bg-red-500 text-white shadow-lg hover:bg-red-600 transition-all duration-200 flex items-center justify-center"
        title="退出手动编辑模式"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
};

export default FloatingToolbar;
