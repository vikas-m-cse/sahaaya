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
