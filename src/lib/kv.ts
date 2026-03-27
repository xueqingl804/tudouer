import { Redis } from '@upstash/redis';

// Upstash Redis 客户端（使用 REST API，无需 TCP 连接，适合 Vercel 等 serverless 环境）
function getRedis(): Redis {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash Redis 环境变量未配置（UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN）');
  }
  return new Redis({ url, token });
}

// ─── 密钥数据结构 ───────────────────────────────────────────────
export interface LicenseKeyData {
  total: number;       // 购买时的总次数
  remaining: number;   // 当前剩余次数
  createdAt: string;   // ISO 时间戳
}

// ─── 订单数据结构 ───────────────────────────────────────────────
export interface OrderData {
  status: 'pending' | 'paid' | 'failed';
  plan: string;          // '1' | '5' | '10'
  amount: number;        // 金额（元）
  downloads: number;     // 该套餐对应下载次数
  licenseKey?: string;   // 支付成功后生成
  createdAt: string;
}

// ─── 密钥操作 ────────────────────────────────────────────────────

export async function getLicenseKey(key: string): Promise<LicenseKeyData | null> {
  try {
    const redis = getRedis();
    return await redis.get<LicenseKeyData>(`lic:${key}`);
  } catch {
    return null;
  }
}

export async function setLicenseKey(key: string, data: LicenseKeyData): Promise<void> {
  const redis = getRedis();
  await redis.set(`lic:${key}`, data);
}

/**
 * 验证密钥并扣减一次下载次数（原子性：先 get 再 set，低并发场景足够用）
 * 返回 { success: true, remaining } 或 { success: false, remaining: 0 }
 */
export async function consumeLicenseDownload(key: string): Promise<{
  success: boolean;
  remaining: number;
  message: string;
}> {
  const data = await getLicenseKey(key);

  if (!data) {
    return { success: false, remaining: 0, message: '密钥无效或不存在' };
  }
  if (data.remaining <= 0) {
    return { success: false, remaining: 0, message: '该密钥下载次数已用完' };
  }

  const newData: LicenseKeyData = { ...data, remaining: data.remaining - 1 };
  await setLicenseKey(key, newData);

  return {
    success: true,
    remaining: newData.remaining,
    message: `验证成功，剩余 ${newData.remaining} 次`,
  };
}

// ─── 订单操作 ────────────────────────────────────────────────────

export async function getOrder(orderId: string): Promise<OrderData | null> {
  try {
    const redis = getRedis();
    return await redis.get<OrderData>(`ord:${orderId}`);
  } catch {
    return null;
  }
}

export async function setOrder(orderId: string, data: OrderData): Promise<void> {
  const redis = getRedis();
  // 订单保留 48 小时
  await redis.set(`ord:${orderId}`, data, { ex: 48 * 3600 });
}
