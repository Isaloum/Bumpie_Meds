/**
 * Pregnancy Audit Logger Tests
 * 
 * Tests for FDA-compliant audit logging functionality
 */

const fs = require('fs').promises;
const path = require('path');

const {
  logSafetyCheck,
  logInteractionCheck,
  logRiskCalculation,
  logProviderDecision,
  logPatientDecision,
  logMedicationStarted,
  logMedicationStopped,
  logAdverseEvent,
  queryAuditLogs,
  exportAuditLogs,
  getAuditStatistics,
  cleanupOldLogs,
  AUDIT_TYPES,
  DECISION_TYPES,
  RETENTION_YEARS
} = require('../../src/services/pregnancy-audit-logger');

// Mock audit log path for testing
const TEST_AUDIT_PATH = path.join(__dirname, '../test-data/test-audit-logs.json');

describe('Pregnancy Audit Logger', () => {

  beforeEach(async () => {
    // Clean up test audit log before each test
    try {
      await fs.unlink(TEST_AUDIT_PATH);
    } catch (error) {
      // File doesn't exist, ignore
    }
  });

  afterAll(async () => {
    // Clean up after all tests
    try {
      await fs.unlink(TEST_AUDIT_PATH);
    } catch (error) {
      // Ignore
    }
  });

  describe('logSafetyCheck', () => {
    test('should create audit entry for safety check', async () => {
      const entry = await logSafetyCheck({
        patientId: 'patient123',
        medicationName: 'Acetaminophen',
        weekOfPregnancy: 20,
        trimester: 2,
        riskScore: 25,
        riskLevel: 'low',
        fdaCategory: 'B',
        safe: true,
        warnings: [],
        recommendation: 'Safe to use',
        sessionId: 'session123'
      });

      expect(entry).toBeDefined();
      expect(entry.id).toBeTruthy();
      expect(entry.type).toBe(AUDIT_TYPES.SAFETY_CHECK);
      expect(entry.patientId).toBe('patient123');
      expect(entry.data.medicationName).toBe('Acetaminophen');
      expect(entry.timestamp).toBeTruthy();
    });

    test('should accept null patientId for anonymous checks', async () => {
      const entry = await logSafetyCheck({
        medicationName: 'Ibuprofen',
        weekOfPregnancy: 15,
        trimester: 2,
        riskScore: 65,
        riskLevel: 'high',
        fdaCategory: 'D',
        safe: false,
        warnings: ['High risk in pregnancy'],
        recommendation: 'Avoid during pregnancy'
      });

      expect(entry.patientId).toBeNull();
      expect(entry.data.medicationName).toBe('Ibuprofen');
    });
  });

  describe('logInteractionCheck', () => {
    test('should log interaction check', async () => {
      const entry = await logInteractionCheck({
        patientId: 'patient456',
        medications: ['Ibuprofen', 'Aspirin'],
        weekOfPregnancy: 35,
        interactionsFound: 1,
        highestSeverity: 'high',
        safe: false,
        recommendation: 'Avoid combination',
        sessionId: 'session456'
      });

      expect(entry.type).toBe(AUDIT_TYPES.INTERACTION_CHECK);
      expect(entry.data.medications).toEqual(['Ibuprofen', 'Aspirin']);
      expect(entry.data.highestSeverity).toBe('high');
    });
  });

  describe('logRiskCalculation', () => {
    test('should log comprehensive risk calculation', async () => {
      const entry = await logRiskCalculation({
        patientId: 'patient789',
        medications: ['Lisinopril', 'Metformin'],
        weekOfPregnancy: 12,
        maternalCondition: 'Hypertension',
        overallRiskLevel: 'high',
        riskScore: 75,
        requiresProviderConsent: true,
        requiresObstetrician: true,
        recommendations: [{ action: 'Switch medications' }]
      });

      expect(entry.type).toBe(AUDIT_TYPES.RISK_CALCULATION);
      expect(entry.data.maternalCondition).toBe('Hypertension');
      expect(entry.data.requiresObstetrician).toBe(true);
    });
  });

  describe('logProviderDecision', () => {
    test('should log provider decision with all required fields', async () => {
      const entry = await logProviderDecision({
        patientId: 'patient123',
        providerId: 'provider789',
        providerName: 'Dr. Smith',
        providerType: 'Obstetrician',
        medicationName: 'Lisinopril',
        decision: DECISION_TYPES.SWITCH,
        reasoning: 'Category D - not safe in pregnancy',
        alternatives: ['Methyldopa', 'Labetalol'],
        followUpRequired: true,
        followUpDate: '2026-02-01'
      });

      expect(entry.type).toBe(AUDIT_TYPES.PROVIDER_DECISION);
      expect(entry.provider.name).toBe('Dr. Smith');
      expect(entry.data.decision).toBe('switch');
      expect(entry.data.followUpRequired).toBe(true);
    });

    test('should require patientId', async () => {
      await expect(logProviderDecision({
        providerName: 'Dr. Smith',
        medicationName: 'Test',
        decision: 'continue',
        reasoning: 'test'
      })).rejects.toThrow('Patient ID is required');
    });
  });

  describe('logPatientDecision', () => {
    test('should log patient decision', async () => {
      const entry = await logPatientDecision({
        patientId: 'patient123',
        medicationName: 'Sertraline',
        decision: DECISION_TYPES.CONTINUE,
        reasoning: 'Benefits outweigh risks',
        acknowledgedRisks: true,
        providerConsulted: true
      });

      expect(entry.type).toBe(AUDIT_TYPES.PATIENT_DECISION);
      expect(entry.data.acknowledgedRisks).toBe(true);
      expect(entry.data.providerConsulted).toBe(true);
    });

    test('should require patientId', async () => {
      await expect(logPatientDecision({
        medicationName: 'Test',
        decision: 'continue'
      })).rejects.toThrow('Patient ID is required');
    });
  });

  describe('logMedicationStarted', () => {
    test('should log medication started', async () => {
      const entry = await logMedicationStarted({
        patientId: 'patient123',
        medicationName: 'Methyldopa',
        dosage: '250mg',
        frequency: 'Twice daily',
        weekOfPregnancy: 15,
        prescriberId: 'provider123',
        prescriberName: 'Dr. Johnson',
        indication: 'Hypertension'
      });

      expect(entry.type).toBe(AUDIT_TYPES.MEDICATION_STARTED);
      expect(entry.data.dosage).toBe('250mg');
      expect(entry.prescriber).toBeDefined();
    });
  });

  describe('logMedicationStopped', () => {
    test('should log medication stopped', async () => {
      const entry = await logMedicationStopped({
        patientId: 'patient123',
        medicationName: 'Lisinopril',
        weekOfPregnancy: 6,
        reason: 'Category D - unsafe in pregnancy',
        prescriberName: 'Dr. Smith'
      });

      expect(entry.type).toBe(AUDIT_TYPES.MEDICATION_STOPPED);
      expect(entry.data.reason).toContain('unsafe in pregnancy');
    });
  });

  describe('logAdverseEvent', () => {
    test('should log adverse event as critical', async () => {
      const entry = await logAdverseEvent({
        patientId: 'patient123',
        medicationName: 'Sertraline',
        weekOfPregnancy: 28,
        eventType: 'Neonatal adaptation syndrome',
        severity: 'moderate',
        description: 'Infant showing withdrawal symptoms',
        outcome: 'Resolved after 48 hours',
        reportedToFDA: true
      });

      expect(entry.type).toBe(AUDIT_TYPES.ADVERSE_EVENT);
      expect(entry.critical).toBe(true);
      expect(entry.data.reportedToFDA).toBe(true);
    });
  });

  describe('queryAuditLogs', () => {
    beforeEach(async () => {
      // Create some test entries
      await logSafetyCheck({
        patientId: 'patient123',
        medicationName: 'Acetaminophen',
        weekOfPregnancy: 20,
        trimester: 2,
        riskScore: 25,
        riskLevel: 'low',
        fdaCategory: 'B',
        safe: true,
        warnings: [],
        recommendation: 'Safe'
      });

      await logSafetyCheck({
        patientId: 'patient456',
        medicationName: 'Ibuprofen',
        weekOfPregnancy: 15,
        trimester: 2,
        riskScore: 65,
        riskLevel: 'high',
        fdaCategory: 'D',
        safe: false,
        warnings: [],
        recommendation: 'Avoid'
      });
    });

    test('should query by patientId', async () => {
      const results = await queryAuditLogs({ patientId: 'patient123' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.patientId === 'patient123')).toBe(true);
    });

    test('should query by type', async () => {
      const results = await queryAuditLogs({ type: AUDIT_TYPES.SAFETY_CHECK });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(r => r.type === AUDIT_TYPES.SAFETY_CHECK)).toBe(true);
    });

    test('should query by medication name', async () => {
      const results = await queryAuditLogs({ medicationName: 'Acetaminophen' });
      
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(r => r.data.medicationName === 'Acetaminophen')).toBe(true);
    });

    test('should return all entries when no filters', async () => {
      const results = await queryAuditLogs();
      
      expect(results.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('exportAuditLogs', () => {
    beforeEach(async () => {
      await logSafetyCheck({
        patientId: 'patient123',
        medicationName: 'Acetaminophen',
        weekOfPregnancy: 20,
        trimester: 2,
        riskScore: 25,
        riskLevel: 'low',
        fdaCategory: 'B',
        safe: true,
        warnings: [],
        recommendation: 'Safe'
      });
    });

    test('should export as JSON', async () => {
      const exported = await exportAuditLogs({}, 'json');
      
      const data = JSON.parse(exported);
      expect(data.exportDate).toBeTruthy();
      expect(Array.isArray(data.entries)).toBe(true);
      expect(data.entryCount).toBeGreaterThan(0);
    });

    test('should export as CSV', async () => {
      const exported = await exportAuditLogs({}, 'csv');
      
      expect(exported).toContain('ID,Type,Timestamp');
      expect(exported).toContain('safety_check');
    });
  });

  describe('getAuditStatistics', () => {
    beforeEach(async () => {
      await logSafetyCheck({
        patientId: 'patient123',
        medicationName: 'Acetaminophen',
        weekOfPregnancy: 20,
        trimester: 2,
        riskScore: 25,
        riskLevel: 'low',
        fdaCategory: 'B',
        safe: true,
        warnings: [],
        recommendation: 'Safe'
      });

      await logProviderDecision({
        patientId: 'patient123',
        providerName: 'Dr. Smith',
        medicationName: 'Lisinopril',
        decision: 'discontinue',
        reasoning: 'Unsafe'
      });
    });

    test('should calculate statistics', async () => {
      const stats = await getAuditStatistics();
      
      expect(stats.totalEntries).toBeGreaterThan(0);
      expect(stats.byType).toBeDefined();
      expect(stats.uniquePatients).toBeGreaterThan(0);
      expect(stats.uniqueMedications).toBeGreaterThan(0);
      expect(stats.providerDecisions).toBeGreaterThan(0);
    });
  });

  describe('Constants', () => {
    test('AUDIT_TYPES should be defined', () => {
      expect(AUDIT_TYPES.SAFETY_CHECK).toBe('safety_check');
      expect(AUDIT_TYPES.PROVIDER_DECISION).toBe('provider_decision');
      expect(AUDIT_TYPES.ADVERSE_EVENT).toBe('adverse_event');
    });

    test('DECISION_TYPES should be defined', () => {
      expect(DECISION_TYPES.CONTINUE).toBe('continue');
      expect(DECISION_TYPES.DISCONTINUE).toBe('discontinue');
      expect(DECISION_TYPES.SWITCH).toBe('switch');
    });

    test('RETENTION_YEARS should be 7 for FDA compliance', () => {
      expect(RETENTION_YEARS).toBe(7);
    });
  });
});
