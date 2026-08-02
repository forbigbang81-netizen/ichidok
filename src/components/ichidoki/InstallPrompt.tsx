"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the install prompt event
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", () => setIsInstalled(true));

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === "accepted") {
      setShowPrompt(false);
      setDeferredPrompt(null);
    }
  };

  if (isInstalled || !showPrompt) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 mx-auto max-w-sm rounded-xl border border-[#f5c518]/30 bg-[#111111] p-4 shadow-2xl fade-in">
      <div className="flex items-start gap-3">
        <div className="shrink-0 rounded-lg bg-[#f5c518] p-2">
          <Download className="h-5 w-5 text-black" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-white">Install Ichidoki</h3>
          <p className="mt-0.5 text-xs text-white/50">
            Add to your home screen for a native app experience
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={handleInstall}
              className="flex-1 rounded-lg bg-[#f5c518] py-2 text-xs font-bold text-black transition-colors active:bg-[#e6b016]"
            >
              Install
            </button>
            <button
              type="button"
              onClick={() => setShowPrompt(false)}
              className="rounded-lg bg-white/5 px-4 py-2 text-xs font-bold text-white/60 transition-colors active:bg-white/10"
            >
              Later
            </button>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowPrompt(false)}
          className="shrink-0 text-white/30 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
