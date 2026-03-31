import { NextRequest, NextResponse } from 'next/server';
import { changePin } from '@/lib/storage';

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { currentPin?: string; nextPin?: string };
  const result = await changePin(body.currentPin ?? '', body.nextPin ?? '');

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(result);
}
