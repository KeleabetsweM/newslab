import React, { useMemo, useState, useEffect } from "react";

interface SafeImageProps {
  src?: string | null;
  alt: string;
  className?: string;
  fallbackLabel?: string;
}

function createSvgFallback(label: string) {
  const safeLabel = label
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .slice(0, 120);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 760">
    <defs>
      <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
        <stop offset="0" stop-color="#1f2937"/>
        <stop offset="0.55" stop-color="#111827"/>
        <stop offset="1" stop-color="#e27d60"/>
      </linearGradient>
    </defs>
    <rect width="1200" height="760" fill="url(#bg)"/>
    <circle cx="950" cy="160" r="180" fill="#fbbf24" opacity="0.18"/>
    <circle cx="220" cy="560" r="220" fill="#38bdf8" opacity="0.10"/>
    <rect x="90" y="90" width="1020" height="580" rx="42" fill="#ffffff" opacity="0.08" stroke="#ffffff" stroke-opacity="0.18"/>
    <text x="100" y="140" font-family="Arial, sans-serif" font-size="28" font-weight="800" fill="#fbbf24" letter-spacing="4">NEWSROOM LAB</text>
    <text x="100" y="625" font-family="Arial, sans-serif" font-size="34" font-weight="700" fill="#ffffff">${safeLabel || "Image preview unavailable"}</text>
  </svg>`;

  try {
    if (typeof window !== "undefined") {
      return `data:image/svg+xml;base64,${window.btoa(unescape(encodeURIComponent(svg)))}`;
    }
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  } catch (e) {
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  }
}

export default function SafeImage({
  src,
  alt,
  className = "",
  fallbackLabel = "Image preview unavailable"
}: SafeImageProps) {
  const fallbackSrc = useMemo(() => createSvgFallback(fallbackLabel), [fallbackLabel]);
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  useEffect(() => {
    setCurrentSrc(src || fallbackSrc);
  }, [src, fallbackSrc]);

  return (
    <img
      src={currentSrc || fallbackSrc}
      alt={alt}
      className={className}
      referrerPolicy="no-referrer"
      onError={() => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
      }}
    />
  );
}
