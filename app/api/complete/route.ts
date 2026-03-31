import { NextResponse } from 'next/server';
import { completeStep } from '@/lib/storage';

export async function POST() {
  const state = await completeStep();
  return NextResponse.json(state);
}
