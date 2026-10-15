import React, { useCallback, useEffect, useMemo, useState } from "react";
import { authFetch, getUserRole } from "../../utils/auth";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  StatusBadge,
  formatDate,
  formatTime,
  getRows,
  todayISO,
} from "../Workflow/ClinicUi";
import Pagination, { usePagination } from "../common/Pagination";
import { manilaDateOf } from "../../utils/manilaDate";
import { Stamp } from "../ui";
import PatientIdentity from "../ui/PatientIdentity";
import styles from "./MedicalRecords.module.css";

const blankRecord = {
  patient_id: "",
  appointment_id: "",
  vital_id: "",
  visit_date: todayISO(),
  chief_complaint: "",
  history_of_illness: "",
  physical_exam: "",
  diagnosis: "",
  treatment_plan: "",
  prescriptions: "",
  lab_requests: "",
  doctor_notes: "",
  follow_up_date: "",
  follow_up_notes: "",
};

// Common diagnostic tests / exams a doctor can order with one click, so the
// requested workup is specific (CBC, Fecalysis, Eyesight, etc.) instead of free text.
const COMMON_TESTS = [
  "CBC", "Urinalysis", "Fecalysis", "Blood Chemistry", "FBS (Blood Sugar)",
  "Lipid Profile", "Chest X-ray", "ECG", "Visual Acuity (Eyesight)",
  "Urine Culture", "Pregnancy Test", "COVID-19 Test",
];

function buildFormFromAppointment(appointment, latestVital) {
  return {
    ...blankRecord,
    patient_id: appointment?.patient_id || "",
    appointment_id: appointment?.id || appointment?.appointment_id || "",
    vital_id: latestVital?.id || latestVital?.vital_id || "",
    chief_complaint: appointment?.chief_complaint || latestVital?.chief_complaint || "",
  };
}

/** @param {{appointment?: any, latestVital?: any, onCreated?: (record: any) => void}} props */
export default function MedicalRecords({ appointment, latestVital, onCreated }) {
  const role = getUserRole();
  const isPatient = role === "Patient";
  const canCreate = role === "Doctor";
  const isConsultationEntry = canCreate && Boolean(appointment);

  const [records, setRecords] = useState([]);
  // Paginate the consultation records list (same behaviour as the website).
  const { page, totalPages, pageItems, setPage, pageSize, totalItems } = usePagination(records, 10, "records");
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(isConsultationEntry);
  const [form, setForm] = useState(() => buildFormFromAppointment(appointment, latestVital));

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const recordEndpoint = isPatient
        ? "/medical-records/me"
        : appointment?.patient_id
          ? `/medical-records/patient/${appointment.patient_id}`
          : "/medical-records?limit=100";

      const [recordRes, appointmentRes] = await Promise.all([
        authFetch(recordEndpoint),
        canCreate && !appointment ? authFetch("/appointments?limit=100") : Promise.resolve(null),
      ]);

      const recordPayload = await recordRes.json();
      if (!recordRes.ok) throw new Error(recordPayload.message || "Failed to load records.");
      setRecords(getRows(recordPayload, "records"));

      if (appointmentRes) {
        const appointmentPayload = await appointmentRes.json();
        if (appointmentRes.ok) setAppointments(getRows(appointmentPayload, "appointments"));
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [appointment, canCreate, isPatient]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!appointment) return;
    setShowForm(canCreate);
    setForm((current) => ({
      ...current,
      ...buildFormFromAppointment(appointment, latestVital),
      history_of_illness: current.history_of_illness,
      physical_exam: current.physical_exam,
      diagnosis: current.diagnosis,
      treatment_plan: current.treatment_plan,
      prescriptions: current.prescriptions,
      lab_requests: current.lab_requests,
      doctor_notes: current.doctor_notes,
      follow_up_date: current.follow_up_date,
      follow_up_notes: current.follow_up_notes,
    }));
  }, [appointment, canCreate, latestVital]);

  const selectedAppointment = useMemo(() => {
    if (appointment) return appointment;
    return appointments.find((item) => String(item.id) === String(form.appointment_id));
  }, [appointment, appointments, form.appointment_id]);

  function updateField(name, value) {
    if (name === "appointment_id") {
      const selected = appointments.find((item) => String(item.id) === String(value));
      setForm((current) => ({
        ...current,
        appointment_id: value,
        patient_id: selected?.patient_id || current.patient_id,
        chief_complaint: selected?.chief_complaint || current.chief_complaint,
      }));
      return;
    }

    setForm((current) => ({ ...current, [name]: value }));
  }

  // Append a selected test to the requested-labs field (no duplicates).
  function addTest(test) {
    setForm((current) => {
      const existing = String(current.lab_requests || "").trim();
      const items = existing ? existing.split(/,\s*/).filter(Boolean) : [];
      if (items.includes(test)) return current;
      return { ...current, lab_requests: [...items, test].join(", ") };
    });
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!canCreate) {
      setError("Only doctors can create medical records.");
      return;
    }
    if (!form.patient_id || !form.diagnosis) {
      setError("Patient and diagnosis are required.");
      return;
    }

    setSaving(true);
    try {
      const response = await authFetch("/medical-records", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          patient_id: Number(form.patient_id),
          appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
          vital_id: form.vital_id ? Number(form.vital_id) : null,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to create record.");

      setMessage(isConsultationEntry ? "Medical record saved. Completing visit..." : "Medical record created.");
      setForm(appointment ? buildFormFromAppointment(appointment, latestVital) : { ...blankRecord });
      setShowForm(Boolean(appointment));
      await load();

      if (onCreated) await onCreated(payload.record || payload.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.page}>
      <ErrorState message={error} />
      {message && (
        <div className={styles.success}>
          {message}
        </div>
      )}

      {canCreate && (
        <Panel className={styles.formPanel}>
          <div className={styles.formHeader}>
            <div>
              <div className={styles.formTitle}>
                {isConsultationEntry ? "Consultation Record" : "Doctor Record Entry"}
              </div>
              <div className={styles.meta}>
                Save diagnosis, treatment plan, prescriptions, and requested procedures after consultation.
              </div>
            </div>
            {!isConsultationEntry && (
              <ActionButton tone={showForm ? "secondary" : "primary"} onClick={() => setShowForm((value) => !value)}>
                {showForm ? "Close Form" : "New Record"}
              </ActionButton>
            )}
          </div>

          {showForm && (
            <form onSubmit={submit} className={styles.form}>
              {isConsultationEntry ? (
                <div className={styles.visitNotice}>
                  <strong className={styles.strong}>{appointment.patient_name}</strong>
                  <span> - Appointment #{appointment.id} - {formatDate(appointment.date)} {formatTime(appointment.time)}</span>
                </div>
              ) : (
                <div className={styles.legacyVisitGrid}>
                  <Field label="Appointment">
                    <select className={styles.control} value={form.appointment_id} onChange={(e) => updateField("appointment_id", e.target.value)}>
                      <option value="">No appointment link</option>
                      {appointments.map((item) => (
                        <option key={item.id} value={item.id}>
                          #{item.id} {item.patient_name} - {formatDate(item.date)} {formatTime(item.time)}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Patient ID">
                    <input className={styles.control} value={form.patient_id} onChange={(e) => updateField("patient_id", e.target.value)} />
                  </Field>
                  <Field label="Visit date">
                    <input className={styles.control} type="date" value={form.visit_date} onChange={(e) => updateField("visit_date", e.target.value)} />
                  </Field>
                </div>
              )}

              {selectedAppointment && !isConsultationEntry && (
                <div className={styles.visitNotice}>
                  <strong className={styles.strong}>{selectedAppointment.patient_name}</strong> with {selectedAppointment.doctor_name} ({selectedAppointment.specialty_name || "No specialty"})
                </div>
              )}

              <div className={styles.formGrid}>
                <Field label="Chief complaint">
                  <textarea className={styles.textareaShort} value={form.chief_complaint} onChange={(e) => updateField("chief_complaint", e.target.value)} />
                </Field>
                <Field label="History of illness">
                  <textarea className={styles.textareaShort} value={form.history_of_illness} onChange={(e) => updateField("history_of_illness", e.target.value)} />
                </Field>
              </div>

              <div className={styles.formGrid}>
                <Field label="Physical exam">
                  <textarea className={styles.textarea} value={form.physical_exam} onChange={(e) => updateField("physical_exam", e.target.value)} />
                </Field>
                <Field label="Diagnosis">
                  <textarea className={styles.textarea} value={form.diagnosis} onChange={(e) => updateField("diagnosis", e.target.value)} />
                </Field>
              </div>

              <div className={styles.formGrid}>
                <Field label="Treatment plan">
                  <textarea className={styles.textareaTall} value={form.treatment_plan} onChange={(e) => updateField("treatment_plan", e.target.value)} />
                </Field>
                <Field label="Prescriptions">
                  <textarea className={styles.textareaTall} value={form.prescriptions} onChange={(e) => updateField("prescriptions", e.target.value)} />
                </Field>
              </div>

              <div className={styles.formGrid}>
                <Field label="Requested procedures or labs">
                  {canCreate && (
                    <div className={styles.tests}>
                      {COMMON_TESTS.map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => addTest(t)}
                          className={styles.testButton}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  )}
                  <textarea className={styles.textarea} value={form.lab_requests} onChange={(e) => updateField("lab_requests", e.target.value)} placeholder="Click a test above to add it, or type specific labs/exams (e.g. CBC, Fecalysis, Eyesight)" />
                </Field>
                <Field label="Doctor notes">
                  <textarea className={styles.textarea} value={form.doctor_notes} onChange={(e) => updateField("doctor_notes", e.target.value)} />
                </Field>
              </div>

              <div className={styles.followUpGrid}>
                <Field label="Follow-up date">
                  <input className={styles.control} type="date" value={form.follow_up_date} onChange={(e) => updateField("follow_up_date", e.target.value)} />
                </Field>
                <Field label="Follow-up notes">
                  <input className={styles.control} value={form.follow_up_notes} onChange={(e) => updateField("follow_up_notes", e.target.value)} />
                </Field>
              </div>

              <div className={styles.actions}>
                <ActionButton type="submit" disabled={saving}>{saving ? "Saving..." : isConsultationEntry ? "Save Record and Complete Visit" : "Add Record"}</ActionButton>
                {!isConsultationEntry && <ActionButton tone="secondary" onClick={() => setShowForm(false)}>Cancel</ActionButton>}
              </div>
            </form>
          )}
        </Panel>
      )}

      <Panel className={styles.recordsPanel}>
        <div className={styles.recordsHeader}>
          <div className={styles.recordsTitle}>{isPatient ? "Consultation Records" : "Medical Records"}</div>
          <div className={styles.recordCount}>{records.length} record(s)</div>
        </div>

        {loading ? (
          <LoadingState label="Loading records..." />
        ) : records.length === 0 ? (
          <EmptyState title="No records found" detail={isPatient ? "Completed doctor records will show here." : "Patient history will appear here after records are created."} />
        ) : (
          <div className={styles.records}>
            {pageItems.map((record) => (
              <RecordCard key={record.record_id || record.id} record={record} />
            ))}
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setPage}
          label="records"
        />
      </Panel>
    </div>
  );
}

function recordRef(id) {
  return `MR-${String(id).padStart(5, "0")}`;
}

/** @param {{label: string, value?: any, formatter?: (value: any) => import('react').ReactNode}} props */
function RecordBlock({ label, value, formatter }) {
  const display = formatter && value ? formatter(value) : value;
  return (
    <div className={styles.recordBlock}>
      <div className={styles.blockLabel}>{label}</div>
      <div className={styles.blockValue}>{display || "-"}</div>
    </div>
  );
}

function RecordCard({ record }) {
  return (
    <article className={styles.recordCard}>
      <div className={styles.recordHeader}>
        <div>
          <div className={styles.recordRef}>{recordRef(record.record_id || record.id)}</div>
          <div className={styles.recordTitle}>{record.diagnosis || "No diagnosis entered"}</div>
          <div className={styles.meta}>
            <PatientIdentity name={record.patient_name || "Patient"}>{record.patient_name || "Patient"} - {record.doctor_name || "Doctor"} - {formatDate(record.visit_date || record.appointment_date)}</PatientIdentity>
          </div>
          {/* Show the same amendment notice already available in mobile records. */}
          {record.amended_at && (
            <div className={styles.amendmentDetail}>
              Amended on {formatDate(manilaDateOf(record.amended_at))}
            </div>
          )}
        </div>
        <div className={styles.recordActions}>
          <StatusBadge status={record.appointment_status || "COMPLETED"} />
          {record.amended_at && <Stamp status="AMENDED" label="Amended" />}
        </div>
      </div>
      <div className={styles.recordGrid}>
        <RecordBlock label="Chief complaint" value={record.chief_complaint} />
        <RecordBlock label="Physical exam" value={record.physical_exam} />
      </div>
      <div className={styles.treatmentGrid}>
        <RecordBlock label="Treatment" value={record.treatment_plan} />
        <RecordBlock label="Prescription" value={record.prescriptions || record.prescription} />
        <RecordBlock label="Requested procedures" value={record.lab_requests} />
      </div>
      <div className={styles.recordGrid}>
        <RecordBlock label="Follow-up" value={record.follow_up_date_text || record.follow_up_date} formatter={formatDate} />
        <RecordBlock label="Doctor notes" value={record.doctor_notes} />
      </div>
    </article>
  );
}
