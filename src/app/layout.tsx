import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import CastProviderScript from "@/components/ichidoki/CastProviderScript";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ichidoki - Watch Anime Online",
  description: "Stream your favorite anime in HD with SUB/DUB options.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ichidoki",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/app-icon.png", sizes: "180x180", type: "image/png" }],
    shortcut: "/app-icon.png",
  },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = {
  themeColor: "#0b0b0f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <CastProviderScript />
        {/* Service worker for PWA install + offline support */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-center" toastOptions={{ style: { background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#ffffff" } }} />
      </body>
    </html>
  );
}
