# QELCare Patient Mobile — Historical Backend Reference

This folder preserves an older patient-mobile route implementation and a PostgreSQL schema snapshot. The mobile app connects to the current **[QELCare Web Platform backend](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System)**; this folder is not a standalone API or the installation path for a new backend.

## Contents

| File | Purpose |
|---|---|
| [`qelcare-backend/features/auth/routes/patientRegistrationRoutes.js`](qelcare-backend/features/auth/routes/patientRegistrationRoutes.js) | Historical patient registration and OTP-gated profile routes; depends on the full backend's configuration, middleware, and utilities |
| [`qelcare-backend/database/qelcareDatabase.sql`](qelcare-backend/database/qelcareDatabase.sql) | Schema-only PostgreSQL snapshot added in commit `9c56d4f`; no patient seed accounts or application data |
| [`tools/apply-patient-mobile-backend-patch.cjs`](tools/apply-patient-mobile-backend-patch.cjs) | Legacy copy/mount helper, retained for reference |

## Current setup

Follow the web repository's [Getting Started instructions](https://github.com/antoniopillaiii/QELCare-Website-Multispecialty-Clinic-Management-System#getting-started) for the current API, schema baseline, legacy repair scripts, and server environment. The mobile client uses the shared `/auth/patient/*` registration/profile endpoints alongside the normal patient data APIs; see the [mobile README](../README.md).

Do not run the legacy helper against an up-to-date backend. It attempts to copy `patient_mobile_patch.sql`, `check_patient_mobile_compatibility.sql`, and `optional_clear_restored_sessions.sql`, which are **not present** in this checkout. It copies the route before reaching those missing files, so a failed run can still partially overwrite the destination backend. Compare the historical route with the current implementation manually if investigating an older installation.

The schema snapshot is not an incremental migration or a production restore procedure. It contains PostgreSQL ownership/session directives from its export environment and should be reviewed before use in an isolated database. The former `qelcaresql-V7.sql` full data dump is not included and is not required for app setup.
