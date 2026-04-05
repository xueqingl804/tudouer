import React from 'react';

interface ToolBarProps {
  onColorSelect: () => void;
  onLocate: () => void;
  onPause: () => void;
  isPaused: boolean;
  elapsedTime: string;
  onUndo?: () => void;
  canUndo?: boolean;
  totalProgress?: number;        // 0~1
  estimatedRemainingTime?: string;
  fillMode?: 'outline' | 'fill';
  onFillModeToggle?: () => void;
  isSettingOrigin?: boolean;
  onToggleSetOrigin?: () => void;
}

const ToolBar: React.FC<ToolBarProps> = ({
  onColorSelect,
  onLocate,
  onPause,
  isPaused,
  elapsedTime,
  onUndo,
  canUndo = false,
  totalProgress,
  estimatedRemainingTime,
  fillMode,
  onFillModeToggle,
  isSettingOrigin,
  onToggleSetOrigin,
}) => {
  const progressPct = totalProgress !== undefined ? Math.round(totalProgress * 100) : null;

  return (
    <div className="bg-white border-t border-gray-200">
      {/* 进度条 */}
      {progressPct !== null && (
        <div className="relative h-1.5 bg-gray-200">
          <div
            className="absolute inset-y-0 left-0 bg-green-500 transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}

      {/* 主工具栏 */}
      <div className="px-4 py-2 flex items-center justify-around">
        {/* 颜色选择 */}
        <button
          onClick={onColorSelect}
          className="flex flex-col items-center space-y-1 text-gray-600 hover:text-blue-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 2a2 2 0 00-2 2v11a3 3 0 106 0V4a2 2 0 00-2-2H4zm1 14a1 1 0 100-2 1 1 0 000 2zm5-1.757l4.9-4.9a2 2 0 000-2.828L13.485 5.1a2 2 0 00-2.828 0L10 5.757v8.486zM16 18H9.071l6-6H16a2 2 0 012 2v2a2 2 0 01-2 2z" clipRule="evenodd" />
          </svg>
          <span className="text-xs">颜色</span>
        </button>

        {/* 定位 */}
        <button
          onClick={onLocate}
          className="flex flex-col items-center space-y-1 text-gray-600 hover:text-green-600 transition-colors"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs">定位</span>
        </button>

        {/* 撤销 */}
        {onUndo && (
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              canUndo ? 'text-orange-500 hover:text-orange-600' : 'text-gray-300'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span className="text-xs">撤销</span>
          </button>
        )}

        {/* 轮廓/填充模式 */}
        {onFillModeToggle && (
          <button
            onClick={onFillModeToggle}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              fillMode === 'outline' ? 'text-purple-600' : 'text-gray-600 hover:text-purple-500'
            }`}
            title={fillMode === 'outline' ? '当前：轮廓模式（点击切换）' : '当前：色块模式（点击切换）'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={2} stroke="currentColor" fill="none" />
              {fillMode === 'outline' ? (
                <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth={1.5} stroke="currentColor" strokeDasharray="3 2" fill="none" />
              ) : (
                <rect x="7" y="7" width="10" height="10" rx="1" strokeWidth={1.5} fill="currentColor" />
              )}
            </svg>
            <span className="text-xs">{fillMode === 'outline' ? '轮廓' : '色块'}</span>
          </button>
        )}

        {/* 坐标原点 */}
        {onToggleSetOrigin && (
          <button
            onClick={onToggleSetOrigin}
            className={`flex flex-col items-center space-y-1 transition-colors ${
              isSettingOrigin ? 'text-blue-600' : 'text-gray-600 hover:text-blue-500'
            }`}
            title={isSettingOrigin ? '点击画布设置原点坐标（再次点击取消）' : '设置坐标原点'}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v20M2 12h20" />
              <circle cx="12" cy="12" r="3" strokeWidth={2} stroke="currentColor" fill="none" />
            </svg>
            <span className="text-xs">{isSettingOrigin ? '设原点' : '坐标'}</span>
          </button>
        )}

        {/* 计时器/暂停 */}
        <button
          onClick={onPause}
          className={`flex flex-col items-center space-y-1 transition-colors ${
            isPaused
              ? 'text-green-600 hover:text-green-700'
              : 'text-red-600 hover:text-red-700'
          }`}
        >
          {isPaused ? (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          )}
          <span className="text-xs font-mono">{elapsedTime}</span>
        </button>
      </div>

      {/* 进度信息 */}
      {progressPct !== null && (
        <div className="px-4 pb-1 flex items-center justify-between text-xs text-gray-400">
          <span>总进度 {progressPct}%</span>
          {estimatedRemainingTime && <span>预计剩余 {estimatedRemainingTime}</span>}
        </div>
      )}
    </div>
  );
};

export default ToolBar;
