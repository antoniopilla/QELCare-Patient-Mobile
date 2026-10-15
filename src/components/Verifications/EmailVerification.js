import { authClasses, AuthRules, AuthIllustration } from "../Auth/AuthFolio";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/auth";

// Password requirements (same as Bantay)
const checkPassword = (pw) => ({
  length:    pw.length >= 8,
  lowercase: /(?=.*[a-z])/.test(pw),
  uppercase: /(?=.*[A-Z])/.test(pw),
  number:    /(?=.*\d)/.test(pw),
  special:   /(?=.*[@$!%*?&#])/.test(pw),
});
const passwordValid = (pw) => Object.values(checkPassword(pw)).every(Boolean);

export default function EmailVerification() {
  const navigate  = useNavigate();
  // Read once when the screen opens. A successful verify/reset clears these from
  // sessionStorage; re-reading them made the screen jump to Forgot password
  // instead of showing the success message.
  const [email]   = useState(() => sessionStorage.getItem("otp_email") || "");
  const [flow]    = useState(() => sessionStorage.getItem("otp_flow") || "password_reset");
  const isRegistration = flow === "registration";

  const [view, setView]               = useState("verify");   // "verify" | "reset"
  const [code, setCode]               = useState(["","","","","",""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPw, setConfirmPw]     = useState("");
  const [showPw, setShowPw]           = useState(false);
  const [showCPw, setShowCPw]         = useState(false);
  const [timer, setTimer]             = useState(600);  // code validity (10 min) — matches backend OTP_TTL_MINUTES
  const [resendIn, setResendIn]       = useState(60);   // resend cooldown — matches backend OTP_COOLDOWN_SECONDS
  const canResend = resendIn <= 0;
  const [error, setError]             = useState("");
  const [success, setSuccess]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [sendingVia, setSendingVia]   = useState(null);   // "email" | "sms" while a new code is being sent
  const inputs = useRef([]);

  // Redirect if no email in session
  useEffect(() => {
    if (!email) navigate(isRegistration ? "/register" : "/forgot-password");
  }, [email, isRegistration, navigate]);

  // Countdown timers: expiry (informational) + resend cooldown (enables Resend).
  // Both run off one interval; resend unlocks after 60s while the code stays valid
  // for the full 10 minutes.
  useEffect(() => {
    if (view !== "verify") return;
    const id = setInterval(() => {
      setTimer(t => (t <= 1 ? 0 : t - 1));
      setResendIn(r => (r <= 1 ? 0 : r - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [view]);

  // -- OTP input handlers ------------------------------------
  const handleCodeChange = (i, val) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...code];
    next[i] = val.slice(-1);
    setCode(next);
    setError("");
    if (val && i < 5) inputs.current[i + 1]?.focus();
  };

  const handleCodeKey = (i, e) => {
    if (e.key === "Backspace" && !code[i] && i > 0) inputs.current[i - 1]?.focus();
  };

  // Let the user paste the whole 6-digit code from their email; distribute the
  // digits across the boxes (non-digits stripped).
  const handleCodePaste = (e) => {
    const digits = (e.clipboardData?.getData("text") || "").replace(/\D/g, "").slice(0, 6);
    if (!digits) return;
    e.preventDefault();
    const next = ["", "", "", "", "", ""];
    for (let j = 0; j < digits.length; j += 1) next[j] = digits[j];
    setCode(next);
    setError("");
    inputs.current[Math.min(digits.length, 5)]?.focus();
  };

  // -- Verify OTP --------------------------------------------
  const handleVerify = async () => {
    if (loading) return;
    const fullCode = code.join("");
    if (fullCode.length !== 6) return setError("Please enter all 6 digits.");

    setLoading(true); setError("");
    try {
      const endpoint = isRegistration
        ? `${API_URL}/auth/patient/register/verify`
        : `${API_URL}/auth/otp/verify`;

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: fullCode }),
      });
      const data = await res.json();

      if (data.success) {
        if (isRegistration) {
          setSuccess(data.message || "Account verified! Redirecting to sign in...");
          sessionStorage.removeItem("otp_email");
          sessionStorage.removeItem("otp_flow");
          sessionStorage.removeItem("otp_code");
          setTimeout(() => navigate("/login"), 1600);
        } else {
          sessionStorage.setItem("otp_code", fullCode);
          setSuccess("Code verified! Please set your new password.");
          setTimeout(() => { setView("reset"); setSuccess(""); }, 1200);
        }
      } else {
        setError(data.message || "Invalid code.");
        // Clear the boxes so the user retypes cleanly instead of editing stale digits.
        setCode(["", "", "", "", "", ""]);
        inputs.current[0]?.focus();
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  // -- Resend OTP (email or SMS) -----------------------------
  // channel:"sms" delivers the code by text — useful when email is slow on weak
  // mobile data. The backend looks up the account's phone; no number is typed here.
  const handleResend = async (channel = "email") => {
    if (!canResend || loading) return;
    setLoading(true); setSendingVia(channel); setError("");
    try {
      const endpoint = isRegistration
        ? `${API_URL}/auth/patient/register/resend`
        : `${API_URL}/auth/otp/resend`;

      const res  = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, channel }),
      });
      const data = await res.json();

      if (data.success) {
        setTimer(600); setResendIn(60);
        setCode(["","","","","",""]);
        const via = (data.channel || channel) === "sms" ? "by SMS" : "to your email";
        setSuccess(`New code sent ${via}!`); setTimeout(() => setSuccess(""), 2500);
      } else {
        setError(data.message || "Failed to resend.");
      }
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
      setSendingVia(null);
    }
  };

  // -- Reset Password ----------------------------------------
  const handleReset = async () => {
    if (loading) return;
    if (!newPassword) return setError("New password is required.");
    if (!passwordValid(newPassword)) return setError("Password does not meet all requirements.");
    if (!confirmPw) return setError("Please confirm your new password.");
    if (newPassword !== confirmPw) return setError("Passwords do not match.");
    const resetCode = sessionStorage.getItem("otp_code") || code.join("");
    if (!/^\d{6}$/.test(resetCode)) return setError("Please verify your email code before resetting your password.");

    setLoading(true); setError("");
    try {
      const res  = await fetch(`${API_URL}/auth/password/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: resetCode, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) return setError(data.message || "Reset failed.");

      setSuccess("Password reset successfully! Redirecting to sign in...");
      sessionStorage.removeItem("otp_email");
      sessionStorage.removeItem("otp_flow");
      sessionStorage.removeItem("otp_code");
      setTimeout(() => navigate("/login"), 2000);
    } catch {
      setError("Cannot connect to server.");
    } finally {
      setLoading(false);
    }
  };

  const checks = checkPassword(newPassword);

  // -- Same style as LoginScreen ----------------------------


  return (
    <>

      <main className={authClasses("page-wrap")}>
        <div className={authClasses("shell")}>
          {/* Brand */}
          <section className={authClasses("brand")}>
            <AuthRules />
            <div className={authClasses("brand-top")}>
              <div className={authClasses("logo")}>
                <div className={authClasses("logo-mark")}>
                  <svg viewBox="0 0 24 24"><path d="M12 4v16M4 12h16"/></svg>
                </div>
                <span>QELCare Portal</span>
              </div>
            </div>
            <div className={authClasses("brand-hero")}>
              <div className={authClasses("eyebrow")}>{view === "verify" ? "Email verification" : "Reset password"}</div>
              <h1>{view === "verify" ? "Enter the code sent to your email." : "Create your new secure password."}</h1>
              <p>{isRegistration ? "QELCare requires email verification before your patient account can sign in." : "QELCare requires a one-time code before resetting your password. Check your inbox and enter the 6-digit code."}</p>
              <AuthIllustration />
              <div className={authClasses("trust-grid")}>
                {[
                  { title:"Secure identity check",   body:"The code confirms access to the registered email address." },
                  { title:"10-minute expiry",         body:"Each code expires after 10 minutes. You can request a new one after 60 seconds." },
                  { title:"Password requirements",    body:"At least 8 characters with uppercase, lowercase, number, and special character." },
                ].map(c => (
                  <div className={authClasses("trust-card")} key={c.title}>
                    <div className={authClasses("trust-icon")}>
                      <svg viewBox="0 0 24 24"><path d="M12 3l7 4v5c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V7l7-4z"/><path d="M9.5 12.2l1.8 1.8 3.7-4.2"/></svg>
                    </div>
                    <div><strong>{c.title}</strong><span>{c.body}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={authClasses("brand-footer")}>
              <span>QELCare Clinic Management System</span>
              <span>Secure email verification</span>
            </div>
          </section>

          {/* Form */}
          <section className={authClasses("form-pane")}>
            <div className={authClasses("form-wrap")}>
              <button className={authClasses("back-link")} onClick={() => navigate(isRegistration ? "/register" : "/forgot-password")}>{"<- Back"}</button>

              {/* -- VERIFY VIEW -- */}
              {view === "verify" && (
                <>
                  <div className={authClasses("auth-head")}>
                    <h2>{isRegistration ? "Verify account" : "Verify your email"}</h2>
                    <p>Enter the 6-digit code sent to <span className={authClasses("email-display")}>{email}</span></p>
                  </div>
                  <div className={authClasses("card")}>
                    <div className={authClasses("status-pill")}>Code sent</div>

                    {error   && <div className={authClasses("alert alert-error")}>{error}</div>}
                    {success && <div className={authClasses("alert alert-success")}>{success}</div>}

                    <div>
                      <div className={authClasses("code-row")}>
                        <span className={authClasses("code-label")}>Verification code</span>
                        <span className={authClasses("timer-pill")}> {Math.floor(timer/60)}:{String(timer%60).padStart(2,"0")}</span>
                      </div>
                      <div className={authClasses("otp-inputs")}>
                        {code.map((v,i) => (
                          <input key={i} ref={el => inputs.current[i]=el}
                            type="text" inputMode="numeric" maxLength={1} value={v}
                            onChange={e => handleCodeChange(i, e.target.value)}
                            onPaste={handleCodePaste}
                            onKeyDown={e => handleCodeKey(i, e)} />
                        ))}
                      </div>
                      <p className={authClasses("otp-helper")}>
                        Enter each digit from your email. Check your spam folder if not received.
                        {!isRegistration && " No code after a minute? Double-check the email address you entered, or create an account if you don't have one yet."}
                      </p>
                    </div>

                    <div className={authClasses("actions")}>
                      <button className={authClasses("btn")} onClick={handleVerify} disabled={loading || !!success}>
                        {loading && !sendingVia ? "Verifying..." : isRegistration ? "Verify Account" : "Verify Code"}
                      </button>
                      <button className={authClasses("btn-ghost")} onClick={() => handleResend("email")} disabled={!canResend || loading}>
                        {sendingVia === "email" ? "Sending..." : canResend ? "Resend by email" : `Resend in ${resendIn}s`}
                      </button>
                      <button className={authClasses("btn-ghost")} onClick={() => handleResend("sms")} disabled={!canResend || loading}>
                        {sendingVia === "sms" ? "Sending SMS..." : "Send code via SMS"}
                      </button>
                      <p className={authClasses("otp-helper helper-center")}>
                        Email slow on weak signal? Get the code by SMS instead.
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* -- RESET VIEW -- */}
              {view === "reset" && (
                <>
                  <div className={authClasses("auth-head")}>
                    <h2>Reset password</h2>
                    <p>Create a new secure password for your QELCare account.</p>
                  </div>
                  <div className={authClasses("card")}>
                    <div className={authClasses("status-pill")}>Code verified</div>

                    {error   && <div className={authClasses("alert alert-error")}>{error}</div>}
                    {success && <div className={authClasses("alert alert-success")}>{success}</div>}

                    <div className={authClasses("field")}>
                      <label>New Password</label>
                      <div className={authClasses("input-wrap")}>
                        <input
                          type={showPw ? "text" : "password"}
                          placeholder="Enter new password"
                          value={newPassword}
                          onChange={e => { setNewPassword(e.target.value); setError(""); }}
                          onPaste={e => e.preventDefault()}
                          maxLength={50}
                        />
                        <button className={authClasses("toggle-btn")} type="button" onClick={() => setShowPw(v => !v)}>
                          <svg viewBox="0 0 24 24">{showPw ? <><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.4 5.1A11.2 11.2 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-4 4.7"/><path d="M6.6 6.7C3.9 8.5 2 12 2 12a15.8 15.8 0 0 0 10 7"/></> : <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></>}</svg>
                        </button>
                      </div>
                    </div>

                    {/* Password requirements - same as Bantay */}
                    {newPassword && (
                      <div className={authClasses("pw-reqs")}>
                        <p>Password Requirements:</p>
                        <ul>
                          {[
                            { key:"length",    label:"At least 8 characters" },
                            { key:"uppercase", label:"One uppercase letter" },
                            { key:"lowercase", label:"One lowercase letter" },
                            { key:"number",    label:"One number" },
                            { key:"special",   label:"One special character (@$!%*?&#)" },
                          ].map(r => (
                            <li key={r.key} className={authClasses(checks[r.key] ? "met" : "")}>
                              {checks[r.key] ? "OK" : ""} {r.label}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className={authClasses("field field-after")}>
                      <label>Confirm New Password</label>
                      <div className={authClasses("input-wrap")}>
                        <input
                          type={showCPw ? "text" : "password"}
                          placeholder="Re-enter new password"
                          value={confirmPw}
                          onChange={e => { setConfirmPw(e.target.value); setError(""); }}
                          onPaste={e => e.preventDefault()}
                          maxLength={50}
                        />
                        <button className={authClasses("toggle-btn")} type="button" onClick={() => setShowCPw(v => !v)}>
                          <svg viewBox="0 0 24 24">{showCPw ? <><path d="M3 3l18 18"/><path d="M10.6 10.7a2 2 0 0 0 2.7 2.7"/><path d="M9.4 5.1A11.2 11.2 0 0 1 12 5c6.5 0 10 7 10 7a15.8 15.8 0 0 1-4 4.7"/><path d="M6.6 6.7C3.9 8.5 2 12 2 12a15.8 15.8 0 0 0 10 7"/></> : <><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"/><circle cx="12" cy="12" r="3"/></>}</svg>
                        </button>
                      </div>
                    </div>

                    <div className={authClasses("actions")}>
                      <button className={authClasses("btn")} onClick={handleReset} disabled={loading || !!success}>
                        {loading ? "Resetting..." : "Reset Password"}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
