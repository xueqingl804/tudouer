import { NextRequest, NextResponse } from 'next/server';
import { setActivationToken } from '@/lib/kv';
import crypto from 'crypto';

function generateToken(): string {
  return crypto.randomBytes(16).toString('hex');
}

// POST /api/admin/create-token
// Header: x-admin-secret: <ADMIN_SECRET>
// Body: { downloads: number, count?: number }
export async function POST(request: NextRequest) {
  const adminSecret = request.headers.get('x-admin-secret');
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const downloads = Math.max(1, parseInt(body.downloads ?? '1', 10) || 1);
  const count = Math.min(50, Math.max(1, parseInt(body.count ?? '1', 10) || 1));

  const tokens: string[] = [];
  for (let i = 0; i < count; i++) {
    const token = generateToken();
    await setActivationToken(token, {
      downloads,
      used: false,
      createdAt: new Date().toISOString(),
    });
    tokens.push(token);
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://your-app.vercel.app';
  const links = tokens.map(t => `${baseUrl}/activate?token=${t}`);

  return NextResponse.json({ tokens, links, downloads, count });
}
