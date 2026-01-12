/**
 * ReportGenerator - Generate reports for doctors
 */

class ReportGenerator {
  constructor(config) {
    this.config = config;
  }

  /**
   * Generate JSON summary report
   * @param {string} patientId - Patient ID (hashed)
   * @param {Array} logs - Audit logs
   * @returns {Object} JSON report
   */
  generateJSON(patientId, logs) {
    const summary = {
      reportId: this._generateReportId(),
      generatedAt: new Date().toISOString(),
      patientId,
      period: {
        start: logs[0]?.timestamp || null,
        end: logs[logs.length - 1]?.timestamp || null,
        totalChecks: logs.length
      },
      summary: {
        totalMedications: new Set(logs.map(l => l.medication?.name)).size,
        safeMedications: logs.filter(l => l.result?.safe).length,
        unsafeMedications: logs.filter(l => !l.result?.safe).length,
        categoriesUsed: this._getCategoryBreakdown(logs),
        trimesterBreakdown: this._getTrimesterBreakdown(logs)
      },
      medications: this._getMedicationSummary(logs),
      warnings: this._collectWarnings(logs),
      recommendations: this._generateRecommendations(logs),
      disclaimer: 'This report is for informational purposes only. Consult your healthcare provider for medical advice.'
    };

    return summary;
  }

  /**
   * Generate CSV export
   * @param {Array} logs - Audit logs
   * @returns {string} CSV content
   */
  generateCSV(logs) {
    const headers = [
      'Date/Time',
      'Medication Name',
      'Week of Pregnancy',
      'Trimester',
      'FDA Category',
      'Safe',
      'Risk Level',
      'Warnings',
      'Alternatives'
    ];

    const rows = logs.map(log => [
      log.timestamp,
      log.medication?.name || '',
      log.patient?.weekOfPregnancy || '',
      log.patient?.trimester || '',
      log.result?.category || '',
      log.result?.safe ? 'Yes' : 'No',
      log.result?.riskLevel || '',
      (log.result?.warnings || []).join('; '),
      log.result?.alternatives?.join(', ') || ''
    ]);

    return [headers, ...rows]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
  }

  /**
   * Generate PDF report (placeholder)
   * @param {string} patientId - Patient ID
   * @param {Array} logs - Audit logs
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(patientId, logs) {
    // TODO: Implement PDF generation with pdfkit
    // For now, return JSON as placeholder
    const json = this.generateJSON(patientId, logs);
    return Buffer.from(JSON.stringify(json, null, 2));
  }

  /**
   * Get category breakdown
   * @private
   */
  _getCategoryBreakdown(logs) {
    const breakdown = {};
    logs.forEach(log => {
      const cat = log.result?.category || 'N';
      breakdown[cat] = (breakdown[cat] || 0) + 1;
    });
    return breakdown;
  }

  /**
   * Get trimester breakdown
   * @private
   */
  _getTrimesterBreakdown(logs) {
    const breakdown = { 1: 0, 2: 0, 3: 0 };
    logs.forEach(log => {
      const tri = log.patient?.trimester;
      if (tri) breakdown[tri]++;
    });
    return breakdown;
  }

  /**
   * Get medication summary
   * @private
   */
  _getMedicationSummary(logs) {
    const meds = {};
    logs.forEach(log => {
      const name = log.medication?.name;
      if (!name) return;

      if (!meds[name]) {
        meds[name] = {
          name,
          timesChecked: 0,
          categories: new Set(),
          safe: null,
          warnings: new Set()
        };
      }

      meds[name].timesChecked++;
      meds[name].categories.add(log.result?.category);
      meds[name].safe = log.result?.safe;
      (log.result?.warnings || []).forEach(w => meds[name].warnings.add(w));
    });

    // Convert sets to arrays
    return Object.values(meds).map(m => ({
      ...m,
      categories: Array.from(m.categories),
      warnings: Array.from(m.warnings)
    }));
  }

  /**
   * Collect all warnings
   * @private
   */
  _collectWarnings(logs) {
    const warnings = new Set();
    logs.forEach(log => {
      (log.result?.warnings || []).forEach(w => warnings.add(w));
    });
    return Array.from(warnings);
  }

  /**
   * Generate recommendations
   * @private
   */
  _generateRecommendations(logs) {
    const recs = [];

    const unsafeLogs = logs.filter(l => !l.result?.safe);
    if (unsafeLogs.length > 0) {
      recs.push({
        priority: 'high',
        recommendation: 'Consult physician about unsafe medications',
        medications: unsafeLogs.map(l => l.medication?.name).filter(Boolean)
      });
    }

    const categoryX = logs.filter(l => l.result?.category === 'X');
    if (categoryX.length > 0) {
      recs.push({
        priority: 'critical',
        recommendation: 'STOP IMMEDIATELY - Category X medications contraindicated',
        medications: categoryX.map(l => l.medication?.name).filter(Boolean)
      });
    }

    return recs;
  }

  /**
   * Generate report ID
   * @private
   */
  _generateReportId() {
    return `report_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}

module.exports = ReportGenerator;
