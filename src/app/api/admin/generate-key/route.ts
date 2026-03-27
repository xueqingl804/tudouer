import { NextRequest, NextResponse } from 'next/server';
import { generateLicenseKey } from '@/lib/payment';
import { setLicenseKey } from '@/lib/kv';

// GET /api/admin/generate-key?count=5&downloads=10
// Header: x-admin-secret: <ADMIN_SECRET>
export async function GET(request: NextRequest) {
  const adminSecret = request.headers.get('x-admin-secret');

  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '未授权，请提供正确的管理员密钥' }, { status: 401 });
  }

  const countParam = request.nextUrl.searchParams.get('count');
  const downloadsParam = request.nextUrl.searchParams.get('downloads');

  const count = Math.min(Math.max(parseInt(countParam ?? '1', 10) || 1, 1), 100);
  const downloads = Math.max(parseInt(downloadsParam ?? '1', 10) || 1, 1);

  const keys: string[] = [];

  for (let i = 0; i < count; i++) {
    const key = generateLicenseKey();
    await setLicenseKey(key, {
      total: downloads,
      remaining: downloads,
      createdAt: new Date().toISOString(),
    });
    keys.push(key);
  }

  return NextResponse.json({
    keys,
    count: keys.length,
    downloads,
    message: `已生成 ${count} 个密钥，每个可下载 ${downloads} 次，已存入数据库。`,
  });
}
