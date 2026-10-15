import React, { useState } from "react";
import Modal from "./Modal";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Field";
import { TOKENS } from "../../styles/theme";
import styles from "./common.module.css";

// In-app replacement for window.prompt() when a short, required reason must be
// captured (appointment cancellation, medication decline, etc.). Renders a
// labelled textarea inside a Modal, blocks submission until a non-empty reason
// is entered, and hands the trimmed reason to onConfirm.
//
// The parent decides what happens next (close the modal and fire the request);
// pass `busy` while that request is in flight to disable the controls.
/** @param {{title?: string, subtitle?: import('react').ReactNode, label?: string, placeholder?: string, confirmText?: string, cancelText?: string, tone?: string, busy?: boolean, maxLength?: number, onConfirm: (reason: string) => void, onClose: () => void}} props */
export default function ReasonModal({
  title = "Provide a reason",
  subtitle,
  label = "Reason",
  placeholder = "Type a short reason...",
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger", // "danger" | "primary"
  busy = false,
  maxLength, // optional: caps the text and shows a character count
  onConfirm,
  onClose,
}) {
  const [reason, setReason] = useState("");
  const trimmed = reason.trim();
  const accent = tone === "danger" ? TOKENS.signal : TOKENS.pine;
  const countId = "reason-modal-count";

  const submit = (event) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    onConfirm(trimmed);
  };

  return (
    <Modal
      title={title}
      subtitle={subtitle}
      onClose={busy ? undefined : onClose}
      headerColor={accent}
      width={480}
      closeOnOverlay={!busy}
    >
      <form onSubmit={submit} className={styles.reasonForm}>
        <label className={styles.reasonLabel}>
          {label}
          <Textarea
            autoFocus
            rows={4}
            value={reason}
            placeholder={placeholder}
            disabled={busy}
            maxLength={maxLength}
            aria-describedby={maxLength ? countId : undefined}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {maxLength && (
          <span id={countId} className={styles.reasonCount}>
            {reason.length}/{maxLength} characters
          </span>
        )}

        <div className={styles.modalActions}>
          <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button type="submit" variant={tone === "danger" ? "danger" : "primary"} disabled={busy || !trimmed}>
            {busy ? "Please wait..." : confirmText}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
