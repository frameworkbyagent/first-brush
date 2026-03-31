import { NextResponse } from 'next/server';
import { getPinHint } from '@/lib/storage';

export async function GET() {
  return NextResponse.json({ hint: await getPinHint() });
}
