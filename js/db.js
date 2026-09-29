/**
 * SAHAAYA — Database & Storage Layer (Repository Pattern)
 * 
 * Provides local persistence with LocalStorage and pre-seeded realistic data.
 * Architecture is fully asynchronous and decoupled, ready for REST API / Firebase swap.
 */

const SahaayaDB = (() => {
  const PREFIX = SAHAAYA_CONFIG.STORAGE_KEY_PREFIX;

  // Initial Seed Data
  const INITIAL_SEED = {
    users: [
      {
        id: "usr_vol_01",
        name: "Ananya Sharma",
        email: "ananya.sharma@example.com",
        password: "demo",
        role: "volunteer",
        phone: "+91 98450 12345",
        avatar_initials: "AS",
        created_at: "2026-08-15T10:00:00Z"
      },
      {
        id: "usr_vol_02",
        name: "Rohan Mehta",
        email: "rohan.m@example.com",
        password: "demo",
        role: "volunteer",
        phone: "+91 98860 54321",
        avatar_initials: "RM",
        created_at: "2026-08-20T14:30:00Z"
      },
      {
        id: "usr_vol_03",
        name: "Priya Nambiar",
        email: "priya.n@example.com",
        password: "demo",
        role: "volunteer",
        phone: "+91 97410 98765",
        avatar_initials: "PN",
        created_at: "2026-09-01T09:15:00Z"
      },
      {
        id: "usr_home_01",
        name: "Rajesh Sen (Coordinator)",
        email: "coordinator@silversprings.org",
        password: "demo",
        role: "home",
        phone: "+91 80 2845 0911",
        avatar_initials: "SS",
        home_id: "home_01",
        created_at: "2026-07-10T11:00:00Z"
      },
      {
        id: "usr_home_02",
        name: "Dr. Malini Rao",
        email: "malini@bhavanacare.org",
        password: "demo",
        role: "home",
        phone: "+91 80 2520 8872",
        avatar_initials: "BH",
        home_id: "home_02",
        created_at: "2026-07-22T16:00:00Z"
      },
      {
        id: "usr_home_03",
        name: "Fr. Thomas Kurian",
        email: "contact@anandapark.org",
        password: "demo",
        role: "home",
        phone: "+91 80 2258 4401",
        avatar_initials: "AP",
        home_id: "home_03",
        created_at: "2026-09-24T18:00:00Z"
      },
      {
        id: "usr_admin_01",
        name: "Sahana K (Admin)",
        email: "admin@sahaaya.org",
        password: "demo",
        role: "admin",
        phone: "+91 99000 11223",
        avatar_initials: "SK",
        created_at: "2026-06-01T08:00:00Z"
      }
    ],

    volunteer_profiles: [
      {
        id: "vp_01",
        user_id: "usr_vol_01",
        bio: "Pre-final year engineering student. Love listening to life stories, playing carrom, chess, and singing old Kishore Kumar classics.",
        interests: ["companionship", "recreation", "music"],
        availability: ["sun_morning", "sat_evening", "sun_evening"],
        total_hours: 14.5,
        completed_count: 5,
        emergency_contact: "Sunita Sharma (Mother) - +91 98450 99887"
      },
      {
        id: "vp_02",
        user_id: "usr_vol_02",
        bio: "Software developer wanting to give back on weekends. Patient with teaching smartphone navigation and WhatsApp video calling.",
        interests: ["assistive", "companionship", "outdoors"],
        availability: ["sat_morning", "sun_morning"],
        total_hours: 22.0,
        completed_count: 8,
        emergency_contact: "Kavita Mehta - +91 98860 11223"
      },
      {
        id: "vp_03",
        user_id: "usr_vol_03",
        bio: "School educator who loves pottery, folk art, watercolor painting, and gentle reading sessions with seniors.",
        interests: ["creative", "companionship"],
        availability: ["sat_morning", "weekday_evening"],
        total_hours: 8.0,
        completed_count: 3,
        emergency_contact: "Narayanan N - +91 97410 44556"
      }
    ],

    homes: [
      {
        id: "home_01",
        user_id: "usr_home_01",
        name: "Silver Springs Senior Care",
        registration_number: "KA-BLR-NGO-2017-882",
        address: "74 ECC Road, Near ITPL Main Gate, Whitefield",
        area: "Whitefield, Bengaluru",
        resident_count: 48,
        contact_person: "Rajesh Sen (Welfare Superintendent)",
        verification_status: "verified",
        verification_notes: "Physical inspection conducted; registered non-profit trust with 80G certification.",
        description: "Silver Springs provides assisted living and palliative day support for 48 elderly citizens. We emphasize community inclusion and interactive social sessions."
      },
      {
        id: "home_02",
        user_id: "usr_home_02",
        name: "Bhavana Senior Care",
        registration_number: "KA-BLR-TRUST-2019-304",
        address: "12, 14th Main, 100 Feet Road, HAL 2nd Stage",
        area: "Indiranagar, Bengaluru",
        resident_count: 32,
        contact_person: "Dr. Malini Rao",
        verification_status: "verified",
        verification_notes: "Verified government registered NGO operating for 6+ years.",
        description: "A tranquil home dedicated to dignified aging, arts appreciation, and recreational group activities for senior citizens."
      },
      {
        id: "home_03",
        user_id: "usr_home_03",
        name: "Ananda Park Senior Home",
        registration_number: "KA-BLR-REG-2026-119",
        address: "Sector 2, 27th Main, HSR Layout",
        area: "HSR Layout, Bengaluru",
        resident_count: 27,
        contact_person: "Fr. Thomas Kurian",
        verification_status: "pending", // NEW PENDING HOME FOR ADMIN DEMO!
        verification_notes: "Awaiting registration certificate cross-check with district registrar.",
        description: "Recently opened community home catering to elderly residents seeking communal warmth, light gardening, and companionship."
      }
    ],

    opportunities: [
      {
        id: "opp_101",
        home_id: "home_01",
        title: "Sunday Social Afternoon & Board Games",
        category: "companionship",
        description: "Spend a relaxing afternoon with residents playing Carrom, Scrabble, or simply listening to childhood stories. No special skills required — just patience, empathy, and warm conversation.",
        date: "2026-10-04",
        time_start: "11:00 AM",
        time_end: "01:30 PM",
        duration_hours: 2.5,
        slot_id: "sun_morning",
        spots_needed: 3,
        spots_filled: 1,
        required_skills: ["Patience", "Storytelling", "Board games"],
        status: "open",
        created_at: "2026-09-20T10:00:00Z"
      },
      {
        id: "opp_102",
        home_id: "home_02",
        title: "Music & Antakshari Melodies",
        category: "music",
        description: "Organize a group singing circle with residents who adore classic 60s/70s Hindi and regional songs. Bring an acoustic instrument if you have one, or just your singing voice!",
        date: "2026-10-03",
        time_start: "04:00 PM",
        time_end: "06:00 PM",
        duration_hours: 2.0,
        slot_id: "sat_evening",
        spots_needed: 4,
        spots_filled: 0,
        required_skills: ["Enthusiasm for music", "Group engagement"],
        status: "open",
        created_at: "2026-09-22T14:00:00Z"
      },
      {
        id: "opp_103",
        home_id: "home_01",
        title: "Smartphone & Video Calling Literacy",
        category: "assistive",
        description: "Help 6 senior residents learn how to video call their grandchildren living abroad, adjust font sizes, and safely use WhatsApp messaging.",
        date: "2026-10-10",
        time_start: "10:30 AM",
        time_end: "12:30 PM",
        duration_hours: 2.0,
        slot_id: "sat_morning",
        spots_needed: 2,
        spots_filled: 0,
        required_skills: ["Tech savvy", "Patient instruction"],
        status: "open",
        created_at: "2026-09-25T11:30:00Z"
      },
      {
        id: "opp_104",
        home_id: "home_02",
        title: "Art, Watercolor & Memory Wall",
        category: "creative",
        description: "Lead a gentle painting and collage activity where seniors paint memorable moments and assemble a vibrant gallery wall in our shared dining hall.",
        date: "2026-10-11",
        time_start: "03:00 PM",
        time_end: "05:00 PM",
        duration_hours: 2.0,
        slot_id: "sun_evening",
        spots_needed: 3,
        spots_filled: 1,
        required_skills: ["Basic arts & crafts", "Gentle support"],
        status: "open",
        created_at: "2026-09-26T09:00:00Z"
      },
      {
        id: "opp_105",
        home_id: "home_01",
        title: "Morning Courtyard Walk & Newspaper Reading",
        category: "outdoors",
        description: "Accompany residents on a refreshing morning walk in the landscaped courtyard, followed by reading out headline articles and cultural news over tea.",
        date: "2026-10-18",
        time_start: "08:30 AM",
        time_end: "10:30 AM",
        duration_hours: 2.0,
        slot_id: "sun_morning",
        spots_needed: 3,
        spots_filled: 0,
        required_skills: ["Gentle walking assistance", "Clear reading voice"],
        status: "open",
        created_at: "2026-09-27T15:00:00Z"
      }
    ],

    applications: [
      {
        id: "app_201",
        opportunity_id: "opp_101",
        volunteer_id: "usr_vol_01", // Ananya Sharma
        match_score: 95,
        match_reasons: [
          "Direct interest match: Companionship & Recreation",
          "Schedule fits your Sunday Morning availability",
          "Prior verified experience in senior companionship"
        ],
        volunteer_note: "I have visited senior homes before and would love to spend time playing Carrom and chatting with residents.",
        status: "approved", // Pre-approved so it shows in Ananya's schedule!
        coordinator_note: "Welcome Ananya! We look forward to having you on Sunday.",
        applied_at: "2026-09-21T11:00:00Z",
        reviewed_at: "2026-09-22T09:30:00Z"
      },
      {
        id: "app_202",
        opportunity_id: "opp_102",
        volunteer_id: "usr_vol_01", // Ananya Sharma
        match_score: 90,
        match_reasons: [
          "Direct interest match: Music & Cultural",
          "Schedule fits your Saturday Evening availability"
        ],
        volunteer_note: "I can lead the singing group and bring a songbook of old Hindi melodies.",
        status: "applied", // Pending approval! Home coordinator can review this.
        coordinator_note: null,
        applied_at: "2026-09-25T16:00:00Z",
        reviewed_at: null
      },
      {
        id: "app_203",
        opportunity_id: "opp_104",
        volunteer_id: "usr_vol_03", // Priya Nambiar
        match_score: 95,
        match_reasons: [
          "Direct interest match: Creative & Arts",
          "Schedule fits your Sunday Evening availability"
        ],
        volunteer_note: "Excited to bring watercolors and paper collage materials.",
        status: "approved",
        coordinator_note: "Approved. Art materials will also be arranged by Bhavana Care.",
        applied_at: "2026-09-26T10:15:00Z",
        reviewed_at: "2026-09-26T18:00:00Z"
      }
    ],

    attendance_records: [
      {
        id: "att_301",
        application_id: "app_prev_01",
        opportunity_id: "opp_past_01",
        volunteer_id: "usr_vol_01",
        home_id: "home_01",
        opportunity_title: "Independence Day Cultural Afternoon",
        date: "2026-08-15",
        hours_credited: 3.0,
        marked_by: "usr_home_01",
        marked_at: "2026-08-15T17:00:00Z",
        status: "present"
      },
      {
        id: "att_302",
        application_id: "app_prev_02",
        opportunity_id: "opp_past_02",
        volunteer_id: "usr_vol_01",
        home_id: "home_01",
        opportunity_title: "Ganesh Festival Clay Craft & Stories",
        date: "2026-09-06",
        hours_credited: 2.5,
        marked_by: "usr_home_01",
        marked_at: "2026-09-06T14:30:00Z",
        status: "present"
      },
      {
        id: "att_303",
        application_id: "app_prev_03",
        opportunity_id: "opp_past_03",
        volunteer_id: "usr_vol_02",
        home_id: "home_02",
        opportunity_title: "Audiobook Reading Session",
        date: "2026-09-12",
        hours_credited: 2.0,
        marked_by: "usr_home_02",
        marked_at: "2026-09-12T16:00:00Z",
        status: "present"
      }
    ],

    feedback: [
      {
        id: "fb_401",
        opportunity_id: "opp_past_01",
        from_user_id: "usr_vol_01",
        to_user_id: "usr_home_01",
        role_type: "volunteer_to_home",
        rating: 5,
        comments: "The residents were so hospitable and full of warmth. Shri Ramanathan shared captivating memories of Bangalore in the 1960s. Thoroughly well-coordinated by Rajesh ji.",
        created_at: "2026-08-16T10:00:00Z"
      },
      {
        id: "fb_402",
        opportunity_id: "opp_past_01",
        from_user_id: "usr_home_01",
        to_user_id: "usr_vol_01",
        role_type: "home_to_volunteer",
        rating: 5,
        comments: "Ananya was exceptionally courteous, patient, and attentive. The residents repeatedly inquired when she would visit again.",
        created_at: "2026-08-16T12:00:00Z"
      }
    ]
  };

  // Internal Helper: Load collection
  function load(key) {
    try {
      const stored = localStorage.getItem(PREFIX + key);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn("Error reading localStorage:", e);
    }
    // Fall back to seed
    if (INITIAL_SEED[key]) {
      save(key, INITIAL_SEED[key]);
      return JSON.parse(JSON.stringify(INITIAL_SEED[key]));
    }
    return [];
  }

  // Internal Helper: Save collection
  function save(key, data) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(data));
    } catch (e) {
      console.error("Error saving to localStorage:", e);
    }
  }

  // Initialize DB if not present
  function init() {
    Object.keys(INITIAL_SEED).forEach(key => {
      if (!localStorage.getItem(PREFIX + key)) {
        save(key, INITIAL_SEED[key]);
      }
    });
  }

  init();

  return {
    // -------------------------------------------------------------
    // Platform / Demo Reset
    // -------------------------------------------------------------
    resetToDemoSeed: async () => {
      Object.keys(INITIAL_SEED).forEach(key => {
        save(key, INITIAL_SEED[key]);
      });
      return true;
    },

    // -------------------------------------------------------------
    // Users & Profiles
    // -------------------------------------------------------------
    getUsers: async () => load("users"),

    getUserById: async (id) => {
      const users = load("users");
      return users.find(u => u.id === id) || null;
    },

    getUserByEmail: async (email) => {
      const users = load("users");
      return users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
    },

    createUser: async (userData) => {
      const users = load("users");
      const id = "usr_" + Date.now();
      const newUser = {
        id,
        ...userData,
        created_at: new Date().toISOString()
      };
      users.push(newUser);
      save("users", users);
      return newUser;
    },

    getVolunteerProfileByUserId: async (userId) => {
      const profiles = load("volunteer_profiles");
      return profiles.find(p => p.user_id === userId) || null;
    },

    updateVolunteerProfile: async (userId, updateData) => {
      const profiles = load("volunteer_profiles");
      const index = profiles.findIndex(p => p.user_id === userId);
      if (index !== -1) {
        profiles[index] = { ...profiles[index], ...updateData };
        save("volunteer_profiles", profiles);
        return profiles[index];
      }
      // Create if doesn't exist
      const newProfile = {
        id: "vp_" + Date.now(),
        user_id: userId,
        total_hours: 0,
        completed_count: 0,
        ...updateData
      };
      profiles.push(newProfile);
      save("volunteer_profiles", profiles);
      return newProfile;
    },

    // -------------------------------------------------------------
    // Old Age Homes
    // -------------------------------------------------------------
    getHomes: async (filter = {}) => {
      let homes = load("homes");
      if (filter.verification_status) {
        homes = homes.filter(h => h.verification_status === filter.verification_status);
      }
      return homes;
    },

    getHomeById: async (id) => {
      const homes = load("homes");
      return homes.find(h => h.id === id) || null;
    },

    getHomeByUserId: async (userId) => {
      const homes = load("homes");
      return homes.find(h => h.user_id === userId) || null;
    },

    createHome: async (homeData) => {
      const homes = load("homes");
      const id = "home_" + Date.now();
      const newHome = {
        id,
        verification_status: SAHAAYA_CONFIG.HOME_STATUS.PENDING,
        verification_notes: "Newly registered; pending admin verification.",
        ...homeData
      };
      homes.push(newHome);
      save("homes", homes);
      return newHome;
    },

    updateHomeStatus: async (homeId, status, notes = "") => {
      const homes = load("homes");
      const home = homes.find(h => h.id === homeId);
      if (!home) throw new Error("Home not found");
      home.verification_status = status;
      if (notes) home.verification_notes = notes;
      save("homes", homes);
      return home;
    },

    // -------------------------------------------------------------
    // Requirements / Opportunities
    // -------------------------------------------------------------
    getOpportunities: async (filters = {}) => {
      let opps = load("opportunities");
      if (filters.home_id) {
        opps = opps.filter(o => o.home_id === filters.home_id);
      }
      if (filters.category && filters.category !== "all") {
        opps = opps.filter(o => o.category === filters.category);
      }
      if (filters.status) {
        opps = opps.filter(o => o.status === filters.status);
      }
      return opps;
    },

    getOpportunityById: async (id) => {
      const opps = load("opportunities");
      return opps.find(o => o.id === id) || null;
    },

    createOpportunity: async (oppData) => {
      const opps = load("opportunities");
      const id = "opp_" + Date.now();
      const newOpp = {
        id,
        spots_filled: 0,
        status: SAHAAYA_CONFIG.OPPORTUNITY_STATUS.OPEN,
        created_at: new Date().toISOString(),
        ...oppData
      };
      opps.unshift(newOpp); // Newest first
      save("opportunities", opps);
      return newOpp;
    },

    updateOpportunity: async (id, data) => {
      const opps = load("opportunities");
      const index = opps.findIndex(o => o.id === id);
      if (index !== -1) {
        opps[index] = { ...opps[index], ...data };
        save("opportunities", opps);
        return opps[index];
      }
      return null;
    },

    // -------------------------------------------------------------
    // Applications
    // -------------------------------------------------------------
    getApplications: async (filter = {}) => {
      let apps = load("applications");
      if (filter.volunteer_id) {
        apps = apps.filter(a => a.volunteer_id === filter.volunteer_id);
      }
      if (filter.opportunity_id) {
        apps = apps.filter(a => a.opportunity_id === filter.opportunity_id);
      }
      if (filter.status) {
        apps = apps.filter(a => a.status === filter.status);
      }
      return apps;
    },

    getApplicationById: async (id) => {
      const apps = load("applications");
      return apps.find(a => a.id === id) || null;
    },

    submitApplication: async (appData) => {
      const apps = load("applications");
      // Prevent duplicate active applications
      const existing = apps.find(
        a => a.opportunity_id === appData.opportunity_id &&
             a.volunteer_id === appData.volunteer_id &&
             (a.status === "applied" || a.status === "approved")
      );
      if (existing) {
        throw new Error("You have already applied for this opportunity.");
      }

      const id = "app_" + Date.now();
      const newApp = {
        id,
        status: SAHAAYA_CONFIG.APPLICATION_STATUS.APPLIED,
        applied_at: new Date().toISOString(),
        reviewed_at: null,
        coordinator_note: null,
        ...appData
      };
      apps.push(newApp);
      save("applications", apps);
      return newApp;
    },

    updateApplicationStatus: async (applicationId, status, coordinatorNote = "") => {
      const apps = load("applications");
      const app = apps.find(a => a.id === applicationId);
      if (!app) throw new Error("Application not found");

      app.status = status;
      app.reviewed_at = new Date().toISOString();
      if (coordinatorNote) {
        app.coordinator_note = coordinatorNote;
      }

      // If approved, update spots_filled on the opportunity
      const opps = load("opportunities");
      const opp = opps.find(o => o.id === app.opportunity_id);
      if (opp && status === SAHAAYA_CONFIG.APPLICATION_STATUS.APPROVED) {
        opp.spots_filled = (opp.spots_filled || 0) + 1;
        if (opp.spots_filled >= opp.spots_needed) {
          opp.status = SAHAAYA_CONFIG.OPPORTUNITY_STATUS.FILLED;
        }
        save("opportunities", opps);
      }

      save("applications", apps);
      return app;
    },

    // -------------------------------------------------------------
    // Attendance & Hours Crediting
    // -------------------------------------------------------------
    recordAttendance: async ({ applicationId, status, markedByUserId }) => {
      const apps = load("applications");
      const app = apps.find(a => a.id === applicationId);
      if (!app) throw new Error("Application not found");

      const opps = load("opportunities");
      const opp = opps.find(o => o.id === app.opportunity_id);
      if (!opp) throw new Error("Opportunity not found");

      const attendanceRecords = load("attendance_records");
      const recordId = "att_" + Date.now();

      const hoursToCredit = status === "present" ? (opp.duration_hours || 2.0) : 0;

      const record = {
        id: recordId,
        application_id: app.id,
        opportunity_id: opp.id,
        opportunity_title: opp.title,
        volunteer_id: app.volunteer_id,
        home_id: opp.home_id,
        date: opp.date,
        hours_credited: hoursToCredit,
        marked_by: markedByUserId,
        marked_at: new Date().toISOString(),
        status
      };

      attendanceRecords.unshift(record);
      save("attendance_records", attendanceRecords);

      // Update application status
      app.status = status === "present" ? SAHAAYA_CONFIG.APPLICATION_STATUS.ATTENDED : SAHAAYA_CONFIG.APPLICATION_STATUS.ABSENT;
      save("applications", apps);

      // Credit hours to volunteer profile if present
      if (status === "present") {
        const profiles = load("volunteer_profiles");
        const profile = profiles.find(p => p.user_id === app.volunteer_id);
        if (profile) {
          profile.total_hours = parseFloat(((profile.total_hours || 0) + hoursToCredit).toFixed(1));
          profile.completed_count = (profile.completed_count || 0) + 1;
          save("volunteer_profiles", profiles);
        }
      }

      return record;
    },

    getAttendanceHistoryByVolunteer: async (volunteerId) => {
      const records = load("attendance_records");
      return records.filter(r => r.volunteer_id === volunteerId);
    },

    // -------------------------------------------------------------
    // Feedback
    // -------------------------------------------------------------
    submitFeedback: async (feedbackData) => {
      const feedbacks = load("feedback");
      const id = "fb_" + Date.now();
      const newFeedback = {
        id,
        created_at: new Date().toISOString(),
        ...feedbackData
      };
      feedbacks.unshift(newFeedback);
      save("feedback", feedbacks);
      return newFeedback;
    },

    getFeedbackForOpportunity: async (oppId) => {
      const feedbacks = load("feedback");
      return feedbacks.filter(f => f.opportunity_id === oppId);
    },

    // -------------------------------------------------------------
    // Platform Analytics & Reports
    // -------------------------------------------------------------
    getPlatformStats: async () => {
      const users = load("users");
      const homes = load("homes");
      const opps = load("opportunities");
      const apps = load("applications");
      const attendance = load("attendance_records");

      const verifiedHomes = homes.filter(h => h.verification_status === "verified");
      const pendingHomes = homes.filter(h => h.verification_status === "pending");
      const volunteers = users.filter(u => u.role === "volunteer");

      const totalHoursCredited = attendance
        .filter(a => a.status === "present")
        .reduce((sum, a) => sum + (parseFloat(a.hours_credited) || 0), 0);

      const completedActivities = opps.filter(o => o.status === "completed" || opps.some(op => op.id === o.id)).length;

      return {
        total_volunteers: volunteers.length,
        total_homes: homes.length,
        verified_homes_count: verifiedHomes.length,
        pending_homes_count: pendingHomes.length,
        open_opportunities_count: opps.filter(o => o.status === "open").length,
        total_applications_count: apps.length,
        approved_applications_count: apps.filter(a => a.status === "approved" || a.status === "attended").length,
        total_hours_volunteered: parseFloat(totalHoursCredited.toFixed(1)),
        completed_sessions_count: attendance.filter(a => a.status === "present").length
      };
    }
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SahaayaDB;
}
