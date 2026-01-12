/**
 * TrimesterAnalyzer Unit Tests
 */

const TrimesterAnalyzer = require('../../src/services/TrimesterAnalyzer');
const { ERROR_CODES } = require('../../src/utils/constants');

describe('TrimesterAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new TrimesterAnalyzer();
  });

  describe('getTrimester', () => {
    test('should return 1 for weeks 1-13', () => {
      expect(analyzer.getTrimester(1)).toBe(1);
      expect(analyzer.getTrimester(7)).toBe(1);
      expect(analyzer.getTrimester(13)).toBe(1);
    });

    test('should return 2 for weeks 14-27', () => {
      expect(analyzer.getTrimester(14)).toBe(2);
      expect(analyzer.getTrimester(20)).toBe(2);
      expect(analyzer.getTrimester(27)).toBe(2);
    });

    test('should return 3 for weeks 28+', () => {
      expect(analyzer.getTrimester(28)).toBe(3);
      expect(analyzer.getTrimester(35)).toBe(3);
      expect(analyzer.getTrimester(40)).toBe(3);
      expect(analyzer.getTrimester(42)).toBe(3);
    });

    test('should throw error for invalid week', () => {
      expect(() => analyzer.getTrimester(0)).toThrow(ERROR_CODES.INVALID_WEEK);
      expect(() => analyzer.getTrimester(50)).toThrow(ERROR_CODES.INVALID_WEEK);
      expect(() => analyzer.getTrimester(-5)).toThrow(ERROR_CODES.INVALID_WEEK);
    });
  });

  describe('isCriticalPeriod', () => {
    test('should return true for first trimester', () => {
      expect(analyzer.isCriticalPeriod(1)).toBe(true);
      expect(analyzer.isCriticalPeriod(13)).toBe(true);
    });

    test('should return false for second and third trimester', () => {
      expect(analyzer.isCriticalPeriod(14)).toBe(false);
      expect(analyzer.isCriticalPeriod(28)).toBe(false);
    });
  });

  describe('isOrganogenesisPeriod', () => {
    test('should return true for first trimester', () => {
      expect(analyzer.isOrganogenesisPeriod(8)).toBe(true);
    });

    test('should return false for second and third trimester', () => {
      expect(analyzer.isOrganogenesisPeriod(20)).toBe(false);
      expect(analyzer.isOrganogenesisPeriod(35)).toBe(false);
    });
  });

  describe('getWarnings', () => {
    const medication = {
      pregnancyCategory: {
        trimester1: {
          warnings: ['Warning 1', 'Warning 2']
        },
        trimester2: {
          warnings: ['Different warning']
        }
      }
    };

    test('should return correct warnings for trimester', () => {
      const warnings1 = analyzer.getWarnings(medication, 1);
      expect(warnings1).toHaveLength(2);
      expect(warnings1).toContain('Warning 1');

      const warnings2 = analyzer.getWarnings(medication, 2);
      expect(warnings2).toHaveLength(1);
      expect(warnings2).toContain('Different warning');
    });

    test('should return default warning if no data', () => {
      const emptyMed = { pregnancyCategory: {} };
      const warnings = analyzer.getWarnings(emptyMed, 1);
      expect(warnings[0]).toContain('Consult your healthcare provider');
    });
  });
});
