import { NextResponse } from 'next/server';
import { readState } from '@/lib/storage';

export async function GET() {
  const state = await readState();
  return NextResponse.json(state);
}
