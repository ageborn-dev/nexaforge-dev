import { notFound, redirect } from "next/navigation";
import CodeViewer from "@/components/code-viewer";
import client from "@/lib/prisma";
import type { Metadata } from "next";
import { cache } from "react";
import { decrypt } from "@/lib/encryption";
import QRCode from "qrcode";
import Image from 'next/image';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Define SharedCode type
interface SharedCode {
  appId: string;
  content: string;
  isEncrypted: boolean;
  expiresAt: Date | null;
  remainingViews: number | null;
}

// Cache the database query
const getGeneratedAppByID = cache(async (id: string) => {
  const generatedApp = await client.generatedApp.findUnique({
    where: { id },
  });
  return generatedApp;
});

// Generate QR code with proper options
async function generateQRCode(url: string): Promise<string | null> {
  try {
    return await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: '#000',
        light: '#fff'
      }
    });
  } catch (err) {
    console.error('QR Code generation failed:', err);
    return null;
  }
}

type GenerateMetadataProps = {
  params: { id: string };
  searchParams: { [key: string]: string | undefined };
}

// Metadata generation
export async function generateMetadata(
  { params }: GenerateMetadataProps
): Promise<Metadata> {
  const generatedApp = await getGeneratedAppByID(params.id);

  if (!generatedApp?.prompt || typeof generatedApp.prompt !== "string") {
    notFound();
  }

  const searchParams = new URLSearchParams();
  searchParams.set("prompt", generatedApp.prompt);

  return {
    title: "An app generated on NexaForge",
    description: `Prompt: ${generatedApp.prompt}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
  };
}

interface PageContent {
  code: string;
  qrCodeDataUrl?: string | null;
}

async function getPageContent(
  id: string,
  key?: string,
  qr?: string
): Promise<PageContent | JSX.Element> {
  const generatedApp = await getGeneratedAppByID(id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  let qrCodeDataUrl: string | null = null;
  if (qr === 'true') {
    qrCodeDataUrl = await generateQRCode(
      `${process.env.NEXT_PUBLIC_BASE_URL}/share/${id}`
    );
  }

  const sharedCode = await client.$queryRaw<SharedCode[]>`
    SELECT * FROM "SharedCode" WHERE "appId" = ${id}
  `;

  if (sharedCode && Array.isArray(sharedCode) && sharedCode.length > 0) {
    const shareData = sharedCode[0];
    
    if (shareData.isEncrypted && !key) {
      redirect(`/share/${id}/protected`);
    }

    if (shareData.isEncrypted && key) {
      try {
        const decrypted = await decrypt(shareData.content, key);
        generatedApp.code = JSON.parse(decrypted).code;
      } catch (error) {
        console.error('Decryption failed:', error);
        redirect(`/share/${id}/protected?error=invalid`);
      }
    }

    if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
      return <div>Share link expired</div>;
    }

    if (shareData.remainingViews !== null && shareData.remainingViews <= 0) {
      return <div>Maximum views reached</div>;
    }

    if (shareData.remainingViews !== null) {
      await client.$executeRaw`
        UPDATE "SharedCode" 
        SET "remainingViews" = "remainingViews" - 1 
        WHERE "appId" = ${id}
      `;
    }
  }

  return {
    code: generatedApp.code,
    qrCodeDataUrl
  };
}

export default async function Page({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const content = await getPageContent(
    params.id,
    searchParams.key as string | undefined,
    searchParams.qr as string | undefined
  );

  if ('type' in content) {
    return content;
  }

  return (
    <div>
      {content.qrCodeDataUrl && (
        <div className="mb-4">
          <Image 
            src={content.qrCodeDataUrl} 
            alt="QR Code" 
            width={400} 
            height={400}
            className="mx-auto"
          />
        </div>
      )}
      <CodeViewer code={content.code} model={""} prompt={""} />
    </div>
  );
}