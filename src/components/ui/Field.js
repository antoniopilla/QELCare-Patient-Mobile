import React, { Children, cloneElement, forwardRef, isValidElement, useId } from "react";
import styles from "./ui.module.css";

function controlClasses(className, error, multiline = false) {
  return [
    styles.input,
    multiline && styles.textarea,
    error && styles.inputError,
    className,
  ].filter(Boolean).join(" ");
}

export const Input = forwardRef(/** @param {import('./types').InputProps} props @param {import('react').ForwardedRef<HTMLInputElement>} ref */ function Input(
  { error = false, className, style, "aria-invalid": ariaInvalid, ...props },
  ref
) {
  return (
    <input
      {...props}
      ref={ref}
      className={controlClasses(className, error)}
      style={style}
      aria-invalid={error ? true : ariaInvalid}
    />
  );
});

export const Select = forwardRef(/** @param {import('./types').SelectProps} props @param {import('react').ForwardedRef<HTMLSelectElement>} ref */ function Select(
  { children, error = false, className, style, "aria-invalid": ariaInvalid, ...props },
  ref
) {
  return (
    <select
      {...props}
      ref={ref}
      className={controlClasses(className, error)}
      style={style}
      aria-invalid={error ? true : ariaInvalid}
    >
      {children}
    </select>
  );
});

export const Textarea = forwardRef(/** @param {import('./types').TextareaProps} props @param {import('react').ForwardedRef<HTMLTextAreaElement>} ref */ function Textarea(
  { error = false, className, style, "aria-invalid": ariaInvalid, ...props },
  ref
) {
  return (
    <textarea
      {...props}
      ref={ref}
      className={controlClasses(className, error, true)}
      style={style}
      aria-invalid={error ? true : ariaInvalid}
    />
  );
});

// A stable marker also keeps Field associations intact during React Fast Refresh,
// when an imported control can still refer to its previous component identity.
/** @type {import('./types').MarkedControl} */ (Input).qelcareFieldControl = true;
/** @type {import('./types').MarkedControl} */ (Select).qelcareFieldControl = true;
/** @type {import('./types').MarkedControl} */ (Textarea).qelcareFieldControl = true;

/** @param {any} child @returns {child is import("react").ReactElement<any>} */
function isDirectControl(child) {
  return isValidElement(child) && (
    ["input", "select", "textarea"].includes(/** @type {string} */ (child.type)) ||
    (/** @type {import("./types").MarkedControl} */ (child.type))?.qelcareFieldControl === true
  );
}

function describeWith(...ids) {
  return Array.from(new Set(ids.filter(Boolean).join(" ").split(/\s+/).filter(Boolean))).join(" ") || undefined;
}

export const Field = forwardRef(/** @param {import('./types').FieldProps} props @param {import('react').ForwardedRef<HTMLDivElement>} ref */ function Field(
  { label, id, hint, error, required = false, children, className, style, ...props },
  ref
) {
  const generatedId = useId();
  const controls = Children.toArray(children).filter(isDirectControl);
  const controlId = id || controls[0]?.props.id || `field-${generatedId}`;
  const hintId = hint != null && hint !== false ? `${controlId}-hint` : undefined;
  const errorId = error != null && error !== false && error !== true ? `${controlId}-error` : undefined;
  const fieldChildren = Children.map(children, (child) => {
    if (!isDirectControl(child)) return child;
    const childId = controls.length === 1 ? controlId : child.props.id;
    const controlProps = {
      id: childId,
      "aria-describedby": describeWith(child.props["aria-describedby"], hintId, errorId),
      "aria-invalid": error ? true : child.props["aria-invalid"],
    };
    if (error) {
      if (typeof child.type === "string") {
        controlProps.className = [child.props.className, styles.inputError].filter(Boolean).join(" ");
      } else {
        controlProps.error = error;
      }
    }
    return cloneElement(child, controlProps);
  });

  return (
    <div
      {...props}
      ref={ref}
      className={[styles.field, className].filter(Boolean).join(" ")}
      style={style}
    >
      <label className={styles.fieldLabel} htmlFor={controls.length === 1 ? controlId : undefined}>
        <span>{label}{required && <span aria-hidden="true"> *</span>}</span>
        {controls.length !== 1 && <span className={styles.fieldControl}>{fieldChildren}</span>}
      </label>
      {controls.length === 1 && <span className={styles.fieldControl}>{fieldChildren}</span>}
      {hintId && <span id={hintId} className={styles.fieldHint}>{hint}</span>}
      {errorId && <span id={errorId} className={styles.fieldError}>{error}</span>}
    </div>
  );
});
