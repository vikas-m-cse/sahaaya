/**
 * SAHAAYA — Authentication & Session Layer
 *
 * Manages Supabase Auth (real auth) and Demo Mode sessions.
 * This is a plain-script IIFE (no ES module imports) so it works
 * consistently in all portal pages served without a build step.
 *
 * Supabase is loaded via CDN <script> tag in each HTML page,
 * exposing the global `window.supabase` (from the CDN UMD build).
 */

const SahaayaAuth = (() => {
  const CACHED_SESSION_KEY = "sahaaya_cached_session";

  // -----------------------------------------------------------------------
  // Supabase client initialisation
  // -----------------------------------------------------------------------
  // Read credentials stored by the HTML page (must be set before this script)
  // We expose them through a global object set by the CDN build, or fall back
  // to null so all auth methods gracefully degrade to demo-only mode.
  function _getSupabaseClient() {
    if (window._supabaseClient) return window._supabaseClient;

    const url  = window.SAHAAYA_SUPABASE_URL  || null;
    const key  = window.SAHAAYA_SUPABASE_KEY  || null;

    if (url && key && window.supabase && typeof window.supabase.createClient === "function") {
      window._supabaseClient = window.supabase.createClient(url, key);
    } else {
      window._supabaseClient = null;
    }

    return window._supabaseClient;
  }

  // -----------------------------------------------------------------------
  // Determine root path dynamically for relative redirects
  // -----------------------------------------------------------------------
  function getBasePath() {
    const path = window.location.pathname;
    if (
      path.includes("/volunteer/") ||
      path.includes("/home/") ||
      path.includes("/admin/")
    ) {
      return "../";
    }
    return "./";
  }

  // -----------------------------------------------------------------------
  // Cached session helpers  (UI-layer session, not authoritative)
  // -----------------------------------------------------------------------
  function getCachedSession() {
    try {
      const data = localStorage.getItem(CACHED_SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  }

  function setCachedSession(sessionUser) {
    try {
      if (sessionUser) {
        localStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(sessionUser));
      } else {
        localStorage.removeItem(CACHED_SESSION_KEY);
      }
    } catch (e) {
      console.warn("Storage warning:", e);
    }
  }

  // -----------------------------------------------------------------------
  // Fetch complete user profile from Supabase
  // -----------------------------------------------------------------------
  async function fetchUserProfile(userId) {
    const sb = _getSupabaseClient();
    if (!sb) return null;

    try {
      const { data: profile, error: profErr } = await sb
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (profErr || !profile) return null;

      let extra = {};

      if (profile.role === "volunteer") {
        const { data: vol } = await sb
          .from("volunteers")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle();
        if (vol) {
          // volunteer_id = volunteers.id (distinct from profiles.id!)
          // Used as FK in applications.volunteer_id and attendance.volunteer_id
          extra.volunteer_id = vol.id;
          extra.volunteer = vol;
        }
      } else if (profile.role === "home") {
        const { data: home } = await sb
          .from("old_age_homes")
          .select("*")
          .eq("profile_id", userId)
          .maybeSingle();
        if (home) {
          // home_id = old_age_homes.id (distinct from profiles.id!)
          // Used as FK in activities.home_id
          extra.home_id = home.id;
          extra.home = home;
        }
      }

      const initials = (profile.full_name || "VO")
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);

      const sessionUser = {
        id: profile.id,          // profiles.id = auth.uid()
        email: profile.email,
        name: profile.full_name,
        role: profile.role,
        phone: profile.phone,
        avatar_initials: initials,
        ...extra
      };

      setCachedSession(sessionUser);
      return sessionUser;
    } catch (err) {
      console.error("Error fetching user profile:", err);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Get active session
  // -----------------------------------------------------------------------
  async function getSession() {
    const sb = _getSupabaseClient();

    // Production mode: only a valid Supabase Auth session is authoritative.
    // Old demo/local cached sessions are deliberately ignored and removed.
    if (!sb) {
      setCachedSession(null);
      return null;
    }

    try {
      const { data, error } = await sb.auth.getSession();
      if (error) throw error;

      if (!data.session?.user?.id) {
        setCachedSession(null);
        return null;
      }

      return await fetchUserProfile(data.session.user.id);
    } catch (err) {
      console.error("Supabase session check failed:", err);
      setCachedSession(null);
      return null;
    }
  }

  // -----------------------------------------------------------------------
  // Sign Up — Volunteer
  // -----------------------------------------------------------------------
  async function registerVolunteer({ name, email, password, phone, interests, availability, preferred_area }) {
    const sb = _getSupabaseClient();
    if (!sb) throw new Error("Supabase is not connected. Please configure .env and use Vite dev server.");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
          phone: phone || "",
          role: "volunteer",
          interests: interests || ["companionship"],
          availability: availability || ["sun_morning"],
          preferred_area: preferred_area || "Bengaluru"
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Registration failed.");

    if (data.session) {
      await sb.from("profiles").upsert({
        id: data.user.id,
        full_name: name,
        email,
        phone: phone || "",
        role: "volunteer"
      });

      const { error: volErr } = await sb.from("volunteers").upsert({
        profile_id: data.user.id,
        interests: interests || ["companionship"],
        availability: availability || ["sun_morning"],
        preferred_activity_types: [],
        preferred_area: preferred_area || "Bengaluru"
      }, { onConflict: "profile_id" });
      if (volErr) console.warn("Volunteer row upsert warning:", volErr);

      const sessionUser = await fetchUserProfile(data.user.id);
      return { user: data.user, sessionUser, needsConfirmation: false };
    }

    return {
      user: data.user,
      sessionUser: null,
      needsConfirmation: true,
      message: "Account created! Please check your email to confirm before signing in."
    };
  }

  // -----------------------------------------------------------------------
  // Sign Up — Old Age Home
  // -----------------------------------------------------------------------
  async function registerHome({ homeName, contactPerson, email, password, phone, address, city, description }) {
    const sb = _getSupabaseClient();
    if (!sb) throw new Error("Supabase is not connected. Please configure .env and use Vite dev server.");

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: contactPerson,
          phone: phone || "",
          role: "home",
          home_name: homeName,
          address: address || "Bengaluru",
          city: city || "Bengaluru",
          description: description || "Senior care residence."
        }
      }
    });

    if (error) throw error;
    if (!data.user) throw new Error("Registration failed.");

    if (data.session) {
      await sb.from("profiles").upsert({
        id: data.user.id,
        full_name: contactPerson,
        email,
        phone: phone || "",
        role: "home"
      });

      const { error: homeErr } = await sb.from("old_age_homes").upsert({
        profile_id: data.user.id,
        name: homeName,
        description: description || "Senior care residence.",
        address: address || "Bengaluru",
        city: city || "Bengaluru",
        contact_phone: phone || "",
        verification_status: "pending"
      }, { onConflict: "profile_id" });
      if (homeErr) console.warn("Home row upsert warning:", homeErr);

      const sessionUser = await fetchUserProfile(data.user.id);
      return { user: data.user, sessionUser, needsConfirmation: false };
    }

    return {
      user: data.user,
      sessionUser: null,
      needsConfirmation: true,
      message: "Home registration received! Verify your email to sign in."
    };
  }

  // -----------------------------------------------------------------------
  // Login
  // -----------------------------------------------------------------------
  async function login(email, password) {
    const sb = _getSupabaseClient();
    if (!sb) throw new Error("Supabase is not connected.");

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) throw error;
    if (!data.user) throw new Error("Authentication failed.");

    const sessionUser = await fetchUserProfile(data.user.id);
    if (!sessionUser) {
      throw new Error("User profile not found in database. Contact administrator.");
    }

    return sessionUser;
  }

  // -----------------------------------------------------------------------
  // Logout
  // -----------------------------------------------------------------------
  async function logout() {
    setCachedSession(null);
    const sb = _getSupabaseClient();
    if (sb) {
      try { await sb.auth.signOut(); } catch (e) { /* ignore */ }
    }
    window.location.href = getBasePath() + "index.html";
  }

  // -----------------------------------------------------------------------
  // Route Guard
  // -----------------------------------------------------------------------
  async function checkAuthGuard(requiredRole) {
    const sessionUser = await getSession();

    if (!sessionUser) {
      window.location.href = getBasePath() + "index.html?login_required=1";
      return null;
    }

    // Admins can access any portal for oversight
    if (sessionUser.role !== requiredRole && sessionUser.role !== "admin") {
      console.warn(`Role mismatch: expected ${requiredRole}, got ${sessionUser.role}.`);
      const map = { volunteer: "volunteer/", home: "home/", admin: "admin/" };
      window.location.href = getBasePath() + (map[sessionUser.role] || "index.html");
      return null;
    }

    return sessionUser;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  return {
    getSession,
    getCachedSession,
    registerVolunteer,
    registerHome,
    login,
    logout,
    checkAuthGuard,
    getBasePath
  };
})();

// Make globally available
window.SahaayaAuth = SahaayaAuth;
