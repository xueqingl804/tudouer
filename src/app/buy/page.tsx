'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import QRCode from 'qrcode';

// ─── 套餐数据 ────────────────────────────────────────────────────
const PLANS = [
  {
    id: '1' as const,
    name: '单次下载',
    downloads: 1,
    price: 1.00,
    pricePerUse: 1.00,
    tag: null,
    highlight: false,
  },
  {
    id: '5' as const,
    name: '5次下载',
    downloads: 5,
    price: 2.50,
    pricePerUse: 0.50,
    tag: '推荐',
    highlight: true,
  },
  {
    id: '10' as const,
    name: '10次下载',
    downloads: 10,
    price: 3.99,
    pricePerUse: 0.40,
    tag: '最划算',
    highlight: false,
  },
];

type PlanId = '1' | '5' | '10';
type PayMethod = 'wechat' | 'alipay';
type Step = 'select' | 'paying' | 'success';

// ─── 主组件（包裹 Suspense 以支持 useSearchParams） ──────────────
export default function BuyPage() {
  return (
    <Suspense>
      <BuyPageInner />
    </Suspense>
  );
}

function BuyPageInner() {
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>('select');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('5');
  const [payMethod, setPayMethod] = useState<PayMethod>('wechat');
  const [orderId, setOrderId] = useState<string | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [licenseKey, setLicenseKey] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setIsMobile(/Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent));
  }, []);

  // 从 URL 参数恢复订单（支付完成后支付宝/微信跳回时自动查询）
  useEffect(() => {
    const oid = searchParams.get('orderId');
    if (oid && step === 'select') {
      setOrderId(oid);
      setStep('paying');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 创建订单 ──────────────────────────────────────────────────
  const handleCreateOrder = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/payment/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan, method: payMethod }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '创建订单失败');

      setOrderId(data.orderId);
      setPaymentUrl(data.paymentUrl);

      // 如果是测试模式（PAYMENT_MOCK=true），订单已直接标记为已支付
      if (data.mock) {
        // 稍等后查询状态
        setTimeout(() => pollStatus(data.orderId), 500);
        setStep('paying');
        return;
      }

      // 生成二维码
      const qr = await QRCode.toDataURL(data.paymentUrl, {
        width: 220,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#1F2937', light: '#FFFFFF' },
      });
      setQrDataUrl(qr);
      setStep('paying');
    } catch (e) {
      setError(e instanceof Error ? e.message : '创建订单失败，请重试');
    } finally {
      setIsLoading(false);
    }
  };

  // ── 轮询支付状态 ──────────────────────────────────────────────
  const pollStatus = useCallback(async (oid?: string) => {
    const id = oid ?? orderId;
    if (!id) return;
    try {
      const res = await fetch(`/api/payment/query?orderId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.status === 'paid') {
        setLicenseKey(data.licenseKey);
        setRemaining(data.remaining);
        setStep('success');
      }
    } catch { /* 忽略轮询错误 */ }
  }, [orderId]);

  useEffect(() => {
    if (step !== 'paying') return;
    const id = setInterval(() => pollStatus(), 2000);
    return () => clearInterval(id);
  }, [step, pollStatus]);

  // ── 复制密钥 ──────────────────────────────────────────────────
  const handleCopy = async () => {
    if (!licenseKey) return;
    await navigator.clipboard.writeText(licenseKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const plan = PLANS.find((p) => p.id === selectedPlan)!;

  // ════════════════════════════════════════════════════════════
  // 渲染
  // ════════════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* 顶部导航 */}
      <nav className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            <span className="text-sm font-medium">返回生成器</span>
          </Link>
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">图豆儿 · 购买下载次数</span>
        </div>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-10">

        {/* ── 第一步：选择套餐 ── */}
        {step === 'select' && (
          <>
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">购买下载次数</h1>
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                购买后获得专属密钥，支持多次使用，剩余次数自动记录
              </p>
            </div>

            {/* 套餐卡片 */}
            <div className="grid grid-cols-3 gap-3 mb-8">
              {PLANS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id)}
                  className={`relative rounded-xl border-2 p-4 text-left transition-all duration-150
                    ${selectedPlan === p.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 shadow-md'
                      : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-indigo-300'
                    }`}
                >
                  {p.tag && (
                    <span className={`absolute -top-2.5 left-1/2 -translate-x-1/2 text-xs font-bold px-2.5 py-0.5 rounded-full
                      ${p.highlight ? 'bg-indigo-500 text-white' : 'bg-purple-500 text-white'}`}>
                      {p.tag}
                    </span>
                  )}
                  <div className="text-lg font-bold text-gray-900 dark:text-white mt-1">
                    ¥{p.price.toFixed(2)}
                  </div>
                  <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mt-0.5">
                    {p.name}
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    ¥{p.pricePerUse.toFixed(2)}/次
                  </div>
                  {selectedPlan === p.id && (
                    <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-indigo-500 flex items-center justify-center">
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* 支付方式 */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 p-5 mb-6">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">选择支付方式</p>
              <div className="grid grid-cols-2 gap-3">
                {/* 微信支付 */}
                <button
                  onClick={() => setPayMethod('wechat')}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all
                    ${payMethod === 'wechat'
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-green-300'
                    }`}
                >
                  <svg viewBox="0 0 48 48" className="w-7 h-7 flex-shrink-0" fill="none">
                    <circle cx="24" cy="24" r="24" fill="#07C160" />
                    <path d="M19.5 21.5c-4.5 0-8.5 2.8-8.5 6.3 0 2 1.1 3.7 2.9 4.9l-.7 2.3 2.6-1.3c.9.3 1.9.4 2.8.4 4.5 0 8.5-2.8 8.5-6.3s-4-6.3-7.6-6.3zm-1.8 3.3a.9.9 0 110 1.8.9.9 0 010-1.8zm3.6 0a.9.9 0 110 1.8.9.9 0 010-1.8z" fill="white" />
                    <path d="M29 14c-5 0-9 3.1-9 7 0 3.8 4 7 9 7 1 0 1.9-.1 2.8-.4l2.6 1.3-.7-2.3c1.8-1.2 3.3-3 3.3-5.6 0-3.9-4-7-8-7zm-2.5 5.5a1 1 0 110 2 1 1 0 010-2zm5 0a1 1 0 110 2 1 1 0 010-2z" fill="white" />
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">微信支付</div>
                  </div>
                </button>

                {/* 支付宝 */}
                <button
                  onClick={() => setPayMethod('alipay')}
                  className={`flex items-center gap-3 rounded-lg border-2 px-4 py-3 transition-all
                    ${payMethod === 'alipay'
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300'
                    }`}
                >
                  <svg viewBox="0 0 48 48" className="w-7 h-7 flex-shrink-0" fill="none">
                    <circle cx="24" cy="24" r="24" fill="#1677FF" />
                    <path d="M33.5 27.6c-2.8-.9-5.2-1.7-7.1-2.4 1.1-1.8 1.9-4 2.3-6.4h-5.5V17h6.4v-1.5H22v-1.8h-3.1v1.8h-6.5V17h6.5v1.8h-5.3v2.1h10.4c-.2 1.3-.6 2.5-1.1 3.5-2.4-.8-4.4-1.3-5.9-1.6-3.3-.6-5.4.9-5.8 3.1-.4 2.4 1.3 4.6 5.2 4.6 2.5 0 5-1.1 6.9-3.1 2.2 1 4.8 2.3 8 4l1.7-3.8z" fill="white" />
                    <path d="M16.5 26.6c-.1.7.3 2.1 2.7 2.1 1.5 0 3-.7 4.2-1.8-1.8-.9-3.6-1.6-5.2-2-.9.3-1.6.9-1.7 1.7z" fill="#1677FF" />
                  </svg>
                  <div className="text-left">
                    <div className="text-sm font-medium text-gray-800 dark:text-gray-200">支付宝</div>
                  </div>
                </button>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-600 dark:text-red-400">
                {error}
              </div>
            )}

            {/* 确认按钮 */}
            <button
              onClick={handleCreateOrder}
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-white bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-300 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  生成订单中…
                </>
              ) : (
                <>
                  立即支付 ¥{plan.price.toFixed(2)}
                  <span className="opacity-70 font-normal">（{plan.downloads} 次下载）</span>
                </>
              )}
            </button>

            <p className="text-center text-xs text-gray-400 mt-4">
              支付即代表同意服务条款 · 密钥永久有效直至次数用完
            </p>
          </>
        )}

        {/* ── 第二步：等待支付 ── */}
        {step === 'paying' && (
          <div className="flex flex-col items-center text-center">
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-6">
              <div className="flex items-center gap-2 mb-4 justify-center">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-sm text-gray-500 dark:text-gray-400">等待支付确认…</span>
              </div>

              {/* 二维码 */}
              {qrDataUrl && !isMobile ? (
                <div className="mb-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={qrDataUrl}
                    alt="支付二维码"
                    className="w-52 h-52 mx-auto rounded-lg border border-gray-100"
                  />
                  <p className="text-xs text-gray-400 mt-2">
                    {payMethod === 'wechat' ? '微信扫码支付' : '支付宝扫码支付'}
                  </p>
                </div>
              ) : paymentUrl ? (
                <a
                  href={paymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full py-3 mb-4 rounded-xl text-white font-semibold text-sm
                    bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 transition-all"
                >
                  点击跳转支付页面
                </a>
              ) : (
                <div className="w-52 h-52 mx-auto rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center mb-4">
                  <svg className="animate-spin h-8 w-8 text-indigo-400" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                </div>
              )}

              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg px-4 py-3 text-sm">
                <div className="flex justify-between text-gray-500 dark:text-gray-400 mb-1">
                  <span>套餐</span>
                  <span className="text-gray-700 dark:text-gray-200 font-medium">
                    {PLANS.find(p => p.id === selectedPlan)?.name}
                  </span>
                </div>
                <div className="flex justify-between text-gray-500 dark:text-gray-400">
                  <span>金额</span>
                  <span className="text-indigo-600 font-bold">
                    ¥{PLANS.find(p => p.id === selectedPlan)?.price.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => { setStep('select'); setQrDataUrl(null); setOrderId(null); }}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              取消，重新选择
            </button>
          </div>
        )}

        {/* ── 第三步：支付成功 ── */}
        {step === 'success' && licenseKey && (
          <div className="flex flex-col items-center text-center">
            {/* 成功图标 */}
            <div className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">支付成功！</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              你的专属下载密钥已生成，共 <strong className="text-gray-700 dark:text-gray-200">{remaining}</strong> 次下载机会
            </p>

            {/* 密钥展示 */}
            <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-4">
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest mb-3">你的下载密钥</p>

              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-4 mb-4 flex items-center justify-between">
                <span className="font-mono text-lg font-bold text-indigo-600 dark:text-indigo-400 tracking-widest select-all">
                  {licenseKey}
                </span>
              </div>

              <button
                onClick={handleCopy}
                className={`w-full py-3 rounded-xl font-semibold text-sm transition-all duration-200
                  ${copied
                    ? 'bg-green-500 text-white'
                    : 'bg-indigo-500 hover:bg-indigo-600 text-white'
                  }`}
              >
                {copied ? '✓ 已复制到剪贴板' : '复制密钥'}
              </button>

              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 text-xs text-gray-400 space-y-1 text-left">
                <p>· 密钥可重复使用，每次下载扣除 1 次</p>
                <p>· 剩余次数会自动保存，下次进入自动恢复</p>
                <p>· 请妥善保管，密钥丢失无法找回</p>
              </div>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-medium
                text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-700
                hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
            >
              返回图纸生成器，立即使用
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
