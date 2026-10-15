import { authClasses, AuthRules, AuthIllustration } from "../Auth/AuthFolio";
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { saveLoginData, API_URL, consumeSessionExpired } from "../../utils/auth";
import { initPush } from "../../utils/push";
import {
  Plus as PlusIcon,
  User as UserIcon,
  Lock as LockIcon,
  Eye as EyeOpen,
  EyeOff as EyeClosed,
  UserPlus as UserPlusIcon,
  ShieldCheck as ShieldIcon,
  KeyRound as KeyIcon,
  LayoutGrid as GridIcon,
  CircleAlert as AlertIcon,
  Check as CheckIcon,
  Home as HomeIcon,
  TriangleAlert as WarnIcon,
  Clock as ClockIcon,
  Info as InfoIcon,
} from "lucide-react";

const ROLE_REDIRECT = {
  Patient: "/dashboard",
};

const FEATURES = [
  { icon: <GridIcon />,   title: "Patient Portal",      desc: "Appointments, records, medications, and lab results." },
  { icon: <ShieldIcon />, title: "Secure & Protected", desc: "JWT auth with lockout protection." },
  { icon: <KeyIcon />,    title: "Clinic-Ready",       desc: "Connected to your QELCare patient account." },
];

// """ Lockout Countdown """"""""""""""""""""""""""""""""""""""""""""""""""""""""
// Display only — LoginScreen owns the timer that actually unlocks the form.
function LockoutCountdown({ until }) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    const calc = () => Math.max(0, Math.floor((/** @type {number} */ (/** @type {unknown} */ (new Date(until))) - Date.now()) / 1000));
    setRemaining(calc());
    const id = setInterval(() => {
      const r = calc();
      setRemaining(r);
      if (r === 0) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, [until]);

  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className={authClasses("mono")}>
      {m > 0 ? `${m}m ` : ""}{String(s).padStart(2, "0")}s
    </span>
  );
}

// """ Styles """""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""""


export default function LoginScreen() {
  const navigate = useNavigate();
  const usernameRef = useRef(null);
  const passwordRef = useRef(null);

  const [username,     setUsername]     = useState("");
  const [password,     setPassword]     = useState("");
  const [showPass,     setShowPass]     = useState(false);
  const [rememberMe,   setRememberMe]   = useState(false);
  const [error,        setError]        = useState("");
  const [errorType,    setErrorType]    = useState("error"); // "error" | "warn" | "lock"
  const [errorField,   setErrorField]   = useState(null);    // "username" | "password" | null
  const [notice,       setNotice]       = useState("");
  const [success,      setSuccess]      = useState("");
  const [loading,      setLoading]      = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState(null); // 1-4 = warning
  const [lockoutUntil, setLockoutUntil] = useState(null); // ISO string when locked
  const [isLocked,     setIsLocked]     = useState(false);

  // Pre-fill username if remembered
  useEffect(() => {
    const saved = localStorage.getItem("qelcare_remembered_user");
    if (saved) { setUsername(saved); setRememberMe(true); }
  }, []);

  // Show a notice when the patient was signed out by the inactivity timeout.
  useEffect(() => {
    if (consumeSessionExpired()) {
      setError("Session expired. You were signed out due to inactivity — please sign in again.");
      setErrorType("warn");
    }
  }, []);

  // Unlock the form when the lockout ends. This lives here rather than in the
  // countdown, so editing a field (which used to clear the alert and its timer)
  // can never leave the form locked after the lockout has expired.
  useEffect(() => {
    if (!lockoutUntil) return undefined;
    const unlock = () => {
      setIsLocked(false);
      setLockoutUntil(null);
      setError("");
      setErrorType("error");
      setAttemptsLeft(null);
    };
    const remaining = new Date(lockoutUntil).getTime() - Date.now();
    if (!(remaining > 0)) { unlock(); return undefined; }
    const id = setTimeout(unlock, remaining);
    return () => clearTimeout(id);
  }, [lockoutUntil]);

  // While locked, keep the lockout alert and its countdown on screen.
  const clearFeedback = () => {
    setNotice("");
    if (isLocked) return;
    setError(""); setErrorType("error"); setErrorField(null); setAttemptsLeft(null);
  };

  const handleLogin = async () => {
    if (loading) return;
    if (!username.trim()) { setNotice(""); setError("Please enter your username."); setErrorType("error"); setErrorField("username"); return; }
    if (!password.trim()) { setNotice(""); setError("Please enter your password."); setErrorType("error"); setErrorField("password"); return; }
    if (isLocked) return;

    setLoading(true); clearFeedback(); setSuccess("");

    try {
      const res  = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password }),
      });
      const data = await res.json();

      if (!res.ok) {
        // "" Unverified patient account → send to email verification ""
        if (data.code === "ACCOUNT_UNVERIFIED") {
          if (data.email) {
            sessionStorage.setItem("otp_email", String(data.email).toLowerCase());
            sessionStorage.setItem("otp_flow", "registration");
            sessionStorage.removeItem("otp_code");
          }
          setError(data.message || "Account is not yet verified. Redirecting to email verification.");
          setErrorType("warn");
          setLoading(false);
          if (data.email) setTimeout(() => navigate("/verify-email"), 1100);
          return;
        }
        // "" Locked with countdown ""
        if (data.lockout_until) {
          setLockoutUntil(data.lockout_until);
          setIsLocked(true);
          setError(data.message || "Account temporarily locked.");
          setErrorType("lock");
          setLoading(false);
          return;
        }
        // "" Permanent lock ""
        if (data.message?.toLowerCase().includes("permanently locked")) {
          setError(data.message);
          setErrorType("lock");
          setLoading(false);
          return;
        }
        // "" Attempts warning ""
        if (typeof data.attempts_left === "number") {
          setAttemptsLeft(data.attempts_left);
          setError(`Incorrect password - ${data.attempts_left} attempt${data.attempts_left !== 1 ? "s" : ""} left before lockout.`);
          setErrorType("warn");
          setLoading(false);
          return;
        }
        // "" Generic error ""
        setError(data.message || "Invalid credentials.");
        setErrorType("error");
        setLoading(false);
        return;
      }

      // "" Success ""
      if (data.user?.role !== "Patient") {
        setError("This APK is for patient accounts only. Please use the main QELCare web portal for staff accounts.");
        setErrorType("warn");
        setLoading(false);
        return;
      }

      if (rememberMe) {
        localStorage.setItem("qelcare_remembered_user", username.trim());
      } else {
        localStorage.removeItem("qelcare_remembered_user");
      }
      saveLoginData(data.token, data.user);
      // Register this device for push now that we have a session (native only).
      initPush();
      setSuccess("Signed in successfully! Redirecting...");
      setTimeout(() => navigate(ROLE_REDIRECT[data.user.role] || "/dashboard"), 800);
    } catch {
      setError("Cannot connect to server. Please try again.");
      setErrorType("error");
      setLoading(false);
    }
  };

  const handleKey = (e) => { if (e.key === "Enter") handleLogin(); };

  // Attempts bar: 5 max before first lock
  const attemptsBarWidth = attemptsLeft != null ? `${((5 - attemptsLeft) / 5) * 100}%` : "0%";
  const attemptsBarColor = attemptsLeft <= 1 ? "var(--signal)" : attemptsLeft <= 2 ? "var(--signal)" : "var(--ink-2)";

  const alertClass = {
    error: "ls-alert-error",
    warn:  "ls-alert-warn",
    lock:  "ls-alert-lock",
  }[errorType] || "ls-alert-error";

  const AlertIconForType = () => {
    if (errorType === "lock") return <ClockIcon />;
    if (errorType === "warn") return <WarnIcon />;
    return <AlertIcon />;
  };

  return (
    <>

      <div className={authClasses("ls-page")}>
        <div className={authClasses("ls-shell")}>

          {/* "" Brand "" */}
          <section className={authClasses("ls-brand")}>
            <AuthRules />
            <div className={authClasses("ls-brand-top")}>
              <div className={authClasses("ls-logo")}>
                <div className={authClasses("ls-logo-mark")}><PlusIcon /></div>
                <span>QELCare Portal</span>
              </div>
              <button
                className={authClasses("ls-home-btn")}
                onClick={() => navigate("/")}
                title="Go to home page"
              >
                <HomeIcon /> Home
              </button>
            </div>

            <div className={authClasses("ls-brand-body")}>
              <div className={authClasses("ls-eyebrow")}>
                <span className={authClasses("ls-eyebrow-dot")} />
                Multispecialty Clinic Management
              </div>
              <h1>Secure sign in for<br /><em>your patient account.</em></h1>
              <p className={authClasses("ls-brand-desc")}>Access appointments, records, billing, and clinic services through one streamlined portal.</p>
              <AuthIllustration />
              <div className={authClasses("ls-features")}>
                {FEATURES.map(f => (
                  <div className={authClasses("ls-feat")} key={f.title}>
                    <div className={authClasses("ls-feat-icon")}>{f.icon}</div>
                    <strong>{f.title}</strong>
                    <span>{f.desc}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className={authClasses("ls-brand-foot")}>
              <span>QELCare Clinic Management System</span>
              <span className={authClasses("ls-foot-badge")}><ShieldIcon />Secure access</span>
            </div>
          </section>

          {/* "" Form "" */}
          <section className={authClasses("ls-form-panel")}>
            <div className={authClasses("ls-form-inner")}>
              <div className={authClasses("ls-form-head")}>
                <h2>Sign in</h2>
                <p>Enter your credentials to access your QELCare portal account.</p>
              </div>

              <div className={authClasses("ls-badge")}><span className={authClasses("ls-badge-dot")} />Secure portal authentication</div>

              {/* Alerts - aria-live so screen readers announce changes */}
              {error && (
                <div
                  className={authClasses(`ls-alert ${alertClass}`)}
                  role="alert"
                  aria-live="assertive"
                >
                  <AlertIconForType />
                  <span>
                    {error}
                    {errorType === "lock" && lockoutUntil && (
                      <> &mdash; unlocks in{" "}
                        <LockoutCountdown until={lockoutUntil} />
                      </>
                    )}
                  </span>
                </div>
              )}
              {notice && !error && !success && (
                <div className={authClasses("ls-alert ls-alert-info")} role="status" aria-live="polite">
                  <InfoIcon />{notice}
                </div>
              )}
              {success && (
                <div className={authClasses("ls-alert ls-alert-success")} role="status" aria-live="polite">
                  <CheckIcon />{success}
                </div>
              )}

              {/* Attempts progress bar */}
              {attemptsLeft != null && attemptsLeft < 5 && (
                <div className={authClasses("ls-attempts")}>
                  <div className={authClasses("ls-attempts-track")}>
                    <div
                      className={authClasses("ls-attempts-fill")}
                      style={{ width: attemptsBarWidth, background: attemptsBarColor }}
                    />
                  </div>
                </div>
              )}

              {/* Username */}
              <div className={authClasses("ls-field")}>
                <label className={authClasses("ls-label")} htmlFor="qelcare-username">Username</label>
                <div className={authClasses("ls-input-wrap")}>
                  <span className={authClasses("ls-input-icon")}><UserIcon /></span>
                  <input
                    id="qelcare-username"
                    ref={usernameRef}
                    className={authClasses(`ls-input${errorField === "username" ? " ls-input-error" : ""}`)}
                    aria-invalid={errorField === "username"}
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={e => { setUsername(e.target.value); clearFeedback(); }}
                    onKeyDown={handleKey}
                    maxLength={50}
                    autoComplete="username"
                    disabled={loading || !!success}
                  />
                </div>
              </div>

              {/* Password */}
              <div className={authClasses("ls-field")}>
                <label className={authClasses("ls-label")} htmlFor="qelcare-password">Password</label>
                <div className={authClasses("ls-input-wrap")}>
                  <span className={authClasses("ls-input-icon")}><LockIcon /></span>
                  <input
                    id="qelcare-password"
                    ref={passwordRef}
                    className={authClasses(`ls-input ls-input-pr${errorField === "password" ? " ls-input-error" : ""}`)}
                    aria-invalid={errorField === "password"}
                    type={showPass ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={e => { setPassword(e.target.value); clearFeedback(); }}
                    onKeyDown={handleKey}
                    maxLength={128}
                    autoComplete="current-password"
                    disabled={loading || !!success || isLocked}
                  />
                  <button
                    className={authClasses("ls-toggle")}
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? <EyeClosed /> : <EyeOpen />}
                  </button>
                </div>
              </div>

              {/* Remember me + Forgot */}
              <div className={authClasses("ls-row-meta")}>
                <label className={authClasses("ls-remember")}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={e => setRememberMe(e.target.checked)}
                  />
                  <span className={authClasses("ls-remember-label")}>Remember username</span>
                </label>
                <button className={authClasses("ls-link")} onClick={() => navigate("/forgot-password")}>
                  Forgot password?
                </button>
              </div>

              <button
                className={authClasses(`ls-btn${isLocked ? " ls-btn-lock" : ""}`)}
                onClick={handleLogin}
                disabled={loading || !!success || isLocked}
              >
                {loading ? "Signing in..." : success ? "Redirecting..." : isLocked ? "Account Locked" : "Sign in to QELCare"}
              </button>

              <div className={authClasses("ls-divider")}>
                <div className={authClasses("ls-divider-line")} />
                <span className={authClasses("ls-divider-label")}>Patient Access</span>
                <div className={authClasses("ls-divider-line")} />
              </div>

              <div className={authClasses("ls-patient-box")}>
                <p className={authClasses("ls-patient-lbl")}>New to QELCare?</p>
                <div className={authClasses("ls-patient-btns")}>
                  <button className={authClasses("ls-patient-btn")} onClick={() => navigate("/register")}>
                    <UserPlusIcon />New Patient
                  </button>
                </div>
              </div>

              <p className={authClasses("ls-footnote")}>Use your existing QELCare patient account to sign in.</p>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
