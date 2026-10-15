import { authClasses, AuthRules, AuthIllustration } from "../Auth/AuthFolio";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/auth";
import { addYears, ageFromBirthDate, manilaToday } from "../../utils/manilaDate";
import {
  Plus as PlusIcon,
  ArrowLeft as ArrowLeftIcon,
  ArrowRight as ArrowRightIcon,
  ShieldCheck as ShieldIcon,
  Eye as EyeOpen,
  EyeOff as EyeClosed,
  CircleAlert as AlertIcon,
  Check as CheckIcon,
  Home as HomeIcon,
  Calendar as CalendarIcon,
  Phone as PhoneIcon,
  User as UserIcon,
  Mail as MailIcon,
  Lock as LockIcon,
  X as CloseIcon,
} from "lucide-react";

// --- Password strength --------------------------------------------------------
const checkPw = (pw) => ({
  length:    pw.length >= 8,
  lowercase: /(?=.*[a-z])/.test(pw),
  uppercase: /(?=.*[A-Z])/.test(pw),
  number:    /(?=.*\d)/.test(pw),
  special:   /(?=.*[@$!%*?&#])/.test(pw),
});
const pwValid = (pw) => Object.values(checkPw(pw)).every(Boolean);

const PW_CHECKS = [
  { key: "length",    label: "8+ chars" },
  { key: "uppercase", label: "Uppercase" },
  { key: "lowercase", label: "Lowercase" },
  { key: "number",    label: "Number" },
  { key: "special",   label: "Special (@$!%*?&#)" },
];

const STEPS = ["Personal Info", "Account Setup", "Password"];
const EMPTY = {
  first_name: "", last_name: "", date_of_birth: "", phone: "",
  email: "", username: "", password: "", confirm: "",
};

// --- Phone validation (PH format or international) ---------------------------
const isValidPhone = (ph) => {
  if (!ph) return true; // optional
  const cleaned = ph.replace(/[\s\-()]/g, "");
  return /^(09\d{9}|\+639\d{9}|\+\d{10,14})$/.test(cleaned);
};

// --- Age from DOB (as of the clinic's day, Asia/Manila) -----------------------
const calcAge = (dob) => (dob ? ageFromBirthDate(dob) : null);

// --- Max DOB date (must be at least 1 year old) -------------------------------
const maxDOB = () => addYears(manilaToday(), -1);

// --- Min DOB date (no older than 120 years) -----------------------------------
const minDOB = () => addYears(manilaToday(), -120);

// --- Username rules -----------------------------------------------------------
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,30}$/;
const usernameHint   = (u) => {
  if (!u) return null;
  if (u.length < 3)           return "At least 3 characters";
  if (u.length > 30)          return "Max 30 characters";
  if (!/^[a-zA-Z]/.test(u))  return "Must start with a letter";
  if (!USERNAME_REGEX.test(u)) return "Only letters, numbers, _ . - allowed";
  return null; // valid
};

// --- Name formatting ----------------------------------------------------------
// Only letters (incl. accents), spaces, period, apostrophe and hyphen are kept.
const NAME_CHARS = /[^A-Za-zÀ-ÿ.'\- ]/g;
// While typing: capitalize the first letter of each word and keep the rest as
// typed, so intentional capitals such as "McArthur" survive.
const liveName = (value) => value
  .replace(NAME_CHARS, "")
  .replace(/(^|[\s'-])([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
// Final form (on blur / before saving): an ALL-CAPS word such as "JUAN" becomes
// "Juan"; mixed case is left alone. Mirrors the backend's toTitleCase().
const formatName = (value) => liveName(
  value.replace(/[A-Za-zÀ-ÿ]+/g, (word) => (word.length > 1 && word === word.toUpperCase() ? word.toLowerCase() : word))
);

// --- Styles -------------------------------------------------------------------


const HIGHLIGHTS = [
  { title: "Secure registration",    desc: "Password-validated with secure encrypted storage." },
  { title: "Patient portal access",  desc: "Book appointments, view records, and track prescriptions." },
  { title: "Walk-in also supported", desc: "Already visited us? Ask staff to set up your account." },
];

// Bump this when the Data Privacy Statement / Terms text below changes, so the
// stored consent version reflects what the patient actually agreed to.
const PRIVACY_VERSION = "1.0";

const LEGAL = {
  privacy: {
    title: "Data Privacy Statement",
    intro:
      "QELCare (KOBE Clinic) values and protects your personal data in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173) of the Philippines.",
    sections: [
      ["What we collect", "Your name, date of birth, contact details (email and phone), and the health information you or your doctors provide — appointments, medical records, vitals, and lab result files you choose to upload."],
      ["How we use it", "To create and secure your account, manage your appointments, store your medical records and results, and send you clinic updates and verification codes."],
      ["How we protect it", "Passwords and verification codes are encrypted, access is restricted by staff role, and information is transmitted over secured connections."],
      ["Your rights", "You may access, correct, or request deletion of your personal data, and withdraw consent, by contacting the clinic."],
      ["Your consent", "By creating an account, you consent to the collection and processing of your personal and health information for the purposes described above."],
    ],
  },
  terms: {
    title: "Terms of Service",
    intro: "By creating a QELCare account and using the patient portal, you agree to the following:",
    sections: [
      ["Accurate information", "You will provide true and accurate details about yourself and any relative you are authorized to book for."],
      ["Proper use", "You will use the portal only for your own care, or for a relative you are authorized to assist, and will not attempt to access other users' data."],
      ["Not a medical service", "Patient tools — including AI text extraction for uploaded papers — are for personal tracking only and do not replace professional medical advice or an official clinic record."],
      ["Account security", "You are responsible for keeping your login credentials confidential. The clinic may suspend accounts that violate these terms."],
    ],
  },
};

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState(EMPTY);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState("");
  const [loading,   setLoading]   = useState(false);
  const [showPw,    setShowPw]    = useState(false);
  const [showCPw,   setShowCPw]   = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [legalView, setLegalView] = useState(null); // "privacy" | "terms" | null
  const [fieldErrors, setFieldErrors] = useState([]); // fields the server rejected, e.g. ["username"]

  // Let keyboard users dismiss the legal modal with Escape.
  useEffect(() => {
    if (!legalView) return undefined;
    const onKey = (e) => { if (e.key === "Escape") setLegalView(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [legalView]);

  // Name fields are normalized as the user types: invalid characters are blocked
  // and each word is auto-capitalized ("kelly celocia" -> "Kelly Celocia"). On
  // blur, ALL-CAPS words are tidied ("JUAN" -> "Juan"), matching what the backend
  // stores, while intentional mixed case ("McArthur") is kept.
  const NAME_FIELDS = ["first_name", "last_name", "middle_name"];
  const handle = e => {
    const { name, value } = e.target;
    const v = NAME_FIELDS.includes(name) ? liveName(value) : value;
    setForm(p => ({ ...p, [name]: v }));
    setError("");
    setFieldErrors(f => f.filter(field => field !== name));
  };
  const handleNameBlur = e => {
    const { name } = e.target;
    setForm(p => ({ ...p, [name]: formatName(p[name]) }));
  };

  // -- Per-step validation ---------------------------------------------------
  const validate = (s) => {
    if (s === 1) {
      if (!form.first_name.trim()) return "First name is required.";
      if (form.first_name.trim().length < 2) return "First name must be at least 2 characters.";
      if (!form.last_name.trim())  return "Last name is required.";
      if (form.last_name.trim().length < 2)  return "Last name must be at least 2 characters.";
      if (!form.date_of_birth)     return "Date of birth is required.";
      const age = calcAge(form.date_of_birth);
      if (!Number.isFinite(age) || age < 0 || age > 120) return "Please enter a valid date of birth.";
      if (age < 1) return "Date of birth must be at least 1 year ago.";
      if (form.phone && !isValidPhone(form.phone)) {
        return "Invalid phone number. Use 09XXXXXXXXX or +639XXXXXXXXX format.";
      }
    }
    if (s === 2) {
      if (!form.email.trim()) return "Email is required.";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return "Invalid email format.";
      if (!form.username.trim()) return "Username is required.";
      const uErr = usernameHint(form.username.trim());
      if (uErr) return uErr;
    }
    if (s === 3) {
      if (!form.password) return "Password is required.";
      if (!pwValid(form.password)) return "Password does not meet all requirements.";
      if (!form.confirm)  return "Please confirm your password.";
      if (form.password !== form.confirm) return "Passwords do not match.";
      if (!agreedToTerms) return "Please agree to the Terms of Service and Data Privacy Statement to sign up.";
    }
    return null;
  };

  const next = () => {
    const e = validate(step);
    if (e) return setError(e);
    setError("");
    if (step === 1) {
      setForm(p => ({ ...p, first_name: formatName(p.first_name), last_name: formatName(p.last_name) }));
    }
    setStep(s => s + 1);
  };
  const back = () => { setStep(s => s - 1); setError(""); };

  // Enter on steps 1-2 continues to the next step, like the Continue button
  // (step 3's Enter already submits the form).
  const handleFormKeyDown = (e) => {
    if (e.key !== "Enter" || step === 3 || e.target.tagName !== "INPUT") return;
    e.preventDefault();
    next();
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    const err = validate(3);
    if (err) return setError(err);
    setLoading(true); setError("");
    try {
      const payload = {
        first_name:    formatName(form.first_name).trim(),
        last_name:     formatName(form.last_name).trim(),
        date_of_birth: form.date_of_birth,
        email:         form.email.trim().toLowerCase(),
        username:      form.username.trim().toLowerCase(),
        password:      form.password,
        privacy_agreed: true,
        privacy_version: PRIVACY_VERSION,
        ...(form.phone ? { phone: form.phone.trim() } : {}),
      };
      const res  = await fetch(`${API_URL}/auth/patient/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // A taken username/email or an undeliverable email can only be caught by
        // the server. Send the patient back to Account Setup with the field(s)
        // to fix marked, instead of leaving them on the Password step.
        const accountFields = data.code === "DUPLICATE"
          ? (Array.isArray(data.fields) && data.fields.length ? data.fields : ["username", "email"])
          : data.code === "EMAIL_UNDELIVERABLE" ? ["email"] : [];
        if (accountFields.length) {
          setFieldErrors(accountFields);
          setStep(2);
        }
        return setError(data.message || "Registration failed. Please try again.");
      }
      sessionStorage.setItem("otp_email", payload.email);
      sessionStorage.setItem("otp_flow", "registration");
      sessionStorage.removeItem("otp_code");
      setSuccess(data.message || "Account created. Redirecting to email verification...");
      setTimeout(() => navigate("/verify-email"), 1600);
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const checks = checkPw(form.password);
  const confirmMatch = form.confirm && form.confirm === form.password;
  const confirmMismatch = form.confirm && form.confirm !== form.password;
  const uHint = usernameHint(form.username);
  const age   = calcAge(form.date_of_birth);

  return (
    <>

      <div className={authClasses("rg-page")}>
        <div className={authClasses("rg-shell")}>

          {/* -- Brand -- */}
          <section className={authClasses("rg-brand")}>
            <AuthRules />
            <div className={authClasses("rg-brand-top")}>
              <div className={authClasses("rg-logo")}>
                <div className={authClasses("rg-logo-mark")}><PlusIcon /></div>
                <span>QELCare Portal</span>
              </div>
              <button
                className={authClasses("rg-home-btn")}
                onClick={() => navigate("/")}
                title="Go to home page"
              >
                <HomeIcon /> Home
              </button>
            </div>

            <div className={authClasses("rg-brand-body")}>
              <div className={authClasses("rg-eyebrow")}><span className={authClasses("rg-eyebrow-dot")} />New Patient Sign Up</div>
              <h1>Sign up for your<br /><em>QELCare patient account.</em></h1>
              <p className={authClasses("rg-brand-desc")}>Sign up as a new patient to book appointments, access your records, and manage your health services online.</p>
              <AuthIllustration />
              <div className={authClasses("rg-highlights")}>
                {HIGHLIGHTS.map(h => (
                  <div className={authClasses("rg-highlight")} key={h.title}>
                    <strong>{h.title}</strong>
                    <span>{h.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={authClasses("rg-brand-foot")}>
              <span>QELCare Clinic Management System</span>
              <span className={authClasses("rg-foot-badge")}><ShieldIcon />Patient self-registration</span>
            </div>
          </section>

          {/* -- Form -- */}
          <section className={authClasses("rg-form-panel")}>
            <div className={authClasses("rg-form-inner")}>

              <button className={authClasses("rg-back")} onClick={() => step > 1 ? back() : navigate("/login")}>
                <ArrowLeftIcon />
                {step > 1 ? "Previous step" : "Back to sign in"}
              </button>

              <div className={authClasses("rg-form-head")}>
                <h2>Sign up</h2>
                <p>Step {step} of 3 - {STEPS[step - 1]}</p>
              </div>

              {/* Step progress bar */}
              <div className={authClasses("rg-step-bar")}>
                {[1, 2, 3].map(s => (
                  <div key={s} className={authClasses(`rg-step-pill${s < step ? " rg-step-complete" : s === step ? " rg-step-current" : ""}`)} />
                ))}
              </div>
              <div className={authClasses("rg-step-labels")}>
                {STEPS.map((label, i) => (
                  <span key={label} className={authClasses(`rg-step-label${i + 1 < step ? " rg-step-complete" : i + 1 === step ? " rg-step-current" : ""}`)}>
                    {label}
                  </span>
                ))}
              </div>

              <div className={authClasses("rg-badge")}><span className={authClasses("rg-badge-dot")} />Patient Sign Up</div>

              {error   && <div className={authClasses("rg-alert rg-alert-error")} role="alert"><AlertIcon />{error}</div>}
              {success && <div className={authClasses("rg-alert rg-alert-success")} role="status"><CheckIcon />{success}</div>}

              <form onSubmit={handleSubmit} onKeyDown={handleFormKeyDown} noValidate>

                {/* -- Step 1: Personal Info -- */}
                {step === 1 && <>
                  <div className={authClasses("rg-field-row")}>
                    <div className={authClasses("rg-field")}>
                      <label className={authClasses("rg-label")} htmlFor="rg-first-name">First Name</label>
                      <div className={authClasses("rg-input-wrap")}>
                        <input
                          id="rg-first-name"
                          className={authClasses("rg-input rg-input-no-icon")}
                          name="first_name"
                          value={form.first_name}
                          onChange={handle}
                          onBlur={handleNameBlur}
                          placeholder="Juan"
                          maxLength={50}
                          autoComplete="given-name"
                        />
                      </div>
                    </div>
                    <div className={authClasses("rg-field")}>
                      <label className={authClasses("rg-label")} htmlFor="rg-last-name">Last Name</label>
                      <div className={authClasses("rg-input-wrap")}>
                        <input
                          id="rg-last-name"
                          className={authClasses("rg-input rg-input-no-icon")}
                          name="last_name"
                          value={form.last_name}
                          onChange={handle}
                          onBlur={handleNameBlur}
                          placeholder="Dela Cruz"
                          maxLength={50}
                          autoComplete="family-name"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-dob">
                      Date of Birth
                    </label>
                    <div className={authClasses("rg-input-wrap")}>
                      <span className={authClasses("rg-input-icon")}><CalendarIcon /></span>
                      <input
                        id="rg-dob"
                        className={authClasses("rg-input")}
                        type="date"
                        name="date_of_birth"
                        value={form.date_of_birth}
                        onChange={handle}
                        min={minDOB()}
                        max={maxDOB()}
                        autoComplete="bdate"
                      />
                    </div>
                    {age !== null && age >= 0 && (
                      <p className={authClasses("rg-field-hint")}>Age: {age} year{age !== 1 ? "s" : ""} old</p>
                    )}
                  </div>

                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-phone">
                      Phone Number <span className={authClasses("rg-label-opt")}>(optional)</span>
                    </label>
                    <div className={authClasses("rg-input-wrap")}>
                      <span className={authClasses("rg-input-icon")}><PhoneIcon /></span>
                      <input
                        id="rg-phone"
                        className={authClasses(`rg-input${form.phone && !isValidPhone(form.phone) ? " rg-input-error" : ""}`)}
                        aria-invalid={Boolean(form.phone) && !isValidPhone(form.phone)}
                        name="phone"
                        value={form.phone}
                        onChange={handle}
                        placeholder="09XXXXXXXXX or +639XXXXXXXXX"
                        maxLength={20}
                        autoComplete="tel"
                        inputMode="tel"
                      />
                    </div>
                    {form.phone && !isValidPhone(form.phone) && (
                      <p className={authClasses("rg-field-hint rg-field-hint-err")}>Format: 09XXXXXXXXX or +639XXXXXXXXX</p>
                    )}
                  </div>
                </>}

                {/* -- Step 2: Account Setup -- */}
                {step === 2 && <>
                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-email">Email Address</label>
                    <div className={authClasses("rg-input-wrap")}>
                      <span className={authClasses("rg-input-icon")}><MailIcon /></span>
                      <input
                        id="rg-email"
                        className={authClasses(`rg-input${fieldErrors.includes("email") ? " rg-input-error" : ""}`)}
                        aria-invalid={fieldErrors.includes("email")}
                        type="email"
                        name="email"
                        value={form.email}
                        onChange={handle}
                        placeholder="name@example.com"
                        maxLength={100}
                        autoComplete="email"
                        inputMode="email"
                      />
                    </div>
                    <p className={authClasses("rg-field-hint")}>Used for account recovery and notifications.</p>
                  </div>

                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-username">Username</label>
                    <div className={authClasses("rg-input-wrap")}>
                      <span className={authClasses("rg-input-icon")}><UserIcon /></span>
                      <input
                        id="rg-username"
                        className={authClasses(`rg-input${(uHint && form.username) || fieldErrors.includes("username") ? " rg-input-error" : ""}`)}
                        aria-invalid={Boolean(uHint && form.username) || fieldErrors.includes("username")}
                        name="username"
                        value={form.username}
                        onChange={handle}
                        placeholder="Choose a unique username"
                        maxLength={30}
                        autoComplete="username"
                        autoCapitalize="none"
                      />
                    </div>
                    {form.username && (
                      <p className={authClasses(`rg-field-hint${uHint ? " rg-field-hint-err" : ""}`)}>
                        {uHint
                          ? uHint
                          : "Looks good — 3-30 characters, letters/numbers/_ . -"}
                      </p>
                    )}
                    {!form.username && (
                      <p className={authClasses("rg-field-hint")}>3-30 characters. Letters, numbers, _ . - allowed. Must start with a letter.</p>
                    )}
                  </div>
                </>}

                {/* -- Step 3: Password -- */}
                {step === 3 && <>
                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-password">Password</label>
                    <div className={authClasses("rg-pw-wrap")}>
                      <span className={authClasses("rg-input-icon icon-layer")}><LockIcon /></span>
                      <input
                        id="rg-password"
                        className={authClasses("rg-input")}
                        type={showPw ? "text" : "password"}
                        name="password"
                        value={form.password}
                        onChange={handle}
                        placeholder="Create a secure password"
                        maxLength={128}
                        autoComplete="new-password"
                      />
                      <button type="button" className={authClasses("rg-eye")} onClick={() => setShowPw(v => !v)} aria-label={showPw ? "Hide password" : "Show password"}>
                        {showPw ? <EyeClosed /> : <EyeOpen />}
                      </button>
                    </div>
                    {form.password && (
                      <div className={authClasses("rg-pw-checks")}>
                        {PW_CHECKS.map(({ key, label }) => (
                          <span key={key} className={authClasses(`rg-pw-check${checks[key] ? " rg-pw-check-met" : ""}`)}>
                            {checks[key] ? <CheckIcon /> : <span className={authClasses("rg-pw-dot")} />}
                            {label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className={authClasses("rg-field")}>
                    <label className={authClasses("rg-label")} htmlFor="rg-confirm">Confirm Password</label>
                    <div className={authClasses("rg-pw-wrap")}>
                      <span className={authClasses("rg-input-icon icon-layer")}><LockIcon /></span>
                      <input
                        id="rg-confirm"
                        className={authClasses(`rg-input${confirmMismatch ? " rg-input-error" : ""}`)}
                        aria-invalid={Boolean(confirmMismatch)}
                        type={showCPw ? "text" : "password"}
                        name="confirm"
                        value={form.confirm}
                        onChange={handle}
                        placeholder="Re-enter password"
                        maxLength={128}
                        autoComplete="new-password"
                      />
                      <button type="button" className={authClasses("rg-eye")} onClick={() => setShowCPw(v => !v)} aria-label={showCPw ? "Hide confirmed password" : "Show confirmed password"}>
                        {showCPw ? <EyeClosed /> : <EyeOpen />}
                      </button>
                    </div>
                    {confirmMatch && (
                      <div className={authClasses("rg-confirm-match text-success")}>
                        <CheckIcon />Passwords match
                      </div>
                    )}
                    {confirmMismatch && (
                      <div className={authClasses("rg-confirm-match text-error")}>
                        <AlertIcon />Passwords do not match
                      </div>
                    )}
                  </div>

                  {/* Terms of Service */}
                  <label className={authClasses("rg-terms")}>
                    <input
                      type="checkbox"
                      checked={agreedToTerms}
                      onChange={e => { setAgreedToTerms(e.target.checked); setError(""); }}
                    />
                    <span className={authClasses("rg-terms-label")}>
                      I agree to the{" "}
                      <button
                        type="button"
                        className={authClasses("rg-terms-link")}
                        onClick={e => { e.preventDefault(); setLegalView("terms"); }}
                      >
                        Terms of Service
                      </button>
                      {" "}and{" "}
                      <button
                        type="button"
                        className={authClasses("rg-terms-link")}
                        onClick={e => { e.preventDefault(); setLegalView("privacy"); }}
                      >
                        Data Privacy Statement
                      </button>
                    </span>
                  </label>
                </>}

                {/* -- Navigation -- */}
                <div className={authClasses("rg-actions")}>
                  {step < 3 && (
                    <button type="button" className={authClasses("rg-btn-main")} onClick={next}>
                      Continue <ArrowRightIcon />
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      type="submit"
                      className={authClasses("rg-btn-main")}
                      disabled={loading || !!success}
                    >
                      {loading ? "Signing up..." : success ? "Done!" : "Sign up"}
                    </button>
                  )}
                </div>
              </form>

              <p className={authClasses("rg-footnote")}>
                Already have an account?{" "}
                <button className={authClasses("rg-footnote-link")} onClick={() => navigate("/login")}>
                  Sign in here
                </button>
              </p>

            </div>
          </section>

        </div>
      </div>

      {legalView && (
        <div className={authClasses("modal-overlay")}
          onClick={() => setLegalView(null)}

        >
          <div className={authClasses("modal legal-modal")}
            role="dialog"
            aria-modal="true"
            aria-labelledby="rg-legal-title"
            onClick={e => e.stopPropagation()}

          >
            <div className={authClasses("modal-head")} >
              <h3 className={authClasses("modal-title")} id="rg-legal-title" >
                <span className={authClasses("modal-mark")} ><ShieldIcon size={17} /></span>
                {LEGAL[legalView].title}
              </h3>
              <button className={authClasses("modal-close")}
                type="button"
                onClick={() => setLegalView(null)}
                aria-label="Close"
                autoFocus

              >
                <CloseIcon size={18} />
              </button>
            </div>
            <div className={authClasses("modal-body")} >
              <p className={authClasses("legal-intro")} >{LEGAL[legalView].intro}</p>
              {LEGAL[legalView].sections.map(([heading, body]) => (
                <div className={authClasses("legal-section")} key={heading} >
                  <div className={authClasses("legal-heading")} >{heading}</div>
                  <div className={authClasses("modal-copy")} >{body}</div>
                </div>
              ))}
              {/* Reading one document must not tick the combined "Terms of Service
                  and Data Privacy Statement" box — consent is given only by the
                  patient ticking that checkbox themselves. */}
              <div className={authClasses("modal-actions legal-actions")} >
                <button className={authClasses("modal-primary")}
                  type="button"
                  onClick={() => setLegalView(null)}

                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
