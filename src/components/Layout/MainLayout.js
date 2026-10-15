import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { CalendarDays, FileText, FileCheck2, LayoutDashboard, LogOut, Menu, Plus, User } from "lucide-react";
import { logout } from "../../utils/auth";
import NotificationBell from "./NotificationBell";
import "./MobileShell.css";

// `label` is the full name shown in the drawer + page headings — it matches the
// website's menu wording so both platforms use one vocabulary. `short` is the
// compact version for the 5-item bottom tab bar, where long text would overflow.
// `Icon` is a Lucide component, matching the sign-in/register screens and the
// website's icon language. These used to be typographic glyphs (⌂ ▣ ▤ ✚ ●),
// which rendered differently on every device and read as placeholders.
const navItems = [
  { label: "Dashboard", short: "Dashboard", path: "/dashboard", Icon: LayoutDashboard },
  { label: "Appointments", short: "Appointments", path: "/patient/appointments", Icon: CalendarDays },
  { label: "Consultation Records", short: "Records", path: "/patient/records", Icon: FileCheck2 },
  { label: "Health Records", short: "Health", path: "/patient/health", Icon: FileText },
  { label: "Profile Settings", short: "Profile", path: "/patient/profile", Icon: User },
];

function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function fullName(user) {
  return [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() || user?.username || "Patient";
}

function initials(name) {
  const parts = String(name || "PT").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0]?.[0] || "P"}${parts[parts.length - 1]?.[0] || "T"}`.toUpperCase();
}

function isActive(pathname, itemPath) {
  if (itemPath === "/dashboard") return pathname === "/dashboard";
  return pathname === itemPath || pathname.startsWith(`${itemPath}/`);
}

export default function MainLayout({ children, pageTitle = "QELCare Patient", pageSubtitle = "Patient portal" }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const user = useMemo(() => getStoredUser(), []);
  const name = fullName(user);

  const go = (path) => {
    setDrawerOpen(false);
    navigate(path);
  };

  return (
    <div className="mobile-shell">
      <aside className={`patient-drawer ${drawerOpen ? "open" : ""}`} aria-label="Patient navigation">
        <div className="brand-card">
          <div className="brand-mark"><Plus size={25} strokeWidth={2.75} aria-hidden="true" /></div>
          <div>
            <div className="brand-title">QELCare</div>
            <div className="brand-subtitle">Patient Portal</div>
          </div>
        </div>

        <nav className="drawer-nav">
          {navItems.map((item) => (
            <button
              key={item.path}
              type="button"
              className={`drawer-link ${isActive(location.pathname, item.path) ? "active" : ""}`}
              onClick={() => go(item.path)}
              aria-current={isActive(location.pathname, item.path) ? "page" : undefined}
            >
              <span className="nav-icon"><item.Icon size={17} strokeWidth={2} aria-hidden="true" /></span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <button type="button" className="logout-button" onClick={logout}>
          <LogOut size={17} strokeWidth={2} aria-hidden="true" />
          <span>Sign Out</span>
        </button>
      </aside>

      {drawerOpen && <button type="button" className="drawer-backdrop" aria-label="Close navigation" onClick={() => setDrawerOpen(false)} />}

      <div className="patient-main">
        <header className="patient-topbar">
          <button type="button" className="menu-button" onClick={() => setDrawerOpen(true)} aria-label="Open navigation">
            <Menu size={20} strokeWidth={2.2} aria-hidden="true" />
          </button>
          <div className="topbar-title-wrap">
            <h1>{pageTitle}</h1>
            <p>{pageSubtitle}</p>
          </div>
          <div className="topbar-actions">
            <NotificationBell />
            <button type="button" className="avatar-button" onClick={() => go("/patient/profile")} aria-label="Open profile">
              {initials(name)}
            </button>
          </div>
        </header>

        <main className="patient-content">{children}</main>

        <nav className="bottom-nav" aria-label="Bottom patient navigation">
          {navItems.slice(0, 5).map((item) => (
            <button
              key={item.path}
              type="button"
              className={`bottom-link ${isActive(location.pathname, item.path) ? "active" : ""}`}
              onClick={() => go(item.path)}
              aria-current={isActive(location.pathname, item.path) ? "page" : undefined}
            >
              <span><item.Icon size={19} strokeWidth={2.1} aria-hidden="true" /></span>
              <small>{item.short || item.label}</small>
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
