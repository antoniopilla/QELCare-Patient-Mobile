<div align="center">

<img src="assets/icon-only.png" alt="QELCare Patient" width="120" />

# QELCare Patient — Mobile App

**The patient-facing companion app for the QELCare clinic platform — native Android & iOS builds that let patients book appointments, view medical records, manage medications, scan lab results, and receive push notifications, all from one React + Capacitor codebase.**

[![Capacitor](https://img.shields.io/badge/Capacitor-8-119EFF?logo=capacitor&logoColor=white)](https://capacitorjs.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Build-Vite_7-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![Platforms](https://img.shields.io/badge/Platforms-Android_%7C_iOS-3DDC84?logo=android&logoColor=white)](#building-the-apps)
[![React Router](https://img.shields.io/badge/Router-HashRouter_v7-CA4245?logo=reactrouter&logoColor=white)](https://reactrouter.com/)

</div>

---

## Overview

**QELCare Patient** is the mobile client for [QELCare](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System), a multispecialty clinic management platform. It packages the patient portion of the web application into native **Android** and **iOS** apps using [Capacitor](https://capacitorjs.com/), talking to the same Node/Express + PostgreSQL backend the clinic staff use.

Rather than maintaining a separate mobile design, the app **reuses the web app's React components** — a small custom Vite plugin compiles the existing `.js` files as JSX. The components live in this repo as a **copy** of the web app's patient screens (not a shared package), and some have diverged for mobile. The mobile entrypoint removes every staff, admin, and public-display route, restricts the app to patient accounts, and adapts navigation for a native WebView.

```
Patient phone (Capacitor WebView, React)
        │  HTTPS + Bearer JWT
        ▼
QELCare backend (Express, Railway) ──▶ PostgreSQL
        │
        └─▶ FCM push · Gemini OCR · Brevo email · SMS gateway
```

## Key Features

### For patients
- **Appointment booking & history** — browse doctors by specialty, book visits (booking is a tab inside *Appointments*), edit or cancel pending requests, and track upcoming and past visits.
- **Medical & health records** — read-only consultation records, vitals, and health history.
- **Medications & documents** — *Health Records* has Medications and Documents tabs: view prescribed medications, log doses, and upload lab papers or prescriptions (camera or file; images and PDFs). PDFs render in-app with **pdf.js**, and text is extracted through the backend's Gemini-powered OCR endpoint.
- **Push notifications** — appointment and queue updates arrive as OS-level notifications (FCM). Tapping one deep-links to the relevant screen, and an in-app notification bell shows the same events.
- **Self-service account** — patient registration, OTP email verification, and forgot-password reset.
- **Profile with OTP-gated edits** — changing username, email, phone, or address requires a fresh one-time code.

### Mobile engineering highlights
- **Patient-only by construction** — all staff/admin/queue/landing routes are removed from the mobile entrypoint, and the app shows a "Patient app only" screen for any non-`Patient` account. *This is a client-side check; the backend login endpoint is shared with staff.*
- **Shared component approach** — a custom Vite transform (`js-as-jsx`) lets the build consume `.js` React components containing JSX.
- **WebView-safe routing** — `HashRouter`, so refreshes inside the WebView never break navigation.
- **Idle auto-logout** — 15 minutes of inactivity signs the patient out (important for shared devices). On logout the device's push token is de-registered from the backend before local storage is cleared.
- **Notch-aware, mobile-first UI** — `viewport-fit=cover`, safe-area insets, a dedicated responsive stylesheet, and a slide-out drawer.
- **Environment-aware API URL** — resolved at runtime (see [Configuration](#configuration)).
- **No-Mac iOS pipeline** — a GitHub Actions workflow builds an unsigned iOS IPA on a macOS runner, so the app can be produced and sideloaded without a Mac or a paid Apple Developer account.

## Tech Stack

| Area | Technologies |
|---|---|
| **App shell** | [Capacitor 8](https://capacitorjs.com/) (`core`, `android`, `ios`, `app`, `push-notifications`) |
| **UI** | React 18, React Router v7 (`HashRouter`), hand-built responsive CSS |
| **Build tooling** | Vite 7, `@vitejs/plugin-react`, custom `.js`-as-JSX transform, `@capacitor/assets` for icon/splash generation |
| **Documents** | `pdfjs-dist` (in-app PDF rendering) + backend Gemini OCR |
| **Push** | Firebase Cloud Messaging via `@capacitor/push-notifications` |
| **CI / Distribution** | GitHub Actions (macOS runner → unsigned IPA artifact); Android APK via Gradle |
| **Backend** | Shared [QELCare](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System) Node/Express + PostgreSQL API |

## What's Inside

<details>
<summary><strong>Screens & structure</strong></summary>

```
src/
├── index.jsx                      # App entrypoint
├── App.js                         # HashRouter + patient-only route map
├── components/
│   ├── Login/LoginScreen.js       # Login (rejects non-Patient accounts)
│   ├── Register/RegisterScreen.js # Patient self-registration
│   ├── ForgotPassword/            # Forgot-password flow
│   ├── Verifications/             # OTP email verification / password reset
│   ├── UserSide/
│   │   ├── UserScreen.js          # Dashboard
│   │   ├── PatientAppointments.js # Upcoming / history / booking tabs
│   │   ├── UserBooking.js         # Booking form (rendered inside Appointments)
│   │   ├── MedicalRecords.js      # Consultation records
│   │   ├── HealthRecords.js       # Health history, Medications and Documents tabs
│   │   └── ProfileScreen.js       # Profile with OTP-gated edits
│   ├── Layout/MainLayout.js       # Drawer navigation + shell
│   ├── Layout/NotificationBell.js # In-app notifications
│   ├── Auth/PatientIdleTimeout.js # Inactivity auto-logout
│   ├── Workflow/ClinicUi.js       # Shared UI kit
│   └── common/Pagination.js
└── utils/                         # auth.js (session + API URL), push.js (FCM),
                                   #   roleAccess.js, manilaDate.js

android/                           # Capacitor Android platform (applicationId com.qelcare.patient)
assets/                            # App icon + splash source images
.github/workflows/build-ios.yml    # Unsigned-IPA CI pipeline
backend-patient-mobile-patch/      # Legacy backend patch bundle (see note below)
PUSH_SMS_SETUP.md                  # Push (FCM) and SMS setup guide
capacitor.config.json              # appId: com.qelcare.patient
vite.config.js                     # Vite config + js-as-jsx plugin
```

**Routes:** `/login`, `/register`, `/forgot-password`, `/verify-email`, `/dashboard`, `/patient/appointments`, `/patient/records`, `/patient/health`, `/patient/profile`. The older `/patient/medications` and `/patient/results` paths redirect to `/patient/health`.
</details>

## Getting Started

### Prerequisites
- **Node.js 22+** and npm — required by the Capacitor 8 CLI.
- A running **QELCare backend** (see [Backend requirement](#backend-requirement)).
- For Android builds: **Android Studio** + Android SDK (`minSdk 24`, `compileSdk`/`targetSdk` 36).
- For iOS builds: a Mac with Xcode **or** this repo's GitHub Actions workflow.

### 1. Install
```bash
npm install
```

### 2. Configure the backend URL
```bash
cp .env.example .env
```
Set `VITE_API_URL`:

| Scenario | Value |
|---|---|
| Android emulator → backend on your machine | `http://10.0.2.2:5001` |
| Real phone / installed app | your deployed HTTPS backend URL |

> On a real phone, **never use `localhost`** — it resolves to the phone itself.

### 3. Run as a web app (fastest dev loop)
```bash
npm run dev      # Vite dev server on http://localhost:3000
```
In a desktop browser the app calls the backend on the **same host as the page, port 5001** (e.g. `localhost:3000` → `localhost:5001`), ignoring `VITE_API_URL`.

## Building the Apps

### Android
```bash
# Build web assets, sync into the native project, and assemble a debug APK
npm run apk:debug
# → android/app/build/outputs/apk/debug/app-debug.apk
```
Release build:
```bash
npm run apk:release
```
- **Signing:** `android/app/build.gradle` has no signing config, so you must provide your own keystore/signing setup to produce an installable release.
- **Versioning:** the native version lives in `android/app/build.gradle` (`versionCode` / `versionName`), separate from `package.json`. Bump both when releasing.
- **Stale builds:** `cap sync` copies whatever is in `dist/`. The `apk:*` scripts rebuild first; if you run Gradle directly, run `npm run build` and `npx cap sync android` yourself.

Or open the project in Android Studio:
```bash
npm run cap:sync:android
npm run cap:open:android
```

### Push notifications (Android)
The Android project applies the `google-services` plugin only if `android/app/google-services.json` exists; without it the APK builds but push stays inactive. The Firebase app's package name must be `com.qelcare.patient`. Backend credentials (`FCM_*`) are set on the server. See [`PUSH_SMS_SETUP.md`](PUSH_SMS_SETUP.md) for the full walkthrough.

### iOS — no Mac required
The [`build-ios.yml`](.github/workflows/build-ios.yml) workflow produces an iOS app without a local Mac or paid Apple Developer account:

1. On every push to `main` (or a manual run from the Actions tab), a **macOS runner** (Node 22) builds the Vite assets, generates the iOS project fresh (`cap add ios` → `cap sync ios`), and brands the icon and splash from `assets/`.
2. It injects the required `Info.plist` usage strings (camera, photo library) and App Transport Security settings.
3. It compiles an **unsigned** `.app`, packages it as `QELCarePatient-unsigned.ipa`, and uploads it as a build artifact.
4. Download the artifact and sign/install it with **[Sideloadly](https://sideloadly.io/)** using a free Apple ID.

> iOS push notifications are not configured by this pipeline.

## Backend Requirement

The app is a client for the shared **[QELCare backend](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System)**, which already includes the patient self-service routes under `/auth/patient/*`.

<details>
<summary><strong>Endpoints the app calls</strong></summary>

**Authentication**
- `POST /auth/login`, `POST /auth/logout`
- `POST /auth/otp/send` · `/otp/verify` · `/otp/resend`
- `POST /auth/password/reset`

**Patient self-service** (`/auth/patient/*`)
- `POST /auth/patient/register` · `/register/verify` · `/register/resend`
- `POST /auth/patient/profile/otp` · `/profile/otp/check`
- `PUT /auth/patient/profile`

**Patient data**
- `GET /users/me` · `GET /users/doctors` · `GET /patients/me`
- `GET /appointments/me` · `POST /appointments/book` · `POST /appointments/:id/cancel` · `PUT|PATCH /appointments/:id/edit`
- `GET /medical-records/me` · `GET /vitals/me`
- `/medications/*` — list, schedule, dose log, adherence, prescription parse
- `GET /patient-results/me` · `POST /patient-results` · `POST /patient-results/ocr` · `PATCH` / `DELETE /patient-results/:id`
- `/relatives` — family profiles

**Notifications**
- `GET /notifications/me` · `PATCH /notifications/read-all` · `PATCH /notifications/:id/read`
- `POST` / `DELETE /notifications/device-token` — push registration (called on login and app start)
</details>

> **Heads-up:** these endpoints are shared with the website. A backend change to any of them can break the installed APK without any visible web symptom, and installed apps cannot be updated without a new build.

<details>
<summary><strong>About <code>backend-patient-mobile-patch/</code></strong></summary>

This folder is a legacy bundle that added patient-mobile support to an older backend. The current backend already contains those routes, so **do not apply the patch over an up-to-date backend** without diffing first. Its README refers to a full SQL dump (`qelcaresql-V7.sql`) that contains real users, password hashes, and tokens — **that dump must never be committed or distributed with the app.**
</details>

## Configuration

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the QELCare backend (no trailing slash). Baked into the build. |
| `REACT_APP_API_URL` | Optional alias, mapped by `vite.config.js` so shared web components work unchanged. |

**How the API URL is resolved** (`src/utils/auth.js`):
- **Native app (APK/IPA):** `VITE_API_URL`, falling back to `http://10.0.2.2:5001` (the emulator's alias for your PC).
- **Desktop browser preview:** same host as the page, port `5001`.

`.env.production` is committed on purpose so CI and local production builds point at the live backend; it contains only a public URL, **never put secrets in it.** The backend must also allow the app's origin in CORS (`capacitor://localhost` and `http(s)://localhost` are on its allow-list).

## Known Limitations
- The JWT is stored in the WebView's `localStorage`.
- `capacitor.config.json` enables cleartext traffic and mixed content (convenient for emulator/LAN testing); consider disabling both for production builds that only talk to the HTTPS backend.
- The Android manifest has `allowBackup="true"` and release builds are not minified.
- Patient components are a copy of the web app's, so fixes to shared screens must be applied in both repos.
- Appointment status values (`PENDING`, `CONFIRMED`, `IN_QUEUE`, ...) are hard-coded in the UI and must match the backend.

## Related

- **[QELCare Web Platform](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System)** — the full clinic management system (staff + patient web app, backend, and database) this app connects to.

## License

No open-source license has been declared for this repository, so all rights are reserved by the author by default. Please contact the maintainer before reusing the code.

## Contact

Built and maintained by **[@antoniopillaiii](https://github.com/antoniopillaiii)** · [Repository](https://github.com/antoniopillaiii/QELCare-Mobile-Patient)
