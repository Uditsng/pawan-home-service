import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ error: 'Migration route disabled' }, { status: 404 });
}
