import React from "react";
import { manilaToday } from "../../utils/manilaDate";
import styles from "./PatientContext.module.css";

/** Age is display-only; incomplete, impossible, or future dates stay unknown. */
export function ageFromDate(dateOfBirth, today = manilaToday()) {
  const birth = String(dateOfBirth || "").slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth) || birth > today) return null;
  const [year, month, day] = birth.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() + 1 !== month || parsed.getUTCDate() !== day) return null;
  const [currentYear, currentMonth, currentDay] = today.split("-").map(Number);
  return currentYear - year - (currentMonth < month || (currentMonth === month && currentDay < day) ? 1 : 0);
}

export function PatientContext({ name, age, dateOfBirth, chiefComplaint, queueNumber, reference, detail, children, className = "" }) {
  const displayAge = age ?? ageFromDate(dateOfBirth);
  return (
    <section className={`${styles.context} ${className}`.trim()} aria-label="Patient context">
      {queueNumber != null && <div className={styles.queue}><span>Queue</span><strong>{queueNumber}</strong></div>}
      <div className={styles.identity}>
        <h2>{name || "Patient"}</h2>
        <div className={styles.metadata}><span>Age: {displayAge == null ? "Not recorded" : `${displayAge} years`}</span>{reference && <span className={styles.reference}>{reference}</span>}</div>
        {detail && <div className={styles.detail}>{detail}</div>}
      </div>
      <div className={styles.complaint}><span>Chief complaint</span><p>{chiefComplaint || "Not recorded"}</p></div>
      {children && <div className={styles.actions}>{children}</div>}
    </section>
  );
}

export default PatientContext;
