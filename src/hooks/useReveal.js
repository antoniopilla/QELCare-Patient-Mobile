import { useLayoutEffect, useRef } from "react";

// Content is visible without JavaScript/observer support; each group reveals once.
export default function useReveal() {
  const ref = useRef(null);

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let observer;
    const reveal = () => {
      element.dataset.revealState = "visible";
      observer?.disconnect();
    };
    const preferenceChanged = () => {
      if (media.matches) reveal();
    };

    if (media?.matches || typeof window.IntersectionObserver !== "function") {
      reveal();
    } else {
      element.dataset.revealState = "pending";
      try {
        observer = new window.IntersectionObserver((entries) => {
          if (entries.some((entry) => entry.target === element && entry.isIntersecting)) reveal();
        }, { threshold: 0.08, rootMargin: "0px 0px -24px 0px" });
        observer.observe(element);
      } catch {
        reveal();
      }
    }

    element.addEventListener("focusin", reveal);
    if (media?.addEventListener) media.addEventListener("change", preferenceChanged);
    else media?.addListener?.(preferenceChanged);
    return () => {
      observer?.disconnect();
      element.removeEventListener("focusin", reveal);
      if (media?.removeEventListener) media.removeEventListener("change", preferenceChanged);
      else media?.removeListener?.(preferenceChanged);
      element.removeAttribute("data-reveal-state");
    };
  }, []);

  return ref;
}
