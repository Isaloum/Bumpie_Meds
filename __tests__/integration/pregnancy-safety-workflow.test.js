/**
 * Integration Tests for Pregnancy Safety System
 * 
 * End-to-end workflow tests combining all modules
 */

const {
  checkMedicationSafety,
  getTrimester
} = require('../../src/services/pregnancy-safety-engine');

const {
  checkPregnancyInteractions,
  assessMedicationRegimen
} = require('../../src/services/pregnancy-interaction-checker');

const {
  calculateComprehensiveRisk,
  getProviderRecommendation
} = require('../../src/services/pregnancy-risk-calculator');

const {
  logSafetyCheck,
  logRiskCalculation,
  queryAuditLogs,
  getAuditStatistics
} = require('../../src/services/pregnancy-audit-logger');

describe('Pregnancy Safety System - Integration Tests', () => {

  describe('Complete Safety Assessment Workflow', () => {
    test('should perform full assessment for safe medication', async () => {
      const medicationName = 'Acetaminophen';
      const weekOfPregnancy = 20;

      // Step 1: Check medication safety
      const safetyCheck = checkMedicationSafety(medicationName, weekOfPregnancy);
      expect(safetyCheck.found).toBe(true);
      expect(safetyCheck.safe).toBe(true);

      // Step 2: Log the safety check
      const auditEntry = await logSafetyCheck({
        patientId: 'integration_test_patient',
        medicationName: safetyCheck.genericName,
        weekOfPregnancy,
        trimester: safetyCheck.trimester.number,
        riskScore: safetyCheck.riskScore,
        riskLevel: safetyCheck.riskLevel,
        fdaCategory: safetyCheck.fdaCategory.category,
        safe: safetyCheck.safe,
        warnings: safetyCheck.warnings,
        recommendation: safetyCheck.recommendation
      });

      expect(auditEntry.id).toBeTruthy();

      // Step 3: Verify audit entry
      const auditResults = await queryAuditLogs({ 
        patientId: 'integration_test_patient' 
      });
      
      expect(auditResults.length).toBeGreaterThan(0);
    });

    test('should handle high-risk medication workflow', async () => {
      const medicationName = 'Atorvastatin';
      const weekOfPregnancy = 12;

      // Step 1: Safety check (should show Category X)
      const safetyCheck = checkMedicationSafety(medicationName, weekOfPregnancy);
      expect(safetyCheck.fdaCategory.category).toBe('X');
      expect(safetyCheck.safe).toBe(false);
      expect(safetyCheck.requiresObstetrician).toBe(true);

      // Step 2: Calculate comprehensive risk
      const riskCalc = calculateComprehensiveRisk(
        [medicationName],
        weekOfPregnancy
      );
      
      expect(riskCalc.hasCategoryX).toBe(true);
      expect(riskCalc.overallRiskLevel).toBe('critical');

      // Step 3: Get provider recommendation
      const providerRec = getProviderRecommendation(riskCalc);
      expect(providerRec.urgency).toBe('emergency');
      expect(providerRec.escalationNeeded).toBe(true);

      // Step 4: Log the assessment
      await logRiskCalculation({
        patientId: 'high_risk_patient',
        medications: [medicationName],
        weekOfPregnancy,
        overallRiskLevel: riskCalc.overallRiskLevel,
        riskScore: riskCalc.riskScore,
        requiresProviderConsent: riskCalc.requiresProviderConsent,
        requiresObstetrician: riskCalc.requiresObstetrician,
        recommendations: riskCalc.recommendations
      });

      // Verify critical event logged
      const stats = await getAuditStatistics({ 
        patientId: 'high_risk_patient' 
      });
      expect(stats.totalEntries).toBeGreaterThan(0);
    });
  });

  describe('Multi-Medication Interaction Workflow', () => {
    test('should assess polypharmacy with interactions', async () => {
      const medications = ['Ibuprofen', 'Aspirin', 'Sertraline'];
      const weekOfPregnancy = 35;

      // Step 1: Check interactions
      const interactionCheck = checkPregnancyInteractions(medications, weekOfPregnancy);
      expect(interactionCheck.interactionsFound).toBeGreaterThan(0);

      // Step 2: Calculate composite risk
      const riskCalc = calculateComprehensiveRisk(medications, weekOfPregnancy);
      expect(riskCalc.medicationCount).toBe(3);
      expect(riskCalc.interactionRisks.length).toBeGreaterThan(0);

      // Step 3: Verify recommendations generated
      expect(riskCalc.recommendations.length).toBeGreaterThan(0);
      
      // Should have recommendations for interactions
      const hasInteractionRec = riskCalc.recommendations.some(rec => 
        rec.reason && rec.reason.includes('interaction')
      );
      expect(hasInteractionRec).toBe(true);
    });
  });

  describe('Maternal Condition Management Workflow', () => {
    test('should assess hypertension regimen appropriately', async () => {
      const medications = ['Methyldopa'];
      const weekOfPregnancy = 24;
      const condition = 'Hypertension';

      // Step 1: Assess regimen for condition
      const regimen = assessMedicationRegimen(
        medications,
        condition,
        weekOfPregnancy
      );

      expect(regimen.condition).toContain('Hypertension');
      expect(regimen.needsChange).toBe(false);
      expect(regimen.optimal).toBe(true);

      // Step 2: Calculate comprehensive risk
      const risk = calculateComprehensiveRisk(
        medications,
        weekOfPregnancy,
        condition
      );

      expect(risk.maternalCondition).toBeTruthy();
      expect(risk.overallRiskLevel).toBe('low');
      expect(risk.safe).toBe(true);
    });

    test('should flag inappropriate medication for condition', async () => {
      const medications = ['Lisinopril'];
      const weekOfPregnancy = 18;
      const condition = 'Hypertension';

      // Step 1: Assess regimen
      const regimen = assessMedicationRegimen(
        medications,
        condition,
        weekOfPregnancy
      );

      expect(regimen.needsChange).toBe(true);
      expect(regimen.optimal).toBe(false);

      // Step 2: Calculate comprehensive risk
      const risk = calculateComprehensiveRisk(
        medications,
        weekOfPregnancy,
        condition
      );

      // Risk should be elevated due to inappropriate medication
      expect(risk.riskAdjustment).toBeGreaterThan(0);
      expect(risk.requiresProviderConsent).toBe(true);

      // Should have recommendation to switch
      const switchRec = risk.recommendations.find(rec => 
        rec.action === 'DISCONTINUE' || rec.type === 'condition_management'
      );
      expect(switchRec).toBeDefined();
    });
  });

  describe('Trimester Progression Workflow', () => {
    test('should track risk changes across trimesters', () => {
      const medicationName = 'Ibuprofen';

      // First trimester
      const check1st = checkMedicationSafety(medicationName, 8);
      const risk1st = check1st.riskScore;

      // Second trimester
      const check2nd = checkMedicationSafety(medicationName, 20);
      const risk2nd = check2nd.riskScore;

      // Third trimester (NSAIDs more dangerous)
      const check3rd = checkMedicationSafety(medicationName, 36);
      const risk3rd = check3rd.riskScore;

      // All should be flagged as high risk Category D
      expect(check1st.fdaCategory.category).toBe('D');
      expect(check2nd.fdaCategory.category).toBe('D');
      expect(check3rd.fdaCategory.category).toBe('D');

      // Risk should be present in all trimesters
      expect(risk1st).toBeGreaterThan(40);
      expect(risk2nd).toBeGreaterThan(40);
      expect(risk3rd).toBeGreaterThan(40);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle unknown medication gracefully', () => {
      const result = checkMedicationSafety('UnknownDrug999', 20);
      
      expect(result.found).toBe(false);
      expect(result.recommendation).toContain('consult healthcare provider');
    });

    test('should handle empty medication list', () => {
      expect(() => 
        checkPregnancyInteractions([], 20)
      ).toThrow();
    });

    test('should handle invalid pregnancy week', () => {
      expect(() => 
        checkMedicationSafety('Acetaminophen', 0)
      ).toThrow();

      expect(() => 
        checkMedicationSafety('Acetaminophen', 50)
      ).toThrow();
    });

    test('should handle medication with minimal data', async () => {
      // Test with medication that might have missing fields
      const result = checkMedicationSafety('Gabapentin', 20);
      
      // Should still return valid result
      expect(result.found).toBe(true);
      expect(result.riskScore).toBeDefined();
      expect(result.recommendation).toBeTruthy();
    });
  });

  describe('Audit Trail Completeness', () => {
    test('should maintain complete audit trail for patient journey', async () => {
      const patientId = 'audit_trail_patient';
      const sessionId = 'session_' + Date.now();

      // Patient checks medication safety
      await logSafetyCheck({
        patientId,
        sessionId,
        medicationName: 'Sertraline',
        weekOfPregnancy: 8,
        trimester: 1,
        riskScore: 50,
        riskLevel: 'moderate',
        fdaCategory: 'C',
        safe: false,
        warnings: ['Use with caution in first trimester'],
        recommendation: 'Consult provider'
      });

      // Comprehensive risk calculation
      await logRiskCalculation({
        patientId,
        sessionId,
        medications: ['Sertraline'],
        weekOfPregnancy: 8,
        overallRiskLevel: 'moderate',
        riskScore: 50,
        requiresProviderConsent: true,
        requiresObstetrician: false,
        recommendations: []
      });

      // Query full audit trail
      const auditTrail = await queryAuditLogs({ patientId });
      
      expect(auditTrail.length).toBeGreaterThanOrEqual(2);
      
      // Verify sessionId links entries
      const sessionEntries = auditTrail.filter(e => e.sessionId === sessionId);
      expect(sessionEntries.length).toBe(2);

      // Verify chronological order
      expect(auditTrail[0].timestamp).toBeTruthy();
      expect(auditTrail[1].timestamp).toBeTruthy();
    });
  });

  describe('Real-World Scenarios', () => {
    test('Scenario: Pregnant woman with depression and headache', async () => {
      const medications = ['Sertraline', 'Acetaminophen'];
      const weekOfPregnancy = 24;
      const condition = 'Depression';

      const risk = calculateComprehensiveRisk(
        medications,
        weekOfPregnancy,
        condition
      );

      // Sertraline is first-line for depression
      // Acetaminophen is safe for pain
      expect(risk.conditionManagement.optimal).toBe(true);
      expect(risk.overallRiskLevel).toBe('low');
    });

    test('Scenario: Pregnant woman with hypertension on wrong medication', async () => {
      const medications = ['Lisinopril'];
      const weekOfPregnancy = 15;
      const condition = 'Hypertension';

      const risk = calculateComprehensiveRisk(
        medications,
        weekOfPregnancy,
        condition
      );

      // Lisinopril is Category D and contraindicated
      expect(risk.hasCategoryD).toBe(true);
      expect(risk.conditionManagement.needsChange).toBe(true);
      expect(risk.requiresProviderConsent).toBe(true);

      // Should recommend safer alternatives
      const alternatives = risk.safeAlternatives;
      expect(alternatives.length).toBeGreaterThan(0);
    });

    test('Scenario: Multiple medications with dangerous interaction', async () => {
      const medications = ['Ibuprofen', 'Lisinopril'];
      const weekOfPregnancy = 28;

      const risk = calculateComprehensiveRisk(medications, weekOfPregnancy);

      // Both medications are problematic individually
      // Combination is critical in pregnancy
      expect(risk.interactionRisks.length).toBeGreaterThan(0);
      expect(risk.overallRiskLevel).toBe('critical');
      expect(risk.requiresObstetrician).toBe(true);
    });
  });
});
