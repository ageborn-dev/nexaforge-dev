import { notFound, redirect } from "next/navigation";
import CodeViewer from "@/components/code-viewer";
import client from "@/lib/prisma";
import type { Metadata } from "next";
import { cache } from "react";
import { decrypt } from "@/lib/encryption";
import QRCode from "qrcode";
import Image from 'next/image';

// Explicitly declare segment configuration
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Remove type declarations and let Next.js infer them
export async function generateMetadata({
  params,
}: {
  params: { id: string }
}): Promise<Metadata> {
  const generatedApp = await getGeneratedAppByID(params.id);

  let prompt = generatedApp?.prompt;
  if (typeof prompt !== "string") {
    notFound();
  }

  let searchParams = new URLSearchParams();
  searchParams.set("prompt", prompt);

  return {
    title: "An app generated on NexaForge",
    description: `Prompt: ${generatedApp?.prompt}`,
    openGraph: {
      images: [`/api/og?${searchParams}`],
    },
  };
}

export default async function SharePage({
  params,
  searchParams,
}: {
  params: { id: string },
  searchParams: { [key: string]: string | undefined }
  }
  ) {
  const getGeneratedAppByID = cache(async (id: string) => {
    const generatedApp = await client.generatedApp.findUnique({
      where: { id },
    });
    return generatedApp;
  });

  const generateQRCode = async (url: string) => {
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(url);
      return qrCodeDataUrl;
    } catch (error) {
      console.error('Error generating QR code:', error);
      return null;
    }
  };

  const key = typeof searchParams.key === 'string' ? searchParams.key : undefined;
  const qr = typeof searchParams.qr === 'string' ? searchParams.qr : undefined;

  const generatedApp = await getGeneratedAppByID(params.id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  // Generate QR code if requested
  let qrCodeDataUrl: string | null = null;
  if (qr === 'true') {
    qrCodeDataUrl = await generateQRCode(`${process.env.NEXT_PUBLIC_BASE_URL}/share/${params.id}`);
  }

  // After Prisma schema update, this will work
  const sharedCode = await client.$queryRaw`
    SELECT * FROM "SharedCode" WHERE "appId" = ${params.id}
  `;

  if (sharedCode && Array.isArray(sharedCode) && sharedCode.length > 0) {
    const shareData = sharedCode[0];
    
    if (shareData.isEncrypted && !key) {
      return redirect(`/share/${params.id}/protected`);
    }

    if (shareData.isEncrypted && key) {
      try {
        const decrypted = await decrypt(shareData.content, key);
        generatedApp.code = JSON.parse(decrypted).code;
      } catch (error) {
        console.error('Decryption failed:', error);
        return redirect(`/share/${params.id}/protected?error=invalid`);
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
        WHERE "appId" = ${params.id}
      `;
    }
  }

  return (
    <div>
      {qrCodeDataUrl && (
        <div className="mb-4">
          <Image 
            src={qrCodeDataUrl} 
            alt="QR Code" 
            width={400} 
            height={400}
            className="mx-auto"
          />
        </div>
      )}
      <CodeViewer code={generatedApp.code} model={""} prompt={""} />
    </div>
  );
}

const getGeneratedAppByID = cache(async (id: string) => {
  return client.generatedApp.findUnique({
    where: {
      id,
    },
  });
});

async function generateQRCode(url: string): Promise<string> {
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
    return '';
  }
}