"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export function SplashScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    // Start fade out after a brief moment to ensure content is ready
    const fadeTimer = setTimeout(() => {
      setIsFading(true);
    }, 500);

    // Remove from DOM after fade animation completes
    const removeTimer = setTimeout(() => {
      setIsVisible(false);
    }, 800);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#821019] transition-opacity duration-300 ${
        isFading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex flex-col items-center gap-6">
        <Image
          src="/icons/icon-192x192.png"
          alt="Gate Rides"
          width={120}
          height={120}
          priority
          className="rounded-3xl"
        />
        <h1 className="text-2xl font-semibold text-white">Gate Rides</h1>
        <div className="mt-4">
          <div className="h-1 w-16 overflow-hidden rounded-full bg-white/30">
            <div className="h-full w-full animate-pulse rounded-full bg-white" />
          </div>
        </div>
      </div>
    </div>
  );
}
