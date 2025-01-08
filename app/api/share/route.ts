import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { nanoid } from 'nanoid';
import { z } from 'zod';
import { encrypt, decrypt } from '../../../lib/encryption';

const shareRequestSchema = z.object({
  code: z.string(),
  prompt: z.string(),
  model: z.string(),
  settings: z.record(z.any()),
  password: z.string().optional(),
  expiresIn: z.number().optional(),
  allowedViews: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const data = await req.json();
    const validated = shareRequestSchema.parse(data);
    
    const shareId = nanoid(10);
    const expiresAt = validated.expiresIn 
      ? new Date(Date.now() + validated.expiresIn * 3600000)
      : null;

    const shareData = {
      code: validated.code,
      prompt: validated.prompt,
      model: validated.model,
      settings: validated.settings,
    };

    // Encrypt data if password protected
    const encryptedData = validated.password 
      ? await encrypt(JSON.stringify(shareData), validated.password)
      : null;

    await prisma.sharedCode.create({
      data: {
        id: shareId,
        content: encryptedData || JSON.stringify(shareData),
        isEncrypted: !!validated.password,
        expiresAt,
        allowedViews: validated.allowedViews || null,
        remainingViews: validated.allowedViews || null,
        createdAt: new Date(),
      },
    });

    // Generate QR Code if requested
    const qrCode = data.generateQR 
      ? await generateQRCode(`${process.env.NEXT_PUBLIC_BASE_URL}/share/${shareId}`)
      : null;

    return NextResponse.json({
      id: shareId,
      expiresAt,
      qrCode,
      isProtected: !!validated.password
    });
  } catch (error) {
    console.error('Share error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const password = req.nextUrl.searchParams.get('password');

    if (!id) {
      return NextResponse.json(
        { error: 'Share ID required' },
        { status: 400 }
      );
    }

    const share = await prisma.sharedCode.findUnique({
      where: { id }
    });

    if (!share) {
      return NextResponse.json(
        { error: 'Share not found' },
        { status: 404 }
      );
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'Share link has expired' },
        { status: 410 }
      );
    }

    // Check remaining views
    if (share.remainingViews !== null && share.remainingViews <= 0) {
      return NextResponse.json(
        { error: 'Maximum views reached' },
        { status: 410 }
      );
    }

    // Handle password protection
    if (share.isEncrypted && !password) {
      return NextResponse.json(
        { error: 'Password required', requiresPassword: true },
        { status: 401 }
      );
    }

    let content = share.content;
    if (share.isEncrypted && password) {
      try {
        content = await decrypt(share.content, password);
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid password' },
          { status: 401 }
        );
      }
    }

    // Update view count if needed
    if (share.remainingViews !== null) {
      await prisma.sharedCode.update({
        where: { id },
        data: { remainingViews: share.remainingViews - 1 }
      });
    }

    return NextResponse.json({
      content: JSON.parse(content),
      expiresAt: share.expiresAt,
      remainingViews: share.remainingViews,
    });
  } catch (error) {
    console.error('Share retrieval error:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve share' },
      { status: 500 }
    );
  }
}

export const runtime = 'edge';