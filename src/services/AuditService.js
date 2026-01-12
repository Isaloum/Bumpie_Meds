/**
 * AuditService - Logging and audit trail management
 */

const fs = require('fs').promises;
const path = require('path');
const { createError, sanitizePatientId } = require('../utils/validators');
const { ERROR_CODES } = require('../utils/constants');

class AuditService {
  constructor(config) {
    this.config = config;
    this.logs = [];
    this.logPath = path.join(__dirname, '../data/audit-logs.json');
  }

  /**
   * Log a safety check
   * @param {Object} checkData - Safety check data
   * @returns {Promise<string>} Log ID
   */
  async logCheck(checkData) {
    const logEntry = {
      id: this._generateId(),
      timestamp: new Date().toISOString(),
      action: 'SAFETY_CHECK',
      medication: {
        rxcui: checkData.medication?.rxcui || null,
        name: checkData.medication?.name || 'Unknown',
        dosage: checkData.dosage || null
      },
      patient: {
        id: sanitizePatientId(checkData.patientId),
        weekOfPregnancy: checkData.weekOfPregnancy,
        trimester: checkData.trimester
      },
      result: {
        safe: checkData.result?.safe || false,
        category: checkData.result?.category || 'N',
        riskLevel: checkData.result?.riskLevel || 'unknown',
        warnings: checkData.result?.warnings || [],
        recommendedAction: checkData.result?.safe ? 'Monitor' : 'Consult physician'
      },
      context: checkData.context || {},
      metadata: {
        processingTimeMs: Date.now() - (checkData.startTime || Date.now()),
        dataVersion: '2026.01',
        complianceLevel: 'FDA_APPROVED'
      }
    };

    this.logs.push(logEntry);

    // Persist to file if enabled
    if (this.config.enableAudit) {
      await this._persistLogs();
    }

    return logEntry.id;
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} Filtered logs
   */
  async query(filters = {}) {
    await this._loadLogs();

    let results = [...this.logs];

    // Filter by patient ID
    if (filters.patientId) {
      const sanitized = sanitizePatientId(filters.patientId);
      results = results.filter(log => log.patient?.id === sanitized);
    }

    // Filter by date range
    if (filters.startDate) {
      const start = new Date(filters.startDate);
      results = results.filter(log => new Date(log.timestamp) >= start);
    }

    if (filters.endDate) {
      const end = new Date(filters.endDate);
      results = results.filter(log => new Date(log.timestamp) <= end);
    }

    // Filter by medication
    if (filters.medicationName) {
      const searchTerm = filters.medicationName.toLowerCase();
      results = results.filter(log => 
        log.medication?.name?.toLowerCase().includes(searchTerm)
      );
    }

    // Filter by trimester
    if (filters.trimester) {
      results = results.filter(log => log.patient?.trimester === filters.trimester);
    }

    return results;
  }

  /**
   * Export audit trail
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} format - 'json' or 'csv'
   * @returns {Promise<Buffer|string>} Export data
   */
  async export(startDate, endDate, format = 'json') {
    const logs = await this.query({ startDate, endDate });

    if (format === 'csv') {
      return this._toCSV(logs);
    }

    return JSON.stringify(logs, null, 2);
  }

  /**
   * Load logs from file
   * @private
   */
  async _loadLogs() {
    if (this.logs.length > 0) return;

    try {
      const data = await fs.readFile(this.logPath, 'utf8');
      this.logs = JSON.parse(data);
    } catch (error) {
      // File doesn't exist yet or is empty
      this.logs = [];
    }
  }

  /**
   * Persist logs to file
   * @private
   */
  async _persistLogs() {
    try {
      await fs.writeFile(this.logPath, JSON.stringify(this.logs, null, 2), 'utf8');
    } catch (error) {
      throw createError(ERROR_CODES.AUDIT_ERROR, 'Failed to persist audit logs', { error: error.message });
    }
  }

  /**
   * Generate unique ID
   * @private
   */
  _generateId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `audit_${timestamp}_${random}`;
  }

  /**
   * Convert logs to CSV
   * @private
   */
  _toCSV(logs) {
    const headers = ['Timestamp', 'Patient ID', 'Week', 'Trimester', 'Medication', 'Safe', 'Category', 'Risk Level', 'Warnings'];
    const rows = logs.map(log => [
      log.timestamp,
      log.patient?.id || '',
      log.patient?.weekOfPregnancy || '',
      log.patient?.trimester || '',
      log.medication?.name || '',
      log.result?.safe ? 'Yes' : 'No',
      log.result?.category || '',
      log.result?.riskLevel || '',
      (log.result?.warnings || []).join('; ')
    ]);

    const csv = [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    return csv;
  }
}

module.exports = AuditService;
