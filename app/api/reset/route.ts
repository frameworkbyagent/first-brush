import { NextResponse } from 'next/server';
import { resetToday } from '@/lib/storage';

export async function POST() {
  const state = await resetToday();
  return NextResponse.json(state);
}
