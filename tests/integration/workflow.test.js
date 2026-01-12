/**
 * Integration test - Full workflow
 */

const BumpieMeds = require('../../src/index');

describe('Bumpie_Meds Integration', () => {
  let meds;

  beforeEach(() => {
    meds = BumpieMeds.initialize({
      enableAudit: false, // Disable for tests
      cacheEnabled: false
    });
  });

  test('should complete full safety check workflow', async () => {
    // Check medication safety
    const result = await meds.checkSafety('Acetaminophen', 24);
    
    expect(result).toMatchObject({
      safe: true,
      category: 'B',
      riskLevel: 'low',
      trimester: 2,
      weekOfPregnancy: 24
    });

    expect(result.medication).toMatchObject({
      name: 'Acetaminophen',
      genericName: 'Acetaminophen',
      rxcui: '161'
    });

    expect(result.warnings).toBeDefined();
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  test('should find alternatives for unsafe medication', async () => {
    const alternatives = await meds.findAlternatives('Ibuprofen', 30);
    
    expect(alternatives).toBeDefined();
    expect(Array.isArray(alternatives)).toBe(true);
    expect(alternatives.length).toBeGreaterThan(0);
    
    // Should suggest Acetaminophen
    const acetaminophen = alternatives.find(a => a.name === 'Acetaminophen');
    expect(acetaminophen).toBeDefined();
  });

  test('should handle Category X medication correctly', async () => {
    const result = await meds.checkSafety('Isotretinoin', 15);
    
    expect(result.safe).toBe(false);
    expect(result.category).toBe('X');
    expect(result.riskLevel).toBe('severe');
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings.some(w => w.includes('CONTRAINDICATED'))).toBe(true);
  });

  test('should get trimester-specific information', async () => {
    const info = await meds.getTrimesterInfo('Aspirin', 1);
    
    expect(info).toBeDefined();
    expect(info.safe).toBe(false);
    expect(info.risk).toBe('high');
    expect(info.alternatives).toContain('Acetaminophen');
  });

  test('should return FDA disclaimer', () => {
    const disclaimer = meds.getDisclaimer();
    
    expect(disclaimer).toBeDefined();
    expect(disclaimer).toContain('MEDICAL DISCLAIMER');
    expect(disclaimer).toContain('consult');
  });
});
