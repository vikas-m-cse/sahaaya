/**
 * SAHAAYA — Explainable compatibility engine v2.1
 * A recommendation aid, never a substitute for human safeguarding decisions.
 *
 * Changes in v2.1:
 * - Schedule mismatch is now a soft warning (volunteers can still apply).
 * - Low score (< 55) is also soft — button remains available with a clear warning.
 * - Only true hard stops (age, required training, missing safeguarding consent)
 *   completely block the "I can show up" action.
 */
const SahaayaMatching = (() => {
  const WEIGHTS = {
    interest: 20, schedule: 20, skills: 15, language: 10,
    location: 10, taskFit: 10, environment: 10, reliability: 5
  };
  const list = value => Array.isArray(value)
    ? value.map(v => String(v).toLowerCase())
    : [];
  const overlap = (a, b) => {
    const right = new Set(list(b));
    return list(a).some(x => right.has(x));
  };
  const scoreDimension = (matched, weight, reason, reasons, gaps) => {
    if (matched) { reasons.push(reason); return weight; }
    gaps.push(reason); return 0;
  };

  function calculateMatch(profile = {}, opportunity = {}) {
    const reasons = [], gaps = [], hardStops = [], softWarnings = [];
    const availability = list(profile.availability);
    const requiredSlot = opportunity.slot_id || opportunity.availability_slot;
    const slotMatch = !!requiredSlot && availability.includes(String(requiredSlot).toLowerCase());

    const interests = list(profile.interests);
    const category = String(opportunity.category || opportunity.activity_type || "").toLowerCase();
    const interestMatch = !!category && interests.includes(category);

    const requiredSkills = opportunity.required_skills || [];
    const skillMatch = !requiredSkills.length ||
      overlap(profile.skills, requiredSkills) || overlap(profile.experience, requiredSkills);
    const requiredLanguages = opportunity.required_languages || [];
    const languageMatch = !requiredLanguages.length || overlap(profile.languages, requiredLanguages);

    const areaMatch = !opportunity.area || !profile.preferred_area ||
      String(profile.preferred_area).toLowerCase().includes(String(opportunity.area).toLowerCase()) ||
      String(opportunity.area).toLowerCase().includes(String(profile.preferred_area).toLowerCase());

    const taskNeeds = list(opportunity.physical_requirements);
    const volunteerLimits = list(profile.task_preferences);
    const taskFit = !taskNeeds.length ||
      taskNeeds.every(x => volunteerLimits.includes(x) || volunteerLimits.includes("can-" + x));
    const environmentMatch = !opportunity.environment || !profile.environment_preferences?.length ||
      overlap(profile.environment_preferences, [opportunity.environment]);

    // Soft warnings do not block applying.
    if (requiredSlot && !slotMatch) {
      softWarnings.push("Schedule conflict: this time is not in your stated availability.");
    }

    // True hard stops: unknown age is treated as unconfirmed when an age limit exists.
    if (opportunity.minimum_age) {
      const volunteerAge = Number(profile.age);
      const minimumAge = Number(opportunity.minimum_age);
      if (!Number.isFinite(volunteerAge) || volunteerAge < minimumAge) {
        hardStops.push("Does not meet or has not confirmed the activity's minimum age requirement.");
      }
    }
    if (opportunity.required_training &&
        !overlap(profile.completed_training, [opportunity.required_training])) {
      hardStops.push("Required training has not been completed.");
    }
    if (opportunity.consent_required && profile.consent_to_safeguarding !== true) {
      hardStops.push("Required safeguarding agreement is not confirmed.");
    }

    let points = 0, applicableWeight = 0;
    const add = (applicable, matched, weight, yes, no) => {
      if (!applicable) return;
      applicableWeight += weight;
      points += scoreDimension(matched, weight, matched ? yes : no, reasons, gaps);
    };

    add(true, interestMatch, WEIGHTS.interest,
      "Activity interest aligns", "Activity is outside your stated interests");
    add(!!requiredSlot, slotMatch, WEIGHTS.schedule,
      "Available for the scheduled time",
      "Schedule conflict: this time is not in your stated availability");
    add(requiredSkills.length > 0, skillMatch, WEIGHTS.skills,
      "Required skills or experience align", "Required skills are not demonstrated");
    add(requiredLanguages.length > 0, languageMatch, WEIGHTS.language,
      "Language requirements align", "Required language is not confirmed");
    add(!!(opportunity.area && profile.preferred_area), areaMatch, WEIGHTS.location,
      "Location appears feasible based on stated areas",
      "Location may be difficult; confirm travel feasibility");
    add(taskNeeds.length > 0, taskFit, WEIGHTS.taskFit,
      "Task requirements align with stated preferences",
      "Task requirements conflict with stated preferences");
    add(!!opportunity.environment, environmentMatch, WEIGHTS.environment,
      "Activity environment aligns with preferences",
      "Environment preference needs review");

    const hours = Number(profile.total_hours || 0);
    const sessions = Number(profile.completed_count || 0);
    const reliability = hours >= 10 ? 5 : sessions >= 1 ? 3 : 2.5;
    applicableWeight += WEIGHTS.reliability;
    points += reliability;
    reasons.push(hours >= 10 || sessions >= 1
      ? "Has verified participation history"
      : "New volunteer; reliability remains neutral until history exists");

    const score = applicableWeight ? Math.round(points / applicableWeight * 100) : 0;
    if (score < 55 && hardStops.length === 0) {
      softWarnings.push("Compatibility score is lower than usual — the home coordinator may review this application more carefully.");
    }

    const matchLevel = hardStops.length || score < 55 ? "low"
      : score >= 85 ? "high"
      : score >= 70 ? "medium"
      : "general";

    return {
      score: Math.round(score), reasons, gaps, hardStops, softWarnings,
      weights: WEIGHTS, matchLevel,
      eligible: hardStops.length === 0,
      needsHumanReview: hardStops.length === 0 && softWarnings.length > 0,
      recommendation: hardStops.length ? "not_eligible"
        : score >= 70 ? "recommend"
        : score >= 55 ? "human_review"
        : "do_not_recommend"
    };
  }
  return { calculateMatch, WEIGHTS };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SahaayaMatching;
