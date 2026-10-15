import React, { forwardRef } from "react";
import styles from "./ui.module.css";

export const Panel = forwardRef(/** @param {import('./types').PanelProps} props @param {import('react').ForwardedRef<HTMLElement>} ref */ function Panel(
  { as: Component = "section", children, className, style, ...props },
  ref
) {
  return (
    <Component
      {...props}
      ref={ref}
      className={[styles.panel, className].filter(Boolean).join(" ")}
      style={style}
    >
      {children}
    </Component>
  );
});
