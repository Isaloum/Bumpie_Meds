/**
 * TrimesterAnalyzer - Analyzes trimester-specific medication risks
 */

const { TRIMESTERS } = require('../utils/constants');
const { validateWeek, validateTrimester } = require('../utils/validators');

class TrimesterAnalyzer {
  /**
   * Get trimester from week of pregnancy
   * @param {number} weekOfPregnancy - Week (1-40+)
   * @returns {number} Trimester number (1, 2, or 3)
   */
  getTrimester(weekOfPregnancy) {
    validateWeek(weekOfPregnancy);

    if (weekOfPregnancy >= 1 && weekOfPregnancy <= 13) return 1;
    if (weekOfPregnancy >= 14 && weekOfPregnancy <= 27) return 2;
    return 3;
  }

  /**
   * Get trimester information
   * @param {number} trimester - Trimester number
   * @returns {Object} Trimester details
   */
  getTrimesterInfo(trimester) {
    validateTrimester(trimester);
    return TRIMESTERS[trimester];
  }

  /**
   * Check if in critical period (first trimester)
   * @param {number} weekOfPregnancy - Week number
   * @returns {boolean}
   */
  isCriticalPeriod(weekOfPregnancy) {
    return this.getTrimester(weekOfPregnancy) === 1;
  }

  /**
   * Check if in organogenesis period
   * @param {number} weekOfPregnancy - Week number
   * @returns {boolean}
   */
  isOrganogenesisPeriod(weekOfPregnancy) {
    const trimester = this.getTrimester(weekOfPregnancy);
    return TRIMESTERS[trimester].organogenesis;
  }

  /**
   * Get trimester-specific warnings for a medication
   * @param {Object} medication - Medication data
   * @param {number} trimester - Trimester number
   * @returns {Array<string>} Warnings
   */
  getWarnings(medication, trimester) {
    validateTrimester(trimester);
    
    const key = `trimester${trimester}`;
    const trimesterData = medication.pregnancyCategory?.[key];

    if (!trimesterData) {
      return ['No trimester-specific data available. Consult your healthcare provider.'];
    }

    return trimesterData.warnings || [];
  }

  /**
   * Get all trimester data for a medication
   * @param {Object} medication - Medication data
   * @returns {Object} All trimester information
   */
  getAllTrimesterData(medication) {
    return {
      trimester1: medication.pregnancyCategory?.trimester1 || null,
      trimester2: medication.pregnancyCategory?.trimester2 || null,
      trimester3: medication.pregnancyCategory?.trimester3 || null
    };
  }
}

module.exports = TrimesterAnalyzer;
