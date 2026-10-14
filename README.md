# SAHAAYA — Old Age Home Volunteer Coordination Portal
> **A Production-Quality College Mini-Project**  
> *"Give time. Share a moment. Make someone’s day."*

---

## 🌟 Core Product Principle
> **"The old age home defines what help it needs. The platform should not assume what elderly residents need."**

Sahaaya provides an empathetic, structured coordination bridge between **Verified Senior Residences** and **Passionate Volunteers**. Old Age Homes explicitly specify their requirements (e.g. companionship, smartphone literacy, antakshari melodies, gentle courtyard walking), and Sahaaya's transparent matching engine connects them with suitable volunteers.

---

## 🏛️ Architecture & Role Portals

| Route | Portal | Primary Actors & Core Features |
| :--- | :--- | :--- |
| `/` | **Public Landing Page** | Public discovery of requirements, partner homes, mission, and registration entry points. |
| `/volunteer` | **Volunteer Portal** | Profile setup (interests & availability), transparent compatibility matching, application submission, **My Schedule**, verified attendance & volunteer hours tracker, feedback submission. |
| `/home` | **Old Age Home Portal** | Home profile & verification badge, custom requirement definition, applicant review (Approve/Reject with notes), **Attendance Sheet & Hour Crediting**, volunteer feedback. |
| `/admin` | **Admin Portal** | Operations overview, **Home Verification Queue** (vetting new senior homes), volunteer directory, platform-wide coordination pipeline, impact analytics. |

---

## ⚡ 1-Click Evaluation Mode (For Viva / Demo)
A pinned top bar labeled **`DEMO MODE / EVALUATION`** is available on all pages:
* **`👤 Volunteer (Ananya)`**: Switches immediately to volunteer Ananya Sharma (`/volunteer/`).
* **`🏡 Old Age Home (Silver Springs)`**: Switches immediately to home coordinator Rajesh Sen (`/home/`).
* **`🛡️ Admin (Platform Team)`**: Switches immediately to platform administrator Sahana K (`/admin/`).
* **`↻ Reset Seed Data`**: Restores the database to clean pre-seeded data in one click.

*(Note: The Demo Mode role switcher is clearly isolated from the session authentication engine to enable seamless evaluation).*

### Pre-Seeded Test Credentials (for manual login):
* **Volunteer**: `ananya.sharma@example.com` (Password: `demo`)
* **Old Age Home**: `coordinator@silversprings.org` (Password: `demo`)
* **Platform Admin**: `admin@sahaaya.org` (Password: `demo`)

---

## 🔄 End-to-End Workflow Demonstration

1. **Old Age Home Defines Requirement**:
   * Navigate to `/home` (Old Age Home Portal).
   * Click **"+ Define New Volunteer Requirement"**.
   * Define need: *"Sunday Storytelling & Carrom Afternoon"*, category: *Companionship*, date/time, and 3 spots needed.
   * Requirement is published live.

2. **Volunteer Discovers with Transparent Matching**:
   * Switch to `/volunteer` (Volunteer Portal).
   * Notice the requirement at the top with a **★ 95% Compatibility Match**.
   * Inspect the transparent breakdown: *"Matches your Companionship preference"* and *"Fits your Sunday Morning availability"*.
   * Click **"Apply to Help →"**, write a personal note, and submit.

3. **Home Reviews & Approves Volunteer**:
   * Switch back to `/home` → **Review Applications** tab.
   * View the applicant with their compatibility score and message.
   * Click **"Approve Volunteer ✓"** and add a welcome instruction note.

4. **Activity Appears on Volunteer Schedule**:
   * Switch to `/volunteer` → **My Schedule** tab.
   * The approved session is now confirmed on Ananya's schedule with venue address, contact superintendent, and directions.

5. **Attendance Verified & Volunteer Hours Credited**:
   * Switch to `/home` → **Attendance & Hours Verification** tab.
   * Click **"Mark Present ✓"**.
   * The system automatically verifies attendance, updates the application to `Attended & Verified`, and credits verified volunteer hours to the volunteer's profile.

6. **Feedback & History**:
   * In `/volunteer` → **Attendance & Hours Log**, see the verified session and hours credited.
   * Click **"💬 Give Feedback"** to rate the experience and submit thoughts.

7. **Admin Oversight & Verification**:
   * Navigate to `/admin`.
   * Under **Home Verification Queue**, see *Ananda Park Senior Home* (pending status).
   * Click **"Approve & Verify Partner ✓"** to verify the home.
   * Inspect the **Volunteer Directory** and **Application Pipeline** table.

---

## 📂 Project Structure

```
Sahaaya/
│
├── index.html                   # Public Landing Page & Discovery (Preserved)
├── styles.css                   # Core Design Tokens & Landing Styles
├── app.js                       # Landing Page Controller & Modal Logic
├── README.md                    # Project Documentation & Viva Guide
│
├── volunteer/
│   └── index.html               # Dedicated Volunteer Portal (/volunteer)
├── home/
│   └── index.html               # Dedicated Old Age Home Portal (/home)
├── admin/
│   └── index.html               # Dedicated Admin Operations Portal (/admin)
│
├── css/
│   ├── portal.css               # Portal Layouts, Cards, Tables, Navbars
│   ├── components.css           # Demo Switcher, Modals, Badges, Toasts
│   └── states.css               # Empty States, Alert Notices, Loading Skeletons
│
└── js/
    ├── config.js                # App Constants, Taxonomies, Categories
    ├── db.js                    # Storage Layer with Pre-populated Realistic Seed Data
    ├── auth.js                  # Session Manager & Role Switcher
    ├── matching.js              # Transparent Explainable Matching Engine
    ├── components.js            # Shared UI Widgets (Floating Demo Bar, Dialogs, Toast System)
    ├── volunteer-portal.js      # Volunteer Controller & Schedule Engine
    ├── home-portal.js           # Home Controller, Requirements Builder & Attendance
    └── admin-portal.js          # Admin Controller & Verification Engine
```

---

## 🚀 How to Run Locally

Using Python HTTP Server:
```bash
cd Sahaaya
python -m http.server 5500
```
Open **`http://localhost:5500/`** in your browser.

Or use VS Code **Live Server** extension: right-click `index.html` → *Open with Live Server*.

---

## 🎓 Academic Presentation Notes
* **Frontend Design**: Built with Vanilla HTML5, CSS3 with Custom Properties (variables), and Vanilla Modular JavaScript without heavy external frameworks.
* **Separation of Concerns**: Repository pattern data layer (`db.js`), transparent matching service (`matching.js`), and isolated UI controllers.
* **Backend Readiness**: `db.js` exposes clean `async` Promise-based methods ready for direct swapping with a Node/Express REST API or Firebase Cloud Firestore backend.


## Supabase setup for real accounts

The portal supports real Supabase Auth and database-backed workflows when these **public client** environment variables are set in Vite and in Vercel:

- `VITE_SUPABASE_URL` — your Supabase project URL.
- `VITE_SUPABASE_PUBLISHABLE_KEY` — your publishable key (or `VITE_SUPABASE_ANON_KEY` for projects still using the legacy anon-key name).

Never put a Supabase **service-role** key in a browser environment variable.

Before testing real accounts, apply the SQL in this exact order in the Supabase SQL Editor:

1. `supabase/schema.sql` — tables, indexes and base row-level security policies.
2. `supabase/auth_triggers.sql` — creates a profile and its volunteer/home detail row from a new Auth account.
3. `supabase/migrations/20261014_application_notes.sql` — persists volunteer/coordinator notes.
4. `supabase/migrations/20261014_secure_signup_roles.sql` — restricts public signup metadata to non-admin roles.
5. `supabase/migrations/20261014_workflow_security_hardening.sql` — blocks role/verification tampering and routes application review and attendance through transactional, server-checked RPCs.

The signup trigger is the authoritative profile bootstrap. The browser must not create duplicate profile/detail rows. A home account starts as `pending`; only an administrator should verify it. Admin accounts must be provisioned through a trusted administrative process, not public signup.

After applying the SQL, configure the public Supabase URL and publishable/anon key in Vercel and run `npm test`, `npm run build`, then test with separate volunteer, home and admin accounts. Do not assume a GitHub commit automatically applies SQL to Supabase, configures Vercel, or proves a live multi-account workflow.

The repository adapter uses Supabase for authenticated, non-demo sessions and preserves LocalStorage seed data for the explicit demo role switcher. Demo users and demo data are for evaluation only; they are not real Supabase accounts and must not be treated as an authentication or authorization mechanism.

For local development, create a local `.env` file (do not commit it) with the two variables above, then run `npm install` and `npm run dev`. Use `npm run build` to verify the Vite production build before deployment.


## Dedicated administrator sign-in

Administrators use `/admin/login.html`, which requires the access code and a real Supabase email/password account whose `profiles.role` is already `admin`. Public registration is not allowed to create administrator accounts, and demo-role switching cannot enter the protected admin portal.

In Vercel, add the server-side environment variable `SAHAAYA_ADMIN_ACCESS_CODE` with the chosen six-digit code, for **Preview** and **Production** environments as appropriate, then redeploy. Keep this variable server-only: do not prefix it with `VITE_`, do not put it in client-side JavaScript, and do not commit its value to GitHub. The API endpoint returns no-store responses and checks the code on the server. The code is an additional gate, not a replacement for Supabase authentication and the database role.

To provision an administrator, create the account through a trusted Supabase Auth/admin workflow and assign `admin` to that account's `public.profiles.role` through a trusted database/admin operation. Do not expose a public admin-registration form.

---

## Supabase setup and security hardening

The repository keeps the existing demo personas for evaluation. Real accounts require a Supabase project and the following setup; these steps are **not applied to a hosted Supabase project automatically**.

1. Copy `.env.example` to `.env.local` for local development, then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` (or `VITE_SUPABASE_ANON_KEY`). Use only a publishable/anon key in browser builds; never put a service-role key in Vite variables.
2. In the Supabase SQL Editor, run `supabase/schema.sql`, then `supabase/auth_triggers.sql` on a new project. If the tables already exist, confirm the signup trigger is installed before testing registration.
3. Run migrations in order (also required for an existing project): `supabase/migrations/20261014_secure_signup_roles.sql`, `supabase/migrations/20261014_application_notes.sql`, then `supabase/migrations/20261014_workflow_security_hardening.sql`.
4. Configure the same public variables in the Vercel project settings and redeploy.
5. Test with two separate real accounts: a volunteer and a verified home. Confirm application review, capacity limits, attendance, and hours before using the system with real users.

The workflow-hardening migration blocks self-service admin-role escalation and client-side home verification changes. It also adds transactional RPCs for application review and attendance; the Supabase adapter calls those RPCs instead of performing vulnerable client-side multi-step updates. The attendance RPC calculates hours from the stored activity time and rejects duplicate attendance.

It also lets a home save requirements while its verification is pending, but public discovery remains restricted to verified homes. The home portal resolves the facility linked to the signed-in account (rather than falling back to the first home), and both portals refresh shared data when the browser tab regains focus. This helps newly posted requirements and volunteer applications appear without a manual full-page reload. In demo mode, data is browser-local and is not shared between different devices.

Homes can use **Delete Requirement** to cancel a listing. This is a safe cancellation rather than a destructive database delete: it removes the requirement from volunteer discovery and cancels pending/approved applications while preserving the record. A requirement with recorded attendance cannot be cancelled, so credited hours and attendance history are not lost.

Automated checks:
- `npm test` runs static regression checks for the security migration.
- `npm run build` verifies the production frontend bundle.

These checks do not replace applying the SQL migration or testing against your own Supabase project.
