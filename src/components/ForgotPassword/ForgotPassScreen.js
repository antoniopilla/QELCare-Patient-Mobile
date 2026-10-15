import { authClasses, AuthRules, AuthIllustration } from "../Auth/AuthFolio";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_URL } from "../../utils/auth";

function PlusIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>;
}
function MailIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="6" width="16" height="12" rx="2"/><path d="M4.5 7.5 12 13l7.5-5.5"/></svg>;
}
function ArrowLeftIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>;
}
function AlertIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/></svg>;
}
function CheckIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>;
}
function ShieldIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 4v5c0 4.5-2.9 7.9-7 9-4.1-1.1-7-4.5-7-9V7l7-4z"/><path d="M9.5 12.2l1.8 1.8 3.7-4.2"/></svg>;
}



const STEPS = [
  { n: "1", title: "Enter your email",     desc: "Provide the email linked to your QELCare account." },
  { n: "2", title: "Receive OTP code",     desc: "A 6-digit code is sent to your inbox. Valid for 10 minutes." },
  { n: "3", title: "Set a new password",   desc: "Verify the code and create a new secure password." },
];

export default function ForgotPasswordScreen() {
  const navigate = useNavigate();
  const [email,   setEmail]   = useState("");
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const validateEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    setError(""); setSuccess("");
    if (!email.trim())         return setError("Email is required.");
    if (!validateEmail(email)) return setError("Please enter a valid email address.");
    setLoading(true);
    try {
      const res  = await fetch(`${API_URL}/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        // Neutral wording on purpose: the backend does NOT reveal whether an account
        // exists (anti-enumeration), so we must not imply the email is definitely
        // registered. If it isn't, no code arrives and the guidance below helps.
        setSuccess("If an account exists for this email, a 6-digit code is on its way. Redirecting...");
        sessionStorage.setItem("otp_email", email.trim().toLowerCase());
        sessionStorage.setItem("otp_flow", "password_reset");
        sessionStorage.removeItem("otp_code");
        setTimeout(() => navigate("/verify-email"), 1500);
      } else {
        setError(data.message || "Failed to send verification code.");
      }
    } catch {
      setError("Cannot connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>

      <div className={authClasses("fp-page")}>
        <div className={authClasses("fp-shell")}>

          {/* Brand */}
          <section className={authClasses("fp-brand")}>
            <AuthRules />
            <div className={authClasses("fp-brand-top")}>
              <div className={authClasses("fp-logo")}>
                <div className={authClasses("fp-logo-mark")}><PlusIcon /></div>
                <span>QELCare Portal</span>
              </div>
            </div>
            <div className={authClasses("fp-brand-body")}>
              <div className={authClasses("fp-eyebrow")}><span className={authClasses("fp-eyebrow-dot")} />Credential Recovery</div>
              <h1>Reset access to your<br /><em>clinic portal account.</em></h1>
              <p className={authClasses("fp-brand-desc")}>Request a secure OTP code to recover access to your QELCare patient account.</p>
              <AuthIllustration />
              <div className={authClasses("fp-steps")}>
                {STEPS.map(s => (
                  <div className={authClasses("fp-step")} key={s.n}>
                    <div className={authClasses("fp-step-num")}>{s.n}</div>
                    <div><strong>{s.title}</strong><span>{s.desc}</span></div>
                  </div>
                ))}
              </div>
            </div>
            <div className={authClasses("fp-brand-foot")}>
              <span>QELCare Clinic Management System</span>
              <span className={authClasses("fp-foot-badge")}><ShieldIcon />Secure recovery</span>
            </div>
          </section>

          {/* Form */}
          <section className={authClasses("fp-form-panel")}>
            <div className={authClasses("fp-form-inner")}>
              <button className={authClasses("fp-back")} onClick={() => navigate("/login")}>
                <ArrowLeftIcon />Back to sign in
              </button>

              <div className={authClasses("fp-form-head")}>
                <h2>Forgot password</h2>
                <p>Enter your registered email and we'll send a 6-digit verification code.</p>
              </div>

              <div className={authClasses("fp-badge")}><span className={authClasses("fp-badge-dot")} />Secure password recovery</div>

              {error   && <div className={authClasses("fp-alert fp-alert-error")}><AlertIcon />{error}</div>}
              {success && <div className={authClasses("fp-alert fp-alert-success")}><CheckIcon />{success}</div>}

              <form onSubmit={handleSubmit}>
                <div className={authClasses("fp-field")}>
                  <label className={authClasses("fp-label")} htmlFor="fp-email">Email address</label>
                  <div className={authClasses("fp-input-wrap")}>
                    <span className={authClasses("fp-input-icon")}><MailIcon /></span>
                    <input id="fp-email" className={authClasses("fp-input")} type="email"
                      placeholder="name@example.com" value={email}
                      onChange={e => { setEmail(e.target.value); setError(""); }}
                      maxLength={100} autoComplete="email" />
                  </div>
                  <p className={authClasses("fp-helper")}>Enter the email address registered to your QELCare account.</p>
                </div>

                <button className={authClasses("fp-btn")} type="submit" disabled={loading || !!success}>
                  {loading ? "Sending..." : success ? "Check your email" : "Send Verification Code"}
                </button>
              </form>

              <p className={authClasses("fp-footnote")}>
                Remembered your password?{" "}
                <button className={authClasses("fp-footnote-link")} onClick={() => navigate("/login")}>Sign in here</button>
              </p>
              <p className={authClasses("fp-footnote")}>
                No QELCare account for this email?{" "}
                <button className={authClasses("fp-footnote-link")} onClick={() => navigate("/register")}>Create one</button>
              </p>
            </div>
          </section>

        </div>
      </div>
    </>
  );
}
