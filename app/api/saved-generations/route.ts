import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { title, description, generatedAppId } = await req.json();

    const savedApp = await prisma.savedApp.create({
      data: {
        title,
        description,
        appId: generatedAppId,
      },
      include: {
        generatedApp: {
          include: {
            analytics: true
          }
        }
      }
    });

    return NextResponse.json(savedApp);
  } catch (error) {
    console.error('Error saving generation:', error);
    return NextResponse.json(
      { error: 'Failed to save generation' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const savedApps = await prisma.savedApp.findMany({
      select: {
        id: true,
        title: true,
        description: true,
        createdAt: true,
        generatedApp: {
          select: {
            id: true,
            code: true,
            model: true,
            prompt: true,
            analytics: {
              select: {
                modelName: true,
                provider: true,
                promptTokens: true,
                responseTokens: true,
                totalTokens: true,
                maxTokens: true,
                utilizationPercentage: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transform the data to match the expected format
    const transformedApps = savedApps.map(app => ({
      id: app.generatedApp.id,
      title: app.title,
      description: app.description,
      code: app.generatedApp.code,
      model: app.generatedApp.model,
      prompt: app.generatedApp.prompt,
      createdAt: app.createdAt,
      analytics: app.generatedApp.analytics
    }));

    return NextResponse.json(transformedApps);
  } catch (error) {
    console.error('Error fetching saved generations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved generations' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing generation ID' },
        { status: 400 }
      );
    }

    await prisma.$transaction(async (tx) => {
      const savedApp = await tx.savedApp.findUnique({
        where: { id },
        include: {
          generatedApp: {
            include: {
              analytics: true
            }
          }
        }
      });

      if (!savedApp) {
        throw new Error('Saved app not found');
      }

      // Delete analytics first if it exists
      if (savedApp.generatedApp.analytics) {
        await tx.analytics.delete({
          where: { appId: savedApp.generatedApp.id }
        });
      }

      // Delete SavedApp
      await tx.savedApp.delete({
        where: { id }
      });

      // Delete GeneratedApp last
      await tx.generatedApp.delete({
        where: { id: savedApp.generatedApp.id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting generation:', error);
    return NextResponse.json(
      { error: 'Failed to delete generation' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';