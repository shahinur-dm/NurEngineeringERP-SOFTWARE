"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

export function applySiteFavicon(customHref?: string) {
  if (typeof document === "undefined") return;
  const href = customHref || `/api/favicon?v=${Date.now()}`;
  const head = document.head;
  const existing = head.querySelectorAll<HTMLLinkElement>("link[rel*='icon']");
  if (existing.length) {
    existing.forEach((link) => {
      link.href = href;
    });
  } else {
    const link = document.createElement("link");
    link.rel = "icon";
    link.href = href;
    head.appendChild(link);
    const shortcut = document.createElement("link");
    shortcut.rel = "shortcut icon";
    shortcut.href = href;
    head.appendChild(shortcut);
  }
}

export function SiteFavicon() {
  const pathname = usePathname();
  useEffect(() => {
    applySiteFavicon();
  }, [pathname]);
  return null;
}
