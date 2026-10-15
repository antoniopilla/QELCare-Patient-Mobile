import React, { forwardRef } from "react";
import styles from "./ui.module.css";

const variants = { text: "skeletonText", circle: "skeletonCircle", panel: "skeletonPanel" };

export const Skeleton = forwardRef(/** @param {import('./types').SkeletonProps} props @param {import('react').ForwardedRef<HTMLSpanElement>} ref */ function Skeleton(
  { variant = "text", className, style, ...props },
  ref
) {
  return (
    <span
      {...props}
      ref={ref}
      aria-hidden="true"
      className={[styles.skeleton, styles[variants[variant] || variants.text], className].filter(Boolean).join(" ")}
      style={style}
    />
  );
});
