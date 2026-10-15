import React from "react";
import { EmptyState } from "./EmptyState";
import PatientIdentity from "./PatientIdentity";
import styles from "./ui.module.css";

/** A semantic ledger. Each mobile cell keeps its visible column label. */
/** @param {import("./types").LedgerProps} props */
export default function LedgerTable({
  columns = [],
  rows = [],
  rowKey = "id",
  caption,
  emptyTitle = "No entries yet",
  emptyDetail,
  className = "",
  style,
  ...props
}) {
  return (
    <div className={`${styles.ledgerViewport} ${className}`.trim()} style={style}>
      <table role="table" className={`qc-rtable ${styles.ledgerTable}`} {...props}>
        {caption && <caption className={styles.ledgerCaption}>{caption}</caption>}
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} scope="col" className={column.numeric ? styles.ledgerNumeric : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? rows.map((row) => (
            <tr key={typeof rowKey === "function" ? rowKey(row) : row[rowKey]}>
              {columns.map((column) => (
                <td
                  key={column.key}
                  data-label={column.label}
                  className={[
                    column.numeric && styles.ledgerNumeric,
                    column.mono && styles.ledgerMono,
                    column.block && "qc-td-block",
                  ].filter(Boolean).join(" ") || undefined}
                >
                  {["patient", "patient_name"].includes(column.key) && row.patient_name
                    ? <PatientIdentity name={row.patient_name}>{column.render ? column.render(row) : row[column.key]}</PatientIdentity>
                    : column.render ? column.render(row) : row[column.key]}
                </td>
              ))}
            </tr>
          )) : (
            <tr>
              <td colSpan={columns.length || 1} className={`qc-td-block ${styles.ledgerEmpty}`}>
                <EmptyState title={emptyTitle} detail={emptyDetail} />
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

export { LedgerTable };
