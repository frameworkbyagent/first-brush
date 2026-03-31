import { NextResponse } from 'next/server';
import { toggleTodayFirst } from '@/lib/storage';

export async function POST() {
  const state = await toggleTodayFirst();
  return NextResponse.json(state);
}
