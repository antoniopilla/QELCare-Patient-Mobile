import { useEffect, useRef, useState } from "react";

const DURATION = 600;
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const isCount = (value) => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

function canStartAnimation() {
  return typeof window !== "undefined"
    && typeof window.requestAnimationFrame === "function"
    && !window.matchMedia?.(REDUCED_MOTION).matches;
}

// Only explicitly opted-in integer counts animate. Do not pass clinical values,
// currency, identifiers, or formatted strings to this presentation-only hook.
export default function useCountUp(value, { enabled = false } = {}) {
  const eligible = enabled && isCount(value);
  const [display, setDisplay] = useState(() => eligible && canStartAnimation() ? 0 : value);
  const displayedRef = useRef(display);

  useEffect(() => {
    let active = true;
    let frameId = null;
    const media = typeof window !== "undefined" && window.matchMedia
      ? window.matchMedia(REDUCED_MOTION)
      : null;

    const show = (next) => {
      if (!active) return;
      displayedRef.current = next;
      setDisplay(next);
    };
    const cancelFrame = () => {
      if (frameId != null) window.cancelAnimationFrame(frameId);
      frameId = null;
    };
    const finish = () => {
      cancelFrame();
      show(value);
    };
    const preferenceChanged = () => {
      if (media.matches) finish();
    };

    if (!eligible || !canStartAnimation()) {
      show(value);
    } else {
      const from = isCount(displayedRef.current) ? displayedRef.current : 0;
      let startedAt = null;
      const tick = (time) => {
        if (!active) return;
        if (startedAt == null) startedAt = time;
        const progress = Math.min(1, Math.max(0, (time - startedAt) / DURATION));
        const eased = 1 - (1 - progress) ** 3;
        show(progress === 1 ? value : Math.round(from + (value - from) * eased));
        frameId = progress < 1 ? window.requestAnimationFrame(tick) : null;
      };
      if (from !== value) frameId = window.requestAnimationFrame(tick);
      else show(value);
    }

    if (eligible && media) {
      if (media.addEventListener) media.addEventListener("change", preferenceChanged);
      else media.addListener?.(preferenceChanged);
    }
    return () => {
      active = false;
      cancelFrame();
      if (eligible && media) {
        if (media.removeEventListener) media.removeEventListener("change", preferenceChanged);
        else media.removeListener?.(preferenceChanged);
      }
    };
  }, [eligible, value]);

  // Async data may replace the target before the effect runs. Reduced motion
  // and unsupported browsers must expose that new value on the same render.
  return eligible && canStartAnimation() ? display : value;
}
