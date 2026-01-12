/**
 * Pregnancy Interaction Checker Tests
 * 
 * Tests for pregnancy-specific drug interactions and maternal conditions
 */

const {
  checkPregnancyInteractions,
  getSafeAlternativesForCondition,
  assessMedicationRegimen,
  PREGNANCY_INTERACTIONS,
  MATERNAL_CONDITIONS
} = require('../../src/services/pregnancy-interaction-checker');

describe('Pregnancy Interaction Checker', () => {

  describe('checkPregnancyInteractions', () => {
    test('should detect Category X contraindication', () => {
      const result = checkPregnancyInteractions(['Atorvastatin'], 20);
      
      expect(result.safe).toBe(false);
      expect(result.highestSeverity).toBe('critical');
      expect(result.interactionsFound).toBeGreaterThan(0);
      expect(result.requiresObstetrician).toBe(true);
    });

    test('should detect Category D high risk', () => {
      const result = checkPregnancyInteractions(['Lisinopril'], 20);
      
      expect(result.safe).toBe(false);
      expect(result.highestSeverity).toBe('high');
      expect(result.requiresProviderConsent).toBe(true);
    });

    test('should detect drug-drug interactions (Ibuprofen + Aspirin)', () => {
      const result = checkPregnancyInteractions(['Ibuprofen', 'Aspirin'], 35);
      
      expect(result.interactionsFound).toBeGreaterThan(0);
      const interaction = result.interactions.find(i => i.type === 'drug_interaction');
      expect(interaction).toBeDefined();
    });

    test('should assess trimester-specific risks correctly', () => {
      const result1st = checkPregnancyInteractions(['Ibuprofen'], 6);
      const result3rd = checkPregnancyInteractions(['Ibuprofen'], 36);
      
      // Both should show risks but 3rd trimester may be more severe for NSAIDs
      expect(result1st.interactionsFound).toBeGreaterThan(0);
      expect(result3rd.interactionsFound).toBeGreaterThan(0);
    });

    test('should return safe for Category A/B medications', () => {
      const result = checkPregnancyInteractions(['Acetaminophen'], 20);
      
      expect(result.safe).toBe(true);
      expect(result.highestSeverity).toBe('none');
    });

    test('should throw error for empty medication array', () => {
      expect(() => checkPregnancyInteractions([], 20)).toThrow();
    });

    test('should throw error for invalid week', () => {
      expect(() => checkPregnancyInteractions(['Acetaminophen'], 0)).toThrow();
    });

    test('should include assessment date', () => {
      const result = checkPregnancyInteractions(['Acetaminophen'], 20);
      expect(result.assessmentDate).toBeTruthy();
    });
  });

  describe('getSafeAlternativesForCondition', () => {
    test('should return safe alternatives for hypertension', () => {
      const result = getSafeAlternativesForCondition('Hypertension', 1);
      
      expect(result.found).toBe(true);
      expect(result.condition).toContain('Hypertension');
      expect(result.safeMedications).toBeDefined();
      expect(result.safeMedications.firstLine).toContain('Methyldopa');
      expect(result.safeMedications.avoid).toContain('ACE Inhibitors (Lisinopril)');
    });

    test('should return safe alternatives for diabetes', () => {
      const result = getSafeAlternativesForCondition('Diabetes', 2);
      
      expect(result.found).toBe(true);
      expect(result.safeMedications.firstLine).toContain('Insulin (all types)');
    });

    test('should return safe alternatives for depression', () => {
      const result = getSafeAlternativesForCondition('Depression', 1);
      
      expect(result.found).toBe(true);
      expect(result.safeMedications.firstLine).toContain('Sertraline');
      expect(result.safeMedications.avoid).toContain('Paroxetine (Category D)');
    });

    test('should return safe alternatives for asthma', () => {
      const result = getSafeAlternativesForCondition('Asthma', 3);
      
      expect(result.found).toBe(true);
      expect(result.safeMedications.firstLine).toContain('Albuterol');
    });

    test('should return trimester-specific guidance', () => {
      const result = getSafeAlternativesForCondition('Hypertension', 1);
      
      expect(result.trimesterGuidance).toBeTruthy();
      expect(typeof result.trimesterGuidance).toBe('string');
    });

    test('should return not found for unknown condition', () => {
      const result = getSafeAlternativesForCondition('UnknownCondition', 1);
      
      expect(result.found).toBe(false);
    });
  });

  describe('assessMedicationRegimen', () => {
    test('should assess hypertension regimen with safe medication', () => {
      const result = assessMedicationRegimen(['Methyldopa'], 'Hypertension', 20);
      
      expect(result.condition).toContain('Hypertension');
      expect(result.needsChange).toBe(false);
      expect(result.currentMedications[0].status).toBe('recommended');
    });

    test('should flag unsafe medication for condition', () => {
      const result = assessMedicationRegimen(['Lisinopril'], 'Hypertension', 20);
      
      expect(result.needsChange).toBe(true);
      const lisinoprilStatus = result.currentMedications.find(m => 
        m.medication === 'Lisinopril'
      );
      expect(lisinoprilStatus.status).toBe('avoid');
    });

    test('should assess diabetes regimen', () => {
      const result = assessMedicationRegimen(['Metformin'], 'Diabetes', 20);
      
      expect(result.condition).toBe('Diabetes');
      expect(result.conditionRisks).toBeDefined();
      expect(Array.isArray(result.conditionRisks)).toBe(true);
    });

    test('should detect interactions in regimen', () => {
      const result = assessMedicationRegimen(
        ['Ibuprofen', 'Aspirin'], 
        'Hypertension', 
        35
      );
      
      expect(result.interactions.interactionsFound).toBeGreaterThan(0);
    });

    test('should require provider consent for problematic regimens', () => {
      const result = assessMedicationRegimen(['Lisinopril'], 'Hypertension', 20);
      
      expect(result.requiresProviderConsent).toBe(true);
    });

    test('should throw error for invalid week', () => {
      expect(() => 
        assessMedicationRegimen(['Methyldopa'], 'Hypertension', 0)
      ).toThrow();
    });

    test('should throw error for unknown condition', () => {
      expect(() => 
        assessMedicationRegimen(['Acetaminophen'], 'UnknownCondition', 20)
      ).toThrow();
    });
  });

  describe('PREGNANCY_INTERACTIONS constant', () => {
    test('should define NSAID + ACE inhibitor interaction', () => {
      const interaction = PREGNANCY_INTERACTIONS['ibuprofen_lisinopril'];
      expect(interaction).toBeDefined();
      expect(interaction.severity).toBe('critical');
      expect(interaction.pregnancySpecific).toBe(true);
    });

    test('should have trimester-specific risk levels', () => {
      const interaction = PREGNANCY_INTERACTIONS['ibuprofen_aspirin'];
      expect(interaction.trimesterRisks).toBeDefined();
      expect(interaction.trimesterRisks[1]).toBeDefined();
      expect(interaction.trimesterRisks[2]).toBeDefined();
      expect(interaction.trimesterRisks[3]).toBeDefined();
    });

    test('should include alternatives for unsafe combinations', () => {
      const interaction = PREGNANCY_INTERACTIONS['ibuprofen_lisinopril'];
      expect(interaction.alternatives).toBeDefined();
      expect(interaction.alternatives['Ibuprofen']).toContain('Acetaminophen');
    });
  });

  describe('MATERNAL_CONDITIONS constant', () => {
    test('should define all major conditions', () => {
      expect(MATERNAL_CONDITIONS.HYPERTENSION).toBeDefined();
      expect(MATERNAL_CONDITIONS.DIABETES).toBeDefined();
      expect(MATERNAL_CONDITIONS.DEPRESSION).toBeDefined();
      expect(MATERNAL_CONDITIONS.ASTHMA).toBeDefined();
      expect(MATERNAL_CONDITIONS.EPILEPSY).toBeDefined();
      expect(MATERNAL_CONDITIONS.THYROID).toBeDefined();
    });

    test('should have first-line treatments for each condition', () => {
      Object.values(MATERNAL_CONDITIONS).forEach(condition => {
        expect(condition.safeMedications.firstLine).toBeDefined();
        expect(Array.isArray(condition.safeMedications.firstLine)).toBe(true);
        expect(condition.safeMedications.firstLine.length).toBeGreaterThan(0);
      });
    });

    test('should have avoid list for each condition', () => {
      Object.values(MATERNAL_CONDITIONS).forEach(condition => {
        expect(condition.safeMedications.avoid).toBeDefined();
        expect(Array.isArray(condition.safeMedications.avoid)).toBe(true);
      });
    });

    test('should have trimester considerations', () => {
      Object.values(MATERNAL_CONDITIONS).forEach(condition => {
        expect(condition.trimesterConsiderations).toBeDefined();
        expect(condition.trimesterConsiderations[1]).toBeDefined();
        expect(condition.trimesterConsiderations[2]).toBeDefined();
        expect(condition.trimesterConsiderations[3]).toBeDefined();
      });
    });
  });
});
