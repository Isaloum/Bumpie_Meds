/**
 * Pregnancy Audit Logger
 * 
 * FDA-compliant audit logging for pregnancy medication decisions
 * Maintains detailed records for legal compliance and patient safety
 * 
 * @module pregnancy-audit-logger
 */

const fs = require('fs').promises;
const path = require('path');

const AUDIT_LOG_PATH = path.join(__dirname, '../data/pregnancy-audit-logs.json');
const RETENTION_YEARS = 7; // FDA requirement: 7-year retention

/**
 * Audit log entry types
 */
const AUDIT_TYPES = {
  SAFETY_CHECK: 'safety_check',
  INTERACTION_CHECK: 'interaction_check',
  RISK_CALCULATION: 'risk_calculation',
  PROVIDER_DECISION: 'provider_decision',
  PATIENT_DECISION: 'patient_decision',
  MEDICATION_STARTED: 'medication_started',
  MEDICATION_STOPPED: 'medication_stopped',
  MEDICATION_CHANGED: 'medication_changed',
  ADVERSE_EVENT: 'adverse_event',
  PROVIDER_CONSULTATION: 'provider_consultation'
};

/**
 * Decision types
 */
const DECISION_TYPES = {
  CONTINUE: 'continue',
  DISCONTINUE: 'discontinue',
  SWITCH: 'switch',
  DEFER: 'defer_to_provider',
  EMERGENCY: 'emergency_referral'
};

/**
 * Initialize audit log file if it doesn't exist
 */
async function initializeAuditLog() {
  try {
    await fs.access(AUDIT_LOG_PATH);
  } catch (error) {
    // File doesn't exist, create it
    const initialData = {
      version: '1.0.0',
      created: new Date().toISOString(),
      retentionYears: RETENTION_YEARS,
      entries: []
    };
    
    // Ensure directory exists
    const dir = path.dirname(AUDIT_LOG_PATH);
    await fs.mkdir(dir, { recursive: true });
    
    await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(initialData, null, 2));
  }
}

/**
 * Read audit log
 */
async function readAuditLog() {
  await initializeAuditLog();
  const data = await fs.readFile(AUDIT_LOG_PATH, 'utf8');
  return JSON.parse(data);
}

/**
 * Write audit log
 */
async function writeAuditLog(logData) {
  await fs.writeFile(AUDIT_LOG_PATH, JSON.stringify(logData, null, 2));
}

/**
 * Log a pregnancy medication safety check
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logSafetyCheck({
  patientId = null,
  medicationName,
  weekOfPregnancy,
  trimester,
  riskScore,
  riskLevel,
  fdaCategory,
  safe,
  warnings = [],
  recommendation,
  sessionId = null
}) {
  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.SAFETY_CHECK,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    data: {
      medicationName,
      weekOfPregnancy,
      trimester,
      riskScore,
      riskLevel,
      fdaCategory,
      safe,
      warnings,
      recommendation
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log a pregnancy drug interaction check
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logInteractionCheck({
  patientId = null,
  medications,
  weekOfPregnancy,
  interactionsFound,
  highestSeverity,
  safe,
  recommendation,
  sessionId = null
}) {
  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.INTERACTION_CHECK,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    data: {
      medications,
      weekOfPregnancy,
      interactionsFound,
      highestSeverity,
      safe,
      recommendation
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log a comprehensive risk calculation
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logRiskCalculation({
  patientId = null,
  medications,
  weekOfPregnancy,
  maternalCondition = null,
  overallRiskLevel,
  riskScore,
  requiresProviderConsent,
  requiresObstetrician,
  recommendations,
  sessionId = null
}) {
  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.RISK_CALCULATION,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    data: {
      medications,
      weekOfPregnancy,
      maternalCondition,
      overallRiskLevel,
      riskScore,
      requiresProviderConsent,
      requiresObstetrician,
      recommendations
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log a provider decision/consultation
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logProviderDecision({
  patientId,
  providerId,
  providerName,
  providerType,
  medicationName,
  decision,
  reasoning,
  alternatives = [],
  followUpRequired = false,
  followUpDate = null,
  sessionId = null
}) {
  if (!patientId) {
    throw new Error('Patient ID is required for provider decisions');
  }
  
  if (!providerId && !providerName) {
    throw new Error('Provider ID or name is required');
  }

  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.PROVIDER_DECISION,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    provider: {
      id: providerId,
      name: providerName,
      type: providerType
    },
    data: {
      medicationName,
      decision,
      reasoning,
      alternatives,
      followUpRequired,
      followUpDate
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log a patient decision
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logPatientDecision({
  patientId,
  medicationName,
  decision,
  reasoning = null,
  acknowledgedRisks = false,
  providerConsulted = false,
  sessionId = null
}) {
  if (!patientId) {
    throw new Error('Patient ID is required for patient decisions');
  }

  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.PATIENT_DECISION,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    data: {
      medicationName,
      decision,
      reasoning,
      acknowledgedRisks,
      providerConsulted
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log medication started
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logMedicationStarted({
  patientId,
  medicationName,
  dosage,
  frequency,
  weekOfPregnancy,
  prescriberId = null,
  prescriberName = null,
  indication,
  sessionId = null
}) {
  if (!patientId) {
    throw new Error('Patient ID is required');
  }

  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.MEDICATION_STARTED,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    prescriber: prescriberId || prescriberName ? {
      id: prescriberId,
      name: prescriberName
    } : null,
    data: {
      medicationName,
      dosage,
      frequency,
      weekOfPregnancy,
      indication
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log medication stopped
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logMedicationStopped({
  patientId,
  medicationName,
  weekOfPregnancy,
  reason,
  prescriberId = null,
  prescriberName = null,
  sessionId = null
}) {
  if (!patientId) {
    throw new Error('Patient ID is required');
  }

  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.MEDICATION_STOPPED,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    prescriber: prescriberId || prescriberName ? {
      id: prescriberId,
      name: prescriberName
    } : null,
    data: {
      medicationName,
      weekOfPregnancy,
      reason
    }
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Log adverse event
 * 
 * @param {Object} params - Log parameters
 * @returns {Object} Log entry
 */
async function logAdverseEvent({
  patientId,
  medicationName,
  weekOfPregnancy,
  eventType,
  severity,
  description,
  outcome,
  reportedToFDA = false,
  sessionId = null
}) {
  if (!patientId) {
    throw new Error('Patient ID is required for adverse events');
  }

  const entry = {
    id: generateLogId(),
    type: AUDIT_TYPES.ADVERSE_EVENT,
    timestamp: new Date().toISOString(),
    patientId,
    sessionId,
    data: {
      medicationName,
      weekOfPregnancy,
      eventType,
      severity,
      description,
      outcome,
      reportedToFDA
    },
    critical: true // Flag for special attention
  };

  await appendAuditEntry(entry);
  return entry;
}

/**
 * Append entry to audit log
 */
async function appendAuditEntry(entry) {
  const logData = await readAuditLog();
  logData.entries.push(entry);
  logData.lastUpdated = new Date().toISOString();
  await writeAuditLog(logData);
}

/**
 * Query audit logs
 * 
 * @param {Object} filters - Filter criteria
 * @returns {Array} Matching log entries
 */
async function queryAuditLogs(filters = {}) {
  const logData = await readAuditLog();
  let results = logData.entries;

  // Filter by patient ID
  if (filters.patientId) {
    results = results.filter(entry => entry.patientId === filters.patientId);
  }

  // Filter by type
  if (filters.type) {
    results = results.filter(entry => entry.type === filters.type);
  }

  // Filter by date range
  if (filters.startDate) {
    const startDate = new Date(filters.startDate);
    results = results.filter(entry => new Date(entry.timestamp) >= startDate);
  }

  if (filters.endDate) {
    const endDate = new Date(filters.endDate);
    results = results.filter(entry => new Date(entry.timestamp) <= endDate);
  }

  // Filter by medication
  if (filters.medicationName) {
    results = results.filter(entry => {
      const data = entry.data;
      return (
        data.medicationName === filters.medicationName ||
        (data.medications && data.medications.includes(filters.medicationName))
      );
    });
  }

  // Filter by session ID
  if (filters.sessionId) {
    results = results.filter(entry => entry.sessionId === filters.sessionId);
  }

  // Sort by timestamp (newest first)
  results.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  return results;
}

/**
 * Export audit logs for FDA compliance
 * 
 * @param {Object} filters - Optional filters
 * @param {string} format - Export format ('json' or 'csv')
 * @returns {string} Formatted export data
 */
async function exportAuditLogs(filters = {}, format = 'json') {
  const entries = await queryAuditLogs(filters);

  if (format === 'csv') {
    return convertToCSV(entries);
  }

  return JSON.stringify({
    exportDate: new Date().toISOString(),
    filters,
    entryCount: entries.length,
    entries
  }, null, 2);
}

/**
 * Convert audit entries to CSV format
 */
function convertToCSV(entries) {
  if (entries.length === 0) {
    return 'No entries found';
  }

  const headers = [
    'ID',
    'Type',
    'Timestamp',
    'Patient ID',
    'Session ID',
    'Medication',
    'Week of Pregnancy',
    'Risk Level',
    'Decision',
    'Provider',
    'Notes'
  ];

  const rows = entries.map(entry => {
    const data = entry.data || {};
    const provider = entry.provider || {};
    
    return [
      entry.id,
      entry.type,
      entry.timestamp,
      entry.patientId || '',
      entry.sessionId || '',
      data.medicationName || data.medications?.join('; ') || '',
      data.weekOfPregnancy || '',
      data.riskLevel || data.overallRiskLevel || '',
      data.decision || '',
      provider.name || '',
      data.reasoning || data.recommendation || ''
    ].map(field => `"${field}"`).join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Clean up old audit logs (beyond retention period)
 */
async function cleanupOldLogs() {
  const logData = await readAuditLog();
  const retentionDate = new Date();
  retentionDate.setFullYear(retentionDate.getFullYear() - RETENTION_YEARS);

  const originalCount = logData.entries.length;
  
  logData.entries = logData.entries.filter(entry => 
    new Date(entry.timestamp) >= retentionDate
  );

  const removedCount = originalCount - logData.entries.length;

  if (removedCount > 0) {
    logData.lastCleanup = new Date().toISOString();
    logData.removedEntries = removedCount;
    await writeAuditLog(logData);
  }

  return {
    removed: removedCount,
    retained: logData.entries.length,
    retentionDate: retentionDate.toISOString()
  };
}

/**
 * Get audit statistics
 */
async function getAuditStatistics(filters = {}) {
  const entries = await queryAuditLogs(filters);

  const stats = {
    totalEntries: entries.length,
    byType: {},
    byRiskLevel: {},
    uniquePatients: new Set(),
    uniqueMedications: new Set(),
    dateRange: {
      earliest: null,
      latest: null
    },
    criticalEvents: 0,
    providerDecisions: 0,
    patientDecisions: 0
  };

  entries.forEach(entry => {
    // Count by type
    stats.byType[entry.type] = (stats.byType[entry.type] || 0) + 1;

    // Track patients
    if (entry.patientId) {
      stats.uniquePatients.add(entry.patientId);
    }

    // Track medications
    const data = entry.data || {};
    if (data.medicationName) {
      stats.uniqueMedications.add(data.medicationName);
    }
    if (data.medications) {
      data.medications.forEach(med => stats.uniqueMedications.add(med));
    }

    // Count by risk level
    const riskLevel = data.riskLevel || data.overallRiskLevel;
    if (riskLevel) {
      stats.byRiskLevel[riskLevel] = (stats.byRiskLevel[riskLevel] || 0) + 1;
    }

    // Track date range
    const timestamp = new Date(entry.timestamp);
    if (!stats.dateRange.earliest || timestamp < new Date(stats.dateRange.earliest)) {
      stats.dateRange.earliest = entry.timestamp;
    }
    if (!stats.dateRange.latest || timestamp > new Date(stats.dateRange.latest)) {
      stats.dateRange.latest = entry.timestamp;
    }

    // Count critical events
    if (entry.critical) {
      stats.criticalEvents++;
    }

    // Count decisions
    if (entry.type === AUDIT_TYPES.PROVIDER_DECISION) {
      stats.providerDecisions++;
    }
    if (entry.type === AUDIT_TYPES.PATIENT_DECISION) {
      stats.patientDecisions++;
    }
  });

  stats.uniquePatients = stats.uniquePatients.size;
  stats.uniqueMedications = stats.uniqueMedications.size;

  return stats;
}

/**
 * Generate unique log ID
 */
function generateLogId() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `audit_${timestamp}_${random}`;
}

module.exports = {
  // Constants
  AUDIT_TYPES,
  DECISION_TYPES,
  RETENTION_YEARS,

  // Core logging functions
  logSafetyCheck,
  logInteractionCheck,
  logRiskCalculation,
  logProviderDecision,
  logPatientDecision,
  logMedicationStarted,
  logMedicationStopped,
  logAdverseEvent,

  // Query and export functions
  queryAuditLogs,
  exportAuditLogs,
  getAuditStatistics,

  // Maintenance functions
  cleanupOldLogs,
  initializeAuditLog
};
