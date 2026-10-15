import React from "react";
import { STATUS_META } from "../../styles/statusMeta";
import { Button } from "../ui/Button";
import { InlineAlert } from "../ui/InlineAlert";
import { StatusMark } from "../ui/StatusMark";

export { STATUS_META } from "../../styles/statusMeta";
export { Panel } from "../ui/Panel";
export { Field } from "../ui/Field";
export { EmptyState } from "../ui/EmptyState";
export { LoadingState } from "../ui/InlineAlert";
export { inputStyle } from "../ui/inputStyle";

export function todayISO() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function formatDate(value) {
  if (!value) return "-";
  const text = String(value).slice(0, 10);
  const [year, month, day] = text.split("-").map(Number);
  if (!year || !month || !day) return text;
  return new Date(year, month - 1, day).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatTime(value) {
  if (!value) return "-";
  const [hour, minute] = String(value).split(":").map(Number);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return String(value);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return date.toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" });
}

export function money(value) {
  const amount = Number(value || 0);
  return `PHP ${amount.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function statusLabel(status) {
  return STATUS_META[status]?.label || status || "-";
}

export function StatusBadge({ status }) {
  return <StatusMark status={status} label={STATUS_META[status]?.label || status || "-"} />;
}

/** @param {import('../ui/types').ButtonProps & { tone?: string }} props */
export function ActionButton({ children, tone = "primary", style, type = "button", ...props }) {
  const variant = { primary: "primary", secondary: "secondary", success: "primary", warning: "secondary", danger: "danger" }[tone] || "primary";

  return (
    <Button
      type={type}
      {...props}
      variant={variant}
      style={style}
    >
      {children}
    </Button>
  );
}

export function ErrorState({ message }) {
  return <InlineAlert message={message} tone="error" />;
}

export function getRows(payload, primary, fallback = "data") {
  return payload?.[primary] || payload?.[fallback] || [];
}
