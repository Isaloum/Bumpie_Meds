/**
 * SafetyChecker Unit Tests
 */

const SafetyChecker = require('../../src/services/SafetyChecker');
const { ERROR_CODES } = require('../../src/utils/constants');

describe('SafetyChecker', () => {
  let checker;

  beforeEach(() => {
    checker = new SafetyChecker({
      dataPath: './src/data',
      cacheEnabled: false
    });
  });

  describe('findMedication', () => {
    test('should find medication by name', async () => {
      const med = await checker.findMedication('Acetaminophen');
      expect(med).toBeDefined();
      expect(med.name).toBe('Acetaminophen');
    });

    test('should find medication by RxCUI', async () => {
      const med = await checker.findMedication('161');
      expect(med).toBeDefined();
      expect(med.rxcui).toBe('161');
    });

    test('should find medication by brand name', async () => {
      const med = await checker.findMedication('Tylenol');
      expect(med).toBeDefined();
      expect(med.brandNames).toContain('Tylenol');
    });

    test('should throw error for unknown medication', async () => {
      await expect(checker.findMedication('InvalidMed123'))
        .rejects
        .toThrow(ERROR_CODES.MEDICATION_NOT_FOUND);
    });
  });

  describe('check', () => {
    test('should return safe result for Acetaminophen in any trimester', async () => {
      const result = await checker.check('Acetaminophen', 24);
      expect(result.safe).toBe(true);
      expect(result.category).toBe('B');
      expect(result.riskLevel).toBe('low');
      expect(result.trimester).toBe(2);
    });

    test('should return unsafe for Aspirin in first trimester', async () => {
      const result = await checker.check('Aspirin', 8);
      expect(result.safe).toBe(false);
      expect(result.category).toBe('D');
      expect(result.riskLevel).toBe('high');
      expect(result.trimester).toBe(1);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    test('should return unsafe for Isotretinoin always', async () => {
      const result = await checker.check('Isotretinoin', 20);
      expect(result.safe).toBe(false);
      expect(result.category).toBe('X');
      expect(result.riskLevel).toBe('severe');
    });

    test('should throw error for invalid week', async () => {
      await expect(checker.check('Acetaminophen', 0))
        .rejects
        .toThrow(ERROR_CODES.INVALID_WEEK);

      await expect(checker.check('Acetaminophen', 50))
        .rejects
        .toThrow(ERROR_CODES.INVALID_WEEK);
    });
  });

  describe('findAlternatives', () => {
    test('should find alternatives for unsafe medication', async () => {
      const alternatives = await checker.findAlternatives('Aspirin', 8);
      expect(alternatives.length).toBeGreaterThan(0);
      expect(alternatives[0].name).toBe('Acetaminophen');
    });

    test('should return empty array for already safe medication', async () => {
      const alternatives = await checker.findAlternatives('Acetaminophen', 20);
      expect(alternatives).toEqual([]);
    });
  });

  describe('calculateRiskScore', () => {
    test('should calculate higher risk for category X', () => {
      const med = { pregnancyCategory: { fda: 'X' } };
      const score = checker.calculateRiskScore(med, 2);
      expect(score).toBeGreaterThan(90);
    });

    test('should calculate low risk for category A', () => {
      const med = { pregnancyCategory: { fda: 'A' } };
      const score = checker.calculateRiskScore(med, 2);
      expect(score).toBeLessThan(20);
    });

    test('should increase risk score in first trimester', () => {
      const med = { pregnancyCategory: { fda: 'C' } };
      const score1 = checker.calculateRiskScore(med, 1);
      const score2 = checker.calculateRiskScore(med, 2);
      expect(score1).toBeGreaterThan(score2);
    });
  });
});
