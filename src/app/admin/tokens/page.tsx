'use client';

import React, { useState } from 'react';

interface SentRecord {
  downloads: number;
  link: string;
  time: string;
}

const PLANS = [
  { label: '1 次下载', downloads: 1, color: 'from-blue-400 to-blue-600', emoji: '🔑' },
  { label: '5 次下载', downloads: 5, color: 'from-purple-400 to-purple-600', emoji: '🎫' },
  { label: '10 次下载', downloads: 10, color: 'from-pink-400 to-rose-600', emoji: '🎁' },
];

const MSG_TEMPLATE = (link: string, downloads: number) =>
  `您好！感谢购买图豆儿拼豆底稿生成器 ${downloads} 次下载权限 🎉\n\n` +
  `您的专属激活链接：\n${link}\n\n` +
  `📌 使用说明：\n` +
  `1. 点开链接，点击「立即生成密钥」\n` +
  `2. 复制密钥，保存好（只能看一次）\n` +
  `3. 在图豆儿下载图纸时输入密钥即可\n\n` +
  `⚠️ 每条链接只能使用一次，请勿转发给他人。如有问题随时联系我！`;

export default function AdminTokensPage() {
  const [adminSecret, setAdminSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [authError, setAuthError] = useState('');
  const [loadingPlan, setLoadingPlan] = useState<number | null>(null);
  const [copiedPlan, setCopiedPlan] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [sentLog, setSentLog] = useState<SentRecord[]>([]);
  const [customDownloads, setCustomDownloads] = useState(3);
  const [showCustom, setShowCustom] = useState(false);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminSecret.trim()) return;
    setAuthed(true);
    setAuthError('');
  };

  const dispatch = async (downloads: number) => {
    setLoadingPlan(downloads);
    setError('');
    try {
      const res = await fetch('/api/admin/create-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminSecret,
        },
        body: JSON.stringify({ downloads, count: 1 }),
      });
      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) { setAuthed(false); setAuthError('密码已失效，请重新登录'); }
        setError(data.error ?? '生成失败，请重试');
        return;
      }

      const link: string = data.links[0];
      const msg = MSG_TEMPLATE(link, downloads);

      await navigator.clipboard.writeText(msg);

      setCopiedPlan(downloads);
      setTimeout(() => setCopiedPlan(null), 3000);

      setSentLog(prev => [
        { downloads, link, time: new Date().toLocaleTimeString('zh-CN') },
        ...prev.slice(0, 19),
      ]);
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoadingPlan(null);
    }
  };

  // ── 登录界面 ──────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-sm">
          <div className="text-center mb-6">
            <p className="text-2xl mb-1">🫛</p>
            <h1 className="text-xl font-bold text-gray-800">图豆儿发货台</h1>
            <p className="text-xs text-gray-400 mt-1">输入管理员密码进入</p>
          </div>
          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="password"
              value={adminSecret}
              onChange={e => setAdminSecret(e.target.value)}
              placeholder="管理员密码"
              className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              autoFocus
            />
            {authError && <p className="text-xs text-red-500">{authError}</p>}
            <button
              type="submit"
              className="w-full py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-xl text-sm transition"
            >
              进入发货台
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── 发货台主界面 ──────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 px-4 py-8">
      <div className="max-w-lg mx-auto">

        {/* 标题 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-800">🫛 图豆儿发货台</h1>
            <p className="text-xs text-gray-400 mt-0.5">一键生成激活链接并复制回复话术</p>
          </div>
          <button onClick={() => setAuthed(false)} className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded border border-gray-200">
            退出
          </button>
        </div>

        {/* 操作说明 */}
        <div className="bg-blue-50 rounded-xl px-4 py-3 mb-5 text-xs text-blue-700 flex items-start gap-2">
          <span className="text-base mt-0.5">💡</span>
          <span>买家下单后，点下方对应按钮 → 话术自动复制到剪贴板 → 直接粘贴到聊天框发送即可</span>
        </div>

        {/* 套餐按钮 */}
        <div className="space-y-3 mb-4">
          {PLANS.map(plan => {
            const isLoading = loadingPlan === plan.downloads;
            const isCopied = copiedPlan === plan.downloads;
            return (
              <button
                key={plan.downloads}
                onClick={() => dispatch(plan.downloads)}
                disabled={loadingPlan !== null}
                className={`w-full py-4 px-5 rounded-2xl text-white font-semibold text-base shadow-md transition-all duration-200
                  bg-gradient-to-r ${plan.color}
                  hover:scale-[1.01] hover:shadow-lg
                  disabled:opacity-60 disabled:scale-100
                  flex items-center justify-between`}
              >
                <span className="flex items-center gap-2 text-lg">
                  <span>{plan.emoji}</span>
                  <span>发货 · {plan.label}</span>
                </span>
                <span className="text-sm opacity-90">
                  {isLoading ? '生成中…' : isCopied ? '✅ 已复制！去粘贴' : '点击一键复制回复'}
                </span>
              </button>
            );
          })}

          {/* 自定义次数 */}
          <div className="border border-gray-200 rounded-2xl overflow-hidden">
            <button
              onClick={() => setShowCustom(v => !v)}
              className="w-full py-3 px-5 text-sm text-gray-600 hover:bg-gray-50 flex items-center justify-between transition"
            >
              <span>🔧 自定义次数</span>
              <span className="text-gray-400 text-xs">{showCustom ? '收起' : '展开'}</span>
            </button>
            {showCustom && (
              <div className="px-5 pb-4 flex items-center gap-3 bg-gray-50">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={customDownloads}
                  onChange={e => setCustomDownloads(Math.max(1, parseInt(e.target.value) || 1))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
                <span className="text-sm text-gray-500">次下载</span>
                <button
                  onClick={() => dispatch(customDownloads)}
                  disabled={loadingPlan !== null}
                  className="flex-1 py-2 bg-gray-700 hover:bg-gray-800 text-white text-sm rounded-lg transition disabled:opacity-50"
                >
                  {loadingPlan === customDownloads ? '生成中…' : copiedPlan === customDownloads ? '✅ 已复制' : '一键复制'}
                </button>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        {/* 今日发货记录 */}
        {sentLog.length > 0 && (
          <div className="bg-white rounded-2xl shadow p-4">
            <h2 className="text-sm font-semibold text-gray-700 mb-3">本次会话发货记录</h2>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {sentLog.map((r, i) => (
                <div key={i} className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-600">{r.time}</span>
                  <span className="font-medium text-gray-700">{r.downloads} 次下载</span>
                  <button
                    onClick={() => navigator.clipboard.writeText(MSG_TEMPLATE(r.link, r.downloads))}
                    className="text-blue-500 hover:text-blue-600 underline"
                  >
                    重新复制
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 话术预览 */}
        <details className="mt-4">
          <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">查看回复话术模板</summary>
          <pre className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-xl p-4 whitespace-pre-wrap break-all">
            {MSG_TEMPLATE('https://tudouer.vercel.app/activate?token=（激活码）', 5)}
          </pre>
        </details>
      </div>
    </div>
  );
}
