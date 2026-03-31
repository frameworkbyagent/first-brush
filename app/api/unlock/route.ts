import { NextRequest, NextResponse } from 'next/server';
import { verifyPin } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { pin?: string };
  const ok = await verifyPin(body.pin ?? '');
  return NextResponse.json({ ok }, { status: ok ? 200 : 401 });
}
