/**
 * Pregnancy Safety Engine Tests
 * 
 * Comprehensive test suite for pregnancy medication safety checking
 */

const {
  getTrimester,
  isCriticalPeriod,
  calculateRiskScore,
  getRiskLevel,
  checkMedicationSafety,
  findMedication,
  getLactationSafety,
  getTrimesterWarnings,
  FDA_CATEGORIES,
  TRIMESTERS
} = require('../../src/services/pregnancy-safety-engine');

describe('Pregnancy Safety Engine', () => {
  
  describe('getTrimester', () => {
    test('should return first trimester for week 1', () => {
      const result = getTrimester(1);
      expect(result.number).toBe(1);
      expect(result.name).toBe('1st Trimester');
    });

    test('should return first trimester for week 12', () => {
      const result = getTrimester(12);
      expect(result.number).toBe(1);
    });

    test('should return second trimester for week 13', () => {
      const result = getTrimester(13);
      expect(result.number).toBe(2);
      expect(result.name).toBe('2nd Trimester');
    });

    test('should return second trimester for week 27', () => {
      const result = getTrimester(27);
      expect(result.number).toBe(2);
    });

    test('should return third trimester for week 28', () => {
      const result = getTrimester(28);
      expect(result.number).toBe(3);
      expect(result.name).toBe('3rd Trimester');
    });

    test('should return third trimester for week 40', () => {
      const result = getTrimester(40);
      expect(result.number).toBe(3);
    });

    test('should throw error for week 0', () => {
      expect(() => getTrimester(0)).toThrow();
    });

    test('should throw error for week 41', () => {
      expect(() => getTrimester(41)).toThrow();
    });
  });

  describe('isCriticalPeriod', () => {
    test('should identify first trimester as critical', () => {
      const result = isCriticalPeriod(6);
      expect(result.isCritical).toBe(true);
      expect(result.severity).toBe('critical');
    });

    test('should identify week 3-4 as neural tube formation', () => {
      const result = isCriticalPeriod(3);
      expect(result.isCritical).toBe(true);
      expect(result.reason).toContain('Neural tube');
    });

    test('should identify full term weeks as moderate risk', () => {
      const result = isCriticalPeriod(39);
      expect(result.isCritical).toBe(true);
      expect(result.severity).toBe('moderate');
    });

    test('should return false for non-critical periods in 2nd trimester', () => {
      const result = isCriticalPeriod(20);
      expect(result.isCritical).toBe(false);
    });
  });

  describe('calculateRiskScore', () => {
    test('should calculate low score for Category A medication', () => {
      const medication = {
        genericName: 'Levothyroxine',
        pregnancyCategory: { fda: 'A' }
      };
      const score = calculateRiskScore(medication, 20);
      expect(score).toBeLessThanOrEqual(30);
    });

    test('should calculate high score for Category D medication in first trimester', () => {
      const medication = {
        genericName: 'Lisinopril',
        pregnancyCategory: { fda: 'D' }
      };
      const score = calculateRiskScore(medication, 6);
      expect(score).toBeGreaterThan(60);
    });

    test('should calculate very high score for Category X medication', () => {
      const medication = {
        genericName: 'Atorvastatin',
        pregnancyCategory: { fda: 'X' }
      };
      const score = calculateRiskScore(medication, 20);
      expect(score).toBeGreaterThan(80);
    });

    test('should apply trimester multiplier correctly', () => {
      const medication = {
        genericName: 'TestMed',
        pregnancyCategory: { fda: 'C' }
      };
      const score1st = calculateRiskScore(medication, 6);
      const score2nd = calculateRiskScore(medication, 20);
      
      // First trimester should have higher risk
      expect(score1st).toBeGreaterThan(score2nd);
    });

    test('should respect trimester-specific risk overrides', () => {
      const medication = {
        genericName: 'TestMed',
        pregnancyCategory: {
          fda: 'C',
          trimester1: { safe: false, risk: 'high' }
        }
      };
      const score = calculateRiskScore(medication, 6);
      expect(score).toBeGreaterThanOrEqual(65);
    });
  });

  describe('getRiskLevel', () => {
    test('should return low for score 20', () => {
      expect(getRiskLevel(20)).toBe('low');
    });

    test('should return moderate for score 35', () => {
      expect(getRiskLevel(35)).toBe('moderate');
    });

    test('should return caution for score 55', () => {
      expect(getRiskLevel(55)).toBe('caution');
    });

    test('should return high for score 75', () => {
      expect(getRiskLevel(75)).toBe('high');
    });

    test('should return critical for score 90', () => {
      expect(getRiskLevel(90)).toBe('critical');
    });
  });

  describe('findMedication', () => {
    test('should find medication by generic name', () => {
      const result = findMedication('Acetaminophen');
      expect(result).toBeTruthy();
      expect(result.genericName).toBe('Acetaminophen');
    });

    test('should find medication by brand name', () => {
      const result = findMedication('Tylenol');
      expect(result).toBeTruthy();
      expect(result.genericName).toBe('Acetaminophen');
    });

    test('should find medication case-insensitively', () => {
      const result = findMedication('acetaminophen');
      expect(result).toBeTruthy();
    });

    test('should return null for non-existent medication', () => {
      const result = findMedication('NonExistentDrug123');
      expect(result).toBeNull();
    });
  });

  describe('checkMedicationSafety', () => {
    test('should return full safety assessment for Acetaminophen', () => {
      const result = checkMedicationSafety('Acetaminophen', 20);
      
      expect(result.found).toBe(true);
      expect(result.medicationName).toBe('Acetaminophen');
      expect(result.safe).toBe(true);
      expect(result.fdaCategory.category).toBe('B');
      expect(result.riskLevel).toBe('low');
      expect(result.trimester.number).toBe(2);
    });

    test('should mark Category X medication as unsafe', () => {
      const result = checkMedicationSafety('Atorvastatin', 20);
      
      expect(result.found).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.fdaCategory.category).toBe('X');
      expect(result.requiresObstetrician).toBe(true);
    });

    test('should mark Category D medication as requiring provider consent', () => {
      const result = checkMedicationSafety('Lisinopril', 20);
      
      expect(result.found).toBe(true);
      expect(result.safe).toBe(false);
      expect(result.fdaCategory.category).toBe('D');
      expect(result.requiresProviderConsent).toBe(true);
    });

    test('should identify critical period risks', () => {
      const result = checkMedicationSafety('Ibuprofen', 5);
      
      expect(result.criticalPeriod.isCritical).toBe(true);
      expect(result.requiresProviderConsent).toBe(true);
    });

    test('should return not found for unknown medication', () => {
      const result = checkMedicationSafety('UnknownMedication', 20);
      
      expect(result.found).toBe(false);
      expect(result.medicationName).toBe('UnknownMedication');
    });

    test('should throw error for invalid week', () => {
      expect(() => checkMedicationSafety('Acetaminophen', 0)).toThrow();
      expect(() => checkMedicationSafety('Acetaminophen', 50)).toThrow();
    });

    test('should include assessment date', () => {
      const result = checkMedicationSafety('Acetaminophen', 20);
      expect(result.assessmentDate).toBeTruthy();
      expect(new Date(result.assessmentDate)).toBeInstanceOf(Date);
    });
  });

  describe('getLactationSafety', () => {
    test('should return lactation safety for safe medication', () => {
      const result = getLactationSafety('Acetaminophen');
      
      expect(result.found).toBe(true);
      expect(result.safety.level).toBeTruthy();
    });

    test('should return not found for unknown medication', () => {
      const result = getLactationSafety('UnknownMed');
      
      expect(result.found).toBe(false);
    });
  });

  describe('getTrimesterWarnings', () => {
    test('should return empty array when no warnings', () => {
      const warnings = getTrimesterWarnings('Acetaminophen', 1);
      expect(Array.isArray(warnings)).toBe(true);
    });

    test('should throw error for invalid trimester', () => {
      expect(() => getTrimesterWarnings('Acetaminophen', 0)).toThrow();
      expect(() => getTrimesterWarnings('Acetaminophen', 4)).toThrow();
    });

    test('should return empty array for unknown medication', () => {
      const warnings = getTrimesterWarnings('UnknownMed', 2);
      expect(warnings).toEqual([]);
    });
  });

  describe('FDA_CATEGORIES constant', () => {
    test('should have all categories defined', () => {
      expect(FDA_CATEGORIES.A).toBeDefined();
      expect(FDA_CATEGORIES.B).toBeDefined();
      expect(FDA_CATEGORIES.C).toBeDefined();
      expect(FDA_CATEGORIES.D).toBeDefined();
      expect(FDA_CATEGORIES.X).toBeDefined();
    });

    test('should have correct risk levels', () => {
      expect(FDA_CATEGORIES.A.riskLevel).toBe('low');
      expect(FDA_CATEGORIES.B.riskLevel).toBe('low');
      expect(FDA_CATEGORIES.C.riskLevel).toBe('moderate');
      expect(FDA_CATEGORIES.D.riskLevel).toBe('high');
      expect(FDA_CATEGORIES.X.riskLevel).toBe('critical');
    });
  });
});
