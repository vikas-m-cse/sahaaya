/**
 * SAHAAYA — Configuration, Taxonomies and Enumerations
 */

const SAHAAYA_CONFIG = {
  APP_NAME: "Sahaaya",
  STORAGE_KEY_PREFIX: "sahaaya_db_",
  VERSION: "1.0.0",

  ROLES: {
    VOLUNTEER: "volunteer",
    HOME: "home",
    ADMIN: "admin"
  },

  CATEGORIES: [
    { id: "companionship", label: "Companionship", color: "#f5cbb9", icon: "♡" },
    { id: "recreation", label: "Recreation & Games", color: "#bcdccf", icon: "⚄" },
    { id: "creative", label: "Creative & Arts", color: "#ddd4f0", icon: "✎" },
    { id: "music", label: "Music & Cultural", color: "#fce1b5", icon: "♫" },
    { id: "assistive", label: "Digital & Reading Help", color: "#cfe56d", icon: "⌨" },
    { id: "outdoors", label: "Walking & Outdoors", color: "#c6e3d2", icon: "☼" }
  ],

  HOME_STATUS: {
    PENDING: "pending",
    VERIFIED: "verified",
    REJECTED: "rejected"
  },

  OPPORTUNITY_STATUS: {
    OPEN: "open",
    FILLED: "filled",
    COMPLETED: "completed",
    CANCELLED: "cancelled"
  },

  APPLICATION_STATUS: {
    APPLIED: "applied",
    APPROVED: "approved",
    REJECTED: "rejected",
    ATTENDED: "attended",
    ABSENT: "absent"
  },

  ATTENDANCE_STATUS: {
    PRESENT: "present",
    ABSENT: "absent"
  },

  WEEKDAY_SLOTS: [
    { id: "sat_morning", label: "Saturday Morning (9:00 AM – 1:00 PM)" },
    { id: "sat_evening", label: "Saturday Evening (4:00 PM – 7:00 PM)" },
    { id: "sun_morning", label: "Sunday Morning (9:00 AM – 1:00 PM)" },
    { id: "sun_evening", label: "Sunday Evening (4:00 PM – 7:00 PM)" },
    { id: "weekday_evening", label: "Weekday Evenings (5:00 PM – 8:00 PM)" }
  ],

  DEMO_USERS: {
    VOLUNTEER: "usr_vol_01",
    HOME: "usr_home_01",
    ADMIN: "usr_admin_01"
  }
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = SAHAAYA_CONFIG;
}
