/**
 * Pregnancy Risk Calculator Tests
 * 
 * Tests for composite risk calculation across medications and conditions
 */

const {
  calculateSingleMedicationRisk,
  calculateMultipleMedicationRisk,
  calculateComprehensiveRisk,
  getProviderRecommendation,
  getRiskLevelFromScore,
  RISK_THRESHOLDS
} = require('../../src/services/pregnancy-risk-calculator');

describe('Pregnancy Risk Calculator', () => {

  describe('calculateSingleMedicationRisk', () => {
    test('should calculate risk for safe medication (Acetaminophen)', () => {
      const result = calculateSingleMedicationRisk('Acetaminophen', 20);
      
      expect(result.found).toBe(true);
      expect(result.riskLevel).toBe('low');
      expect(result.safe).toBe(true);
      expect(result.fdaCategory).toBe('B');
    });

    test('should calculate risk for Category X medication', () => {
      const result = calculateSingleMedicationRisk('Atorvastatin', 20);
      
      expect(result.found).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.fdaCategory).toBe('X');
      expect(result.requiresObstetrician).toBe(true);
    });

    test('should include trimester information', () => {
      const result = calculateSingleMedicationRisk('Acetaminophen', 15);
      
      expect(result.trimester).toBe(2);
      expect(result.weekOfPregnancy).toBe(15);
    });

    test('should return unknown for medication not in database', () => {
      const result = calculateSingleMedicationRisk('UnknownDrug', 20);
      
      expect(result.found).toBe(false);
      expect(result.riskLevel).toBe('unknown');
    });
  });

  describe('calculateMultipleMedicationRisk', () => {
    test('should calculate composite risk for safe medications', () => {
      const result = calculateMultipleMedicationRisk(
        ['Acetaminophen', 'Levothyroxine'], 
        20
      );
      
      expect(result.safe).toBe(true);
      expect(result.overallRiskLevel).toBe('low');
      expect(result.medicationCount).toBe(2);
    });

    test('should detect Category X medication in regimen', () => {
      const result = calculateMultipleMedicationRisk(
        ['Acetaminophen', 'Atorvastatin'], 
        20
      );
      
      expect(result.hasCategoryX).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.requiresObstetrician).toBe(true);
    });

    test('should detect drug interactions', () => {
      const result = calculateMultipleMedicationRisk(
        ['Ibuprofen', 'Aspirin'], 
        35
      );
      
      expect(result.interactionRisks.length).toBeGreaterThan(0);
    });

    test('should apply polypharmacy penalty for multiple medications', () => {
      const result2Meds = calculateMultipleMedicationRisk(
        ['Acetaminophen', 'Levothyroxine'], 
        20
      );
      
      const result4Meds = calculateMultipleMedicationRisk(
        ['Acetaminophen', 'Levothyroxine', 'Metformin', 'Sertraline'], 
        20
      );
      
      // More medications should generally have higher risk
      expect(result4Meds.riskScore).toBeGreaterThanOrEqual(result2Meds.riskScore);
    });

    test('should collect all warnings from medications', () => {
      const result = calculateMultipleMedicationRisk(
        ['Ibuprofen', 'Lisinopril'], 
        20
      );
      
      expect(Array.isArray(result.warnings)).toBe(true);
    });

    test('should collect safe alternatives', () => {
      const result = calculateMultipleMedicationRisk(
        ['Lisinopril'], 
        20
      );
      
      expect(Array.isArray(result.safeAlternatives)).toBe(true);
    });

    test('should generate recommendations', () => {
      const result = calculateMultipleMedicationRisk(
        ['Atorvastatin'], 
        20
      );
      
      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      
      const criticalRec = result.recommendations.find(r => r.priority === 'CRITICAL');
      expect(criticalRec).toBeDefined();
    });

    test('should throw error for empty array', () => {
      expect(() => calculateMultipleMedicationRisk([], 20)).toThrow();
    });

    test('should throw error for invalid week', () => {
      expect(() => 
        calculateMultipleMedicationRisk(['Acetaminophen'], 50)
      ).toThrow();
    });
  });

  describe('calculateComprehensiveRisk', () => {
    test('should calculate risk without maternal condition', () => {
      const result = calculateComprehensiveRisk(
        ['Acetaminophen'], 
        20
      );
      
      expect(result.maternalCondition).toBeNull();
      expect(result.conditionManagement).toBeNull();
    });

    test('should calculate risk with maternal condition', () => {
      const result = calculateComprehensiveRisk(
        ['Methyldopa'], 
        20,
        'Hypertension'
      );
      
      expect(result.maternalCondition).toContain('Hypertension');
      expect(result.conditionManagement).toBeDefined();
      expect(result.conditionManagement.optimal).toBeDefined();
    });

    test('should increase risk for inappropriate medications', () => {
      const resultAppropriate = calculateComprehensiveRisk(
        ['Methyldopa'], 
        20,
        'Hypertension'
      );
      
      const resultInappropriate = calculateComprehensiveRisk(
        ['Lisinopril'], 
        20,
        'Hypertension'
      );
      
      expect(resultInappropriate.riskScore).toBeGreaterThan(resultAppropriate.riskScore);
      expect(resultInappropriate.conditionManagement.needsChange).toBe(true);
    });

    test('should merge medication and condition recommendations', () => {
      const result = calculateComprehensiveRisk(
        ['Lisinopril'], 
        20,
        'Hypertension'
      );
      
      expect(result.recommendations.length).toBeGreaterThan(0);
      const conditionRec = result.recommendations.find(r => 
        r.type === 'condition_management'
      );
      expect(conditionRec).toBeDefined();
    });

    test('should require provider consent for high-risk regimens', () => {
      const result = calculateComprehensiveRisk(
        ['Lisinopril'], 
        20,
        'Hypertension'
      );
      
      expect(result.requiresProviderConsent).toBe(true);
    });

    test('should mark as safe for optimal regimen', () => {
      const result = calculateComprehensiveRisk(
        ['Methyldopa'], 
        20,
        'Hypertension'
      );
      
      // Should be relatively safe with appropriate medication
      expect(result.overallRiskLevel).toBe('low');
    });
  });

  describe('getProviderRecommendation', () => {
    test('should recommend emergency for Category X', () => {
      const riskAssessment = {
        overallRiskLevel: 'critical',
        riskScore: 95,
        requiresObstetrician: true,
        hasCategoryX: true,
        hasCategoryD: false
      };
      
      const result = getProviderRecommendation(riskAssessment);
      
      expect(result.urgency).toBe('emergency');
      expect(result.providerType).toContain('Obstetrician');
      expect(result.escalationNeeded).toBe(true);
    });

    test('should recommend urgent for high risk', () => {
      const riskAssessment = {
        overallRiskLevel: 'high',
        riskScore: 75,
        requiresObstetrician: true,
        hasCategoryX: false,
        hasCategoryD: true
      };
      
      const result = getProviderRecommendation(riskAssessment);
      
      expect(result.urgency).toBe('urgent');
      expect(result.escalationNeeded).toBe(true);
    });

    test('should recommend routine for low risk', () => {
      const riskAssessment = {
        overallRiskLevel: 'low',
        riskScore: 20,
        requiresObstetrician: false,
        hasCategoryX: false,
        hasCategoryD: false
      };
      
      const result = getProviderRecommendation(riskAssessment);
      
      expect(result.urgency).toBe('routine');
      expect(result.escalationNeeded).toBe(false);
    });
  });

  describe('getRiskLevelFromScore', () => {
    test('should return low for score 25', () => {
      expect(getRiskLevelFromScore(25)).toBe('low');
    });

    test('should return moderate for score 45', () => {
      expect(getRiskLevelFromScore(45)).toBe('moderate');
    });

    test('should return high for score 65', () => {
      expect(getRiskLevelFromScore(65)).toBe('high');
    });

    test('should return critical for score 90', () => {
      expect(getRiskLevelFromScore(90)).toBe('critical');
    });

    test('should handle boundary values correctly', () => {
      expect(getRiskLevelFromScore(30)).toBe('moderate');
      expect(getRiskLevelFromScore(50)).toBe('high');
      expect(getRiskLevelFromScore(70)).toBe('critical');
    });
  });

  describe('RISK_THRESHOLDS constant', () => {
    test('should have all thresholds defined', () => {
      expect(RISK_THRESHOLDS.LOW).toBe(30);
      expect(RISK_THRESHOLDS.MODERATE).toBe(50);
      expect(RISK_THRESHOLDS.HIGH).toBe(70);
      expect(RISK_THRESHOLDS.CRITICAL).toBe(85);
    });

    test('should have increasing values', () => {
      expect(RISK_THRESHOLDS.LOW).toBeLessThan(RISK_THRESHOLDS.MODERATE);
      expect(RISK_THRESHOLDS.MODERATE).toBeLessThan(RISK_THRESHOLDS.HIGH);
      expect(RISK_THRESHOLDS.HIGH).toBeLessThan(RISK_THRESHOLDS.CRITICAL);
    });
  });
});
