import { TOKENS } from "./theme";

// Presentation metadata only: these keys never change API values or transitions.
// Keep label/bg/color for the screens using the legacy StatusBadge interface.
const neutral = (label, progress = null) => ({
  label,
  bg: TOKENS.surface,
  color: TOKENS.ink2,
  tone: "neutral",
  progress,
});
const exception = (label, interrupted = false) => ({
  label,
  bg: TOKENS.signalWash,
  color: TOKENS.signal,
  tone: "exception",
  progress: null,
  interrupted,
});
const success = (label) => ({
  ...neutral(label),
  color: TOKENS.ok,
  tone: "success",
});

const paid = success("Paid");
const voided = exception("Voided");

export const STATUS_META = {
  PENDING: neutral("Pending", 0),
  CONFIRMED: neutral("Confirmed", 1),
  IN_QUEUE: neutral("In Queue", 2),
  FOR_BILLING: neutral("For Billing", 3),
  COMPLETED: neutral("Completed", 4),
  CANCELLED: exception("Cancelled", true),
  RESCHEDULED: neutral("Rescheduled", 0),
  NO_SHOW: exception("No Show", true),
  WAITING: neutral("Waiting"),
  CALLED: neutral("Called"),
  IN_PROGRESS: neutral("In Progress"),
  DONE: neutral("Done"),
  SKIPPED: neutral("Skipped"),
  PAID: paid,
  VOIDED: voided,
  UNPAID: exception("Unpaid"),
  OVERDUE: exception("Overdue"),
  AMENDED: neutral("Amended"),
  TAKEN: success("Taken"),
  NOT_DUE_YET: neutral("Not due yet"),
  PENDING_DOCTOR_REVIEW: neutral("Pending doctor review"),
  NOT_VALIDATED: exception("Not validated"),
  active: neutral("Active"),
  finished: neutral("Finished"),
  paused: neutral("Paused"),
  // Existing admin inquiry, billing, and account states retain their labels.
  new: neutral("New"),
  in_progress: neutral("In Progress"),
  resolved: neutral("Resolved"),
  archived: neutral("Archived"),
  paid,
  voided,
  verified: neutral("Active"),
  unverified: neutral("Unverified"),
  locked: exception("Locked"),
  deactivated: neutral("Deactivated"),
};

// Accept human-readable/case aliases at the presentation boundary only.
// A queue/payment state has no visit progress unless explicitly mapped above.
export function getStatusMeta(status, { pastDue = false } = {}) {
  const word = String(status ?? "").trim();
  const key = word.replace(/[\s-]+/g, "_").toUpperCase();
  const mappedKey = [word, key, key.toLowerCase()].find((candidate) =>
    Object.prototype.hasOwnProperty.call(STATUS_META, candidate)
  );
  const meta = mappedKey ? STATUS_META[mappedKey] : null;

  if (!meta) return neutral(word || "Unknown");
  if (key === "FOR_BILLING" && pastDue) {
    return { ...meta, bg: TOKENS.signalWash, color: TOKENS.signal, tone: "exception" };
  }
  return meta;
}
