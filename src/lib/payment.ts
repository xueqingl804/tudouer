import crypto, { randomBytes } from 'crypto';

// ─── 套餐定义 ────────────────────────────────────────────────────
export const PLANS = {
  '1':  { id: '1',  name: '单次下载',  downloads: 1,  price: 1.00 },
  '5':  { id: '5',  name: '5次下载',   downloads: 5,  price: 2.50 },
  '10': { id: '10', name: '10次下载',  downloads: 10, price: 3.99 },
} as const;

export type PlanId = keyof typeof PLANS;

// ─── 工具函数 ────────────────────────────────────────────────────

/** 生成格式为 XXXX-XXXX-XXXX-XXXX 的密钥 */
export function generateLicenseKey(): string {
  const raw = randomBytes(8).toString('hex').toUpperCase();
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`;
}

/** 生成订单号：PB + 时间戳36进制 + 随机后缀 */
export function generateOrderId(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = randomBytes(3).toString('hex').toUpperCase();
  return `PB${ts}${rand}`;
}

// ─── 虎皮椒支付（xunhupay.com）集成 ────────────────────────────
// 如果使用其他支付聚合商（如彩虹易支付/Epay），修改此部分即可
// 签名规则：所有参数按 key 字母序排列，拼接为 key=value&... 后追加 &key=<appsecret>，再 MD5

const XUNHUPAY_API = 'https://api.xunhupay.com/payment/do.html';

export async function createPaymentOrder(params: {
  orderId: string;
  amount: number;
  title: string;
  type: 'wechat' | 'alipay';
  notifyUrl: string;
  returnUrl: string;
}): Promise<{ paymentUrl: string }> {
  const appid = process.env.PAYMENT_APP_ID;
  const appsecret = process.env.PAYMENT_APP_SECRET;

  if (!appid || !appsecret) {
    throw new Error('支付配置未完成，请在 .env.local 配置 PAYMENT_APP_ID 和 PAYMENT_APP_SECRET');
  }

  const nonce_str = randomBytes(8).toString('hex');
  const time = Math.floor(Date.now() / 1000).toString();

  const payload: Record<string, string> = {
    version: '1.1',
    appid,
    trade_order_id: params.orderId,
    total_fee: params.amount.toFixed(2),
    title: params.title,
    time,
    notify_url: params.notifyUrl,
    return_url: params.returnUrl,
    nonce_str,
    type: params.type,
  };

  // 签名
  const sortedKeys = Object.keys(payload).sort();
  const signStr =
    sortedKeys.map((k) => `${k}=${payload[k]}`).join('&') + `&key=${appsecret}`;
  payload.hash = crypto.createHash('md5').update(signStr).digest('hex');

  const res = await fetch(XUNHUPAY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(payload).toString(),
  });

  const data = (await res.json()) as { errcode: number; errmsg?: string; url?: string };

  if (data.errcode !== 0 || !data.url) {
    throw new Error(data.errmsg || '创建支付订单失败');
  }

  return { paymentUrl: data.url };
}

/** 验证支付回调签名（防止伪造回调） */
export function verifyPaymentCallback(params: Record<string, string>): boolean {
  const appsecret = process.env.PAYMENT_APP_SECRET;
  if (!appsecret) return false;

  const { hash, ...rest } = params;
  if (!hash) return false;

  const sortedKeys = Object.keys(rest).sort();
  const signStr =
    sortedKeys.map((k) => `${k}=${rest[k]}`).join('&') + `&key=${appsecret}`;
  const expected = crypto.createHash('md5').update(signStr).digest('hex');

  return hash.toLowerCase() === expected.toLowerCase();
}
