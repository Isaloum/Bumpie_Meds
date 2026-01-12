/**
 * Pregnancy Interaction Checker
 * 
 * Checks for dangerous drug interactions during pregnancy
 * Includes pregnancy-specific interactions and maternal health conditions
 * 
 * @module pregnancy-interaction-checker
 */

const { findMedication, getTrimester, FDA_CATEGORIES } = require('./pregnancy-safety-engine');
const { validateWeek } = require('../utils/validators');

/**
 * Pregnancy-specific drug interactions
 * Some interactions that are moderate normally become serious during pregnancy
 */
const PREGNANCY_INTERACTIONS = {
  // NSAIDs + ACE Inhibitors - High risk during pregnancy
  'ibuprofen_lisinopril': {
    medications: ['Ibuprofen', 'Lisinopril'],
    severity: 'critical',
    normalSeverity: 'moderate',
    pregnancySpecific: true,
    reason: 'Combined use significantly increases risk of renal failure in fetus',
    effects: {
      maternal: ['Kidney damage', 'Blood pressure instability'],
      fetal: ['Renal failure', 'Oligohydramnios', 'Fetal death'],
      neonatal: ['Kidney dysfunction', 'Hypotension']
    },
    trimesterRisks: {
      1: 'high',
      2: 'critical',
      3: 'critical'
    },
    recommendation: 'AVOID COMBINATION - Use safer alternatives',
    alternatives: {
      'Ibuprofen': ['Acetaminophen'],
      'Lisinopril': ['Methyldopa', 'Labetalol']
    }
  },

  // NSAIDs + NSAIDs - Increased bleeding risk
  'ibuprofen_aspirin': {
    medications: ['Ibuprofen', 'Aspirin'],
    severity: 'high',
    normalSeverity: 'moderate',
    pregnancySpecific: true,
    reason: 'Increased bleeding risk, especially near delivery',
    effects: {
      maternal: ['Increased bleeding', 'Prolonged labor'],
      fetal: ['Premature closure of ductus arteriosus'],
      neonatal: ['Bleeding complications', 'Pulmonary hypertension']
    },
    trimesterRisks: {
      1: 'moderate',
      2: 'high',
      3: 'critical'
    },
    recommendation: 'Avoid in 3rd trimester; use caution earlier',
    alternatives: {
      'Ibuprofen': ['Acetaminophen'],
      'Aspirin': ['Low-dose aspirin under supervision only']
    }
  },

  // SSRIs + NSAIDs - Bleeding risk
  'sertraline_ibuprofen': {
    medications: ['Sertraline', 'Ibuprofen'],
    severity: 'high',
    normalSeverity: 'moderate',
    pregnancySpecific: true,
    reason: 'Both increase bleeding risk; synergistic effect during pregnancy',
    effects: {
      maternal: ['Postpartum hemorrhage risk'],
      fetal: ['Persistent pulmonary hypertension (3rd trimester)'],
      neonatal: ['Bleeding', 'Withdrawal symptoms']
    },
    trimesterRisks: {
      1: 'moderate',
      2: 'moderate',
      3: 'high'
    },
    recommendation: 'Avoid combination; use acetaminophen instead of NSAIDs',
    alternatives: {
      'Ibuprofen': ['Acetaminophen']
    }
  },

  // Statins + Pregnancy (any medication)
  'atorvastatin_pregnancy': {
    medications: ['Atorvastatin'],
    severity: 'critical',
    normalSeverity: 'n/a',
    pregnancySpecific: true,
    reason: 'Category X - Absolutely contraindicated in pregnancy',
    effects: {
      maternal: ['None specific'],
      fetal: ['Severe birth defects', 'Skeletal abnormalities', 'CNS malformations'],
      neonatal: ['Multiple congenital anomalies']
    },
    trimesterRisks: {
      1: 'critical',
      2: 'critical',
      3: 'critical'
    },
    recommendation: 'DISCONTINUE IMMEDIATELY - Never use during pregnancy',
    alternatives: {
      'Atorvastatin': ['Dietary management', 'Bile acid sequestrants (limited use)']
    }
  },

  // ACE Inhibitors + Pregnancy
  'lisinopril_pregnancy': {
    medications: ['Lisinopril'],
    severity: 'critical',
    normalSeverity: 'n/a',
    pregnancySpecific: true,
    reason: 'Causes fetal renal damage and death in 2nd/3rd trimesters',
    effects: {
      maternal: ['Hypotension'],
      fetal: ['Renal failure', 'Oligohydramnios', 'Intrauterine growth restriction', 'Death'],
      neonatal: ['Anuria', 'Hypotension', 'Renal failure', 'Death']
    },
    trimesterRisks: {
      1: 'high',
      2: 'critical',
      3: 'critical'
    },
    recommendation: 'DISCONTINUE - Switch to pregnancy-safe antihypertensive',
    alternatives: {
      'Lisinopril': ['Methyldopa', 'Labetalol', 'Nifedipine']
    }
  },

  // ARBs + Pregnancy  
  'losartan_pregnancy': {
    medications: ['Losartan'],
    severity: 'critical',
    normalSeverity: 'n/a',
    pregnancySpecific: true,
    reason: 'Similar mechanism to ACE inhibitors - causes fetal harm',
    effects: {
      maternal: ['Hypotension'],
      fetal: ['Renal failure', 'Oligohydramnios', 'Skull hypoplasia', 'Death'],
      neonatal: ['Anuria', 'Hypotension', 'Renal failure']
    },
    trimesterRisks: {
      1: 'high',
      2: 'critical',
      3: 'critical'
    },
    recommendation: 'DISCONTINUE - Switch to safer blood pressure medication',
    alternatives: {
      'Losartan': ['Methyldopa', 'Labetalol', 'Nifedipine']
    }
  }
};

/**
 * Maternal health conditions and medication considerations
 */
const MATERNAL_CONDITIONS = {
  HYPERTENSION: {
    condition: 'Hypertension (High Blood Pressure)',
    risksInPregnancy: ['Preeclampsia', 'Placental abruption', 'Preterm birth'],
    safeMedications: {
      firstLine: ['Methyldopa', 'Labetalol', 'Nifedipine'],
      secondLine: ['Hydralazine'],
      avoid: ['ACE Inhibitors (Lisinopril)', 'ARBs (Losartan)', 'Atenolol']
    },
    trimesterConsiderations: {
      1: 'Close monitoring; establish safe medication regimen',
      2: 'Monitor for preeclampsia; adjust medications as needed',
      3: 'Prepare for delivery; may need medication adjustments'
    }
  },

  DIABETES: {
    condition: 'Diabetes',
    risksInPregnancy: ['Macrosomia', 'Birth defects', 'Preeclampsia', 'Preterm birth'],
    safeMedications: {
      firstLine: ['Insulin (all types)', 'Metformin (growing evidence)'],
      secondLine: ['Glyburide (limited use)'],
      avoid: ['Most oral hypoglycemics', 'GLP-1 agonists', 'SGLT2 inhibitors']
    },
    trimesterConsiderations: {
      1: 'Strict glucose control critical for organ formation',
      2: 'Monitor for macrosomia; adjust insulin as resistance increases',
      3: 'Prepare for delivery; monitor for complications'
    }
  },

  DEPRESSION: {
    condition: 'Depression',
    risksInPregnancy: ['Poor prenatal care', 'Preterm birth', 'Low birth weight'],
    safeMedications: {
      firstLine: ['Sertraline', 'Fluoxetine (some risk)'],
      secondLine: ['Citalopram', 'Escitalopram'],
      avoid: ['Paroxetine (Category D)', 'MAO inhibitors']
    },
    trimesterConsiderations: {
      1: 'Weigh benefits vs risks; some small risk of defects',
      2: 'Generally safer; continue if needed',
      3: 'Monitor for neonatal adaptation syndrome; taper if possible'
    }
  },

  ASTHMA: {
    condition: 'Asthma',
    risksInPregnancy: ['Preeclampsia', 'Preterm birth', 'Low birth weight'],
    safeMedications: {
      firstLine: ['Albuterol', 'Budesonide inhaled'],
      secondLine: ['Montelukast', 'Other inhaled corticosteroids'],
      avoid: ['Epinephrine (except emergencies)', 'Systemic steroids (minimize)']
    },
    trimesterConsiderations: {
      1: 'Maintain good control; uncontrolled asthma more dangerous than meds',
      2: 'Continue treatment; monitor lung function',
      3: 'Prepare for delivery; have emergency plan'
    }
  },

  EPILEPSY: {
    condition: 'Epilepsy',
    risksInPregnancy: ['Seizures harm both mother and fetus', 'Medication-related birth defects'],
    safeMedications: {
      firstLine: ['Lamotrigine', 'Levetiracetam'],
      secondLine: ['Oxcarbazepine'],
      avoid: ['Valproate (highest risk)', 'Phenytoin', 'Carbamazepine']
    },
    trimesterConsiderations: {
      1: 'Folic acid critical; switch to safer medication if possible',
      2: 'Monitor medication levels; pregnancy increases metabolism',
      3: 'Plan for delivery; seizure control essential'
    }
  },

  THYROID: {
    condition: 'Thyroid Disorders',
    risksInPregnancy: ['Miscarriage', 'Preeclampsia', 'Preterm birth', 'Developmental delays'],
    safeMedications: {
      firstLine: ['Levothyroxine (hypothyroid)', 'Propylthiouracil (hyperthyroid - 1st trimester)', 'Methimazole (hyperthyroid - 2nd/3rd trimester)'],
      secondLine: [],
      avoid: ['Radioactive iodine']
    },
    trimesterConsiderations: {
      1: 'Critical for fetal brain development; increase levothyroxine dose',
      2: 'Continue monitoring; adjust as needed',
      3: 'Prepare for postpartum thyroid changes'
    }
  }
};

/**
 * Check for drug interactions during pregnancy
 * 
 * @param {Array<string>} medicationNames - Array of medication names
 * @param {number} weekOfPregnancy - Current week of pregnancy
 * @returns {Object} Interaction assessment
 */
function checkPregnancyInteractions(medicationNames, weekOfPregnancy) {
  if (!Array.isArray(medicationNames) || medicationNames.length === 0) {
    throw new Error('Medication names must be a non-empty array');
  }

  validateWeek(weekOfPregnancy);

  const trimester = getTrimester(weekOfPregnancy);
  const interactions = [];
  const warnings = [];
  let highestSeverity = 'none';

  // Check each medication individually for pregnancy contraindications
  medicationNames.forEach(medName => {
    const med = findMedication(medName);
    if (med) {
      const fdaCategory = med.pregnancyCategory?.fda;
      
      // Check for Category X (contraindicated)
      if (fdaCategory === 'X') {
        const interactionKey = `${med.genericName.toLowerCase()}_pregnancy`;
        const interaction = PREGNANCY_INTERACTIONS[interactionKey] || {
          medications: [med.genericName],
          severity: 'critical',
          pregnancySpecific: true,
          reason: 'Category X - Contraindicated in pregnancy',
          effects: {
            maternal: ['Unknown'],
            fetal: ['Birth defects', 'Fetal harm'],
            neonatal: ['Potential complications']
          },
          trimesterRisks: { 1: 'critical', 2: 'critical', 3: 'critical' },
          recommendation: 'DISCONTINUE IMMEDIATELY',
          alternatives: {}
        };
        
        interactions.push({
          type: 'pregnancy_contraindication',
          ...interaction,
          currentTrimester: trimester.number
        });
        
        highestSeverity = 'critical';
      }
      
      // Check for Category D (serious risk)
      else if (fdaCategory === 'D') {
        const interactionKey = `${med.genericName.toLowerCase()}_pregnancy`;
        const interaction = PREGNANCY_INTERACTIONS[interactionKey] || {
          medications: [med.genericName],
          severity: 'high',
          pregnancySpecific: true,
          reason: 'Category D - Evidence of fetal risk',
          effects: {
            maternal: ['Varies by medication'],
            fetal: ['Fetal harm possible'],
            neonatal: ['Potential complications']
          },
          trimesterRisks: { 1: 'high', 2: 'high', 3: 'high' },
          recommendation: 'Avoid unless benefits outweigh risks',
          alternatives: {}
        };
        
        interactions.push({
          type: 'pregnancy_high_risk',
          ...interaction,
          currentTrimester: trimester.number
        });
        
        if (highestSeverity !== 'critical') {
          highestSeverity = 'high';
        }
      }
    }
  });

  // Check for drug-drug interactions
  for (let i = 0; i < medicationNames.length; i++) {
    for (let j = i + 1; j < medicationNames.length; j++) {
      const med1 = findMedication(medicationNames[i]);
      const med2 = findMedication(medicationNames[j]);
      
      if (med1 && med2) {
        // Create interaction key (alphabetically sorted)
        const names = [med1.genericName.toLowerCase(), med2.genericName.toLowerCase()].sort();
        const interactionKey = names.join('_');
        
        const interaction = PREGNANCY_INTERACTIONS[interactionKey];
        
        if (interaction) {
          const trimesterRisk = interaction.trimesterRisks[trimester.number];
          
          interactions.push({
            type: 'drug_interaction',
            ...interaction,
            currentTrimester: trimester.number,
            currentTrimesterRisk: trimesterRisk
          });
          
          // Update highest severity
          if (interaction.severity === 'critical' || trimesterRisk === 'critical') {
            highestSeverity = 'critical';
          } else if (interaction.severity === 'high' && highestSeverity !== 'critical') {
            highestSeverity = 'high';
          } else if (interaction.severity === 'moderate' && highestSeverity === 'none') {
            highestSeverity = 'moderate';
          }
        }
      }
    }
  }

  // Generate overall assessment
  const requiresProviderConsent = highestSeverity === 'high' || highestSeverity === 'critical';
  const requiresObstetrician = highestSeverity === 'critical';

  return {
    weekOfPregnancy,
    trimester: trimester.number,
    medications: medicationNames,
    interactionsFound: interactions.length,
    interactions,
    highestSeverity,
    safe: highestSeverity === 'none',
    requiresProviderConsent,
    requiresObstetrician,
    recommendation: generateInteractionRecommendation(highestSeverity, interactions),
    assessmentDate: new Date().toISOString()
  };
}

/**
 * Get safe alternatives for a maternal health condition
 * 
 * @param {string} conditionName - Name of maternal condition
 * @param {number} trimesterNumber - Current trimester (1, 2, or 3)
 * @returns {Object} Safe medication options
 */
function getSafeAlternativesForCondition(conditionName, trimesterNumber) {
  const conditionKey = conditionName.toUpperCase().replace(/\s+/g, '_');
  const condition = MATERNAL_CONDITIONS[conditionKey];
  
  if (!condition) {
    return {
      found: false,
      condition: conditionName,
      message: 'Condition not found in database',
      recommendation: 'Consult healthcare provider for medication options'
    };
  }

  return {
    found: true,
    condition: condition.condition,
    trimester: trimesterNumber,
    risks: condition.risksInPregnancy,
    safeMedications: condition.safeMedications,
    trimesterGuidance: condition.trimesterConsiderations[trimesterNumber],
    recommendation: `First-line treatments: ${condition.safeMedications.firstLine.join(', ')}`
  };
}

/**
 * Assess medication regimen for maternal condition
 * 
 * @param {Array<string>} currentMedications - Current medications
 * @param {string} maternalCondition - Maternal health condition
 * @param {number} weekOfPregnancy - Current week
 * @returns {Object} Comprehensive assessment
 */
function assessMedicationRegimen(currentMedications, maternalCondition, weekOfPregnancy) {
  validateWeek(weekOfPregnancy);
  
  const trimester = getTrimester(weekOfPregnancy);
  const conditionKey = maternalCondition.toUpperCase().replace(/\s+/g, '_');
  const condition = MATERNAL_CONDITIONS[conditionKey];
  
  if (!condition) {
    throw new Error(`Unknown maternal condition: ${maternalCondition}`);
  }

  // Check interactions
  const interactionResult = checkPregnancyInteractions(currentMedications, weekOfPregnancy);
  
  // Analyze each medication against recommended list
  const medicationAnalysis = currentMedications.map(medName => {
    const med = findMedication(medName);
    const genericName = med?.genericName || medName;
    
    const isFirstLine = condition.safeMedications.firstLine.some(safe => 
      safe.toLowerCase().includes(genericName.toLowerCase()) || 
      genericName.toLowerCase().includes(safe.toLowerCase())
    );
    
    const isSecondLine = condition.safeMedications.secondLine.some(safe => 
      safe.toLowerCase().includes(genericName.toLowerCase()) || 
      genericName.toLowerCase().includes(safe.toLowerCase())
    );
    
    const shouldAvoid = condition.safeMedications.avoid.some(avoid => 
      avoid.toLowerCase().includes(genericName.toLowerCase()) || 
      genericName.toLowerCase().includes(avoid.toLowerCase())
    );

    return {
      medication: genericName,
      status: shouldAvoid ? 'avoid' : isFirstLine ? 'recommended' : isSecondLine ? 'acceptable' : 'unknown',
      recommendation: shouldAvoid 
        ? `DISCONTINUE - Not safe for ${condition.condition} during pregnancy`
        : isFirstLine 
        ? 'CONTINUE - First-line treatment'
        : isSecondLine
        ? 'ACCEPTABLE - Second-line option'
        : 'REVIEW - Consult provider'
    };
  });

  const needsChange = medicationAnalysis.some(m => m.status === 'avoid');
  const allRecommended = medicationAnalysis.every(m => m.status === 'recommended');

  return {
    condition: condition.condition,
    trimester: trimester.number,
    weekOfPregnancy,
    currentMedications: medicationAnalysis,
    interactions: interactionResult,
    conditionRisks: condition.risksInPregnancy,
    trimesterGuidance: condition.trimesterConsiderations[trimester.number],
    needsChange,
    optimal: allRecommended && !interactionResult.interactionsFound,
    recommendations: generateRegimenRecommendations(medicationAnalysis, condition),
    requiresProviderConsent: needsChange || interactionResult.requiresProviderConsent,
    requiresObstetrician: interactionResult.requiresObstetrician,
    assessmentDate: new Date().toISOString()
  };
}

/**
 * Generate recommendation text for interactions
 */
function generateInteractionRecommendation(severity, interactions) {
  if (severity === 'critical') {
    return '🚫 CRITICAL INTERACTIONS DETECTED: Immediate medical attention required. Do not take these medications together during pregnancy.';
  }
  
  if (severity === 'high') {
    return '❌ SERIOUS INTERACTIONS: Consult your obstetrician before continuing these medications together.';
  }
  
  if (severity === 'moderate') {
    return '⚠️ MODERATE INTERACTIONS: Discuss with your healthcare provider. Close monitoring may be needed.';
  }
  
  return '✅ No significant pregnancy-specific interactions detected. Continue as directed by your provider.';
}

/**
 * Generate recommendations for medication regimen
 */
function generateRegimenRecommendations(analysis, condition) {
  const recommendations = [];
  
  analysis.forEach(med => {
    if (med.status === 'avoid') {
      recommendations.push({
        action: 'DISCONTINUE',
        medication: med.medication,
        reason: `Not safe for ${condition.condition} during pregnancy`,
        alternatives: condition.safeMedications.firstLine
      });
    } else if (med.status === 'unknown') {
      recommendations.push({
        action: 'REVIEW',
        medication: med.medication,
        reason: 'Not in standard treatment list',
        alternatives: []
      });
    }
  });

  if (recommendations.length === 0) {
    recommendations.push({
      action: 'CONTINUE',
      reason: 'Current regimen appears appropriate',
      note: 'Continue regular monitoring with healthcare provider'
    });
  }

  return recommendations;
}

module.exports = {
  // Constants
  PREGNANCY_INTERACTIONS,
  MATERNAL_CONDITIONS,
  
  // Core functions
  checkPregnancyInteractions,
  getSafeAlternativesForCondition,
  assessMedicationRegimen,
  
  // Helper functions
  generateInteractionRecommendation,
  generateRegimenRecommendations
};
