import React, { useEffect } from "react";
import { X } from "lucide-react";
import { TOKENS } from "../../styles/theme";
import styles from "./common.module.css";

// Reusable in-app modal shell used across the app (admin, frontdesk, patient,
// doctor). Renders a fixed overlay with a centered card: a quiet header
// (title + optional subtitle + close button) and a scrollable body slot.
// Theme-agnostic and self-styled so it can be dropped into any screen without
// pulling in a specific design system. Closes on Escape and on overlay click,
// and locks background scroll while open.
//
// The consumer is expected to render its own <form> (with submit/cancel
// buttons) inside `children`, so keyboard submit and button clicks work
// naturally without an extra footer contract.
/** @param {{title: string, subtitle?: import('react').ReactNode, onClose?: () => void, children?: import('react').ReactNode, headerColor?: string, width?: number, closeOnOverlay?: boolean}} props */
export default function Modal({
  title,
  subtitle,
  onClose,
  children,
  headerColor = TOKENS.pine,
  width = 460,
  closeOnOverlay = true,
}) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onMouseDown={(event) => {
        if (closeOnOverlay && event.target === event.currentTarget) onClose?.();
      }}
      className={styles.modalOverlay}
    >
      <div
        className={styles.modal}
        style={{ width: `min(${width}px, 100%)` }}
      >
        <div
          className={styles.modalHeader}
          style={{ "--modal-accent": headerColor }}
        >
          <div className={styles.modalHeading}>
            <div className={styles.modalTitle}>{title}</div>
            {subtitle && (
              <div className={styles.modalSubtitle}>{subtitle}</div>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className={styles.modalClose}
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}
