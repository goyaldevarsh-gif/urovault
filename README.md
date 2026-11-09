# UroVault

*Your Urology Practice, Organised.* A lightweight, offline-first digital casebook for individual urologists.

**Flow:** UHID → Patient → Diagnosis → Investigations → Images → Surgery → Follow-up

## What works in this build (MVP)

- Splash, onboarding, local doctor account (first launch creates it), login, optional biometric unlock
- Dashboard: stats, quick actions, recent patients / cases, upcoming follow-ups, notifications sheet
- Patient registration (UHID, name, age, sex, chief complaints) with live duplicate-UHID check and draft autosave
- One-tap diagnosis selection (9 options, multiple allowed, Right / Left / Bilateral for paired organs, additional diagnosis)
- Patient profile with Overview / Media / Investigations / Surgery / Follow-up tabs and a full case timeline
- Investigations checklist with per-test date, notes and report / image attachments
- Media gallery with categories, camera + multi-image gallery upload, full-screen zoom viewer, edit and delete with confirmation
- Surgery records (multiple per patient, HPE, operative photos, post-op instructions) and an all-surgeries list
- Follow-up dashboard (Due Today / Upcoming / Overdue / Completed), record visit, schedule next review
- Search by UHID or name, filters (All / Renal / Bladder / Prostate / Other)
- CSV export, per-patient PDF summary, zip backup and restore, audit log, sample data (clearly tagged, removable)

All data lives in SQLite on the device; images are kept in the app's private storage.

## Build without installing Flutter (GitHub Actions)

1. Push this repo to GitHub.
2. Open **Actions → Build Android APK → Run workflow** (it also runs on every push to `main`).
3. Download the `urovault-apk` artifact, copy `app-release.apk` to the phone and install it.

## Build locally

```bash
bash scripts/setup_platforms.sh     # creates android/ios, patches permissions, makes icons
flutter run                         # or: flutter build apk --release
```

## Not done yet (next phases)

- Local notification reminders for follow-ups
- Database encryption at rest (SQLCipher) and encrypted backups
- Optional encrypted cloud sync
- Tablet-specific layouts beyond centered, width-limited content

## Notes

- Laterality uses **Right / Left / Bilateral** (OD/OS/OU are ophthalmology terms).
- Patient filter groups: Renal = Renal Mass, Renal Stone, Ureteric Stone, Ureterocele, PUJO; Bladder = Ca Bladder; Prostate = Prostate CA; Other = Adrenal Mass, Other and undiagnosed. Edit `lib/core/constants.dart` to change.
- A patient has one active "next follow-up"; saving a new visit replaces any pending one.
- Reference mockups used for design: `assets/reference/`.
