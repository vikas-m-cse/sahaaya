/**
 * SAHAAYA — Explainable compatibility engine v2
 * A recommendation aid, never a substitute for human safeguarding decisions.
 */
const SahaayaMatching = (() => {
  const WEIGHTS = {
    interest: 20, schedule: 20, skills: 15, language: 10,
    location: 10, taskFit: 10, environment: 10, reliability: 5
  };
  const list = value => Array.isArray(value) ? value.map(v => String(v).toLowerCase()) : [];
  const overlap = (a,b) => {
    const right = new Set(list(b));
    return list(a).some(x => right.has(x));
  };
  const scoreDimension = (matched, weight, reason, reasons, gaps) => {
    if (matched) { reasons.push(reason); return weight; }
    gaps.push(reason); return 0;
  };
  function calculateMatch(profile = {}, opportunity = {}) {
    const reasons = [], gaps = [], hardStops = [];
    const availability = list(profile.availability);
    const requiredSlot = opportunity.slot_id || opportunity.availability_slot;
    const slotMatch = !!requiredSlot && availability.includes(String(requiredSlot).toLowerCase());
    const interests = list(profile.interests);
    const category = String(opportunity.category || opportunity.activity_type || "").toLowerCase();
    const interestMatch = !!category && interests.includes(category);
    const requiredSkills = opportunity.required_skills || [];
    const skillMatch = !requiredSkills.length || overlap(profile.skills, requiredSkills) || overlap(profile.experience, requiredSkills);
    const requiredLanguages = opportunity.required_languages || [];
    const languageMatch = !requiredLanguages.length || overlap(profile.languages, requiredLanguages);
    const areaMatch = !opportunity.area || !profile.preferred_area ||
      String(profile.preferred_area).toLowerCase().includes(String(opportunity.area).toLowerCase()) ||
      String(opportunity.area).toLowerCase().includes(String(profile.preferred_area).toLowerCase());
    const taskNeeds = list(opportunity.physical_requirements);
    const volunteerLimits = list(profile.task_preferences);
    const taskFit = !taskNeeds.length || taskNeeds.every(x => volunteerLimits.includes(x) || volunteerLimits.includes("can-" + x));
    const environmentMatch = !opportunity.environment || !profile.environment_preferences?.length ||
      overlap(profile.environment_preferences, [opportunity.environment]);
    if (requiredSlot && !slotMatch) hardStops.push("Schedule conflict: the volunteer has not marked this time as available.");
    if (opportunity.minimum_age && Number(profile.age) < Number(opportunity.minimum_age)) hardStops.push("Does not meet the activity's minimum age requirement.");
    if (opportunity.required_training && !overlap(profile.completed_training, [opportunity.required_training])) hardStops.push("Required training has not been completed.");
    if (opportunity.consent_required && profile.consent_to_safeguarding !== true) hardStops.push("Required safeguarding agreement is not confirmed.");

    let score = 0;
    score += scoreDimension(interestMatch, WEIGHTS.interest, "Activity interest aligns", reasons, gaps);
    score += scoreDimension(slotMatch || !requiredSlot, WEIGHTS.schedule, slotMatch ? "Available for the scheduled time" : "No fixed time slot was specified", reasons, gaps);
    score += scoreDimension(skillMatch, WEIGHTS.skills, skillMatch ? "Required skills or experience align" : "Required skills are not demonstrated", reasons, gaps);
    score += scoreDimension(languageMatch, WEIGHTS.language, languageMatch ? "Language requirements align" : "Language requirement not confirmed", reasons, gaps);
    score += scoreDimension(areaMatch, WEIGHTS.location, areaMatch ? "Location appears feasible based on stated areas" : "Location may be difficult; confirm travel feasibility", reasons, gaps);
    score += scoreDimension(taskFit, WEIGHTS.taskFit, taskFit ? "Task preferences are compatible" : "Task requirements conflict with stated preferences", reasons, gaps);
    score += scoreDimension(environmentMatch, WEIGHTS.environment, environmentMatch ? "Activity environment aligns with preferences" : "Environment preference needs review", reasons, gaps);
    const hours = Number(profile.total_hours || 0), sessions = Number(profile.completed_count || 0);
    const reliability = hours >= 10 ? 5 : sessions >= 1 ? 3 : 0;
    score += reliability;
    reasons.push(reliability ? "Has verified participation history" : "New volunteer; no reliability penalty applied");
    const matchLevel = hardStops.length || score < 55 ? "low" : score >= 85 ? "high" : score >= 70 ? "good" : "conditional";
    return {
      score: Math.round(score), reasons, gaps, hardStops, weights: WEIGHTS,
      matchLevel, eligible: hardStops.length === 0 && score >= 55,
      recommendation: hardStops.length ? "not_eligible" : score >= 70 ? "recommend" : score >= 55 ? "human_review" : "do_not_recommend"
    };
  }
  return { calculateMatch, WEIGHTS };
})();
if (typeof module !== "undefined" && module.exports) module.exports = SahaayaMatching;
