import React, { forwardRef } from "react";
import { getStatusMeta } from "../../styles/statusMeta";
import StatusMark from "./StatusMark";
import styles from "./ui.module.css";

const STEPS = ["Requested", "Confirmed", "In Queue", "Payment", "Completed"];

export const Thread = forwardRef(/** @param {import('./types').ThreadProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function Thread(
  { status, compact = false, pastDue = false, className = "", ...props },
  ref
) {
  const meta = getStatusMeta(status, { pastDue });
  const current = meta.progress;
  const hasProgress = Number.isInteger(current);
  const description = meta.interrupted
    ? `Visit interrupted: ${meta.label}`
    : hasProgress
      ? `Visit progress: ${meta.label}${pastDue && current === 3 ? ", past due" : ""}. Step ${current + 1} of ${STEPS.length}, ${STEPS[current]}.`
      : `Visit status: ${meta.label}`;
  const classes = [
    styles.thread,
    compact && styles.threadCompact,
    meta.interrupted && styles.threadInterrupted,
    className,
  ].filter(Boolean).join(" ");

  return (
    <div {...props} ref={ref} role={props.role || "group"} aria-label={props["aria-label"] || description} className={classes}>
      {meta.interrupted ? (
        <>
          <span className={styles.threadBreak} aria-hidden="true" />
          <span className={styles.threadExceptionLabel}><StatusMark status={status} /></span>
        </>
      ) : hasProgress ? (
        <>
          <ol key={current} className={styles.threadSteps} style={{ "--thread-progress": current }}>
            {STEPS.map((step, index) => {
              const state = index < current ? "completed" : index === current ? "current step" : "upcoming";
              const stateClass = index < current
                ? styles.threadReached
                : index === current ? styles.threadCurrent : styles.threadFuture;

              return (
                <li
                  key={step}
                  className={[styles.threadStep, stateClass].filter(Boolean).join(" ")}
                  aria-current={index === current ? "step" : undefined}
                  aria-label={`${step}: ${state}`}
                >
                  <span className={styles.threadDot} aria-hidden="true" />
                  <span className={styles.threadLabel}>{step}</span>
                </li>
              );
            })}
          </ol>
          {compact && <StatusMark status={status} pastDue={pastDue} />}
        </>
      ) : <StatusMark status={status} />}
    </div>
  );
});

export default Thread;
