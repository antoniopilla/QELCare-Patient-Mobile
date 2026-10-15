import React, { forwardRef } from "react";
import { getStatusMeta } from "../../styles/statusMeta";
import styles from "./ui.module.css";

export const Stamp = forwardRef(/** @param {import('./types').StampProps} props @param {import('react').ForwardedRef<HTMLSpanElement>} ref */ function Stamp(
  { status, label, children, className = "", ...props },
  ref
) {
  const customWord = [label, children].find((value) => typeof value === "string" && value.trim());
  const value = status ?? customWord ?? "PAID";
  const key = typeof value === "string" ? value.trim().toUpperCase() : "";
  const meta = getStatusMeta(value);
  const variantClass = {
    PAID: styles.stampPaid,
    VOIDED: styles.stampVoided,
    AMENDED: styles.stampAmended,
  }[key];

  return (
    <span {...props} ref={ref} className={[styles.stamp, variantClass, className].filter(Boolean).join(" ")}>
      {customWord || meta.label}
    </span>
  );
});

export default Stamp;
