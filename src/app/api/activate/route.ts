import { NextRequest, NextResponse } from 'next/server';
import { getActivationToken, setActivationToken, setLicenseKey } from '@/lib/kv';
import { generateLicenseKey } from '@/lib/payment';

// POST /api/activate
// Body: { token: string }
export async function POST(request: NextRequest) {
  const { token } = await request.json().catch(() => ({ token: '' }));

  if (!token || typeof token !== 'string') {
    return NextResponse.json({ error: '无效的激活码' }, { status: 400 });
  }

  const tokenData = await getActivationToken(token.trim());

  if (!tokenData) {
    return NextResponse.json({ error: '激活码不存在或已过期' }, { status: 404 });
  }

  if (tokenData.used) {
    return NextResponse.json({
      error: '该激活码已被使用',
      usedAt: tokenData.usedAt,
    }, { status: 409 });
  }

  // 生成密钥
  const licenseKey = generateLicenseKey();
  await setLicenseKey(licenseKey, {
    total: tokenData.downloads,
    remaining: tokenData.downloads,
    createdAt: new Date().toISOString(),
  });

  // 标记 token 为已使用
  await setActivationToken(token.trim(), {
    ...tokenData,
    used: true,
    usedAt: new Date().toISOString(),
    generatedKey: licenseKey,
  });

  return NextResponse.json({
    licenseKey,
    downloads: tokenData.downloads,
    message: `密钥生成成功，可下载 ${tokenData.downloads} 次`,
  });
}
