/**
 * SafetyChecker - Core medication safety checking logic
 */

const TrimesterAnalyzer = require('./TrimesterAnalyzer');
const { FDA_CATEGORIES } = require('../utils/constants');
const { validateMedication, validateWeek, createError } = require('../utils/validators');
const { ERROR_CODES } = require('../utils/constants');
const fs = require('fs').promises;
const path = require('path');

class SafetyChecker {
  constructor(config) {
    this.config = config;
    this.trimesterAnalyzer = new TrimesterAnalyzer();
    this.medications = null;
    this.cache = new Map();
  }

  /**
   * Load medication database
   * @private
   */
  async _loadMedications() {
    if (this.medications) return this.medications;

    try {
      const dataPath = path.join(__dirname, '../data/medications.json');
      const data = await fs.readFile(dataPath, 'utf8');
      this.medications = JSON.parse(data);
      return this.medications;
    } catch (error) {
      throw createError(ERROR_CODES.DATA_LOAD_ERROR, 'Failed to load medication database', { error: error.message });
    }
  }

  /**
   * Find medication by name or RxCUI
   * @param {string} medicationId - Name or RxCUI
   * @returns {Promise<Object>} Medication data
   */
  async findMedication(medicationId) {
    await this._loadMedications();

    const searchTerm = medicationId.toLowerCase().trim();
    
    // Search by RxCUI
    let med = this.medications.find(m => m.rxcui === searchTerm);
    
    // Search by name
    if (!med) {
      med = this.medications.find(m => 
        m.name.toLowerCase() === searchTerm ||
        m.genericName?.toLowerCase() === searchTerm ||
        m.brandNames?.some(b => b.toLowerCase() === searchTerm)
      );
    }

    if (!med) {
      throw createError(ERROR_CODES.MEDICATION_NOT_FOUND, `Medication not found: ${medicationId}`);
    }

    return med;
  }

  /**
   * Check medication safety
   * @param {string} medicationId - Name or RxCUI
   * @param {number} weekOfPregnancy - Week (1-40+)
   * @returns {Promise<Object>} Safety result
   */
  async check(medicationId, weekOfPregnancy) {
    validateWeek(weekOfPregnancy);

    // Check cache
    const cacheKey = `${medicationId}_${weekOfPregnancy}`;
    if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const medication = await this.findMedication(medicationId);
    validateMedication(medication);

    const trimester = this.trimesterAnalyzer.getTrimester(weekOfPregnancy);
    const trimesterKey = `trimester${trimester}`;
    const trimesterData = medication.pregnancyCategory[trimesterKey];

    const result = {
      medication: {
        name: medication.name,
        genericName: medication.genericName,
        rxcui: medication.rxcui
      },
      safe: trimesterData?.safe || false,
      category: medication.pregnancyCategory.fda,
      categoryInfo: FDA_CATEGORIES[medication.pregnancyCategory.fda],
      riskLevel: trimesterData?.risk || 'unknown',
      trimester,
      trimesterInfo: this.trimesterAnalyzer.getTrimesterInfo(trimester),
      weekOfPregnancy,
      warnings: trimesterData?.warnings || [],
      alternatives: trimesterData?.alternatives || [],
      maxDosage: trimesterData?.maxDosage || null,
      contraindications: medication.contraindications || [],
      sources: medication.sources || [],
      lastUpdated: medication.lastUpdated
    };

    // Cache result
    if (this.config.cacheEnabled) {
      this.cache.set(cacheKey, result);
      setTimeout(() => this.cache.delete(cacheKey), this.config.cacheTTL * 1000);
    }

    return result;
  }

  /**
   * Get trimester-specific information
   * @param {string} medicationId - Name or RxCUI
   * @param {number} trimester - Trimester (1, 2, or 3)
   * @returns {Promise<Object>} Trimester info
   */
  async getTrimesterInfo(medicationId, trimester) {
    const medication = await this.findMedication(medicationId);
    const key = `trimester${trimester}`;
    return medication.pregnancyCategory[key] || null;
  }

  /**
   * Find safe alternatives
   * @param {string} medicationId - Unsafe medication
   * @param {number} weekOfPregnancy - Current week
   * @returns {Promise<Array>} Safe alternatives
   */
  async findAlternatives(medicationId, weekOfPregnancy) {
    const result = await this.check(medicationId, weekOfPregnancy);
    
    if (result.safe) {
      return []; // Already safe
    }

    // Get alternatives from medication data
    const alternatives = result.alternatives;
    
    // Check if alternatives are actually safe
    const safeAlternatives = [];
    for (const altName of alternatives) {
      try {
        const altResult = await this.check(altName, weekOfPregnancy);
        if (altResult.safe) {
          safeAlternatives.push({
            name: altResult.medication.name,
            category: altResult.category,
            riskLevel: altResult.riskLevel
          });
        }
      } catch (error) {
        // Skip if alternative not found
        continue;
      }
    }

    return safeAlternatives;
  }

  /**
   * Calculate risk score (0-100)
   * @param {Object} medication - Medication data
   * @param {number} trimester - Trimester number
   * @returns {number} Risk score
   */
  calculateRiskScore(medication, trimester) {
    const categoryScores = { A: 10, B: 30, C: 60, D: 85, X: 100, N: 50 };
    const baseScore = categoryScores[medication.pregnancyCategory.fda] || 50;

    // Increase score in first trimester (critical period)
    const trimesterMultiplier = trimester === 1 ? 1.2 : 1.0;

    return Math.min(100, Math.round(baseScore * trimesterMultiplier));
  }
}

module.exports = SafetyChecker;
