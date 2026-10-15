import styles from "./ProfileScreen.module.css";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, logout } from "../../utils/auth";
import MainLayout from "../Layout/MainLayout";
import { EmptyState, LoadingState } from "../Workflow/ClinicUi";
import { ageFromBirthDate, CLINIC_TZ } from "../../utils/manilaDate";

const profileClasses = (value) => value.split(/\s+/).filter(Boolean).map((name) => styles[name] || "").filter(Boolean).join(" ");

// Same two sub-sections as the website's Profile Settings.
const TABS = [
  { id: "profile", label: "Profile" },
  { id: "security", label: "Security" },
];

const blankForm = {
  username: "",
  first_name: "",
  last_name: "",
  middle_name: "",
  suffix: "",
  email: "",
  phone: "",
  alternate_phone: "",
  gender: "",
  date_of_birth: "",
  address_line: "",
};

const FIELD_LIMITS = {
  username: 50,
  email: 100,
  first_name: 50,
  last_name: 50,
  middle_name: 50,
  suffix: 10,
  phone: 20,
  alternate_phone: 20,
};

function lengthError(label, value, max) {
  return String(value || "").length > max ? `${label} must be ${max} characters or less.` : "";
}

function validateProfileForm(form) {
  const checks = [
    ["Username", form.username, FIELD_LIMITS.username],
    ["Email", form.email, FIELD_LIMITS.email],
    ["First name", form.first_name, FIELD_LIMITS.first_name],
    ["Last name", form.last_name, FIELD_LIMITS.last_name],
    ["Middle name", form.middle_name, FIELD_LIMITS.middle_name],
    ["Suffix", form.suffix, FIELD_LIMITS.suffix],
    ["Phone", form.phone, FIELD_LIMITS.phone],
    ["Alternate phone", form.alternate_phone, FIELD_LIMITS.alternate_phone],
  ];
  for (const [label, value, max] of checks) {
    const error = lengthError(label, value, max);
    if (error) return error;
  }
  if (form.username && !/^[a-zA-Z0-9._-]{3,50}$/.test(form.username.trim())) {
    return "Username must be 3-50 characters and may contain letters, numbers, dot, underscore, or hyphen.";
  }
  if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    return "Enter a valid email address.";
  }
  // Phone FORMAT (matches the backend + registration): PH mobile 09XXXXXXXXX,
  // +639XXXXXXXXX, or international +<10-14 digits>. Optional -> empty passes.
  const phoneOk = (value) => {
    const cleaned = String(value || "").trim().replace(/[\s\-()]/g, "");
    return !cleaned || /^(09\d{9}|\+639\d{9}|\+\d{10,14})$/.test(cleaned);
  };
  if (!phoneOk(form.phone)) return "Enter a valid phone, e.g. 09XXXXXXXXX or +639XXXXXXXXX.";
  if (!phoneOk(form.alternate_phone)) return "Enter a valid alternate phone, e.g. 09XXXXXXXXX or +639XXXXXXXXX.";
  return "";
}

function nameFrom(profile, patient) {
  return [
    profile?.first_name || patient?.first_name,
    profile?.middle_name || patient?.middle_name,
    profile?.last_name || patient?.last_name,
    profile?.suffix || patient?.suffix,
  ].filter(Boolean).join(" ").trim() || patient?.display_name || patient?.name || "Patient";
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "PT";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

// Age as of the clinic's day (Asia/Manila), whatever the phone's time zone.
function ageFrom(dateOfBirth) {
  const age = ageFromBirthDate(dateOfBirth);
  return age !== null && age >= 0 ? `${age} years old` : "";
}

function makeForm(profile, patient) {
  return {
    username: profile?.username || "",
    first_name: profile?.first_name || patient?.first_name || "",
    last_name: profile?.last_name || patient?.last_name || "",
    middle_name: profile?.middle_name || patient?.middle_name || "",
    suffix: profile?.suffix || patient?.suffix || "",
    email: profile?.email || patient?.email || patient?.user_email || "",
    phone: profile?.phone || patient?.phone || patient?.contact || "",
    alternate_phone: profile?.alternate_phone || "",
    gender: profile?.gender || patient?.gender || "",
    date_of_birth: String(profile?.date_of_birth || patient?.date_of_birth || "").slice(0, 10),
    address_line: profile?.address_line || patient?.address || "",
  };
}

function changedContactFields(form, profile) {
  const fields = ["username", "email", "phone", "alternate_phone", "address_line"];
  return fields.filter((field) => String(form[field] || "").trim() !== String(profile?.[field] || "").trim());
}

// New styled field wrapper (label + control) matching the redesigned web profile.
function Field({ label, required = false, wide = false, children }) {
  return (
    <label className={profileClasses(`ps-field${wide ? " ps-col-2" : ""}`)}>
      <span className={profileClasses("lbl")}>
        {label}
        {required && <span className={profileClasses("req")}>*</span>}
      </span>
      <div className={profileClasses("ps-control")}>{children}</div>
    </label>
  );
}

const SECTION_ICONS = {
  identity: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="12" cy="10" r="2.5" />
      <path d="M8.5 16a3.5 3.5 0 0 1 7 0" />
    </svg>
  ),
  contact: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  ),
  address: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  ),
};

const TAB_ICONS = {
  profile: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
  security: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

function SectionHead({ icon, title }) {
  return (
    <div className={profileClasses("ps-section-head")}>
      <span className={profileClasses("ps-sdot")}>{SECTION_ICONS[icon]}</span>
      <h4>{title}</h4>
    </div>
  );
}

// Clinic time (Asia/Manila), whatever the phone's time zone. Same as the website.
function formatDateTime(value) {
  if (!value) return "Not recorded";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not recorded";
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: CLINIC_TZ,
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

// One read-only account detail on the Security tab.
function ReadOnly({ label, value, mono = false }) {
  return (
    <div className={profileClasses("ps-stat")}>
      <div className={profileClasses("ps-stat-k")}>{label}</div>
      <div className={profileClasses(`ps-stat-v${mono ? " mono" : ""}`)}>{value || "Not recorded"}</div>
    </div>
  );
}

// Same 5 password rules the website enforces (features/auth changePassword).
const PW_RULES = [
  { key: "length", label: "8+ characters" },
  { key: "uppercase", label: "Uppercase" },
  { key: "lowercase", label: "Lowercase" },
  { key: "number", label: "Number" },
  { key: "special", label: "Special (@$!%*?&#)" },
];
function passwordChecks(password) {
  return {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[@$!%*?&#]/.test(password),
  };
}

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState("profile");
  const [profile, setProfile] = useState(null);
  const [patient, setPatient] = useState(null);
  const [form, setForm] = useState(blankForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [showPw, setShowPw] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwMsg, setPwMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const [profileRes, patientRes] = await Promise.all([
        authFetch("/users/me"),
        authFetch("/patients/me"),
      ]);

      const profilePayload = await profileRes.json();
      const patientPayload = await patientRes.json();

      if (!profileRes.ok) throw new Error(profilePayload.message || "Failed to load account profile.");
      if (!patientRes.ok) throw new Error(patientPayload.message || "Failed to load patient profile.");

      const profileData = profilePayload.data || profilePayload.user || profilePayload.profile;
      const patientData = patientPayload.patient || patientPayload.data;

      setProfile(profileData);
      setPatient(patientData);
      setForm(makeForm(profileData, patientData));
      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const displayName = useMemo(() => nameFrom(profile, patient), [profile, patient]);
  const ageLabel = useMemo(() => ageFrom(form.date_of_birth || patient?.date_of_birth), [form.date_of_birth, patient]);
  const needsOtp = useMemo(() => changedContactFields(form, profile).length > 0, [form, profile]);
  const canSave = !saving && (!needsOtp || otpVerified);
  const statusValue = profile?.status || "unknown";
  const statusOk = String(statusValue).toLowerCase() === "verified";
  const hasPhoto = Boolean(profile?.profile_picture);

  // Typed values stay when switching tabs (as on the website); only the
  // messages are cleared, so one tab's notice isn't left showing over the other.
  function switchTab(id) {
    if (id === activeTab) return;
    setActiveTab(id);
    setError("");
    setMessage("");
    setPwError("");
  }

  function updateField(name, value) {
    setForm((current) => ({ ...current, [name]: value }));
    if (["username", "email", "phone", "alternate_phone", "address_line"].includes(name)) {
      setOtpVerified(false);
    }
  }

  async function sendOtp() {
    const email = profile?.email || form.email;
    if (!email) {
      setError("Your current email is required before OTP can be sent.");
      return;
    }

    setOtpSending(true);
    setError("");
    setMessage("");
    try {
      const response = await authFetch("/auth/patient/profile/otp", {
        method: "POST",
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.message || "Failed to send OTP.");
      setOtpSent(true);
      setMessage(`Verification code sent to ${email}. Enter it before saving contact changes.`);
    } catch (err) {
      setError(err.message || "Failed to send OTP.");
    } finally {
      setOtpSending(false);
    }
  }

  async function verifyOtp() {
    const email = profile?.email || form.email;
    if (!/^\d{6}$/.test(otpCode)) {
      setError("Enter the 6-digit OTP code.");
      return;
    }

    setOtpVerifying(true);
    setError("");
    setMessage("");
    try {
      const response = await authFetch("/auth/patient/profile/otp/check", {
        method: "POST",
        body: JSON.stringify({ code: otpCode }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.message || "OTP verification failed.");
      setOtpVerified(true);
      setMessage("OTP verified. You can now save your profile changes.");
    } catch (err) {
      setOtpVerified(false);
      setError(err.message || "OTP verification failed.");
    } finally {
      setOtpVerifying(false);
    }
  }

  async function save(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!form.first_name.trim() || !form.last_name.trim()) {
      setError("First name and last name are required.");
      return;
    }
    const validationError = validateProfileForm(form);
    if (validationError) {
      setError(validationError);
      return;
    }
    if (needsOtp && !otpVerified) {
      setError("Please verify the OTP before saving username, email, phone, or address changes.");
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch("/auth/patient/profile", {
        method: "PUT",
        body: JSON.stringify({
          username: form.username.trim(),
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          middle_name: form.middle_name.trim(),
          suffix: form.suffix.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          alternate_phone: form.alternate_phone.trim(),
          gender: form.gender,
          date_of_birth: form.date_of_birth || null,
          address_line: form.address_line.trim(),
          otp_code: needsOtp ? otpCode : undefined,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to update profile.");
      if (payload.changed === false) {
        setMessage(payload.message || "No changes to save.");
        return;
      }

      const updatedProfile = payload.data || payload.profile || payload.user;
      setProfile(updatedProfile);
      setForm((current) => makeForm(updatedProfile, { ...patient, ...current }));

      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          const user = JSON.parse(storedUser);
          localStorage.setItem("user", JSON.stringify({ ...user, ...updatedProfile }));
          if (updatedProfile?.username) localStorage.setItem("username", updatedProfile.username);
        } catch {
          // Ignore invalid localStorage data.
        }
      }

      setOtpSent(false);
      setOtpVerified(false);
      setOtpCode("");
      // After the reload (it clears messages), so the confirmation stays on screen.
      await load();
      setMessage("Profile updated. Your account and linked patient profile are synced.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  // --- Profile photo upload (matches the website's /users/profile-picture) ---
  async function uploadPicture(event) {
    const file = event.target.files?.[0];
    event.target.value = ""; // let the same file be re-picked after an error
    if (!file) return;
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be 5MB or smaller.");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const body = new FormData();
      body.append("profilePicture", file);
      const response = await authFetch("/users/profile-picture", { method: "POST", body });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.message || "Upload failed.");
      const url = payload.url || payload.data?.profile_picture;
      setProfile((current) => ({ ...current, profile_picture: url }));
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          localStorage.setItem("user", JSON.stringify({ ...JSON.parse(storedUser), profile_picture: url }));
        } catch { /* ignore */ }
      }
      await load();
      setMessage("Profile photo updated.");
    } catch (err) {
      setError(err.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  // --- In-app password change (matches the website's Security tab) -----------
  async function changePassword() {
    if (pwSaving) return;
    if (!pw.current) { setPwError("Current password is required."); return; }
    if (!Object.values(passwordChecks(pw.next)).every(Boolean)) {
      setPwError("New password does not meet all requirements.");
      return;
    }
    if (pw.next !== pw.confirm) { setPwError("New password and confirmation do not match."); return; }
    setPwSaving(true);
    setPwError("");
    setPwMsg("");
    try {
      const response = await authFetch("/auth/password/change", {
        method: "POST",
        // Don't let a business 401 (e.g. wrong current password) trigger the global
        // auth-expiry redirect — show the error and keep the patient on this screen.
        noAuthRedirect: true,
        body: JSON.stringify({ currentPassword: pw.current, newPassword: pw.next }),
      });
      const payload = await response.json();
      if (!response.ok || payload.success === false) throw new Error(payload.message || "Password change failed.");
      // Only reached when the current password verified AND the new hash was saved.
      setPwMsg("Password changed. Signing you out...");
      setTimeout(() => logout(), 1400);
    } catch (err) {
      setPwError(err.message || "Password change failed.");
    } finally {
      setPwSaving(false);
    }
  }

  return (
    <MainLayout pageTitle="Profile Settings" pageSubtitle="Manage your patient account details">
      <div className={profileClasses("ps-page")}>
        {error && (
          <div className={profileClasses("ps-toast error")}>
            <span className={profileClasses("ps-toast-dot")} />
            {error}
          </div>
        )}
        {message && (
          <div className={profileClasses("ps-toast success")}>
            <span className={profileClasses("ps-toast-dot")} />
            {message}
          </div>
        )}

        {loading ? (
          <LoadingState label="Loading profile..." />
        ) : !profile || !patient ? (
          <EmptyState title="Profile not available" detail="Please refresh or contact the clinic if this continues." />
        ) : (
          <>
            {/* Hero */}
            <section className={profileClasses("ps-card ps-hero")}>
              <div className={profileClasses("ps-hero-cover")} />
              <div className={profileClasses("ps-hero-body")}>
                <div className={profileClasses("ps-id")}>
                  <label className={profileClasses(`ps-avatar ps-avatar-edit${hasPhoto ? " has-img" : ""}`)} title="Change photo">
                    {hasPhoto ? (
                      <img src={profile.profile_picture} alt={displayName} />
                    ) : (
                      <span>{initials(displayName)}</span>
                    )}
                    <span className={profileClasses("ps-avatar-cam")}>
                      {uploading ? "…" : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                          <circle cx="12" cy="13" r="4" />
                        </svg>
                      )}
                    </span>
                    <input type="file" accept="image/png,image/jpeg,image/webp" onChange={uploadPicture} disabled={uploading} hidden />
                  </label>
                  <div className={profileClasses("ps-idtext")}>
                    <h2>{displayName}</h2>
                    <div className={profileClasses("ps-email")}>{form.email || "No email recorded"}</div>
                    <div className={profileClasses("ps-chips")}>
                      <span className={profileClasses("role")}>Patient #{patient.id}</span>
                      <span className={profileClasses(`status ${statusOk ? "ok" : "warn"}`)}>{statusValue}</span>
                      {ageLabel && <span className={profileClasses("extra")}>{ageLabel}</span>}
                    </div>
                  </div>
                </div>
                <div className={profileClasses("ps-tabs")} role="tablist" aria-label="Profile Settings sections">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={activeTab === tab.id}
                      className={profileClasses(activeTab === tab.id ? "active" : "")}
                      onClick={() => switchTab(tab.id)}
                    >
                      {TAB_ICONS[tab.id]}
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            {activeTab === "profile" && (
            <section className={profileClasses("ps-card ps-panel")}>
              <div className={profileClasses("ps-panel-head")}>
                <div className={profileClasses("ps-htitle")}>
                  <span className={profileClasses("ps-hicon")}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <div>
                    <h3>Personal Information</h3>
                    <p>OTP is required before saving username, email, phone, or address changes.</p>
                  </div>
                </div>
              </div>

              <form onSubmit={save} className={profileClasses("ps-body")}>
                <div className={profileClasses("ps-section")}>
                  <SectionHead icon="identity" title="Identity" />
                  <div className={profileClasses("ps-grid")}>
                    <Field label="First Name" required>
                      <input value={form.first_name} maxLength={FIELD_LIMITS.first_name} autoComplete="given-name" onChange={(event) => updateField("first_name", event.target.value)} />
                    </Field>
                    <Field label="Last Name" required>
                      <input value={form.last_name} maxLength={FIELD_LIMITS.last_name} autoComplete="family-name" onChange={(event) => updateField("last_name", event.target.value)} />
                    </Field>
                    <Field label="Middle Name">
                      <input value={form.middle_name} maxLength={FIELD_LIMITS.middle_name} autoComplete="additional-name" onChange={(event) => updateField("middle_name", event.target.value)} />
                    </Field>
                    <Field label="Suffix">
                      <input value={form.suffix} maxLength={FIELD_LIMITS.suffix} placeholder="Jr., III" onChange={(event) => updateField("suffix", event.target.value)} />
                    </Field>
                    <Field label="Gender">
                      <select value={form.gender || ""} onChange={(event) => updateField("gender", event.target.value)}>
                        <option value="">Not specified</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </Field>
                    <Field label="Date of Birth">
                      <input type="date" value={form.date_of_birth || ""} onChange={(event) => updateField("date_of_birth", event.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className={profileClasses("ps-section")}>
                  <SectionHead icon="contact" title="Account & Contact" />
                  <div className={profileClasses("ps-grid")}>
                    <Field label="Username">
                      <input value={form.username} maxLength={FIELD_LIMITS.username} autoComplete="username" onChange={(event) => updateField("username", event.target.value)} />
                    </Field>
                    <Field label="Email">
                      <input type="email" value={form.email} maxLength={FIELD_LIMITS.email} autoComplete="email" onChange={(event) => updateField("email", event.target.value)} />
                    </Field>
                    <Field label="Phone">
                      <input value={form.phone} maxLength={FIELD_LIMITS.phone} inputMode="tel" autoComplete="tel" placeholder="09XXXXXXXXX" onChange={(event) => updateField("phone", event.target.value)} />
                    </Field>
                    <Field label="Alternate Phone">
                      <input value={form.alternate_phone} maxLength={FIELD_LIMITS.alternate_phone} inputMode="tel" placeholder="Optional" onChange={(event) => updateField("alternate_phone", event.target.value)} />
                    </Field>
                  </div>
                </div>

                <div className={profileClasses("ps-section")}>
                  <SectionHead icon="address" title="Address" />
                  <div className={profileClasses("ps-grid")}>
                    <Field label="Address Line" wide>
                      <input value={form.address_line} onChange={(event) => updateField("address_line", event.target.value)} />
                    </Field>
                  </div>
                </div>

                {needsOtp && (
                  <div className={profileClasses(`ps-otp${otpVerified ? " verified" : ""}`)}>
                    <div className={profileClasses("ps-otp-head")}>
                      <span className={profileClasses("ps-otp-ic")}>
                        {otpVerified ? (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6 9 17l-5-5" />
                          </svg>
                        ) : (
                          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="3" y="11" width="18" height="11" rx="2" />
                            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                        )}
                      </span>
                      <div>
                        <strong>{otpVerified ? "OTP verified" : "Verification required"}</strong>
                        <p>Changes to your username, email, phone, or address need a one-time code sent to your email.</p>
                      </div>
                    </div>
                    <div className={profileClasses("ps-otp-row")}>
                      <button type="button" className={profileClasses("ps-btn ghost")} disabled={otpSending} onClick={sendOtp}>
                        {otpSending ? "Sending..." : otpSent ? "Resend code" : "Send code"}
                      </button>
                      <input
                        className={profileClasses("ps-otp-input")}
                        inputMode="numeric"
                        maxLength={6}
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="------"
                        disabled={otpVerified}
                      />
                      <button type="button" className={profileClasses("ps-btn primary")} disabled={!otpSent || otpVerifying || otpVerified} onClick={verifyOtp}>
                        {otpVerified ? "Verified" : otpVerifying ? "Checking..." : "Verify"}
                      </button>
                    </div>
                  </div>
                )}

                <div className={profileClasses("ps-form-actions")}>
                  <button type="submit" className={profileClasses("ps-btn primary")} disabled={!canSave}>
                    {saving ? "Saving..." : "Save Changes"}
                  </button>
                  <button type="button" className={profileClasses("ps-btn ghost")} onClick={load} disabled={saving}>
                    Reset
                  </button>
                </div>
              </form>
            </section>
            )}

            {activeTab === "security" && (
            <>
            <section className={profileClasses("ps-card ps-panel")}>
              <div className={profileClasses("ps-panel-head")}>
                <div className={profileClasses("ps-htitle")}>
                  <span className={profileClasses("ps-hicon")}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                  </span>
                  <div>
                    <h3>Account Status</h3>
                    <p>Your account access and security history.</p>
                  </div>
                </div>
              </div>
              <div className={profileClasses("ps-status-grid")}>
                <ReadOnly label="Username" value={profile.username} />
                <ReadOnly label="Role" value={profile.role} />
                <ReadOnly label="Status" value={profile.status} />
                <ReadOnly label="User ID" value={profile.user_id ? `#${profile.user_id}` : ""} mono />
                <ReadOnly label="Last Login" value={formatDateTime(profile.last_login)} mono />
                <ReadOnly label="Password Changed" value={formatDateTime(profile.password_changed_at)} mono />
                <ReadOnly label="Email Changed" value={formatDateTime(profile.email_changed_at)} mono />
                <ReadOnly label="Failed Login Attempts" value={String(profile.failed_login_attempts || 0)} mono />
                <ReadOnly label="Lockout Until" value={formatDateTime(profile.lockout_until)} mono />
                <ReadOnly label="Created" value={formatDateTime(profile.created_at)} mono />
              </div>
            </section>

            <section className={profileClasses("ps-card ps-panel")}>
              <div className={profileClasses("ps-panel-head")}>
                <div className={profileClasses("ps-htitle")}>
                  <span className={profileClasses("ps-hicon")}>
                    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <div>
                    <h3>Change Password</h3>
                    <p>You will be signed out after a successful password change.</p>
                  </div>
                </div>
              </div>

              <div className={profileClasses("ps-body")}>
                {pwError && <div className={profileClasses("ps-toast error")} style={{ marginBottom: 12 }}><span className={profileClasses("ps-toast-dot")} />{pwError}</div>}
                {pwMsg && <div className={profileClasses("ps-toast success")} style={{ marginBottom: 12 }}><span className={profileClasses("ps-toast-dot")} />{pwMsg}</div>}

                <div className={profileClasses("ps-grid")}>
                  <Field label="Current Password">
                    <input type={showPw ? "text" : "password"} value={pw.current} autoComplete="current-password" onChange={(event) => setPw((p) => ({ ...p, current: event.target.value }))} />
                  </Field>
                  <Field label="New Password">
                    <input type={showPw ? "text" : "password"} value={pw.next} autoComplete="new-password" onChange={(event) => setPw((p) => ({ ...p, next: event.target.value }))} />
                  </Field>
                  <Field label="Confirm New Password">
                    <input type={showPw ? "text" : "password"} value={pw.confirm} autoComplete="new-password" onChange={(event) => setPw((p) => ({ ...p, confirm: event.target.value }))} />
                  </Field>
                </div>

                {pw.next.length > 0 && (
                  <div className={profileClasses("ps-pwrules")}>
                    {PW_RULES.map((rule) => {
                      const ok = passwordChecks(pw.next)[rule.key];
                      return <span key={rule.key} className={profileClasses(`ps-pwrule${ok ? " ok" : ""}`)}>{ok ? "✓" : "○"} {rule.label}</span>;
                    })}
                  </div>
                )}

                <label className={profileClasses("ps-pwshow")}>
                  <input type="checkbox" checked={showPw} onChange={(event) => setShowPw(event.target.checked)} /> Show passwords
                </label>

                <div className={profileClasses("ps-form-actions")}>
                  <button type="button" className={profileClasses("ps-btn primary")} onClick={changePassword} disabled={pwSaving}>
                    {pwSaving ? "Updating..." : "Update Password"}
                  </button>
                </div>
              </div>
            </section>
            </>
            )}
          </>
        )}
      </div>


    </MainLayout>
  );
}
