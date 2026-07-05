import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Ichidoki - Watch Anime Online",
  description: "Stream your favorite anime in HD with SUB/DUB options.",
  manifest: "/manifest.json",
  icons: { icon: "/app-icon.png", apple: "/app-icon.png", shortcut: "/app-icon.png" },
};
export const viewport: Viewport = { themeColor: "#0b0b0f", width: "device-width", initialScale: 1, maximumScale: 1, userScalable: false };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}>
        {children}
        <Toaster position="top-center" toastOptions={{ style: { background: "#1c1c1c", border: "1px solid #2a2a2a", color: "#ffffff" } }} />
      </body>
    </html>
  );
}
