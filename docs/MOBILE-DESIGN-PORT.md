# QELCare patient mobile design port

The existing React + Capacitor patient app was restyled from the local redesigned website. Its existing screens, HashRouter paths, API payloads, account validation, session timeout, push registration and Android permissions remain intact. The website and backend were not edited.

## Source locations

- Website reference: `C:\Users\ADMIN\Downloads\QELCare-Website\QELCare_ReactWeb-acp-main\my-app`
- Mobile project: `C:\Users\ADMIN\Downloads\QELCare-Patient-Mobile\qelcare_patient_mobile_v3`
- Final delivery folder: `C:\Users\ADMIN\Downloads\QELCare-Patient-Mobile\qelcare_patient_mobile_v3\QELCare-APK`
- Final APK: `C:\Users\ADMIN\Downloads\QELCare-Patient-Mobile\qelcare_patient_mobile_v3\QELCare-APK\qelcare-patient-release.apk`
- Original signed output: `C:\Users\ADMIN\Downloads\QELCare-Patient-Mobile\qelcare_patient_mobile_v3\android\app\build\outputs\apk\release\app-release.apk`

## Page mapping and design differences

| Website reference | Existing mobile destination | Differences corrected |
| --- | --- | --- |
| UserSide/UserScreen | /dashboard | Replaced blue, heavy cards with website welcome hierarchy, paper panels, pine next-visit hero, brass rules, serif headings, care shortcuts, vitals, notices and latest-record layout. |
| UserSide/PatientAppointments | /patient/appointments | Ported website section/tab vocabulary and order, visit Thread, patient identity, status marks and labeled phone cards. Appointment editing and cancellation use phone sheets. Upcoming/history/booking/relatives remain available. |
| UserSide/UserBooking | Appointments booking tab | Ported the website form grouping, patient selection, relative details, specialty/doctor/date/time hierarchy and coverage presentation. All existing validation and booking handlers retained. |
| UserSide/MedicalRecords | /patient/records | Ported consultation reference cards, typography, metadata, treatment/prescription blocks, search and pagination. Retained existing patient read-only access. |
| UserSide/HealthRecords | /patient/health | Ported medication/document tabs, document/editor hierarchy, plain statuses, dose schedule, medication editors, file controls, confirmation sheets and cards. Existing OCR, PDFs, camera uploads, medication review/reminders and dose logging retained. |
| AdminFeatures/ProfileSettings | /patient/profile | Ported short pine cover rule, serif profile heading, brass underline tabs, paper surfaces and exact camera icon. Kept existing mobile inline contact editing, OTP and password controls. |
| Login/LoginScreen | /login | Ported website pine/paper Folio layout, serif heading, brass accent, actual folio/rule SVG artwork and token controls. Patient-only behavior retained. |
| Register/RegisterScreen | /register | Same Folio design across all three registration steps, password guidance, legal documents and phone legal sheets. |
| ForgotPassword/ForgotPassScreen | /forgot-password | Ported matching recovery layout, labels, controls, alerts and hierarchy. |
| Verifications/EmailVerification | /verify-email | Ported OTP, recovery verification and reset-password presentation while retaining email/SMS options, timers, validation and navigation. |
| Layout/Sidebar + Topbar | Existing drawer, topbar and five bottom tabs | Website section names/order and line icon vocabulary, pine drawer, 56px topbar, brass active marker and paper bottom navigation adapted for phones and safe areas. Existing notifications and all destinations retained. |

## Shared design system and assets

- Exact website tokens copied into `src/styles`: paper #EEE8DC, surface #FFFEFA, ink #1B2B2A, pine #0B3B36, brass accents, semantic status colors, spacing, radius, shadows and motion.
- Website Newsreader, Inter and IBM Plex Mono font packages are bundled locally for offline WebView use; remote Google Fonts loading removed. Font license notices are bundled in public/licenses.
- Actual website UI primitives copied and adopted through the existing ClinicUi interface: buttons, fields, inputs, selects, textareas, panels, status marks, stamps, Thread, empty/loading/error feedback and shared modal content.
- Phone tables become labeled cards; website dialogs become bottom sheets. Android insets and 44px form controls/touch targets are retained.
- Actual AuthFolio SVG artwork is rendered in account screens. Website ClinicIllustration and Plus mark vector sources are included in `assets/folio`.
- Android splash, launcher/adaptive icons and system bars use the website Plus mark and paper/pine colors. App ID and display name remain `com.qelcare.patient` / `QELCare Patient`, matching the website patient portal branding.
- A Vite-only PDF worker URL import fixes the existing incompatible CRA worker entry. OCR/PDF processing logic was not changed.
- JSDoc and declarations describe existing runtime behavior for checkJs typechecking; they introduce no runtime logic.

## Website behavior deliberately not ported

- No public landing page, staff/admin/doctor screens, multi-role login or public inquiry feature was added: these were not existing mobile features.
- No doctor record creation/amendment workflows or changed record-fetch behavior was added from the website. Existing mobile role checks and functionality were retained.
- Website profile Edit gating and separate password-confirm/OTP dialogs were not copied because they would change the existing mobile inline edit/OTP sequence.
- Mobile HashRouter and current redirect paths, notification deep links, auth, data calculations and permissions were retained.
- The website desktop sidebar is adapted to the existing drawer/bottom tabs; desktop columns/tables/dialog placement are adapted for phone screens.

## Validation

- `npm run lint`: zero errors, one pre-existing unused local `email` warning in profile verification. The unused declaration was retained to leave account functions intact.
- `npm run typecheck`: TypeScript checkJs / noEmit passes across the application.
- `npm run check:contracts`: 47 request/payload trees unchanged; account controls/state, routes, guards, auth, push, dates, Android permissions and backend unchanged.
- 67 auth/profile fixture-only browser checks passed at 360, 393, 412, 640 and 768px.
- 40 patient page/tab layout checks and 30 document workflow checkpoints passed at the same widths. Additional appointment edit/cancel, relatives, medication edit/removal and Take/Skip dose interactions passed using fabricated data.
- Checks covered local fonts/tokens, form/control visibility, no horizontal overflow, no baseline layout overlaps, no console/runtime errors and no unknown API calls. Browser QA intercepted clinic requests and did not contact the clinic backend.
- No screenshots or screenshot artifacts were generated.
- 14 additional production-bundle smoke checks passed at360/768px, including all locally bundled fonts. Notification-sheet hit testing and drawer navigation passed at360/393/640/768px after correcting stacking order.
- Native release resources compile. The final release script also verifies signature, alignment, application ID and debuggable=false before copying the delivery APK.
- Device camera/push/OS behavior was preserved in source; no physical Android device installation was performed in this environment.

## Release build

Command executed from the mobile project root:

```powershell
npm run apk:release
```

This runs `scripts/build-apk.ps1`: Vite production build, Capacitor Android sync, `gradlew.bat assembleRelease`, zipalign, apksigner verification and delivery copy. It uses the installed JDK21 / SDK36 and supports environment overrides documented in the script.

Signing retains the existing distributed APK's developer/debug certificate (SHA256 `5b270652b168a35630115bd59d614b47cea25ba58966b9be0ae8f589478acf06`) for signing identity continuity. The APK is the release build variant with debuggable=false. No new key was generated or copied into the repository.

The final command completed successfully after replacing a Windows PowerShell-dependent hash cmdlet with .NET SHA256.

Existing PDF.js eval/chunk-size and Android dependency/compiler warnings do not prevent the release build. No existing runtime dependency versions were changed; added runtime packages are the website's exact local fonts. APK outputs are ignored by Git. No staging, commits or pushes were performed.

## Files changed

- `.eslintrc.cjs`
- `.gitignore`
- `android/app/src/main/AndroidManifest.xml`
- `android/app/src/main/res/drawable-v26/qelcare_launcher.xml`
- `android/app/src/main/res/drawable/qelcare_brand_mark.xml`
- `android/app/src/main/res/drawable/qelcare_launcher.xml`
- `android/app/src/main/res/drawable/splash.xml`
- `android/app/src/main/res/values/colors.xml`
- `android/app/src/main/res/values/styles.xml`
- `assets/folio/clinic-illustration.svg`
- `assets/folio/qelcare-brand.svg`
- `docs/MOBILE-DESIGN-PORT.md`
- `index.html`
- `package-lock.json`
- `package.json`
- `public/clinic-illustration.svg`
- `public/licenses/ibm-plex-mono-LICENSE.txt`
- `public/licenses/inter-LICENSE.txt`
- `public/licenses/newsreader-LICENSE.txt`
- `public/manifest.json`
- `public/qelcare-brand.svg`
- `scripts/build-apk.ps1`
- `scripts/check-ui-contracts.mjs`
- `src/components/Auth/AuthFolio.js`
- `src/components/Auth/AuthFolio.module.css`
- `src/components/ForgotPassword/ForgotPassScreen.js`
- `src/components/Layout/MainLayout.js`
- `src/components/Layout/MobileShell.css`
- `src/components/Layout/NotificationBell.js`
- `src/components/Login/LoginScreen.js`
- `src/components/Register/RegisterScreen.js`
- `src/components/UserSide/HealthRecords.js`
- `src/components/UserSide/HealthRecords.module.css`
- `src/components/UserSide/MedicalRecords.js`
- `src/components/UserSide/MedicalRecords.module.css`
- `src/components/UserSide/PatientAppointments.js`
- `src/components/UserSide/PatientAppointments.module.css`
- `src/components/UserSide/ProfileScreen.js`
- `src/components/UserSide/ProfileScreen.module.css`
- `src/components/UserSide/UserBooking.js`
- `src/components/UserSide/UserBooking.module.css`
- `src/components/UserSide/UserScreen.js`
- `src/components/UserSide/UserScreen.module.css`
- `src/components/Verifications/EmailVerification.js`
- `src/components/Workflow/ClinicUi.js`
- `src/components/common/ConfirmModal.js`
- `src/components/common/Modal.js`
- `src/components/common/Pagination.js`
- `src/components/common/ReasonModal.js`
- `src/components/common/common.module.css`
- `src/components/ui/Button.js`
- `src/components/ui/EmptyState.js`
- `src/components/ui/Field.js`
- `src/components/ui/InlineAlert.js`
- `src/components/ui/LedgerTable.js`
- `src/components/ui/PageHeader.js`
- `src/components/ui/Panel.js`
- `src/components/ui/PatientContext.js`
- `src/components/ui/PatientContext.module.css`
- `src/components/ui/PatientIdentity.js`
- `src/components/ui/Skeleton.js`
- `src/components/ui/Stamp.js`
- `src/components/ui/Stat.js`
- `src/components/ui/StatusMark.js`
- `src/components/ui/Thread.js`
- `src/components/ui/index.js`
- `src/components/ui/inputStyle.js`
- `src/components/ui/types.d.ts`
- `src/components/ui/ui.module.css`
- `src/env.d.ts`
- `src/hooks/useCountUp.js`
- `src/hooks/useReveal.js`
- `src/index.css`
- `src/index.jsx`
- `src/mobile-responsive.css`
- `src/mobilePolish.css`
- `src/styles/base.css`
- `src/styles/custom-properties.d.ts`
- `src/styles/motion.css`
- `src/styles/statusMeta.js`
- `src/styles/theme.js`
- `src/styles/tokens.css`
- `src/utils/auth.js`
- `tsconfig.json`

Final release result: BUILD SUCCESSFUL (exit 0). Signature and alignment verified, debuggable=false. All 38 bundled website/font/license assets match the production files byte-for-byte. Final APK SHA256: `392fc0cd71cec184051f5dd7729bbc633d81e2ad04927803f89b242f146d6ecc`.
