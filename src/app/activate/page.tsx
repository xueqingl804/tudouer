'use client';

import React, { useState, useEffect, useCallback } from 'react';

type Status = 'idle' | 'activating' | 'success' | 'error' | 'already-used';

export default function ActivatePage() {
  const [token, setToken] = useState<string>('');
  const [status, setStatus] = useState<Status>('idle');
  const [licenseKey, setLicenseKey] = useState<string>('');
  const [downloads, setDownloads] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // 从 URL 参数读取 token
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (t) setToken(t);
  }, []);

  const handleActivate = useCallback(async () => {
    if (!token.trim()) return;
    setStatus('activating');
    try {
      const res = await fetch('/api/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setStatus('already-used');
        setErrorMsg(data.error ?? '该激活码已被使用');
      } else if (!res.ok) {
        setStatus('error');
        setErrorMsg(data.error ?? '激活失败，请联系客服');
      } else {
        setLicenseKey(data.licenseKey);
        setDownloads(data.downloads);
        setStatus('success');
      }
    } catch {
      setStatus('error');
      setErrorMsg('网络错误，请稍后重试');
    }
  }, [token]);

  const handleCopy = () => {
    navigator.clipboard.writeText(licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">图豆儿</h1>
          <p className="text-sm text-gray-500 mt-1">拼豆底稿生成器</p>
        </div>

        {status === 'idle' && (
          <>
            <h2 className="text-lg font-semibold text-gray-700 mb-4 text-center">领取下载密钥</h2>
            <p className="text-sm text-gray-500 text-center mb-6">
              感谢您的购买！点击下方按钮生成您的专属密钥。
              <br />
              <span className="text-red-500 font-medium">每个链接只能生成一次密钥，请妥善保存。</span>
            </p>
            <button
              onClick={handleActivate}
              disabled={!token}
              className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-purple-600 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              立即生成密钥
            </button>
          </>
        )}

        {status === 'activating' && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4" />
            <p className="text-gray-500">正在生成密钥…</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">密钥生成成功！</h2>
            <p className="text-sm text-gray-500 mb-6">可下载 <span className="font-bold text-blue-500">{downloads}</span> 次图纸</p>

            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
              <p className="text-xs text-gray-400 mb-2">您的专属密钥</p>
              <p className="font-mono text-lg font-bold text-gray-800 tracking-widest break-all">{licenseKey}</p>
            </div>

            <button
              onClick={handleCopy}
              className={`w-full py-3 rounded-xl font-semibold transition-all duration-200 ${
                copied
                  ? 'bg-green-500 text-white'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
            >
              {copied ? '已复制！' : '复制密钥'}
            </button>

            <p className="text-xs text-gray-400 mt-4">
              在图豆儿下载图纸时输入此密钥即可使用。
              <br />请截图保存，此页面关闭后无法再次显示密钥。
            </p>
          </div>
        )}

        {(status === 'error' || status === 'already-used') && (
          <div className="text-center py-4">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {status === 'already-used' ? '激活码已使用' : '激活失败'}
            </h2>
            <p className="text-sm text-gray-500">{errorMsg}</p>
            {status === 'already-used' && (
              <p className="text-xs text-gray-400 mt-3">
                如有疑问请联系客服并出示订单截图。
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
