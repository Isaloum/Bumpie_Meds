/**
 * Pregnancy Risk Calculator
 * 
 * Calculates composite risk scores for medication use during pregnancy
 * Combines individual medication risks, drug interactions, and maternal conditions
 * 
 * @module pregnancy-risk-calculator
 */

const { 
  checkMedicationSafety, 
  calculateRiskScore,
  getTrimester,
  findMedication,
  FDA_CATEGORIES 
} = require('./pregnancy-safety-engine');

const { 
  checkPregnancyInteractions,
  assessMedicationRegimen,
  MATERNAL_CONDITIONS 
} = require('./pregnancy-interaction-checker');

const { validateWeek } = require('../utils/validators');

/**
 * Risk level thresholds
 */
const RISK_THRESHOLDS = {
  LOW: 30,
  MODERATE: 50,
  HIGH: 70,
  CRITICAL: 85
};

/**
 * Calculate composite pregnancy risk for single medication
 * 
 * @param {string} medicationName - Medication name
 * @param {number} weekOfPregnancy - Current week of pregnancy
 * @returns {Object} Risk assessment
 */
function calculateSingleMedicationRisk(medicationName, weekOfPregnancy) {
  validateWeek(weekOfPregnancy);
  
  const safetyCheck = checkMedicationSafety(medicationName, weekOfPregnancy);
  
  if (!safetyCheck.found) {
    return {
      found: false,
      medicationName,
      riskLevel: 'unknown',
      recommendation: 'Medication not in database - consult healthcare provider'
    };
  }

  return {
    found: true,
    medicationName: safetyCheck.genericName,
    weekOfPregnancy,
    trimester: safetyCheck.trimester.number,
    riskScore: safetyCheck.riskScore,
    riskLevel: safetyCheck.riskLevel,
    fdaCategory: safetyCheck.fdaCategory.category,
    safe: safetyCheck.safe,
    criticalPeriod: safetyCheck.criticalPeriod.isCritical,
    warnings: safetyCheck.warnings,
    alternatives: safetyCheck.alternatives,
    recommendation: safetyCheck.recommendation,
    requiresProviderConsent: safetyCheck.requiresProviderConsent,
    requiresObstetrician: safetyCheck.requiresObstetrician
  };
}

/**
 * Calculate composite risk for multiple medications
 * 
 * @param {Array<string>} medicationNames - Array of medication names
 * @param {number} weekOfPregnancy - Current week of pregnancy
 * @returns {Object} Composite risk assessment
 */
function calculateMultipleMedicationRisk(medicationNames, weekOfPregnancy) {
  if (!Array.isArray(medicationNames) || medicationNames.length === 0) {
    throw new Error('Medication names must be a non-empty array');
  }

  validateWeek(weekOfPregnancy);

  const trimester = getTrimester(weekOfPregnancy);
  
  // Assess each medication individually
  const medicationRisks = medicationNames.map(medName => 
    calculateSingleMedicationRisk(medName, weekOfPregnancy)
  );

  // Check for interactions
  const interactionCheck = checkPregnancyInteractions(medicationNames, weekOfPregnancy);

  // Calculate composite risk score
  const compositeScore = calculateCompositeScore(medicationRisks, interactionCheck);
  const overallRiskLevel = getRiskLevelFromScore(compositeScore);

  // Determine highest individual risk
  const highestIndividualRisk = Math.max(
    ...medicationRisks.filter(m => m.found).map(m => m.riskScore || 0)
  );

  // Check if any Category X medications
  const hasCategoryX = medicationRisks.some(m => m.found && m.fdaCategory === 'X');
  const hasCategoryD = medicationRisks.some(m => m.found && m.fdaCategory === 'D');

  // Determine if requires medical oversight
  const requiresProviderConsent = 
    compositeScore > RISK_THRESHOLDS.MODERATE || 
    hasCategoryD || 
    hasCategoryX ||
    interactionCheck.requiresProviderConsent;

  const requiresObstetrician = 
    compositeScore > RISK_THRESHOLDS.HIGH || 
    hasCategoryX ||
    interactionCheck.requiresObstetrician;

  // Collect all warnings
  const allWarnings = [];
  medicationRisks.forEach(med => {
    if (med.found && med.warnings && med.warnings.length > 0) {
      allWarnings.push(...med.warnings.map(w => ({
        medication: med.medicationName,
        warning: w
      })));
    }
  });

  // Collect all alternatives
  const allAlternatives = [];
  medicationRisks.forEach(med => {
    if (med.found && med.alternatives && med.alternatives.length > 0) {
      allAlternatives.push({
        medication: med.medicationName,
        alternatives: med.alternatives
      });
    }
  });

  // Add interaction-based alternatives
  if (interactionCheck.interactions) {
    interactionCheck.interactions.forEach(interaction => {
      if (interaction.alternatives) {
        Object.keys(interaction.alternatives).forEach(medName => {
          const existing = allAlternatives.find(a => 
            a.medication.toLowerCase() === medName.toLowerCase()
          );
          
          if (!existing) {
            allAlternatives.push({
              medication: medName,
              alternatives: interaction.alternatives[medName]
            });
          } else {
            // Merge alternatives
            existing.alternatives = [
              ...new Set([...existing.alternatives, ...interaction.alternatives[medName]])
            ];
          }
        });
      }
    });
  }

  // Generate recommendations
  const recommendations = generateMultiMedicationRecommendations(
    medicationRisks,
    interactionCheck,
    overallRiskLevel,
    hasCategoryX,
    hasCategoryD
  );

  return {
    weekOfPregnancy,
    trimester: trimester.number,
    medicationCount: medicationNames.length,
    medicationRisks,
    interactionRisks: interactionCheck.interactions || [],
    overallRiskLevel,
    riskScore: compositeScore,
    highestIndividualRisk,
    safe: overallRiskLevel === 'low' && !hasCategoryD && !hasCategoryX,
    hasCategoryX,
    hasCategoryD,
    warnings: allWarnings,
    safeAlternatives: allAlternatives,
    recommendations,
    requiresProviderConsent,
    requiresObstetrician,
    assessmentDate: new Date().toISOString()
  };
}

/**
 * Calculate comprehensive risk including maternal condition
 * 
 * @param {Array<string>} medicationNames - Medications being taken
 * @param {number} weekOfPregnancy - Current week
 * @param {string} maternalCondition - Maternal health condition (optional)
 * @returns {Object} Comprehensive risk assessment
 */
function calculateComprehensiveRisk(medicationNames, weekOfPregnancy, maternalCondition = null) {
  validateWeek(weekOfPregnancy);

  // Get multi-medication risk
  const medicationRisk = calculateMultipleMedicationRisk(medicationNames, weekOfPregnancy);

  // If no maternal condition, return medication risk only
  if (!maternalCondition) {
    return {
      ...medicationRisk,
      maternalCondition: null,
      conditionManagement: null
    };
  }

  // Assess medication regimen for maternal condition
  const regimenAssessment = assessMedicationRegimen(
    medicationNames,
    maternalCondition,
    weekOfPregnancy
  );

  // Adjust composite score based on condition appropriateness
  let adjustedScore = medicationRisk.riskScore;
  
  // If medications are not appropriate for condition, increase risk
  if (regimenAssessment.needsChange) {
    adjustedScore += 15; // Significant penalty for inappropriate medications
  } else if (!regimenAssessment.optimal) {
    adjustedScore += 5; // Minor penalty for suboptimal regimen
  }

  // Cap at 100
  adjustedScore = Math.min(adjustedScore, 100);
  const adjustedRiskLevel = getRiskLevelFromScore(adjustedScore);

  // Merge recommendations
  const combinedRecommendations = [
    ...medicationRisk.recommendations,
    ...regimenAssessment.recommendations.map(rec => ({
      type: 'condition_management',
      ...rec
    }))
  ];

  return {
    weekOfPregnancy,
    trimester: medicationRisk.trimester,
    medicationCount: medicationNames.length,
    
    // Medication risks
    medicationRisks: medicationRisk.medicationRisks,
    interactionRisks: medicationRisk.interactionRisks,
    
    // Maternal condition
    maternalCondition: regimenAssessment.condition,
    conditionManagement: {
      optimal: regimenAssessment.optimal,
      needsChange: regimenAssessment.needsChange,
      currentMedications: regimenAssessment.currentMedications,
      conditionRisks: regimenAssessment.conditionRisks,
      trimesterGuidance: regimenAssessment.trimesterGuidance
    },
    
    // Overall risk
    overallRiskLevel: adjustedRiskLevel,
    riskScore: adjustedScore,
    originalRiskScore: medicationRisk.riskScore,
    riskAdjustment: adjustedScore - medicationRisk.riskScore,
    
    // Safety flags
    safe: adjustedRiskLevel === 'low' && regimenAssessment.optimal,
    hasCategoryX: medicationRisk.hasCategoryX,
    hasCategoryD: medicationRisk.hasCategoryD,
    
    // Warnings and alternatives
    warnings: medicationRisk.warnings,
    safeAlternatives: medicationRisk.safeAlternatives,
    
    // Recommendations
    recommendations: combinedRecommendations,
    
    // Medical oversight
    requiresProviderConsent: 
      medicationRisk.requiresProviderConsent || 
      regimenAssessment.requiresProviderConsent,
    requiresObstetrician: 
      medicationRisk.requiresObstetrician || 
      regimenAssessment.requiresObstetrician,
    
    assessmentDate: new Date().toISOString()
  };
}

/**
 * Calculate composite score from individual risks and interactions
 * 
 * @param {Array} medicationRisks - Individual medication risk assessments
 * @param {Object} interactionCheck - Interaction check results
 * @returns {number} Composite score (0-100)
 */
function calculateCompositeScore(medicationRisks, interactionCheck) {
  const validRisks = medicationRisks.filter(m => m.found);
  
  if (validRisks.length === 0) {
    return 0;
  }

  // Calculate average medication risk
  const avgMedicationRisk = validRisks.reduce((sum, m) => sum + (m.riskScore || 0), 0) / validRisks.length;
  
  // Get highest individual risk
  const maxRisk = Math.max(...validRisks.map(m => m.riskScore || 0));
  
  // Weight: 60% highest risk, 40% average risk
  let baseScore = (maxRisk * 0.6) + (avgMedicationRisk * 0.4);

  // Add interaction penalties
  if (interactionCheck.interactions && interactionCheck.interactions.length > 0) {
    interactionCheck.interactions.forEach(interaction => {
      if (interaction.severity === 'critical') {
        baseScore += 20;
      } else if (interaction.severity === 'high') {
        baseScore += 15;
      } else if (interaction.severity === 'moderate') {
        baseScore += 10;
      }
    });
  }

  // Multiple medication penalty (polypharmacy risk)
  if (validRisks.length >= 3) {
    baseScore += (validRisks.length - 2) * 3; // +3 per medication beyond 2
  }

  // Cap at 100
  return Math.min(Math.round(baseScore), 100);
}

/**
 * Get risk level from numeric score
 * 
 * @param {number} score - Risk score (0-100)
 * @returns {string} Risk level
 */
function getRiskLevelFromScore(score) {
  if (score <= RISK_THRESHOLDS.LOW) return 'low';
  if (score <= RISK_THRESHOLDS.MODERATE) return 'moderate';
  if (score <= RISK_THRESHOLDS.HIGH) return 'high';
  return 'critical';
}

/**
 * Generate recommendations for multiple medications
 * 
 * @param {Array} medicationRisks - Individual medication risks
 * @param {Object} interactionCheck - Interaction results
 * @param {string} overallRisk - Overall risk level
 * @param {boolean} hasCategoryX - Has Category X medications
 * @param {boolean} hasCategoryD - Has Category D medications
 * @returns {Array} Recommendations
 */
function generateMultiMedicationRecommendations(
  medicationRisks,
  interactionCheck,
  overallRisk,
  hasCategoryX,
  hasCategoryD
) {
  const recommendations = [];

  // Critical: Category X medications
  if (hasCategoryX) {
    const categoryXMeds = medicationRisks.filter(m => m.found && m.fdaCategory === 'X');
    categoryXMeds.forEach(med => {
      recommendations.push({
        priority: 'CRITICAL',
        action: 'DISCONTINUE IMMEDIATELY',
        medication: med.medicationName,
        reason: 'Category X - Contraindicated in pregnancy',
        urgency: 'immediate'
      });
    });
  }

  // High priority: Category D medications
  if (hasCategoryD) {
    const categoryDMeds = medicationRisks.filter(m => m.found && m.fdaCategory === 'D');
    categoryDMeds.forEach(med => {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review with obstetrician',
        medication: med.medicationName,
        reason: 'Category D - Known fetal risks',
        urgency: 'within 24-48 hours'
      });
    });
  }

  // Critical interactions
  if (interactionCheck.highestSeverity === 'critical') {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Seek immediate medical attention',
      reason: 'Critical drug interactions detected during pregnancy',
      urgency: 'immediate'
    });
  }

  // High severity interactions
  if (interactionCheck.highestSeverity === 'high') {
    recommendations.push({
      priority: 'HIGH',
      action: 'Consult obstetrician about drug interactions',
      reason: 'Serious drug interactions possible during pregnancy',
      urgency: 'within 24-48 hours'
    });
  }

  // Polypharmacy warning
  if (medicationRisks.length >= 4) {
    recommendations.push({
      priority: 'MODERATE',
      action: 'Review medication necessity',
      reason: `Taking ${medicationRisks.length} medications - minimize polypharmacy during pregnancy`,
      urgency: 'at next appointment'
    });
  }

  // Overall risk-based recommendations
  if (overallRisk === 'critical' && recommendations.length === 0) {
    recommendations.push({
      priority: 'CRITICAL',
      action: 'Immediate obstetric consultation required',
      reason: 'Very high overall pregnancy risk from current medications',
      urgency: 'immediate'
    });
  } else if (overallRisk === 'high' && recommendations.length === 0) {
    recommendations.push({
      priority: 'HIGH',
      action: 'Schedule urgent appointment with obstetrician',
      reason: 'High pregnancy risk - medication review needed',
      urgency: 'within 24-48 hours'
    });
  } else if (overallRisk === 'moderate' && recommendations.length === 0) {
    recommendations.push({
      priority: 'MODERATE',
      action: 'Discuss medications at next prenatal visit',
      reason: 'Moderate risk - ongoing monitoring recommended',
      urgency: 'at next appointment'
    });
  }

  // If everything is safe
  if (recommendations.length === 0 && overallRisk === 'low') {
    recommendations.push({
      priority: 'INFO',
      action: 'Continue current medications as directed',
      reason: 'Current regimen appears safe for pregnancy',
      urgency: 'routine monitoring'
    });
  }

  return recommendations;
}

/**
 * Get provider recommendation based on risk assessment
 * 
 * @param {Object} riskAssessment - Risk assessment result
 * @returns {Object} Provider recommendation
 */
function getProviderRecommendation(riskAssessment) {
  const { overallRiskLevel, riskScore, requiresObstetrician, hasCategoryX, hasCategoryD } = riskAssessment;

  let providerType = 'Primary Care Provider';
  let urgency = 'routine';
  let action = 'Routine follow-up';
  let timeframe = 'At next scheduled appointment';

  if (hasCategoryX || riskScore >= RISK_THRESHOLDS.CRITICAL) {
    providerType = 'Obstetrician (Maternal-Fetal Medicine if available)';
    urgency = 'emergency';
    action = 'Immediate consultation required';
    timeframe = 'Within hours';
  } else if (requiresObstetrician || riskScore >= RISK_THRESHOLDS.HIGH) {
    providerType = 'Obstetrician';
    urgency = 'urgent';
    action = 'Urgent medication review';
    timeframe = 'Within 24-48 hours';
  } else if (hasCategoryD || riskScore >= RISK_THRESHOLDS.MODERATE) {
    providerType = 'Obstetrician or Primary Care Provider';
    urgency = 'soon';
    action = 'Medication review recommended';
    timeframe = 'Within 1 week';
  }

  return {
    providerType,
    urgency,
    action,
    timeframe,
    escalationNeeded: urgency === 'emergency' || urgency === 'urgent',
    recommendation: `${action} - Contact ${providerType} ${timeframe.toLowerCase()}`
  };
}

module.exports = {
  // Constants
  RISK_THRESHOLDS,
  
  // Core functions
  calculateSingleMedicationRisk,
  calculateMultipleMedicationRisk,
  calculateComprehensiveRisk,
  getProviderRecommendation,
  
  // Helper functions
  calculateCompositeScore,
  getRiskLevelFromScore,
  generateMultiMedicationRecommendations
};
