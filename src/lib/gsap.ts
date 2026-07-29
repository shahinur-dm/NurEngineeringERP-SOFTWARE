"use client";

import { useEffect } from "react";
import gsap from "gsap";

export function animateIn(
  el: HTMLElement | null,
  opts?: { y?: number; delay?: number; duration?: number },
) {
  if (!el) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: opts?.y ?? 14 },
    {
      opacity: 1,
      y: 0,
      duration: opts?.duration ?? 0.42,
      delay: opts?.delay ?? 0,
      ease: "power2.out",
    },
  );
}

export function animateStagger(
  els: HTMLElement[] | NodeListOf<Element>,
  opts?: { y?: number; stagger?: number; duration?: number },
) {
  if (!els.length) return;
  gsap.fromTo(
    els,
    { opacity: 0, y: opts?.y ?? 10 },
    {
      opacity: 1,
      y: 0,
      duration: opts?.duration ?? 0.32,
      stagger: opts?.stagger ?? 0.035,
      ease: "power2.out",
    },
  );
}

export function animateCardsIn(container: HTMLElement | null) {
  if (!container) return;
  const cards = container.querySelectorAll<HTMLElement>("[data-animate='card']");
  if (!cards.length) {
    animateIn(container, { y: 12 });
    return;
  }
  gsap.fromTo(
    cards,
    { opacity: 0, y: 16, scale: 0.985 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.38,
      stagger: 0.04,
      ease: "power2.out",
    },
  );
}

export function animateModalIn(backdrop: HTMLElement | null, panel: HTMLElement | null) {
  if (!backdrop || !panel) return;
  gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: 0.18 });
  gsap.fromTo(
    panel,
    { opacity: 0, y: 20, scale: 0.97 },
    { opacity: 1, y: 0, scale: 1, duration: 0.32, ease: "power3.out" },
  );
}

export function animateModalOut(
  backdrop: HTMLElement | null,
  panel: HTMLElement | null,
  onDone: () => void,
) {
  if (!backdrop || !panel) {
    onDone();
    return;
  }
  gsap.to(backdrop, { opacity: 0, duration: 0.14 });
  gsap.to(panel, {
    opacity: 0,
    y: 10,
    scale: 0.98,
    duration: 0.18,
    ease: "power2.in",
    onComplete: onDone,
  });
}

export function usePageEnter(ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    animateIn(ref.current, { y: 16 });
  }, [ref]);
}
