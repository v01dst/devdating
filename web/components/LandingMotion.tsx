"use client";

import { useEffect } from "react";

/**
 * Landing interaction layer (client leaf):
 * - scroll reveal via IntersectionObserver ([data-reveal] -> [data-reveal="in"])
 * - subtle parallax tilt on the match-card stack ([data-landing-stack])
 * Honors prefers-reduced-motion for everything.
 */
export function LandingMotion() {
  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* scroll reveal */
    const revealEls = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduce || !("IntersectionObserver" in window)) {
      revealEls.forEach((el) => el.setAttribute("data-reveal", "in"));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              (entry.target as HTMLElement).setAttribute("data-reveal", "in");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15 },
      );
      revealEls.forEach((el) => io.observe(el));
      /* cleanup: disconnect if the component ever unmounts */
      return () => io.disconnect();
    }
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !window.matchMedia("(pointer: fine)").matches) return;

    const stack = document.querySelector<HTMLElement>("[data-landing-stack]");
    const stage = document.querySelector<HTMLElement>("[data-landing-stage]");
    if (!stack || !stage) return;

    let raf: number | null = null;
    let tx = 0;
    let ty = 0;

    const onMove = (ev: MouseEvent) => {
      const rect = stage.getBoundingClientRect();
      tx = ((ev.clientX - rect.left) / rect.width - 0.5) * 10;
      ty = ((ev.clientY - rect.top) / rect.height - 0.5) * -8;
      if (raf === null) {
        raf = requestAnimationFrame(() => {
          stack.style.transform = `perspective(1100px) rotateY(${tx.toFixed(2)}deg) rotateX(${ty.toFixed(2)}deg)`;
          raf = null;
        });
      }
    };
    const onLeave = () => {
      stack.style.transform = "perspective(1100px) rotateY(0deg) rotateX(0deg)";
    };

    stack.style.transition = "transform .45s cubic-bezier(.2,.7,.2,1)";
    stage.addEventListener("mousemove", onMove);
    stage.addEventListener("mouseleave", onLeave);
    return () => {
      if (raf !== null) cancelAnimationFrame(raf);
      stage.removeEventListener("mousemove", onMove);
      stage.removeEventListener("mouseleave", onLeave);
    };
  }, []);

  return null;
}
