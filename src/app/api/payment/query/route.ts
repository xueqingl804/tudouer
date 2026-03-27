import { NextRequest, NextResponse } from 'next/server';
import { getOrder } from '@/lib/kv';

// 前端轮询此接口以获取支付状态
export async function GET(request: NextRequest) {
  const orderId = request.nextUrl.searchParams.get('orderId');

  if (!orderId) {
    return NextResponse.json({ error: '缺少 orderId' }, { status: 400 });
  }

  const order = await getOrder(orderId);

  if (!order) {
    return NextResponse.json({ error: '订单不存在' }, { status: 404 });
  }

  if (order.status === 'paid' && order.licenseKey) {
    return NextResponse.json({
      status: 'paid',
      licenseKey: order.licenseKey,
      remaining: order.downloads,
      plan: order.plan,
    });
  }

  return NextResponse.json({ status: order.status });
}
