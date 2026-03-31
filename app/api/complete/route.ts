import { NextResponse } from 'next/server';
import { completeToday } from '@/lib/storage';

export async function POST() {
  const state = await completeToday();
  return NextResponse.json(state);
}
