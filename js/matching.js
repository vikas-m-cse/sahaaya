/**
 * SAHAAYA — Transparent Matching Engine
 * 
 * Computes an explainable compatibility score between a volunteer's profile
 * and a requirement posted by an Old Age Home.
 * 
 * Core Principle: Explainable matching. The volunteer and home can see
 * EXACTLY WHY an activity was recommended.
 */

const SahaayaMatching = (() => {
  /**
   * Evaluates match between a volunteer profile and an opportunity
   * @param {Object} profile - Volunteer profile { interests, availability, total_hours }
   * @param {Object} opportunity - Opportunity { category, slot_id, required_skills, date }
   * @returns {Object} { score: number, reasons: Array<string>, matchLevel: string }
   */
  function calculateMatch(profile, opportunity) {
    if (!profile || !opportunity) {
      return {
        score: 60,
        reasons: ["Open community requirement welcoming all volunteers"],
        matchLevel: "general"
      };
    }

    let score = 30; // Base score for any registered willing volunteer
    const reasons = [];

    // 1. Interest Alignment (Up to 35 points)
    const interests = profile.interests || [];
    if (interests.includes(opportunity.category)) {
      score += 35;
      const catConfig = SAHAAYA_CONFIG.CATEGORIES.find(c => c.id === opportunity.category);
      const catLabel = catConfig ? catConfig.label : opportunity.category;
      reasons.push(`Direct interest match: You enjoy "${catLabel}" activities`);
    } else {
      reasons.push(`New activity type to explore beyond your usual preferences`);
    }

    // 2. Schedule & Slot Fit (Up to 25 points)
    const availability = profile.availability || [];
    if (opportunity.slot_id && availability.includes(opportunity.slot_id)) {
      score += 25;
      const slotConfig = SAHAAYA_CONFIG.WEEKDAY_SLOTS.find(s => s.id === opportunity.slot_id);
      const slotLabel = slotConfig ? slotConfig.label : opportunity.slot_id;
      reasons.push(`Schedule fit: Matches your stated availability (${slotLabel.split("(")[0].trim()})`);
    } else {
      reasons.push(`Check your calendar: Scheduled on ${opportunity.date || "weekend"}`);
    }

    // 3. Past Experience & Reliability (Up to 10 points)
    if ((profile.total_hours || 0) >= 10) {
      score += 10;
      reasons.push(`Strong reliability record (${profile.total_hours} verified volunteer hours)`);
    } else if ((profile.completed_count || 0) >= 1) {
      score += 5;
      reasons.push(`Prior verified volunteer participation on Sahaaya`);
    }

    // Cap at 98% (humility in matching)
    score = Math.min(score, 98);

    let matchLevel = "general";
    if (score >= 85) matchLevel = "high";
    else if (score >= 65) matchLevel = "medium";

    return {
      score,
      reasons,
      matchLevel
    };
  }

  return {
    calculateMatch
  };
})();

if (typeof module !== "undefined" && module.exports) {
  module.exports = SahaayaMatching;
}
