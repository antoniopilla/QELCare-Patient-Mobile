import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch } from "../../utils/auth";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  todayISO,
} from "../Workflow/ClinicUi";
import { Input, Select, Textarea } from "../ui/Field";
import { InlineAlert } from "../ui/InlineAlert";
import { StatusMark } from "../ui/StatusMark";
import styles from "./UserBooking.module.css";

const APPOINTMENT_TYPES = [
  { value: "consultation", label: "Consultation" },
  { value: "follow_up", label: "Follow-up" },
  { value: "walk_in", label: "Walk-in" },
  { value: "emergency", label: "Emergency" },
];

// ---------------------------------------------------------------------------
// Chief complaints are DEPARTMENT-SPECIFIC. A patient booking with ENT must not
// be offered "High blood pressure check", so each of the 8 departments has its
// own list instead of one shared menu.
//
// Keys are the specialty_name from the API, normalised (lowercased, every
// non-alphanumeric stripped) so "Ob-Gyne", "OB GYNE" and "Obstetrics &
// Gynecology" all resolve to the same list. Every list ends with
// "Follow-up check-up" then "Other" ("Other" reveals a free-text box).
// ---------------------------------------------------------------------------
const GENERAL_COMPLAINTS = [
  "Fever",
  "Cough or colds",
  "Sore throat",
  "Headache",
  "Body pain / muscle pain",
  "Skin problem or rashes",
  "High blood pressure check",
  "Diabetes / blood sugar check",
  "General check-up",
  "Medical certificate / clearance",
  "Vaccination / immunization",
  "Follow-up check-up",
  "Other",
];

const COMPLAINTS_BY_DEPARTMENT = {
  ent: [
    "Sore throat",
    "Ear pain or ear discharge",
    "Hearing problem or ringing in the ear",
    "Colds or blocked nose",
    "Sinus pain or congestion",
    "Tonsil problem",
    "Hoarseness or voice change",
    "Nosebleed",
    "Snoring or sleep problem",
    "Dizziness or vertigo",
    "Follow-up check-up",
    "Other",
  ],
  cardiology: [
    "High blood pressure check",
    "Chest pain or tightness",
    "Palpitations or irregular heartbeat",
    "Shortness of breath",
    "Swelling of legs or feet",
    "Dizziness or fainting",
    "Cholesterol check",
    "Heart check-up or clearance",
    "Follow-up check-up",
    "Other",
  ],
  gastroenterology: [
    "Stomach ache or abdominal pain",
    "Acid reflux or heartburn",
    "Nausea or vomiting",
    "Diarrhea",
    "Constipation",
    "Bloating or gas",
    "Blood in stool",
    "Difficulty swallowing",
    "Yellowing of eyes or skin",
    "Follow-up check-up",
    "Other",
  ],
  generalmedicine: GENERAL_COMPLAINTS,
  rehabilitationmedicine: [
    "Back pain",
    "Neck or shoulder pain",
    "Knee or joint pain",
    "Muscle weakness",
    "Difficulty walking or moving",
    "Recovery after injury or surgery",
    "Recovery after stroke",
    "Sports injury",
    "Physical therapy session",
    "Follow-up check-up",
    "Other",
  ],
  obgyne: [
    "Prenatal check-up",
    "Postnatal check-up",
    "Irregular menstruation",
    "Menstrual pain",
    "Vaginal discharge or itching",
    "Pelvic or lower abdominal pain",
    "Family planning or contraception",
    "Pap smear or cervical screening",
    "Breast lump or breast pain",
    "Pregnancy test or confirmation",
    "Follow-up check-up",
    "Other",
  ],
  pediatrics: [
    "Fever",
    "Cough or colds",
    "Sore throat",
    "Diarrhea or vomiting",
    "Skin rashes",
    "Ear pain",
    "Growth or weight concern",
    "Well-baby check-up",
    "Vaccination or immunization",
    "Follow-up check-up",
    "Other",
  ],
  psychiatry: [
    "Anxiety or excessive worry",
    "Sadness or depression",
    "Sleep problems or insomnia",
    "Stress or burnout",
    "Mood swings",
    "Difficulty focusing",
    "Panic attacks",
    "Grief or loss",
    "Medication review",
    "Follow-up check-up",
    "Other",
  ],
};

// Naming differences between the database and the UI still resolve correctly.
const DEPARTMENT_ALIASES = {
  earnosethroat: "ent",
  otorhinolaryngology: "ent",
  gastro: "gastroenterology",
  internalmedicine: "generalmedicine",
  familymedicine: "generalmedicine",
  generalpractice: "generalmedicine",
  rehabilitation: "rehabilitationmedicine",
  physicalmedicineandrehabilitation: "rehabilitationmedicine",
  physicaltherapy: "rehabilitationmedicine",
  obgyn: "obgyne",
  obstetricsgynecology: "obgyne",
  obstetricsandgynecology: "obgyne",
  obstetrics: "obgyne",
  gynecology: "obgyne",
  pedia: "pediatrics",
  pediatric: "pediatrics",
  mentalhealth: "psychiatry",
};

function normalizeDepartment(name) {
  return String(name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Returns [] when no department is chosen yet (the picker stays disabled), and
// falls back to the general list for any unmapped/new specialty so a patient is
// never left with an empty menu.
function complaintsForDepartment(specialtyName) {
  const key = normalizeDepartment(specialtyName);
  if (!key) return [];
  return (
    COMPLAINTS_BY_DEPARTMENT[key] ||
    COMPLAINTS_BY_DEPARTMENT[DEPARTMENT_ALIASES[key]] ||
    GENERAL_COMPLAINTS
  );
}

const GENDERS = ["", "Male", "Female", "Other"];

function manilaNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`,
  };
}

function normalizeTime(value) {
  return String(value || "").slice(0, 5);
}

function isPastManila(date, time) {
  if (!date || !time) return false;
  const now = manilaNowParts();
  return `${date}T${normalizeTime(time)}` <= `${now.date}T${now.time}`;
}

// Clinic operating hours: 8:00 AM to 8:00 PM (Asia/Manila).
const CLINIC_OPEN = "08:00";
const CLINIC_CLOSE = "20:00";

function minTimeFor(date) {
  const now = manilaNowParts();
  // For today, the earliest pickable time is "now" but never before opening.
  if (date === now.date) return now.time > CLINIC_OPEN ? now.time : CLINIC_OPEN;
  return CLINIC_OPEN;
}

function outsideClinicHours(time) {
  const t = normalizeTime(time);
  if (!t) return false;
  return t < CLINIC_OPEN || t > CLINIC_CLOSE;
}

export default function UserBooking({ onViewAppointments, onBooked }) {
  const [doctors, setDoctors] = useState([]);
  const [specialties, setSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [complaintChoice, setComplaintChoice] = useState("");
  const [relatives, setRelatives] = useState([]);
  const [selectedRelativeId, setSelectedRelativeId] = useState("");
  const [saveRelative, setSaveRelative] = useState(true);
  const [form, setForm] = useState({
    booked_for: "self",
    doctor_id: "",
    specialty_id: "",
    date: todayISO(),
    time: "09:00",
    type: "consultation",
    chief_complaint: "",
    notes: "",
    relative: {
      first_name: "",
      last_name: "",
      relationship: "",
      date_of_birth: "",
      age: "",
      gender: "",
      phone: "",
      email: "",
    },
  });

  const loadDoctors = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await authFetch("/users/doctors");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load doctors.");
      setDoctors(payload.doctors || payload.data || []);
      setSpecialties(payload.specialties || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadRelatives = useCallback(async () => {
    try {
      const res = await authFetch("/relatives");
      const payload = await res.json();
      if (res.ok) setRelatives(payload.relatives || payload.data || []);
    } catch {
      /* saved relatives are optional */
    }
  }, []);

  useEffect(() => {
    loadDoctors();
  }, [loadDoctors]);

  useEffect(() => {
    loadRelatives();
  }, [loadRelatives]);

  function pickRelative(id) {
    setSelectedRelativeId(id);
    if (!id) {
      setForm((c) => ({ ...c, relative: { first_name: "", last_name: "", relationship: "", date_of_birth: "", age: "", gender: "", phone: "", email: "" } }));
      return;
    }
    const r = relatives.find((x) => String(x.relative_id) === String(id));
    if (!r) return;
    setForm((c) => ({
      ...c,
      relative: {
        first_name: r.first_name || "",
        last_name: r.last_name || "",
        relationship: r.relationship || "",
        date_of_birth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : "",
        age: r.age ?? "",
        gender: r.gender || "",
        phone: r.phone || "",
        email: r.email || "",
      },
    }));
  }

  const selectedDoctor = useMemo(
    () => doctors.find((doctor) => String(doctor.user_id) === String(form.doctor_id)),
    [doctors, form.doctor_id]
  );

  const doctorsBySpecialty = useMemo(() => {
    return doctors.reduce((groups, doctor) => {
      const name = doctor.specialty_name || "Specialty not assigned";
      if (!groups[name]) groups[name] = [];
      groups[name].push(doctor);
      return groups;
    }, {});
  }, [doctors]);

  const specialtyCards = useMemo(() => {
    if (specialties.length) {
      return specialties.map((specialty) => ({
        ...specialty,
        doctor_count: Number(specialty.doctor_count || 0),
      }));
    }

    return Object.entries(doctorsBySpecialty).map(([specialty_name, group], index) => ({
      specialty_id: specialty_name,
      specialty_name,
      display_order: index + 1,
      doctor_count: group.length,
    }));
  }, [doctorsBySpecialty, specialties]);

  // Bookable departments = specialties that actually have at least one doctor.
  const departments = useMemo(() => {
    const map = new Map();
    doctors.forEach((d) => {
      const key = String(d.specialty_id || "");
      if (key && !map.has(key)) map.set(key, { specialty_id: d.specialty_id, specialty_name: d.specialty_name || "Specialty" });
    });
    return Array.from(map.values()).sort((a, b) => String(a.specialty_name).localeCompare(String(b.specialty_name)));
  }, [doctors]);

  // Doctors filtered to the chosen department.
  const departmentDoctors = useMemo(() => {
    if (!form.specialty_id) return [];
    return doctors.filter((d) => String(d.specialty_id) === String(form.specialty_id));
  }, [doctors, form.specialty_id]);

  // Chief-complaint options follow the chosen department.
  const selectedDepartmentName = useMemo(() => {
    const match = departments.find((d) => String(d.specialty_id) === String(form.specialty_id));
    return match?.specialty_name || "";
  }, [departments, form.specialty_id]);

  const complaintOptions = useMemo(
    () => complaintsForDepartment(selectedDepartmentName),
    [selectedDepartmentName]
  );

  function updateField(name, value) {
    if (name === "doctor_id") {
      const doctor = doctors.find((item) => String(item.user_id) === String(value));
      const nextSpecialty = doctor?.specialty_id || "";
      // Picking a doctor can also change the department, which would invalidate
      // an already-chosen complaint — clear it so no ENT booking keeps a
      // cardiology concern.
      const departmentChanged = String(nextSpecialty) !== String(form.specialty_id);
      setForm((current) => ({
        ...current,
        doctor_id: value,
        specialty_id: nextSpecialty,
        chief_complaint: departmentChanged ? "" : current.chief_complaint,
      }));
      if (departmentChanged) setComplaintChoice("");
      return;
    }
    setForm((current) => ({ ...current, [name]: value }));
  }

  function updateRelative(name, value) {
    // Auto-capitalize and block invalid characters in the relative's name fields,
    // matching registration and Add User.
    let v = value;
    if (name === "first_name" || name === "last_name") {
      v = value
        .replace(/[^A-Za-zÀ-ÿ.'\- ]/g, "")
        .toLowerCase()
        .replace(/(^|[\s'-])([a-zà-ÿ])/g, (_m, sep, ch) => sep + ch.toUpperCase());
    }
    setForm((current) => ({
      ...current,
      relative: {
        ...current.relative,
        [name]: v,
      },
    }));
  }

  // Picking a department resets the doctor choice so only that department's
  // doctors can be selected next, and clears the chief complaint because the
  // available complaints are department-specific.
  function selectDepartment(value) {
    setForm((current) => ({ ...current, specialty_id: value, doctor_id: "", chief_complaint: "" }));
    setComplaintChoice("");
  }

  function selectComplaint(value) {
    setComplaintChoice(value);
    updateField("chief_complaint", value === "Other" ? "" : value);
  }

  function validate() {
    if (doctors.length === 0) return "No bookable doctors are available. Please contact the clinic.";
    if (!form.specialty_id) return "Please select a department.";
    if (!form.doctor_id || !form.date || !form.time) return "Department, doctor, date, and time are required.";
    if (isPastManila(form.date, form.time)) return "Choose a future date and time using Asia/Manila time.";
    if (outsideClinicHours(form.time)) return "Clinic hours are 8:00 AM to 8:00 PM. Please choose a time within clinic hours.";
    if (!String(form.chief_complaint).trim()) return "Please select or describe your chief complaint.";
    if (form.booked_for === "other") {
      if (!form.relative.first_name.trim() || !form.relative.last_name.trim() || !form.relative.relationship.trim()) {
        return "Relative first name, last name, and relationship are required.";
      }
      if (form.relative.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.relative.email)) {
        return "Relative email is invalid.";
      }
    }
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    const validation = validate();
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    try {
      const response = await authFetch("/appointments/book", {
        method: "POST",
        body: JSON.stringify({
          booked_for: form.booked_for,
          relative: form.booked_for === "other" ? form.relative : undefined,
          doctor_id: Number(form.doctor_id),
          specialty_id: form.specialty_id ? Number(form.specialty_id) : selectedDoctor?.specialty_id || null,
          date: form.date,
          time: form.time,
          type: form.type,
          chief_complaint: form.chief_complaint,
          notes: form.notes,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to book appointment.");

      // Save a newly-typed relative to the patient's address book for next time.
      if (form.booked_for === "other" && !selectedRelativeId && saveRelative) {
        try {
          await authFetch("/relatives", { method: "POST", body: JSON.stringify(form.relative) });
          loadRelatives();
        } catch {
          /* saving the relative is best-effort */
        }
      }

      setMessage("Appointment booked. It will stay pending until Frontdesk confirms it.");
      setSelectedRelativeId("");
      // Clear the picker too, otherwise it keeps showing the previous concern
      // while form.chief_complaint below is reset to empty.
      setComplaintChoice("");
      setForm((current) => ({
        ...current,
        chief_complaint: "",
        notes: "",
        relative: current.booked_for === "other"
          ? { first_name: "", last_name: "", relationship: "", date_of_birth: "", age: "", gender: "", phone: "", email: "" }
          : current.relative,
      }));
      if (onBooked) onBooked(payload.appointment || payload.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.bookingLayout}>
      <Panel className={styles.formPanel}>
        <form onSubmit={submit} className={styles.form}>
          <div>
            <div className={styles.title}>Book Appointment</div>
            <div className={styles.description}>Choose a doctor, schedule, patient, and reason for visit.</div>
          </div>

          <ErrorState message={error} />
          {message && <InlineAlert tone="success" message={message} />}

          <div className={styles.patientSelector}>
            <button type="button" className={[styles.patientOption, form.booked_for === "self" && styles.patientOptionActive].filter(Boolean).join(" ")} aria-pressed={form.booked_for === "self"} onClick={() => updateField("booked_for", "self")}>Myself</button>
            <button type="button" className={[styles.patientOption, form.booked_for === "other" && styles.patientOptionActive].filter(Boolean).join(" ")} aria-pressed={form.booked_for === "other"} onClick={() => updateField("booked_for", "other")}>Someone else</button>
          </div>

          {form.booked_for === "other" && (
            <Panel className={styles.relativePanel}>
              <div className={styles.relativeFields}>
                <div className={styles.relativeHeading}>
                  <div className={styles.sectionTitle}>Relative information</div>
                  {relatives.length > 0 && (
                    <Select aria-label="Choose a saved relative" className={styles.relativePicker} value={selectedRelativeId} onChange={(e) => pickRelative(e.target.value)}>
                      <option value="">+ Add a new person</option>
                      {relatives.map((r) => (
                        <option key={r.relative_id} value={r.relative_id}>{r.first_name} {r.last_name} ({r.relationship})</option>
                      ))}
                    </Select>
                  )}
                </div>
                <div className={styles.nameGrid}>
                  <Field label="First name">
                    <Input value={form.relative.first_name} onChange={(e) => updateRelative("first_name", e.target.value)} />
                  </Field>
                  <Field label="Last name">
                    <Input value={form.relative.last_name} onChange={(e) => updateRelative("last_name", e.target.value)} />
                  </Field>
                </div>
                <div className={styles.relationshipGrid}>
                  <Field label="Relationship">
                    <Input value={form.relative.relationship} onChange={(e) => updateRelative("relationship", e.target.value)} placeholder="Parent, child, spouse" />
                  </Field>
                  <Field label="Birth date">
                    <Input type="date" value={form.relative.date_of_birth} onChange={(e) => updateRelative("date_of_birth", e.target.value)} />
                  </Field>
                  <Field label="Age">
                    <Input type="number" min="0" max="130" value={form.relative.age} onChange={(e) => updateRelative("age", e.target.value)} />
                  </Field>
                </div>
                <div className={styles.contactGrid}>
                  <Field label="Gender">
                    <Select value={form.relative.gender} onChange={(e) => updateRelative("gender", e.target.value)}>
                      {GENDERS.map((gender) => <option key={gender || "blank"} value={gender}>{gender || "Select"}</option>)}
                    </Select>
                  </Field>
                  <Field label="Phone">
                    <Input value={form.relative.phone} onChange={(e) => updateRelative("phone", e.target.value)} />
                  </Field>
                  <Field label="Email">
                    <Input type="email" value={form.relative.email} onChange={(e) => updateRelative("email", e.target.value)} />
                  </Field>
                </div>
                {!selectedRelativeId && (
                  <label className={styles.saveRelative}>
                    <input type="checkbox" checked={saveRelative} onChange={(e) => setSaveRelative(e.target.checked)} />
                    Save this person to my relatives for next time
                  </label>
                )}
              </div>
            </Panel>
          )}

          {loading ? (
            <LoadingState label="Loading available doctors..." />
          ) : doctors.length === 0 ? (
            <EmptyState title="No bookable doctors" detail="Admin must create or update a verified Doctor account with a specialty assignment." />
          ) : (
            <>
              <Field label="Department">
                <Select value={form.specialty_id} onChange={(e) => selectDepartment(e.target.value)}>
                  <option value="">Select a department</option>
                  {departments.map((dep) => (
                    <option key={dep.specialty_id} value={dep.specialty_id}>{dep.specialty_name}</option>
                  ))}
                </Select>
              </Field>

              <Field label="Doctor">
                <Select value={form.doctor_id} onChange={(e) => updateField("doctor_id", e.target.value)} disabled={!form.specialty_id}>
                  <option value="">{form.specialty_id ? "Select doctor" : "Select a department first"}</option>
                  {departmentDoctors.map((doctor) => (
                    <option key={doctor.user_id} value={doctor.user_id}>
                      {doctor.doctor_name || `${doctor.first_name} ${doctor.last_name}`}
                    </option>
                  ))}
                </Select>
                {form.specialty_id && departmentDoctors.length === 0 && (
                  <div className={styles.fieldHint}>No available doctor in this department yet.</div>
                )}
              </Field>

              {selectedDoctor && (
                <div className={styles.doctorContext}>
                  <strong className={styles.doctorName}>{selectedDoctor.doctor_name || `${selectedDoctor.first_name} ${selectedDoctor.last_name}`}</strong>
                  <div className={styles.doctorSpecialty}>{selectedDoctor.specialty_name}</div>
                </div>
              )}
            </>
          )}

          <div className={styles.scheduleGrid}>
            <Field label="Date">
              <Input type="date" min={todayISO()} value={form.date} onChange={(e) => updateField("date", e.target.value)} />
            </Field>
            <Field label="Time">
              <Input type="time" min={minTimeFor(form.date)} max={CLINIC_CLOSE} value={form.time} onChange={(e) => updateField("time", e.target.value)} />
              <div className={styles.fieldHint}>Clinic hours: 8:00 AM – 8:00 PM</div>
            </Field>
            <Field label="Type">
              <Select value={form.type} onChange={(e) => updateField("type", e.target.value)}>
                {APPOINTMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </Select>
            </Field>
          </div>

          <Field label="Chief complaint">
            <Select
              value={complaintChoice}
              onChange={(e) => selectComplaint(e.target.value)}
              disabled={!form.specialty_id}
            >
              <option value="">
                {form.specialty_id ? "Select your main concern" : "Select a department first"}
              </option>
              {complaintOptions.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
            {form.specialty_id && (
              <div className={styles.fieldHint}>
                Showing concerns commonly handled by {selectedDepartmentName}.
              </div>
            )}
          </Field>
          {complaintChoice === "Other" && (
            <Field label="Please specify your concern">
              <Input
                value={form.chief_complaint}
                onChange={(e) => updateField("chief_complaint", e.target.value)}
                placeholder="Describe your concern"
              />
            </Field>
          )}

          <Field label="Notes">
            <Textarea
              className={styles.notes}
              value={form.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              placeholder="Optional details"
            />
          </Field>

          <div className={styles.formActions}>
            <ActionButton type="submit" disabled={loading || submitting || doctors.length === 0}>{submitting ? "Booking..." : "Book Appointment"}</ActionButton>
            <ActionButton tone="secondary" onClick={onViewAppointments || (() => { window.location.href = "/patient/appointments"; })}>
              View Appointments
            </ActionButton>
          </div>
        </form>
      </Panel>

      <Panel className={styles.coveragePanel}>
        <div className={styles.sectionTitle}>Clinic Specialty Coverage</div>
        <div className={styles.coverageDescription}>Departments become bookable when a verified doctor is assigned by admin.</div>
        {loading ? (
          <LoadingState />
        ) : specialtyCards.length === 0 ? (
          <EmptyState title="No active specialties" detail="Admin must set active specialties before patients can book." />
        ) : (
          <div className={styles.specialties}>
            {specialtyCards.map((specialty) => {
              const hasDoctors = Number(specialty.doctor_count || 0) > 0;
              return (
                <div key={specialty.specialty_id || specialty.specialty_name} className={styles.specialtyCard}>
                  <div className={styles.specialtyHeading}>
                    <div className={styles.specialtyName}>{specialty.specialty_name}</div>
                    <StatusMark status={hasDoctors ? "Bookable" : "Needs doctor"} />
                  </div>
                  <div className={styles.specialtyCount}>
                    <span className={styles.numeric}>{Number(specialty.doctor_count || 0)}</span> verified doctor(s)
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>
    </div>
  );
}
