import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ichidok — Watch Anime Online",
  description: "Stream your favorite anime in HD with SUB/DUB options. Auto-imports new episodes as they air.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ichidok",
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
  themeColor: "#000000",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
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
        {/* Google Cast SDK — loads the cast framework and custom elements */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window['__onGCastApiAvailable'] = function(isAvailable) {
                if (isAvailable) {
                  window.dispatchEvent(new CustomEvent('cast-api-ready'));
                }
              };
            `,
          }}
        />
        <script
          defer
          src="https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1"
        />
      </head>
      <body className={`${inter.variable} antialiased bg-black text-white`}>
        {children}
        <Toaster position="top-center" toastOptions={{ style: { background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#ffffff" } }} />
      </body>
    </html>
  );
}
