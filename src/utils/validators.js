/**
 * Input validation utilities
 */

const { ERROR_CODES, DEFAULT_CONFIG } = require('./constants');

/**
 * Validate configuration object
 * @param {Object} config - User configuration
 * @returns {Object} Validated config
 */
function validateConfig(config = {}) {
  const validated = { ...DEFAULT_CONFIG, ...config };

  if (validated.auditRetentionYears < 1) {
    throw createError(ERROR_CODES.INVALID_CONFIG, 'Audit retention must be at least 1 year');
  }

  if (validated.cacheTTL < 0) {
    throw createError(ERROR_CODES.INVALID_CONFIG, 'Cache TTL cannot be negative');
  }

  return validated;
}

/**
 * Validate week of pregnancy
 * @param {number} week - Week number
 * @returns {boolean}
 */
function validateWeek(week) {
  if (typeof week !== 'number' || week < 1 || week > 45) {
    throw createError(ERROR_CODES.INVALID_WEEK, `Week must be between 1 and 45, got ${week}`);
  }
  return true;
}

/**
 * Validate trimester number
 * @param {number} trimester - Trimester (1, 2, or 3)
 * @returns {boolean}
 */
function validateTrimester(trimester) {
  if (![1, 2, 3].includes(trimester)) {
    throw createError(ERROR_CODES.INVALID_TRIMESTER, `Trimester must be 1, 2, or 3, got ${trimester}`);
  }
  return true;
}

/**
 * Validate medication object
 * @param {Object} medication - Medication data
 * @returns {boolean}
 */
function validateMedication(medication) {
  if (!medication) {
    throw createError(ERROR_CODES.MEDICATION_NOT_FOUND, 'Medication data is required');
  }

  const required = ['name', 'pregnancyCategory'];
  for (const field of required) {
    if (!medication[field]) {
      throw createError(ERROR_CODES.MEDICATION_NOT_FOUND, `Medication missing required field: ${field}`);
    }
  }

  return true;
}

/**
 * Create standardized error
 * @param {string} code - Error code
 * @param {string} message - Error message
 * @param {Object} details - Additional details
 * @returns {Error}
 */
function createError(code, message, details = {}) {
  const error = new Error(message);
  error.code = code;
  error.details = details;
  return error;
}

/**
 * Sanitize patient ID for hashing
 * @param {string} patientId - Raw patient ID
 * @returns {string} Sanitized ID
 */
function sanitizePatientId(patientId) {
  if (!patientId) return null;
  return String(patientId).trim().toLowerCase();
}

module.exports = {
  validateConfig,
  validateWeek,
  validateTrimester,
  validateMedication,
  createError,
  sanitizePatientId
};
