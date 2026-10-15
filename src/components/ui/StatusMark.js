import React, { forwardRef } from "react";
import { getStatusMeta } from "../../styles/statusMeta";
import styles from "./ui.module.css";

export const StatusMark = forwardRef(/** @param {import('./types').StatusProps} props @param {import('react').ForwardedRef<HTMLSpanElement>} ref */ function StatusMark(
  { status, label, pastDue = false, className = "", ...props },
  ref
) {
  const meta = getStatusMeta(status, { pastDue });
  const defaultWord = pastDue && meta.progress === 3 ? `${meta.label} (past due)` : meta.label;
  const word = typeof label === "string" && label.trim() ? label : defaultWord;
  const toneClass = meta.tone === "exception"
    ? styles.statusException
    : meta.tone === "success" ? styles.statusSuccess : "";

  return (
    <span {...props} ref={ref} className={[styles.statusMark, toneClass, className].filter(Boolean).join(" ")}>
      <span className={styles.statusDot} aria-hidden="true" />
      <span>{word}</span>
    </span>
  );
});

// Legacy vocabulary can adopt the same plain dot-and-word presentation.
export const Badge = StatusMark;

export default StatusMark;
