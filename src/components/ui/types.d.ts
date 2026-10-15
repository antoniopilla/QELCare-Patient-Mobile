import type * as React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: string;
  size?: string;
  loading?: boolean;
}
export interface PanelProps extends React.HTMLAttributes<HTMLElement> { as?: React.ElementType; }
export interface EmptyStateProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  title?: React.ReactNode;
  detail?: React.ReactNode;
  action?: React.ReactNode;
}
export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
}
export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> { error?: boolean | string; }
export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> { error?: boolean | string; }
export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> { error?: boolean | string; }
export type MarkedControl = React.ElementType & { qelcareFieldControl?: boolean };
export interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, "title"> {
  message?: React.ReactNode;
  title?: React.ReactNode;
  tone?: string;
}
export interface ToastProps extends AlertProps { onDismiss?: () => void; dismissLabel?: string; }
export interface LoadingProps extends React.HTMLAttributes<HTMLDivElement> { label?: React.ReactNode; }
export interface PageHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>, "title"> {
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  eyebrow?: React.ReactNode;
  actions?: React.ReactNode;
}
export interface StatusProps extends React.HTMLAttributes<HTMLSpanElement> { status?: string; label?: string; pastDue?: boolean; }
export interface ThreadProps extends React.HTMLAttributes<HTMLDivElement> { status?: string; compact?: boolean; pastDue?: boolean; }
export interface StampProps extends React.HTMLAttributes<HTMLSpanElement> { status?: string; label?: string; }
export interface SkeletonProps extends React.HTMLAttributes<HTMLSpanElement> { variant?: string; }
export interface StatProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: React.ReactNode;
  label?: React.ReactNode;
  note?: React.ReactNode;
  animateCount?: boolean;
}
export interface LedgerProps extends React.TableHTMLAttributes<HTMLTableElement> {
  columns?: { key: string; label: string; numeric?: boolean; mono?: boolean; block?: boolean; render?: (row: Record<string, any>) => React.ReactNode }[];
  rows?: Record<string, any>[];
  rowKey?: string | ((row: Record<string, any>) => React.Key);
  caption?: React.ReactNode;
  emptyTitle?: string;
  emptyDetail?: string;
}
