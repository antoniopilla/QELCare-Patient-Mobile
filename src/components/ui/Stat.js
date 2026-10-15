import React, { forwardRef } from "react";
import useCountUp from "../../hooks/useCountUp";
import styles from "./ui.module.css";

export const Stat = forwardRef(/** @param {import('./types').StatProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function Stat(
  { value, label, note, children, className, style, animateCount = false, ...props },
  ref
) {
  const finalValue = value ?? children;
  const displayValue = useCountUp(finalValue, { enabled: animateCount });
  const animated = animateCount && typeof finalValue === "number"
    && Number.isSafeInteger(finalValue) && finalValue >= 0;
  return (
    <div
      {...props}
      ref={ref}
      className={[styles.stat, className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className={styles.statValue} data-qc-count-up={animated ? "true" : undefined} role={animated ? "status" : undefined} aria-live={animated ? "off" : undefined} aria-label={animated ? String(finalValue) : undefined}>
        {animated ? <span aria-hidden="true">{displayValue}</span> : finalValue}
      </div>
      {label != null && <div className={styles.statLabel}>{label}</div>}
      {note != null && <div className={styles.statNote}>{note}</div>}
    </div>
  );
});
