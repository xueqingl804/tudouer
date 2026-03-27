import { NextRequest, NextResponse } from 'next/server';
import { useOneLicenseDownload } from '@/lib/kv';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { key } = body;

    if (!key || typeof key !== 'string' || key.trim().length === 0) {
      return NextResponse.json(
        { valid: false, message: '密钥格式无效' },
        { status: 400 }
      );
    }

    const normalizedKey = key.trim().toUpperCase();

    // 从 KV 验证密钥并扣减一次下载次数
    const result = await useOneLicenseDownload(normalizedKey);

    return NextResponse.json({
      valid: result.success,
      message: result.message,
      remaining: result.remaining,
    });
  } catch (e) {
    console.error('[validate-key]', e);
    return NextResponse.json(
      { valid: false, message: '验证服务暂时不可用，请稍后重试' },
      { status: 500 }
    );
  }
}
