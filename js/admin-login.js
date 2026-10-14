/**
 * Dedicated administrator login.
 *
 * The access code is a UI-level extra gate only; real access depends on
 * Supabase Auth plus the trusted admin role in public.profiles.
 */
(() => {
  const form = document.getElementById("adminLoginForm");
  if (!form) return;

  const codeField = document.getElementById("adminCode");
  const emailField = document.getElementById("adminEmail");
  const passwordField = document.getElementById("adminPassword");
  const submit = document.getElementById("adminSubmit");
  const message = document.getElementById("adminMessage");
  const ACCESS_CODE = "232758";

  function showMessage(text, type = "error") {
    message.textContent = text;
    message.className = "message " + type;
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    message.textContent = "";
    message.className = "message";

    if (codeField.value.trim() !== ACCESS_CODE) {
      showMessage("The administrator access code is incorrect.");
      codeField.focus();
      return;
    }

    if (!form.reportValidity()) return;
    submit.disabled = true;
    submit.textContent = "Verifying access…";

    try {
      const sessionUser = await window.SahaayaAuth.login(
        emailField.value.trim(),
        passwordField.value
      );

      if (!sessionUser || sessionUser.role !== "admin") {
        try {
          if (window._supabaseClient) await window._supabaseClient.auth.signOut();
          localStorage.removeItem("sahaaya_cached_session");
        } catch (_) {}
        showMessage("This account is not authorised as a Sahaaya administrator. Contact the platform owner.");
        return;
      }

      showMessage("Access verified. Opening the admin portal…", "success");
      window.location.replace("./index.html");
    } catch (error) {
      showMessage(error?.message || "Sign-in failed. Check your credentials and try again.");
    } finally {
      submit.disabled = false;
      submit.innerHTML = 'Verify and sign in <span aria-hidden="true">→</span>';
    }
  });
})();
