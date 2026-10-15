import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { authFetch } from "../../utils/auth";
import {
  ActionButton,
  EmptyState,
  ErrorState,
  Field,
  LoadingState,
  Panel,
  formatDate,
  formatTime,
  getRows,
  todayISO,
} from "../Workflow/ClinicUi";
import Pagination, { usePagination } from "../common/Pagination";
import UserBooking from "./UserBooking";
import ReasonModal from "../common/ReasonModal";
import ConfirmModal from "../common/ConfirmModal";
import { Input, Select } from "../ui/Field";
import { InlineAlert } from "../ui/InlineAlert";
import Thread from "../ui/Thread";
import PatientIdentity from "../ui/PatientIdentity";
import styles from "./PatientAppointments.module.css";

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "history", label: "History" },
  { id: "book", label: "Book Appointment" },
  { id: "relatives", label: "Relatives" },
];

const GENDERS = ["", "Male", "Female", "Other"];
const emptyRelative = () => ({ first_name: "", last_name: "", relationship: "", date_of_birth: "", age: "", gender: "", phone: "", email: "" });

const ACTIVE_STATUSES = ["PENDING", "CONFIRMED", "IN_QUEUE", "FOR_BILLING", "RESCHEDULED"];
const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "NO_SHOW"];
// Patients can edit OR cancel their own appointment only while it is still a
// request (pending/rescheduled). Once the clinic confirms it, self-service is
// locked and they must call the clinic so staff can adjust the schedule/queue.
const CANCELLABLE = ["PENDING", "RESCHEDULED"];
const EDITABLE = ["PENDING", "RESCHEDULED"];
const CLINIC_OPEN = "08:00";
const CLINIC_CLOSE = "20:00";
const CLINIC_PHONE = "(02) 8842-5405";

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
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

function scheduleKey(item) {
  const date = String(item.date || "").slice(0, 10);
  const time = String(item.time || "00:00").slice(0, 5);
  return `${date}T${time}`;
}

function isHistory(item) {
  if (item.is_history === true) return true;
  if (TERMINAL_STATUSES.includes(item.status)) return true;
  // Mid-visit: the patient is physically at the clinic (in the queue / in
  // consultation, or done and awaiting payment). Never age these into history
  // by the clock — they stay active until a terminal status.
  if (item.status === "IN_QUEUE" || item.status === "FOR_BILLING") return false;
  return ACTIVE_STATUSES.includes(item.status) && scheduleKey(item) <= manilaNowParts();
}

function bookingTarget(item) {
  if (item.booked_for === "other") {
    return item.booked_for_relationship ? `Someone else - ${item.booked_for_relationship}` : "Someone else";
  }
  return "Myself";
}

function compareUpcoming(a, b) {
  return scheduleKey(a).localeCompare(scheduleKey(b)) || Number(b.id || 0) - Number(a.id || 0);
}

function compareHistory(a, b) {
  return scheduleKey(b).localeCompare(scheduleKey(a)) || Number(b.id || 0) - Number(a.id || 0);
}

function TabButton({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[styles.tabButton, active && styles.tabActive].filter(Boolean).join(" ")}
      aria-pressed={active}
    >
      {children}
    </button>
  );
}

export default function PatientAppointments() {
  const [params, setParams] = useSearchParams();
  const tabParam = params.get("tab");
  const activeTab = TABS.some((tab) => tab.id === tabParam) ? tabParam : "upcoming";

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [actionMsg, setActionMsg] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({ date: "", time: "" });
  const [cancelTarget, setCancelTarget] = useState(null);

  // `silent` = background poll: don't toggle the loading spinner and don't wipe
  // the visible list/bar on a transient error, so the live sync is seamless.
  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    try {
      const response = await authFetch("/appointments/me?limit=100");
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.message || "Failed to load appointments.");
      setAppointments(getRows(payload, "appointments"));
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Keep the live visit-progress bar in step with clinic staff actions (confirm,
  // queue, bill, complete) without the patient having to hit Refresh. Poll quietly
  // while the Upcoming tab is showing and the app tab is visible.
  useEffect(() => {
    if (activeTab !== "upcoming") return undefined;
    const id = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        load(true);
      }
    }, 30000);
    return () => clearInterval(id);
  }, [activeTab, load]);

  function cancelAppt(item) {
    setActionErr("");
    setActionMsg("");
    setCancelTarget(item);
  }

  async function confirmCancel(reason) {
    if (!reason.trim()) { setActionErr("A reason is required to cancel."); return; }
    const item = cancelTarget;
    setCancelTarget(null);
    setBusyId(item.id);
    setActionErr("");
    setActionMsg("");
    try {
      const res = await authFetch(`/appointments/${item.id}/cancel`, { method: "POST", body: JSON.stringify({ cancel_reason: reason.trim() }) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to cancel appointment.");
      setActionMsg(`Appointment #${item.id} cancelled.`);
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setBusyId(null);
    }
  }

  function openEdit(item) {
    setEditing(item);
    setEditForm({ date: String(item.date).slice(0, 10), time: String(item.time).slice(0, 5) });
    setActionErr("");
    setActionMsg("");
  }

  async function submitEdit() {
    if (!editForm.date || !editForm.time) { setActionErr("New date and time are required."); return; }
    setBusyId(editing.id);
    setActionErr("");
    try {
      const res = await authFetch(`/appointments/${editing.id}/edit`, { method: "PUT", body: JSON.stringify(editForm) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to update appointment.");
      setActionMsg("Appointment updated. It will stay pending until the clinic confirms it.");
      setEditing(null);
      await load();
    } catch (err) {
      setActionErr(err.message);
    } finally {
      setBusyId(null);
    }
  }

  const actions = { onCancel: cancelAppt, onEdit: openEdit, busyId };

  const upcoming = useMemo(
    () => appointments.filter((item) => ACTIVE_STATUSES.includes(item.status) && !isHistory(item)).sort(compareUpcoming),
    [appointments]
  );
  const history = useMemo(
    () => appointments.filter(isHistory).sort(compareHistory),
    [appointments]
  );

  // The visit-progress bar tracks the patient's CURRENT visit. Priority:
  //  1) a visit physically in progress (in queue / awaiting payment), whatever
  //     its scheduled time — that is where the patient actually is right now;
  //  2) otherwise the soonest still-upcoming (pending/confirmed) visit;
  //  3) otherwise a visit COMPLETED today, so the bar reaches "Completed" and
  //     stays visible for the rest of the day instead of vanishing on payment.
  const currentVisit = useMemo(() => {
    const inClinic = appointments
      .filter((item) => item.status === "IN_QUEUE" || item.status === "FOR_BILLING")
      .sort(compareUpcoming);
    if (inClinic.length) return inClinic[0];
    if (upcoming.length) return upcoming[0];
    const today = todayISO();
    const completedToday = appointments
      .filter((item) => item.status === "COMPLETED" && String(item.date).slice(0, 10) === today)
      .sort(compareHistory);
    return completedToday[0] || null;
  }, [appointments, upcoming]);

  function changeTab(tab) {
    setParams(tab === "upcoming" ? {} : { tab });
  }

  return (
    <div className={styles.page}>
      <Panel className={styles.tabsPanel}>
        <div className={styles.workspaceHeading}><span className={styles.eyebrow}>Patient appointments</span><span>Upcoming visits, history and bookings</span></div>
        <div className={styles.toolbar}>
          <div className={styles.tabs}>
            {TABS.map((tab) => (
              <TabButton key={tab.id} active={activeTab === tab.id} onClick={() => changeTab(tab.id)}>
                {tab.label}
              </TabButton>
            ))}
          </div>
          <ActionButton tone="secondary" onClick={() => load()}>Refresh</ActionButton>
        </div>
      </Panel>

      <ErrorState message={error} />
      {actionErr && <ErrorState message={actionErr} />}
      {actionMsg && <InlineAlert tone="success" message={actionMsg} />}

      {activeTab === "book" ? (
        <UserBooking onViewAppointments={() => changeTab("upcoming")} onBooked={() => { load(); changeTab("upcoming"); }} />
      ) : activeTab === "relatives" ? (
        <RelativesTab />
      ) : loading ? (
        <LoadingState label="Loading appointments..." />
      ) : activeTab === "upcoming" ? (
        <>
          {currentVisit && <VisitContext appointment={currentVisit} />}
          <AppointmentTable
            title="Upcoming Appointments"
            rows={upcoming}
            emptyTitle="No upcoming appointments"
            emptyDetail="Book an appointment to start the clinic flow."
            emptyAction={<ActionButton onClick={() => changeTab("book")}>Book Appointment</ActionButton>}
            actions={actions}
          />
        </>
      ) : (
        <AppointmentTable
          title="Appointment History"
          rows={history}
          emptyTitle="No appointment history"
          emptyDetail="Past, completed, cancelled, and no-show appointments appear here."
          emptyAction={<ActionButton tone="secondary" onClick={() => changeTab("upcoming")}>View Upcoming Appointments</ActionButton>}
          history
        />
      )}

      {editing && (
        <div
          className={styles.editOverlay}
          onClick={() => setEditing(null)}
        >
          <div onClick={(e) => e.stopPropagation()} className={styles.editDialog} role="dialog" aria-modal="true" aria-labelledby="patient-edit-appointment-title">
          <Panel className={styles.formPanel}>
            <div className={styles.sectionTitle} id="patient-edit-appointment-title">Edit Appointment <span className={styles.reference}>#{editing.id}</span></div>
            <div className={styles.sectionDescription}>Changing the schedule sets it back to pending for clinic confirmation.</div>
            <div className={styles.formFields}>
              <Field label="Date">
                <Input type="date" min={todayISO()} value={editForm.date} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} />
              </Field>
              <Field label="Time">
                <Input type="time" min={CLINIC_OPEN} max={CLINIC_CLOSE} value={editForm.time} onChange={(e) => setEditForm((f) => ({ ...f, time: e.target.value }))} />
                <div className={styles.fieldHint}>Clinic hours: 8:00 AM – 8:00 PM</div>
              </Field>
              {actionErr && <ErrorState message={actionErr} />}
              <div className={styles.dialogActions}>
                <ActionButton tone="secondary" onClick={() => setEditing(null)}>Close</ActionButton>
                <ActionButton onClick={submitEdit} disabled={busyId === editing.id}>{busyId === editing.id ? "Saving..." : "Save Changes"}</ActionButton>
              </div>
            </div>
          </Panel>
          </div>
        </div>
      )}

      {cancelTarget && (
        <ReasonModal
          title="Cancel Appointment"
          subtitle={`#${cancelTarget.id} · ${formatDate(cancelTarget.date)} at ${formatTime(cancelTarget.time)}`}
          label="Reason for cancelling"
          placeholder="Please tell the clinic why you are cancelling..."
          confirmText="Cancel Appointment"
          cancelText="Keep Appointment"
          busy={busyId === cancelTarget.id}
          onClose={() => setCancelTarget(null)}
          onConfirm={confirmCancel}
        />
      )}
    </div>
  );
}

function RelativesTab() {
  const [relatives, setRelatives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState(emptyRelative());
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/relatives");
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to load relatives.");
      setRelatives(payload.relatives || payload.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const setField = (name, value) => {
    let v = value;
    if (name === "first_name" || name === "last_name") {
      v = value.replace(/[^A-Za-zÀ-ÿ.'\- ]/g, "").toLowerCase().replace(/(^|[\s'-])([a-zà-ÿ])/g, (_m, s, c) => s + c.toUpperCase());
    }
    setForm((c) => ({ ...c, [name]: v }));
  };

  const reset = () => { setForm(emptyRelative()); setEditingId(null); };

  const save = async () => {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.relationship.trim()) {
      setError("First name, last name, and relationship are required.");
      return;
    }
    setSaving(true); setError(""); setMsg("");
    try {
      const endpoint = editingId ? `/relatives/${editingId}` : "/relatives";
      const method = editingId ? "PATCH" : "POST";
      const res = await authFetch(endpoint, { method, body: JSON.stringify(form) });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to save relative.");
      setMsg(editingId ? "Relative updated." : "Relative saved.");
      reset();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const edit = (r) => {
    setEditingId(r.relative_id);
    setForm({
      first_name: r.first_name || "",
      last_name: r.last_name || "",
      relationship: r.relationship || "",
      date_of_birth: r.date_of_birth ? String(r.date_of_birth).slice(0, 10) : "",
      age: r.age ?? "",
      gender: r.gender || "",
      phone: r.phone || "",
      email: r.email || "",
    });
    setMsg("");
  };

  const remove = (r) => {
    setConfirm({ title: "Remove Relative", message: `Remove ${r.first_name} ${r.last_name} from your saved relatives?`, confirmText: "Remove", relative: r });
  };

  const doRemove = async (r) => {
    setError("");
    try {
      const res = await authFetch(`/relatives/${r.relative_id}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.message || "Failed to remove relative.");
      if (editingId === r.relative_id) reset();
      await load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.page}>
      <Panel className={styles.formPanel}>
        <div className={styles.sectionTitle}>{editingId ? "Edit relative" : "Add a relative"}</div>
        <div className={styles.sectionDescription}>Save the people you book for so you don't have to retype them. They appear in the "Someone else" picker when booking.</div>
        <ErrorState message={error} />
        {msg && <InlineAlert tone="success" message={msg} className={styles.relativeMessage} />}
        <div className={styles.formFields}>
          <div className={styles.nameGrid}>
            <Field label="First name"><Input value={form.first_name} onChange={(e) => setField("first_name", e.target.value)} /></Field>
            <Field label="Last name"><Input value={form.last_name} onChange={(e) => setField("last_name", e.target.value)} /></Field>
          </div>
          <div className={styles.relationshipGrid}>
            <Field label="Relationship"><Input value={form.relationship} onChange={(e) => setField("relationship", e.target.value)} placeholder="Parent, child, spouse" /></Field>
            <Field label="Birth date"><Input type="date" value={form.date_of_birth} onChange={(e) => setField("date_of_birth", e.target.value)} /></Field>
            <Field label="Age"><Input type="number" min="0" max="130" value={form.age} onChange={(e) => setField("age", e.target.value)} /></Field>
          </div>
          <div className={styles.contactGrid}>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => setField("gender", e.target.value)}>
                {GENDERS.map((g) => <option key={g || "blank"} value={g}>{g || "Select"}</option>)}
              </Select>
            </Field>
            <Field label="Phone"><Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} /></Field>
            <Field label="Email"><Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} /></Field>
          </div>
          <div className={styles.formActions}>
            <ActionButton onClick={save} disabled={saving}>{saving ? "Saving..." : editingId ? "Update relative" : "Save relative"}</ActionButton>
            {editingId && <ActionButton tone="secondary" onClick={reset}>Cancel edit</ActionButton>}
          </div>
        </div>
      </Panel>

      <Panel className={styles.formPanel}>
        <div className={styles.savedTitle}>Saved relatives (<span className={styles.reference}>{relatives.length}</span>)</div>
        {loading ? (
          <LoadingState label="Loading relatives..." />
        ) : relatives.length === 0 ? (
          <EmptyState title="No saved relatives" detail="Add someone above, or tick 'Save this person' while booking for someone else." />
        ) : (
          <div className={styles.formFields}>
            {relatives.map((r) => (
              <div key={r.relative_id} className={styles.relativeCard}>
                <div className={styles.relativeCopy}>
                  <div className={styles.relativeName}>{r.first_name} {r.last_name}</div>
                  <div className={styles.relativeDetail}>
                    {r.relationship}{r.age ? ` - ${r.age} y/o` : ""}{r.gender ? ` - ${r.gender}` : ""}
                  </div>
                  {(r.phone || r.email) && <div className={styles.relativeContact}>{[r.phone, r.email].filter(Boolean).join(" - ")}</div>}
                </div>
                <div className={styles.relativeActions}>
                  <ActionButton tone="secondary" onClick={() => edit(r)}>Edit</ActionButton>
                  <ActionButton tone="danger" onClick={() => remove(r)}>Delete</ActionButton>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      {confirm && (
        <ConfirmModal
          title={confirm.title}
          message={confirm.message}
          confirmText={confirm.confirmText}
          onClose={() => setConfirm(null)}
          onConfirm={() => { const r = confirm.relative; setConfirm(null); doRemove(r); }}
        />
      )}
    </div>
  );
}

export function VisitContext({ appointment }) {
  if (!appointment) return null;
  return (
    <Panel className={styles.visitPanel}>
      <div className={styles.visitHeading}>
        <div>
          <div className={styles.eyebrow}>Your visit progress</div>
          <div className={styles.visitTitle}>{appointment.doctor_name || "Doctor"}</div>
          {appointment.specialty_name && <div className={styles.visitSpecialty}>{appointment.specialty_name}</div>}
        </div>
        <span className={styles.reference}>Appointment #{appointment.id}</span>
      </div>
      <dl className={styles.visitDetails}>
        <div><dt>Patient</dt><dd><PatientIdentity name={appointment.patient_name || "-"} /></dd></div>
        <div><dt>Booked for</dt><dd>{bookingTarget(appointment)}</dd></div>
        <div><dt>Schedule</dt><dd>{formatDate(appointment.date)} at {formatTime(appointment.time)}</dd></div>
      </dl>
      <Thread status={appointment.status} className={styles.visitThread} />
    </Panel>
  );
}

export function AppointmentTable({ title, rows, emptyTitle, emptyDetail, emptyAction, history = false, actions = null }) {
  // Paginate here so every tab that renders this table gets the same behaviour.
  // `title` is the reset key: switching tabs starts at page 1, while a data
  // refresh keeps the reader on the page they were viewing.
  const { page, totalPages, pageItems, setPage, pageSize, totalItems } = usePagination(rows, 10, title);

  return (
    <Panel className={styles.tablePanel}>
      <div className={styles.tableHeading}>
        <div>
          <h2 className={styles.sectionTitle}>{title}</h2>
          <div className={styles.tableDescription}>
            {rows.length} record(s){history ? " - read-only history" : " - clinic confirmation required before queueing"}
          </div>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} action={emptyAction} />
      ) : (
        <div className={styles.tableViewport}>
          <table className={`qc-rtable ${styles.table}`} aria-label={title}>
            <thead>
              <tr>
                {["ID", "Patient", "Booked For", "Doctor", "Specialty", "Schedule", "Status", "Details", ...(actions ? ["Actions"] : [])].map((heading) => (
                  <th scope="col" key={heading} className={heading === "ID" ? styles.numeric : undefined}>{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((item) => (
                <tr key={item.id}>
                  <td data-label="Ref" className={styles.numeric}>#{item.id}</td>
                  <td data-label="Patient">
                    <PatientIdentity name={item.patient_name || "-"}><div>
                    <div className={styles.patientName}>{item.patient_name || "-"}</div>
                    <div className={styles.patientContact}>{item.patient_phone || item.patient_email || ""}</div>
                    </div></PatientIdentity>
                  </td>
                  <td data-label="Booked For" className={styles.bookedFor}>{bookingTarget(item)}</td>
                  <td data-label="Doctor" className={styles.doctorName}>{item.doctor_name || "-"}</td>
                  <td data-label="Specialty">{item.specialty_name || "-"}</td>
                  <td data-label="Schedule" className={styles.schedule}>{formatDate(item.date)} at {formatTime(item.time)}</td>
                  <td data-label="Status" className={`qc-td-block ${styles.statusCell}`}><Thread status={item.status} compact /></td>
                  <td data-label="Details" className={`qc-td-block ${styles.detailsCell}`}>
                    <div className={styles.detailText}>{item.chief_complaint || item.notes || "-"}</div>
                  </td>
                  {actions && (
                    <td data-label="Actions" className={`qc-td-block ${styles.actionsCell}`}>
                      <div className={`qc-actions ${styles.rowActions}`}>
                        {EDITABLE.includes(item.status) && (
                          <ActionButton tone="secondary" disabled={actions.busyId === item.id} onClick={() => actions.onEdit(item)}>Edit</ActionButton>
                        )}
                        {CANCELLABLE.includes(item.status) && (
                          <ActionButton tone="danger" disabled={actions.busyId === item.id} onClick={() => actions.onCancel(item)}>Cancel</ActionButton>
                        )}
                        {!EDITABLE.includes(item.status) && !CANCELLABLE.includes(item.status) && (
                          <span className={styles.clinicContact}>
                            Confirmed — call the clinic at {CLINIC_PHONE} to change or cancel.
                          </span>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        totalPages={totalPages}
        totalItems={totalItems}
        pageSize={pageSize}
        onPageChange={setPage}
        label="appointments"
      />
    </Panel>
  );
}
