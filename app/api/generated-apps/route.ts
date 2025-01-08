import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { model, prompt, code } = await req.json();

    const generatedApp = await prisma.generatedApp.create({
      data: {
        model,
        prompt,
        code,
      },
    });

    return NextResponse.json(generatedApp);
  } catch (error) {
    console.error('Error saving generated app:', error);
    return NextResponse.json(
      { error: 'Failed to save generated app' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';