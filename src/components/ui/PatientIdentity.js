import React from "react";
import styles from "./ui.module.css";

/** A display-only identity marker; the existing cell content remains intact. */
/** @param {{name?: string, children?: import('react').ReactNode, className?: string}} props */
export default function PatientIdentity({ name, children, className = "" }) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  const initials = words.length ? [words[0], words.length > 1 ? words[words.length - 1] : ""]
    .map((word) => Array.from(word)[0] || "").join("").toLocaleUpperCase() : "?";
  return <span className={`${styles.patientIdentity} ${className}`.trim()}>
    <span className={styles.patientInitials} aria-hidden="true">{initials}</span>
    <span className={styles.patientIdentityCopy}>{children ?? name}</span>
  </span>;
}
