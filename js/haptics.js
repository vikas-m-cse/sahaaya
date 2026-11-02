/* Sahaaya Android haptics — graceful no-op on unsupported devices. */
(function () {
  "use strict";
  const ua = navigator.userAgent || "";
  const isAndroid = /Android/i.test(ua) ||
    (navigator.userAgentData && /Android/i.test(navigator.userAgentData.platform || ""));
  const supported = isAndroid && typeof navigator.vibrate === "function";
  const patterns = {
    tap: 12,
    selection: 8,
    success: [18, 35, 28],
    confirmation: [24, 45, 42, 45, 28],
    warning: [45, 55, 45],
    error: [55, 45, 55]
  };
  function play(type) {
    if (!supported) return false;
    try { return navigator.vibrate(patterns[type] || patterns.tap); }
    catch (_) { return false; }
  }
  window.SahaayaHaptics = Object.freeze({
    supported,
    tap: () => play("tap"),
    selection: () => play("selection"),
    success: () => play("success"),
    confirmation: () => play("confirmation"),
    warning: () => play("warning"),
    error: () => play("error"),
    stop: () => { if (supported) navigator.vibrate(0); }
  });
  if (!supported) return;
  let lastTap = 0;
  document.addEventListener("pointerdown", function (event) {
    if (event.pointerType !== "touch") return;
    const target = event.target.closest("button,a,[role='button'],select,input[type='checkbox'],input[type='radio'],label[for],[data-haptic]");
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;
    const now = Date.now();
    if (now - lastTap < 65) return;
    lastTap = now;
    play(target.matches("select,input[type='checkbox'],input[type='radio']") ? "selection" : "tap");
  }, { passive: true });
  document.addEventListener("invalid", () => play("warning"), true);
})();