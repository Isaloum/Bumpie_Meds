/**
 * Bumpie_Meds - Pregnancy Medication Safety Module
 * Main entry point
 */

const SafetyChecker = require('./services/SafetyChecker');
const TrimesterAnalyzer = require('./services/TrimesterAnalyzer');
const AuditService = require('./services/AuditService');
const ReportGenerator = require('./services/ReportGenerator');
const PregnancySafetyEngine = require('./services/pregnancy-safety-engine');
const PregnancyInteractionChecker = require('./services/pregnancy-interaction-checker');
const PregnancyRiskCalculator = require('./services/pregnancy-risk-calculator');
const PregnancyAuditLogger = require('./services/pregnancy-audit-logger');
const { validateConfig } = require('./utils/validators');
const CONSTANTS = require('./utils/constants');

class BumpieMeds {
  constructor(config = {}) {
    this.config = validateConfig(config);
    this.safetyChecker = new SafetyChecker(this.config);
    this.trimesterAnalyzer = new TrimesterAnalyzer();
    this.auditService = new AuditService(this.config);
    this.reportGenerator = new ReportGenerator(this.config);
  }

  /**
   * Check medication safety during pregnancy
   * @param {string} medicationId - RxCUI or medication name
   * @param {number} weekOfPregnancy - Current week (1-40+)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Safety result
   */
  async checkSafety(medicationId, weekOfPregnancy, options = {}) {
    try {
      const result = await this.safetyChecker.check(medicationId, weekOfPregnancy);
      
      // Log to audit trail if enabled
      if (this.config.enableAudit) {
        await this.auditService.logCheck({
          medication: result.medication,
          weekOfPregnancy,
          trimester: result.trimester,
          result,
          context: options.context || {},
          patientId: options.patientId || null
        });
      }

      return result;
    } catch (error) {
      throw this._handleError(error);
    }
  }

  /**
   * Get trimester-specific information
   * @param {string} medicationId - RxCUI or medication name
   * @param {number} trimester - Trimester number (1, 2, or 3)
   * @returns {Promise<Object>} Trimester info
   */
  async getTrimesterInfo(medicationId, trimester) {
    return this.safetyChecker.getTrimesterInfo(medicationId, trimester);
  }

  /**
   * Find safe alternatives for a medication
   * @param {string} medicationId - Unsafe medication
   * @param {number} weekOfPregnancy - Current week
   * @returns {Promise<Array>} Safe alternatives
   */
  async findAlternatives(medicationId, weekOfPregnancy) {
    return this.safetyChecker.findAlternatives(medicationId, weekOfPregnancy);
  }

  /**
   * Generate doctor report
   * @param {string} patientId - Patient identifier (hashed)
   * @param {Date} startDate - Report start date
   * @param {Date} endDate - Report end date
   * @param {string} format - 'pdf' | 'json' | 'csv'
   * @returns {Promise<Buffer|Object|string>} Report
   */
  async generateReport(patientId, startDate, endDate, format = 'json') {
    const logs = await this.auditService.query({
      patientId,
      startDate,
      endDate
    });

    switch (format) {
      case 'pdf':
        return this.reportGenerator.generatePDF(patientId, logs);
      case 'csv':
        return this.reportGenerator.generateCSV(logs);
      case 'json':
      default:
        return this.reportGenerator.generateJSON(patientId, logs);
    }
  }

  /**
   * Get audit logs
   * @param {Object} filters - Filter criteria
   * @returns {Promise<Array>} Audit logs
   */
  async getAuditLogs(filters = {}) {
    return this.auditService.query(filters);
  }

  /**
   * Get FDA disclaimer text
   * @returns {string} Disclaimer
   */
  getDisclaimer() {
    return CONSTANTS.FDA_DISCLAIMER;
  }

  /**
   * Handle errors consistently
   * @private
   */
  _handleError(error) {
    const err = new Error(error.message);
    err.code = error.code || 'UNKNOWN_ERROR';
    err.details = error.details || {};
    return err;
  }
}

/**
 * Initialize Bumpie_Meds module
 * @param {Object} config - Configuration options
 * @returns {BumpieMeds} Configured instance
 */
function initialize(config = {}) {
  return new BumpieMeds(config);
}

module.exports = {
  initialize,
  BumpieMeds,
  CONSTANTS,
  // Export pregnancy safety modules directly
  PregnancySafetyEngine,
  PregnancyInteractionChecker,
  PregnancyRiskCalculator,
  PregnancyAuditLogger
};
