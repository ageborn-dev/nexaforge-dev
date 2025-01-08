// layout.tsx
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import AnimatedBackground from "@/components/AnimatedBackground";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <body>
      <AnimatedBackground />

      {/* Content Overlay */}
      <div className="relative">
        <div className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center py-2">
          <Header />
          {children}
          <Footer />
        </div>
      </div>
    </body>
  );
}