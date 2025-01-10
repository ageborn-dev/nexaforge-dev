import { notFound, redirect } from "next/navigation";
import CodeViewer from "@/components/code-viewer";
import client from "@/lib/prisma";
import type { Metadata } from "next";
import { cache } from "react";
import { decrypt } from "@/lib/encryption";
import QRCode from "qrcode";
import Image from "next/image";

// Explicitly declare segment configuration
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Define PageProps type
interface PageProps {
  params: { id: string };
  searchParams?: { [key: string]: string };
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
        dark: "#000",
        light: "#fff",
      },
    });
  } catch (err) {
    console.error("QR Code generation failed:", err);
    return null;
  }
}

// Metadata generation
export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
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

// Main page component
export default async function Page({ params, searchParams }: PageProps) {
  const { id } = params;
  const { key, qr } = searchParams || {};

  const generatedApp = await getGeneratedAppByID(id);

  if (!generatedApp) {
    return <div>App not found</div>;
  }

  // Generate QR code if requested
  let qrCodeDataUrl: string | null = null;
  if (qr === "true") {
    qrCodeDataUrl = await generateQRCode(
      `${process.env.NEXT_PUBLIC_BASE_URL}/share/${id}`
    );
  }

  // Query shared code data
  const sharedCode = await client.$queryRaw`
    SELECT * FROM "SharedCode" WHERE "appId" = ${id}
  `;

  if (sharedCode && Array.isArray(sharedCode) && sharedCode.length > 0) {
    const shareData = sharedCode[0];

    // Handle encrypted content
    if (shareData.isEncrypted && !key) {
      return redirect(`/share/${id}/protected`);
    }

    if (shareData.isEncrypted && key) {
      try {
        const decrypted = await decrypt(shareData.content, key);
        generatedApp.code = JSON.parse(decrypted).code;
      } catch (error) {
        console.error("Decryption failed:", error);
        return redirect(`/share/${id}/protected?error=invalid`);
      }
    }

    // Check expiration
    if (shareData.expiresAt && new Date(shareData.expiresAt) < new Date()) {
      return <div>Share link expired</div>;
    }

    // Handle view limits
    if (shareData.remainingViews !== null && sharedCode.remainingViews <= 0) {
      return <div>Maximum views reached</div>;
    }

    // Decrement remaining views if applicable
    if (shareData.remainingViews !== null) {
      await client.$executeRaw`
        UPDATE "SharedCode" 
        SET "remainingViews" = "remainingViews" - 1 
        WHERE "appId" = ${id}
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
