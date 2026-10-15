import React from "react";
import Modal from "./Modal";
import { Button } from "../ui/Button";
import { TOKENS } from "../../styles/theme";
import styles from "./common.module.css";

// In-app replacement for window.confirm(): a yes/no confirmation dialog built
// on the shared Modal shell. No text input - just a message and two buttons.
// `message` renders with pre-line whitespace so "\n\n" in the text becomes
// paragraph breaks. Pass `busy` while the confirmed action is in flight.
export default function ConfirmModal({
  title = "Please confirm",
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  tone = "danger", // "danger" | "primary"
  busy = false,
  onConfirm,
  onClose,
}) {
  const accent = tone === "danger" ? TOKENS.signal : TOKENS.pine;

  return (
    <Modal
      title={title}
      onClose={busy ? undefined : onClose}
      headerColor={accent}
      width={440}
      closeOnOverlay={!busy}
    >
      <div className={styles.confirmContent}>
        <div className={styles.confirmMessage}>{message}</div>
        <div className={styles.modalActions}>
          <Button type="button" variant="secondary" autoFocus onClick={onClose} disabled={busy}>
            {cancelText}
          </Button>
          <Button type="button" variant={tone === "danger" ? "danger" : "primary"} onClick={() => !busy && onConfirm()} disabled={busy}>
            {busy ? "Please wait..." : confirmText}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
