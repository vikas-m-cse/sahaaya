/* Sahaaya haptics for supported Android browsers.
   Requires HTTPS, a device/browser exposing Vibration API, and enabled system touch feedback. */
(function () {
  "use strict";

  const patterns = {
    tap: 28,
    selection: 18,
    success: [28, 45, 42],
    confirmation: [35, 55, 55, 55, 38],
    warning: [55, 45, 55],
    error: [75, 55, 75]
  };

  const isAndroid = /Android/i.test(navigator.userAgent || "") ||
    (navigator.userAgentData && /Android/i.test(navigator.userAgentData.platform || ""));
  const supported = isAndroid && typeof navigator.vibrate === "function";
  let lastTap = 0;

  function play(type) {
    if (!supported) return false;
    try {
      // A non-zero return means the browser accepted the vibration request.
      return navigator.vibrate(patterns[type] || patterns.tap);
    } catch (_) {
      return false;
    }
  }

  const api = {
    supported,
    tap: () => play("tap"),
    selection: () => play("selection"),
    success: () => play("success"),
    confirmation: () => play("confirmation"),
    warning: () => play("warning"),
    error: () => play("error"),
    test: () => play("confirmation"),
    stop: () => { if (supported) navigator.vibrate(0); }
  };

  window.SahaayaHaptics = Object.freeze(api);
  document.documentElement.dataset.sahaayaHaptics = supported ? "supported" : "unavailable";

  if (!supported) return;

  function handleTouch(event) {
    if (event.pointerType && event.pointerType !== "touch") return;
    const target = event.target && event.target.closest
      ? event.target.closest("button,a,[role='button'],select,input,summary,label[for],[data-haptic]")
      : null;
    if (!target || target.disabled || target.getAttribute("aria-disabled") === "true") return;

    const now = Date.now();
    if (now - lastTap < 90) return;
    lastTap = now;

    const isChoice = target.matches("select,input[type='checkbox'],input[type='radio']");
    play(isChoice ? "selection" : "tap");
  }

  // pointerdown is supported by current Android Chrome; touchstart is a fallback
  // for browsers with incomplete Pointer Events. Debounce prevents double pulses.
  if ("PointerEvent" in window) {
    document.addEventListener("pointerdown", handleTouch, { passive: true, capture: true });
  } else {
    document.addEventListener("touchstart", handleTouch, { passive: true, capture: true });
  }

  document.addEventListener("invalid", () => play("warning"), true);
})();
