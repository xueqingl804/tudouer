import React, { useState, useEffect } from 'react';
import { GridDownloadOptions } from '../types/downloadTypes';
import { MappedPixel } from '../utils/pixelation';
import { createFocusSession } from '../utils/focusSessionUtils';

const STORAGE_KEY = 'perler_license_key';

// 定义可选的网格线颜色
const gridLineColorOptions = [
  { name: '深灰色', value: '#555555' },
  { name: '红色', value: '#FF0000' },
  { name: '蓝色', value: '#0000FF' },
  { name: '绿色', value: '#008000' },
  { name: '紫色', value: '#800080' },
  { name: '橙色', value: '#FFA500' },
];

/** 专心拼豆会话所需的像素图数据，由父组件（page.tsx）注入 */
export interface FocusPayload {
  pixelData: MappedPixel[][];
  gridDimensions: { N: number; M: number };
  colorCounts: Record<string, { count: number; color: string }>;
  selectedColorSystem: string;
}

interface DownloadSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  options: GridDownloadOptions;
  onOptionsChange: (options: GridDownloadOptions) => void;
  onDownload: (opts?: GridDownloadOptions) => void;
  /** 可选：提供后，下载成功会生成专心拼豆会话链接 */
  focusPayload?: FocusPayload | null;
}

type Step = 'settings' | 'license' | 'success';

const DownloadSettingsModal: React.FC<DownloadSettingsModalProps> = ({
  isOpen,
  onClose,
  options,
  onOptionsChange,
  onDownload,
  focusPayload,
}) => {
  const [tempOptions, setTempOptions] = useState<GridDownloadOptions>({ ...options });
  const [step, setStep] = useState<Step>('settings');
  const [licenseKey, setLicenseKey] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [keyError, setKeyError] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);

  // 成功后生成的专心拼豆链接
  const [focusLink, setFocusLink] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // 从 localStorage 读取已缓存的密钥
  useEffect(() => {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached) {
      setSavedKey(cached);
      setLicenseKey(cached);
    }
  }, []);

  // 弹窗重新打开时复位到第一步
  useEffect(() => {
    if (isOpen) {
      setStep('settings');
      setKeyError('');
      setFocusLink('');
      setCopied(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOptionChange = (key: keyof GridDownloadOptions, value: string | number | boolean) => {
    setTempOptions((prev) => ({ ...prev, [key]: value }));
  };

  // 第一步：保存设置，进入密钥验证步骤
  const handleNextToLicense = () => {
    onOptionsChange(tempOptions);
    setStep('license');
    setKeyError('');
  };

  // 第二步：验证密钥并下载
  const handleValidateAndDownload = async () => {
    const trimmedKey = licenseKey.trim().toUpperCase();
    if (!trimmedKey) {
      setKeyError('请输入密钥');
      return;
    }

    setIsValidating(true);
    setKeyError('');

    try {
      const res = await fetch('/api/validate-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: trimmedKey }),
      });

      const data = await res.json();

      if (data.valid) {
        // 缓存密钥
        localStorage.setItem(STORAGE_KEY, trimmedKey);
        setSavedKey(trimmedKey);

        // 触发实际下载
        onDownload(tempOptions);

        // 剩余 0 次时清除缓存
        if (data.remaining === 0) {
          localStorage.removeItem(STORAGE_KEY);
          setSavedKey(null);
        }

        // 生成专心拼豆会话链接
        if (focusPayload) {
          const sessionId = createFocusSession(focusPayload);
          const link = `${window.location.origin}/focus?session=${sessionId}`;
          setFocusLink(link);
        }

        // 进入成功步骤
        setStep('success');
      } else {
        setKeyError(data.message || '密钥无效，请检查后重试');
      }
    } catch {
      setKeyError('网络错误，请稍后重试');
    } finally {
      setIsValidating(false);
    }
  };

  const handleKeyInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLicenseKey(e.target.value);
    setKeyError('');
  };

  const handleClearSavedKey = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedKey(null);
    setLicenseKey('');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(focusLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // 降级：选中输入框内容
    }
  };

  const stepTitle: Record<Step, string> = {
    settings: '下载图纸设置',
    license: '输入下载密钥',
    success: '下载成功',
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden w-full max-w-md">
        <div className="p-5">
          {/* 标题栏 */}
          <div className="flex justify-between items-center border-b dark:border-gray-700 pb-3 mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {stepTitle[step]}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* ── 第一步：下载设置 ── */}
          {step === 'settings' && (
            <>
              <div className="space-y-4">
                {/* 显示网格线 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">显示网格线</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempOptions.showGrid}
                      onChange={(e) => handleOptionChange('showGrid', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {tempOptions.showGrid && (
                  <div className="space-y-4 pl-2 border-l-2 border-gray-200 dark:border-gray-700 ml-1 pt-2 pb-1">
                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        网格线间隔 (每 N 格画一条线)
                      </label>
                      <div className="flex items-center justify-between space-x-3">
                        <input
                          type="range"
                          min="5"
                          max="20"
                          step="1"
                          value={tempOptions.gridInterval}
                          onChange={(e) => handleOptionChange('gridInterval', parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                        />
                        <span className="flex items-center justify-center min-w-[40px] text-sm font-medium text-gray-900 dark:text-gray-100">
                          {tempOptions.gridInterval}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col space-y-2">
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">网格线颜色</label>
                      <div className="flex flex-wrap gap-2">
                        {gridLineColorOptions.map((colorOpt) => (
                          <button
                            key={colorOpt.value}
                            type="button"
                            onClick={() => handleOptionChange('gridLineColor', colorOpt.value)}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-150 flex items-center justify-center 
                                        ${tempOptions.gridLineColor === colorOpt.value
                                ? 'border-blue-500 ring-2 ring-blue-500 ring-offset-1 dark:ring-offset-gray-800'
                                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'}`}
                            title={colorOpt.name}
                          >
                            <span className="block w-6 h-6 rounded-full" style={{ backgroundColor: colorOpt.value }} />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* 显示坐标 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">显示坐标数字</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempOptions.showCoordinates}
                      onChange={(e) => handleOptionChange('showCoordinates', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 隐藏格内色号 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">隐藏格内色号</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={!tempOptions.showCellNumbers}
                      onChange={(e) => handleOptionChange('showCellNumbers', !e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 包含色号统计 */}
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">包含色号统计</label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempOptions.includeStats}
                      onChange={(e) => handleOptionChange('includeStats', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {/* 同时导出源数据 */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">同时导出源数据</label>
                    <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      导出 hex 颜色值的 CSV 文件，可用于重新导入
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={tempOptions.exportCsv}
                      onChange={(e) => handleOptionChange('exportCsv', e.target.checked)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>

              <div className="flex justify-end mt-6 space-x-3">
                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleNextToLicense}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
                >
                  下一步 →
                </button>
              </div>
            </>
          )}

          {/* ── 第二步：密钥验证 ── */}
          {step === 'license' && (
            <>
              {/* 锁图标 + 说明 */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  下载图纸需要有效的下载密钥。<br />
                  密钥可在
                  <a
                    href="/buy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-500 hover:underline mx-1"
                  >
                    此处购买
                  </a>
                  获取。
                </p>
              </div>

              {/* 已缓存密钥提示 */}
              {savedKey && (
                <div className="mb-3 flex items-center justify-between bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg px-3 py-2">
                  <span className="text-xs text-green-700 dark:text-green-400">
                    已记住密钥：{savedKey.slice(0, 4)}****{savedKey.slice(-4)}
                  </span>
                  <button
                    onClick={handleClearSavedKey}
                    className="text-xs text-gray-400 hover:text-gray-600 ml-2"
                  >
                    更换
                  </button>
                </div>
              )}

              {/* 密钥输入框 */}
              <div className="mb-1">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={handleKeyInputChange}
                  onKeyDown={(e) => e.key === 'Enter' && handleValidateAndDownload()}
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                  className={`w-full px-4 py-2.5 border rounded-lg text-sm font-mono tracking-widest
                    text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700
                    focus:outline-none focus:ring-2 focus:ring-indigo-400
                    ${keyError
                      ? 'border-red-400 focus:ring-red-400'
                      : 'border-gray-300 dark:border-gray-600'
                    }`}
                  autoFocus
                />
              </div>

              {/* 错误提示 */}
              {keyError && (
                <p className="text-xs text-red-500 mt-1 mb-3">{keyError}</p>
              )}

              <div className="flex justify-between items-center mt-5">
                <button
                  onClick={() => setStep('settings')}
                  className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ← 返回设置
                </button>
                <button
                  onClick={handleValidateAndDownload}
                  disabled={isValidating}
                  className="px-5 py-2 bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                  {isValidating ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      验证中…
                    </>
                  ) : (
                    '验证并下载'
                  )}
                </button>
              </div>
            </>
          )}

          {/* ── 第三步：下载成功 + 专心拼豆链接 ── */}
          {step === 'success' && (
            <>
              {/* 成功图标 */}
              <div className="flex flex-col items-center text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-green-50 dark:bg-green-900/30 flex items-center justify-center mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-base font-semibold text-gray-800 dark:text-gray-100">图纸下载已开始！</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  文件正在保存到你的设备
                </p>
              </div>

              {/* 专心拼豆链接区域 */}
              {focusLink ? (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {/* 豆子图标 */}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-purple-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">
                      专心拼豆模式链接
                    </span>
                  </div>
                  <p className="text-xs text-purple-600 dark:text-purple-400 mb-3">
                    收藏此链接，可随时在本设备无限次进入这张图纸的专心拼豆模式。
                  </p>

                  {/* 链接 + 复制按钮 */}
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={focusLink}
                      className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-white dark:bg-gray-700 border border-purple-300 dark:border-purple-600 rounded-lg text-gray-700 dark:text-gray-200 focus:outline-none"
                      onFocus={(e) => e.target.select()}
                    />
                    <button
                      onClick={handleCopyLink}
                      className={`flex-shrink-0 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        copied
                          ? 'bg-green-500 text-white'
                          : 'bg-purple-500 hover:bg-purple-600 text-white'
                      }`}
                    >
                      {copied ? '已复制！' : '复制'}
                    </button>
                  </div>

                  {/* 直接进入按钮 */}
                  <a
                    href={focusLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 w-full flex items-center justify-center gap-2 py-2 px-4 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    立即进入专心拼豆模式
                  </a>
                </div>
              ) : (
                <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    如需专心拼豆模式，请在主页点击「进入专心拼豆模式」
                  </p>
                </div>
              )}

              <button
                onClick={onClose}
                className="w-full py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg transition-colors text-sm"
              >
                完成
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default DownloadSettingsModal;
export { gridLineColorOptions };
