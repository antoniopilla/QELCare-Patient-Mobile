import React, { forwardRef } from "react";
import styles from "./ui.module.css";

export const EmptyState = forwardRef(/** @param {import('./types').EmptyStateProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function EmptyState(
  { title, detail, action, children, className, style, ...props },
  ref
) {
  return (
    <div
      {...props}
      ref={ref}
      className={[styles.emptyState, className].filter(Boolean).join(" ")}
      style={style}
    >
      <svg className={styles.emptyIllustration} viewBox="0 0 56 48" fill="none" aria-hidden="true" focusable="false">
        <path d="M13 6h23l7 7v29H13V6Z" fill="var(--surface)" stroke="var(--pine-300)" />
        <path d="M36 6v8h7M20 22h16M20 28h12M20 34h8" stroke="var(--pine-300)" strokeLinecap="round" />
        <circle cx="12" cy="36" r="7" fill="var(--brass-wash)" />
        <path d="M9 36h6m-3-3v6" stroke="var(--brass-ink)" strokeLinecap="round" />
      </svg>
      <div className={styles.emptyTitle}>{title}</div>
      {detail && <div className={styles.emptyDetail}>{detail}</div>}
      {(action || children) && <div className={styles.emptyAction}>{action || children}</div>}
    </div>
  );
});
