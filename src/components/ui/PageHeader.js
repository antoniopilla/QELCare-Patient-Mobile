import React, { forwardRef } from "react";
import styles from "./ui.module.css";

export const PageHeader = forwardRef(/** @param {import('./types').PageHeaderProps} props @param {import('react').ForwardedRef<HTMLElement>} ref */ function PageHeader(
  { title, subtitle, eyebrow, actions, className, style, ...props },
  ref
) {
  return (
    <header
      {...props}
      ref={ref}
      className={[styles.pageHeader, className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className={styles.pageHeaderCopy}>
        {eyebrow && <div className={styles.pageEyebrow}>{eyebrow}</div>}
        <h1 className={styles.pageTitle}>{title}</h1>
        {subtitle && <p className={styles.pageSubtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
});
