import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, CalendarDays, NotebookTabs, Pill } from "lucide-react";
import { authFetch } from "../../utils/auth";
import MainLayout from "../Layout/MainLayout";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  LoadingState,
  Panel,
  formatDate,
  formatTime,
  getRows,
} from "../Workflow/ClinicUi";
import { Button, Stamp, Thread } from "../ui";
import styles from "./UserScreen.module.css";

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_QUEUE", "RESCHEDULED"];

function manilaNowKey() {
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
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function scheduleKey(item) {
  const date = String(item.date || "").slice(0, 10);
  const time = String(item.time || "00:00").slice(0, 5);
  return `${date}T${time}`;
}

function isUpcoming(item) {
  if (item.is_history === true) return false;
  return ACTIVE_STATUSES.includes(item.status) && scheduleKey(item) > manilaNowKey();
}

export default function UserScreen() {
  const navigate = useNavigate();
  const [patient, setPatient] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [patientRes, appointmentsRes, recordsRes, vitalsRes] = await Promise.all([
        authFetch("/patients/me"),
        authFetch("/appointments/me?limit=50"),
        authFetch("/medical-records/me"),
        authFetch("/vitals/me"),
      ]);

      const patientPayload = await patientRes.json();
      const appointmentsPayload = await appointmentsRes.json();
      const recordsPayload = await recordsRes.json();
      const vitalsPayload = await vitalsRes.json();

      if (!patientRes.ok) throw new Error(patientPayload.message || "Failed to load patient profile.");
      if (!appointmentsRes.ok) throw new Error(appointmentsPayload.message || "Failed to load appointments.");
      if (!recordsRes.ok) throw new Error(recordsPayload.message || "Failed to load medical records.");
      if (!vitalsRes.ok) throw new Error(vitalsPayload.message || "Failed to load vitals.");

      setPatient(patientPayload.patient || patientPayload.data);
      setAppointments(getRows(appointmentsPayload, "appointments"));
      setRecords(getRows(recordsPayload, "records"));
      setVitals(getRows(vitalsPayload, "vitals"));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const upcomingAppointments = useMemo(
    () => appointments.filter(isUpcoming).sort((a, b) => scheduleKey(a).localeCompare(scheduleKey(b))),
    [appointments]
  );

  const nextAppointment = upcomingAppointments[0];
  const latestRecord = records[0];
  const latestVitals = vitals[0];
  const prescriptions = records.filter((record) => String(record.prescriptions || record.prescription || "").trim()).length;

  const notices = useMemo(() => {
    const rows = [];
    if (nextAppointment?.status === "PENDING") rows.push("Your appointment request is waiting for clinic confirmation.");
    if (nextAppointment?.status === "CONFIRMED") rows.push("Your appointment is confirmed. Please arrive on time for queue processing.");
    if (nextAppointment?.status === "IN_QUEUE") rows.push("You are currently in the clinic queue.");
    if (latestRecord) rows.push("A doctor medical record is available in Consultation Records.");
    if (prescriptions > 0) rows.push("Prescription details are available in Health Records.");
    return rows.slice(0, 4);
  }, [latestRecord, nextAppointment, prescriptions]);

  return (
    <MainLayout pageTitle="Patient Dashboard" pageSubtitle="Appointments, records, prescriptions, and latest vitals">
      <div className={styles.page}>
        <ErrorState message={error} />
        {loading ? <LoadingState label="Loading your dashboard..." /> : (
          <PatientDashboardContent patient={patient} nextAppointment={nextAppointment} latestRecord={latestRecord} latestVitals={latestVitals} notices={notices} onBook={() => navigate("/patient/appointments?tab=book")} onAppointments={() => navigate("/patient/appointments")} onRefresh={load} onRecords={() => navigate("/patient/records")} onMedications={() => navigate("/patient/health")} />
        )}
      </div>
    </MainLayout>
  );
}

export function PatientDashboardContent({ patient, nextAppointment, latestRecord, latestVitals, notices, onBook, onAppointments, onRefresh, onRecords, onMedications = onRecords }) {
  return (
    <div className={`${styles.page} reveal`}>
      <Panel className={styles.welcome}>
        <div><p className={styles.eyebrow}>Welcome back</p><h2>{patient?.display_name || patient?.name || [patient?.first_name, patient?.last_name].filter(Boolean).join(" ") || "Patient"}</h2><p className={styles.help}>{patient?.phone || "No phone on file"} - {patient?.email || "No email on file"}</p></div>
        <div className={styles.actions}><ActionButton tone="secondary" onClick={onAppointments}>Appointments</ActionButton><ActionButton tone="secondary" onClick={onRefresh}>Refresh</ActionButton></div>
      </Panel>
      <nav className={styles.quickActions} aria-label="Your care shortcuts">
        <CareShortcut icon={CalendarDays} label="Book Appointment" detail="Request a consultation" onClick={onBook} />
        <CareShortcut icon={NotebookTabs} label="Records" detail="Review your consultations" onClick={onRecords} />
        <CareShortcut icon={Pill} label="Medications" detail="Open your health records" onClick={onMedications} />
      </nav>
      <NextVisitHero appointment={nextAppointment} onAppointments={onAppointments} />
        <Panel className={styles.panel}>
          <SectionHeader title="Latest Vitals" action="Refresh" onClick={onRefresh} />
          {!latestVitals ? <EmptyState title="No vitals recorded" detail="Nurse-recorded vitals appear after check-in." /> : <div className={styles.vitalsGrid}>
            <Vital label="Blood pressure" value={latestVitals.blood_pressure} />
            <Vital label="Heart rate" value={latestVitals.heart_rate || latestVitals.pulse_rate} />
            <Vital label="Temperature" value={latestVitals.temperature} />
            <Vital label="Oxygen sat" value={latestVitals.oxygen_sat || latestVitals.oxygen_saturation} />
            <Vital label="Weight" value={latestVitals.weight || latestVitals.weight_kg} />
            <Vital label="Recorded" value={formatDate(latestVitals.recorded_at)} />
          </div>}
        </Panel>
      <div className={styles.detailsGrid}>
        <Panel className={styles.panel}>
          <SectionHeader title="Notifications" action="Refresh" onClick={onRefresh} />
          {notices.length === 0 ? <EmptyState title="No dashboard notices" detail="Clinic updates also appear under the bell icon." /> : <div className={styles.notices}>{notices.map((notice) => <p key={notice}>{notice}</p>)}</div>}
        </Panel>
      <Panel className={styles.panel}>
        <SectionHeader title="Latest Medical Record" action="View Records" onClick={onRecords} />
        {!latestRecord ? <EmptyState title="No completed records yet" detail="Doctor-created records appear after consultation." /> : <div className={styles.recordBody}>
          <div className={styles.recordHeading}><div><h3>{latestRecord.diagnosis || "Consultation record"}</h3><p className={styles.help}>{latestRecord.doctor_name || "Doctor"} - {formatDate(latestRecord.visit_date || latestRecord.appointment_date)}</p></div>{latestRecord.amended_at && <Stamp status="AMENDED" />}</div>
          <div className={styles.detailsGrid}><InfoBlock label="Treatment" value={latestRecord.treatment_plan} /><InfoBlock label="Prescription" value={latestRecord.prescriptions || latestRecord.prescription} /></div>
        </div>}
      </Panel>
      </div>
    </div>
  );
}

function CareShortcut({ icon: Icon, label, detail, onClick }) {
  return <Button variant="secondary" className={styles.quickTile} onClick={onClick}>
    <span className={styles.quickIcon}><Icon size={22} aria-hidden="true" /></span>
    <span className={styles.quickCopy}><strong>{label}</strong><span>{detail}</span></span>
    <ArrowUpRight size={18} aria-hidden="true" />
  </Button>;
}

export function NextVisitHero({ appointment, onAppointments }) {
  const title = { CONFIRMED: "Your visit is confirmed", PENDING: "Your request is with the clinic", IN_QUEUE: "You're in the clinic queue", RESCHEDULED: "Your rescheduled visit" }[appointment?.status] || "Your next appointment";
  return (
    <Panel className={styles.visitHero}>
      <div className={styles.heroHeader}><div><p className={styles.eyebrow}>Next Appointment</p><h2>{title}</h2></div><ActionButton tone="secondary" onClick={onAppointments}>View All</ActionButton></div>
      {!appointment ? <EmptyState title="No upcoming appointment" detail="Book a consultation to start the clinic flow." /> : <div className={styles.visitBody}>
        <div className={styles.visitFacts}><div><h3>{appointment.specialty_name || "Consultation"}</h3><p className={styles.help}>{appointment.doctor_name || "Doctor"}</p></div><p className={styles.schedule}>{formatDate(appointment.date)} at {formatTime(appointment.time)}</p></div>
        <Thread status={appointment.status} />
        {appointment.booked_for === "other" && <p className={styles.help}>For {appointment.patient_name} ({appointment.booked_for_relationship || "relative"})</p>}
        {appointment.chief_complaint && <p className={styles.complaint}>{appointment.chief_complaint}</p>}
      </div>}
    </Panel>
  );
}

function SectionHeader({ title, action, onClick }) {
  return <div className={styles.sectionHeader}><h2>{title}</h2>{action && <ActionButton tone="secondary" onClick={onClick}>{action}</ActionButton>}</div>;
}

function Vital({ label, value }) {
  return <div className={styles.vital}><div className={styles.eyebrow}>{label}</div><div className={styles.vitalValue}>{value || "-"}</div></div>;
}

function InfoBlock({ label, value }) {
  return <div className={styles.infoBlock}><div className={styles.eyebrow}>{label}</div><div className={styles.clinicalText}>{value || "-"}</div></div>;
}
