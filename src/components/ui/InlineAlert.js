import React, { forwardRef } from "react";
import styles from "./ui.module.css";

const tones = { neutral: "alertNeutral", error: "alertError", success: "alertSuccess" };

export const InlineAlert = forwardRef(/** @param {import('./types').AlertProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function InlineAlert(
  { message, title, tone = "neutral", className, style, role, ...props },
  ref
) {
  if (!message) return null;
  return (
    <div
      {...props}
      ref={ref}
      role={role || (tone === "error" ? "alert" : "status")}
      className={[styles.inlineAlert, styles[tones[tone] || tones.neutral], className].filter(Boolean).join(" ")}
      style={style}
    >
      {title && <div className={styles.alertTitle}>{title}</div>}
      <div className={styles.alertMessage}>{message}</div>
    </div>
  );
});

export const Toast = forwardRef(/** @param {import('./types').ToastProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function Toast(
  { message, title, tone = "neutral", onDismiss, dismissLabel = "Dismiss notification", className, style, role, ...props },
  ref
) {
  if (!message) return null;
  return (
    <div
      {...props}
      ref={ref}
      role={role || (tone === "error" ? "alert" : "status")}
      className={[styles.inlineAlert, styles.toast, styles[tones[tone] || tones.neutral], className].filter(Boolean).join(" ")}
      style={style}
    >
      <div className={styles.alertMessage}>
        {title && <div className={styles.alertTitle}>{title}</div>}
        {message}
      </div>
      {onDismiss && (
        <button type="button" className={styles.toastDismiss} aria-label={dismissLabel} onClick={onDismiss}>
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
});

export const LoadingState = forwardRef(/** @param {import('./types').LoadingProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function LoadingState(
  { label = "Loading...", className, style, role = "status", ...props },
  ref
) {
  return (
    <div
      {...props}
      ref={ref}
      role={role}
      className={[styles.loadingState, className].filter(Boolean).join(" ")}
      style={style}
    >
      {label}
    </div>
  );
});
