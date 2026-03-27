import { NextRequest, NextResponse } from 'next/server';
import { verifyPaymentCallback, generateLicenseKey, PLANS, PlanId } from '@/lib/payment';
import { getOrder, setOrder, setLicenseKey } from '@/lib/kv';

// 虎皮椒支付的回调可能是 GET 或 POST（两者都要支持）
async function handleNotify(params: Record<string, string>): Promise<NextResponse> {
  const { trade_order_id, trade_status } = params;

  if (!trade_order_id) {
    return new NextResponse('missing trade_order_id', { status: 400 });
  }

  // 验证签名（防止伪造回调）
  if (!verifyPaymentCallback(params)) {
    console.error('[payment/notify] 签名验证失败', params);
    return new NextResponse('invalid signature', { status: 400 });
  }

  // 只处理支付成功的回调
  if (trade_status !== 'TRADE_SUCCESS') {
    return new NextResponse('OKK');
  }

  const order = await getOrder(trade_order_id);
  if (!order) {
    console.error('[payment/notify] 订单不存在:', trade_order_id);
    return new NextResponse('order not found', { status: 404 });
  }

  // 防止重复处理
  if (order.status === 'paid') {
    return new NextResponse('OKK');
  }

  // 生成密钥并更新订单
  const licenseKey = generateLicenseKey();
  const planData = PLANS[order.plan as PlanId];

  await setLicenseKey(licenseKey, {
    total: planData.downloads,
    remaining: planData.downloads,
    createdAt: new Date().toISOString(),
  });

  await setOrder(trade_order_id, {
    ...order,
    status: 'paid',
    licenseKey,
  });

  console.log(`[payment/notify] 订单 ${trade_order_id} 支付成功，密钥已生成`);

  // 虎皮椒支付要求回调成功时返回 "OKK"
  return new NextResponse('OKK');
}

export async function GET(request: NextRequest) {
  const params = Object.fromEntries(request.nextUrl.searchParams.entries());
  return handleNotify(params);
}

export async function POST(request: NextRequest) {
  let params: Record<string, string>;
  const contentType = request.headers.get('content-type') ?? '';

  if (contentType.includes('application/json')) {
    params = await request.json();
  } else {
    const text = await request.text();
    params = Object.fromEntries(new URLSearchParams(text).entries());
  }

  return handleNotify(params);
}
