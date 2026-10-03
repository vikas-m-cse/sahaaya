/**
 * SAHAAYA — Shared UI Components
 *
 * Provides the persistent Demo Evaluation Bar, Modal dialogs,
 * Toast system, and helper badge formatters.
 *
 * Depends on: SahaayaAuth (global), SahaayaDB (global), SAHAAYA_CONFIG (global)
 */

const SahaayaUI = (() => {

  // -----------------------------------------------------------------------
  // DEMO EVALUATION BAR
  // Renders the top bar and handles role switching.
  // getSession() is async so we render an optimistic bar first,
  // then update the active button once the session resolves.
  // -----------------------------------------------------------------------
  // Demo role switching is disabled in real-account mode.
  function initDemoBar() {
    const existingBar = document.getElementById("sahaayaDemoBar");
    if (existingBar) existingBar.remove();
  }

  // -----------------------------------------------------------------------
  // TOAST NOTIFICATIONS
  // -----------------------------------------------------------------------
  function showToast(message, type = "info") {
    let toast = document.getElementById("sahaayaToast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "sahaayaToast";
      toast.className = "sahaaya-toast";
      document.body.appendChild(toast);
    }

    const icon = type === "success" ? "✓ " : type === "warning" ? "⚠ " : type === "error" ? "✕ " : "ℹ ";
    toast.className = `sahaaya-toast show toast-${type}`;
    toast.innerHTML = `<span>${icon}</span> <span>${message}</span>`;

    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove("show");
    }, 3500);
  }

  // -----------------------------------------------------------------------
  // SHARED MODAL COMPONENT
  // -----------------------------------------------------------------------
  function openModal({ title, subtitle = "", bodyHtml = "", footerHtml = "" }) {
    let modal = document.getElementById("sahaayaSharedModal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "sahaayaSharedModal";
      modal.className = "sahaaya-modal";
      modal.innerHTML = `
        <div class="sahaaya-modal-backdrop"></div>
        <div class="sahaaya-modal-dialog">
          <button class="sahaaya-modal-close" id="sharedModalClose" aria-label="Close modal">×</button>
          <div class="sahaaya-modal-header">
            <h3 id="sharedModalTitle"></h3>
            <p id="sharedModalSubtitle"></p>
          </div>
          <div class="sahaaya-modal-body" id="sharedModalBody"></div>
          <div class="sahaaya-modal-footer" id="sharedModalFooter"></div>
        </div>
      `;
      document.body.appendChild(modal);

      modal.querySelector(".sahaaya-modal-backdrop").addEventListener("click", closeModal);
      modal.querySelector("#sharedModalClose").addEventListener("click", closeModal);
      document.addEventListener("keydown", e => {
        if (e.key === "Escape" && modal.classList.contains("open")) closeModal();
      });
    }

    modal.querySelector("#sharedModalTitle").textContent = title;
    modal.querySelector("#sharedModalSubtitle").textContent = subtitle;
    modal.querySelector("#sharedModalBody").innerHTML = bodyHtml;
    modal.querySelector("#sharedModalFooter").innerHTML = footerHtml;

    modal.classList.add("open");
    document.body.style.overflow = "hidden";
  }

  function closeModal() {
    const modal = document.getElementById("sahaayaSharedModal");
    if (modal) {
      modal.classList.remove("open");
      document.body.style.overflow = "";
    }
  }

  // -----------------------------------------------------------------------
  // BADGE & PILL FORMATTERS
  // -----------------------------------------------------------------------
  function getCategoryBadge(catId) {
    const cat = (SAHAAYA_CONFIG.CATEGORIES || []).find(c => c.id === catId);
    if (!cat) return `<span class="cat-pill">${catId}</span>`;
    return `<span class="cat-pill" style="background-color: rgba(139, 92, 246, 0.16); color: #dcd6ff; border: 1px solid rgba(139, 92, 246, 0.35);">
      <span style="color: #21c8ff;">${cat.icon}</span> ${cat.label}
    </span>`;
  }

  function getStatusBadge(status) {
    const map = {
      applied:   { label: "Under Review",        cls: "badge-warning" },
      approved:  { label: "Approved",             cls: "badge-success" },
      rejected:  { label: "Declined",             cls: "badge-danger"  },
      attended:  { label: "Attended & Verified",  cls: "badge-primary" },
      absent:    { label: "Absent",               cls: "badge-muted"   },
      open:      { label: "Open Spots",           cls: "badge-info"    },
      filled:    { label: "Filled",               cls: "badge-muted"   },
      verified:  { label: "Verified Partner",     cls: "badge-success" },
      pending:   { label: "Pending Verification", cls: "badge-warning" }
    };
    const s = map[status] || { label: status, cls: "badge-muted" };
    return `<span class="badge ${s.cls}">${s.label}</span>`;
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------
  return {
    initDemoBar,
    showToast,
    openModal,
    closeModal,
    getCategoryBadge,
    getStatusBadge
  };
})();

// Auto-initialize demo bar on every page
if (typeof document !== "undefined") {
  document.addEventListener("DOMContentLoaded", () => {
    SahaayaUI.initDemoBar();
  });
}
