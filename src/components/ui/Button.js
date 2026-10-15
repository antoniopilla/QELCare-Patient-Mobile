import React, { forwardRef } from "react";
import styles from "./ui.module.css";

const variants = {
  primary: "buttonPrimary",
  secondary: "buttonSecondary",
  ghost: "buttonGhost",
  danger: "buttonDanger",
};

const sizes = { sm: "buttonSm", md: "buttonMd", lg: "buttonLg" };

export const Button = forwardRef(/** @param {import('./types').ButtonProps} props @param {import('react').ForwardedRef<HTMLButtonElement>} ref */ function Button(
  {
    children,
    variant = "primary",
    size = "md",
    type = "button",
    loading = false,
    disabled = false,
    className,
    style,
    "aria-busy": ariaBusy,
    ...props
  },
  ref
) {
  const classes = [
    styles.button,
    styles[variants[variant] || variants.primary],
    styles[sizes[size] || sizes.md],
    loading && styles.buttonLoading,
    className,
  ].filter(Boolean).join(" ");

  return (
    <button
      {...props}
      ref={ref}
      type={type}
      className={classes}
      style={style}
      disabled={disabled || loading}
      aria-busy={loading ? true : ariaBusy}
    >
      {children}
    </button>
  );
});
