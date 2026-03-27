import { NextRequest, NextResponse } from 'next/server';
import { PLANS, PlanId, createPaymentOrder, generateOrderId, generateLicenseKey } from '@/lib/payment';
import { setOrder, setLicenseKey } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const { plan, method } = await request.json() as { plan: PlanId; method: 'wechat' | 'alipay' };

    if (!plan || !PLANS[plan]) {
      return NextResponse.json({ error: '无效的套餐' }, { status: 400 });
    }
    if (method !== 'wechat' && method !== 'alipay') {
      return NextResponse.json({ error: '无效的支付方式' }, { status: 400 });
    }

    const planData = PLANS[plan];
    const orderId = generateOrderId();

    // ── 开发/测试模式：跳过真实支付，直接生成密钥 ──────────────
    if (process.env.PAYMENT_MOCK === 'true') {
      const licenseKey = generateLicenseKey();
      await setLicenseKey(licenseKey, {
        total: planData.downloads,
        remaining: planData.downloads,
        createdAt: new Date().toISOString(),
      });
      await setOrder(orderId, {
        status: 'paid',
        plan,
        amount: planData.price,
        downloads: planData.downloads,
        licenseKey,
        createdAt: new Date().toISOString(),
      });
      return NextResponse.json({
        orderId,
        paymentUrl: `${getBaseUrl(request)}/buy?orderId=${orderId}`,
        mock: true,
      });
    }

    // ── 真实支付：调用虎皮椒支付 API ──────────────────────────
    const baseUrl = getBaseUrl(request);
    const notifyUrl = `${baseUrl}/api/payment/notify`;
    const returnUrl = `${baseUrl}/buy?orderId=${orderId}`;

    const { paymentUrl } = await createPaymentOrder({
      orderId,
      amount: planData.price,
      title: `拼豆图纸 - ${planData.name}`,
      type: method,
      notifyUrl,
      returnUrl,
    });

    // 保存待支付订单
    await setOrder(orderId, {
      status: 'pending',
      plan,
      amount: planData.price,
      downloads: planData.downloads,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({ orderId, paymentUrl });
  } catch (e) {
    console.error('[payment/create]', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '创建订单失败' },
      { status: 500 }
    );
  }
}

function getBaseUrl(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-host');
  const host = forwarded ?? req.headers.get('host') ?? 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') ?? 'http';
  return `${proto}://${host}`;
}
