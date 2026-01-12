/**
 * Pregnancy Safety Engine
 * 
 * Core module for assessing medication safety during pregnancy
 * Implements FDA pregnancy category logic with trimester-specific rules
 * 
 * @module pregnancy-safety-engine
 */

const { validateWeek, validateMedication } = require('../utils/validators');
const medications = require('../data/medications.json');

/**
 * Trimester definitions based on pregnancy weeks
 * Critical periods for fetal development
 */
const TRIMESTERS = {
  FIRST: {
    name: '1st Trimester',
    weeks: [1, 12],
    description: 'Organ formation - HIGHEST RISK period',
    criticalDevelopment: ['Neural tube', 'Heart', 'Limbs', 'Eyes', 'Ears'],
    riskMultiplier: 1.5 // Higher risk weight
  },
  SECOND: {
    name: '2nd Trimester',
    weeks: [13, 27],
    description: 'Growth phase - Moderate risk',
    criticalDevelopment: ['Brain development', 'Bone growth', 'Organ maturation'],
    riskMultiplier: 1.0
  },
  THIRD: {
    name: '3rd Trimester',
    weeks: [28, 40],
    description: 'Preparation for birth - Focus on maternal/neonatal effects',
    criticalDevelopment: ['Final organ maturation', 'Weight gain', 'Lung development'],
    riskMultiplier: 1.2 // Increased risk for labor/delivery complications
  }
};

/**
 * FDA Pregnancy Category Definitions
 * Based on FDA pregnancy labeling system (pre-2015)
 * Note: New system uses more detailed risk summaries
 */
const FDA_CATEGORIES = {
  A: {
    name: 'Category A',
    emoji: '✅',
    description: 'Safe - Controlled studies show no risk',
    riskLevel: 'low',
    baseScore: 10,
    recommendation: 'Safe to use during pregnancy',
    explanation: 'Adequate and well-controlled studies have failed to demonstrate a risk to the fetus in the first trimester of pregnancy (and there is no evidence of risk in later trimesters).'
  },
  B: {
    name: 'Category B',
    emoji: '✅',
    description: 'Probably Safe - Animal studies OK, no human data',
    riskLevel: 'low',
    baseScore: 25,
    recommendation: 'Generally considered safe',
    explanation: 'Animal reproduction studies have failed to demonstrate a risk to the fetus and there are no adequate and well-controlled studies in pregnant women.'
  },
  C: {
    name: 'Category C',
    emoji: '⚠️',
    description: 'Use with Caution - Risk cannot be ruled out',
    riskLevel: 'moderate',
    baseScore: 50,
    recommendation: 'Use only if benefits outweigh risks',
    explanation: 'Animal reproduction studies have shown an adverse effect on the fetus and there are no adequate and well-controlled studies in humans, but potential benefits may warrant use in pregnant women despite potential risks.'
  },
  D: {
    name: 'Category D',
    emoji: '❌',
    description: 'Serious Risk - Evidence of fetal risk',
    riskLevel: 'high',
    baseScore: 75,
    recommendation: 'Avoid unless no alternatives exist',
    explanation: 'There is positive evidence of human fetal risk based on adverse reaction data, but potential benefits may warrant use in pregnant women despite potential risks.'
  },
  X: {
    name: 'Category X',
    emoji: '🚫',
    description: 'CONTRAINDICATED - Proven fetal harm',
    riskLevel: 'critical',
    baseScore: 95,
    recommendation: 'NEVER use during pregnancy',
    explanation: 'Studies in animals or humans have demonstrated fetal abnormalities and/or there is positive evidence of human fetal risk. The risks involved clearly outweigh potential benefits.'
  }
};

/**
 * Lactation safety levels
 */
const LACTATION_SAFETY = {
  SAFE: {
    level: 'safe',
    description: 'Safe - Can breastfeed normally',
    recommendation: 'Continue breastfeeding without concern'
  },
  CAUTION: {
    level: 'caution',
    description: 'Use with Caution - Monitor infant',
    recommendation: 'Breastfeed with monitoring for infant side effects'
  },
  UNSAFE: {
    level: 'unsafe',
    description: 'Unsafe - Do NOT breastfeed',
    recommendation: 'Discontinue breastfeeding or use alternative medication'
  },
  UNKNOWN: {
    level: 'unknown',
    description: 'Unknown - Insufficient data',
    recommendation: 'Consult healthcare provider before breastfeeding'
  }
};

/**
 * Get trimester information based on pregnancy week
 * 
 * @param {number} weekOfPregnancy - Current week of pregnancy (1-40)
 * @returns {Object} Trimester information
 */
function getTrimester(weekOfPregnancy) {
  validateWeek(weekOfPregnancy);

  if (weekOfPregnancy >= TRIMESTERS.FIRST.weeks[0] && weekOfPregnancy <= TRIMESTERS.FIRST.weeks[1]) {
    return { ...TRIMESTERS.FIRST, number: 1, week: weekOfPregnancy };
  } else if (weekOfPregnancy >= TRIMESTERS.SECOND.weeks[0] && weekOfPregnancy <= TRIMESTERS.SECOND.weeks[1]) {
    return { ...TRIMESTERS.SECOND, number: 2, week: weekOfPregnancy };
  } else if (weekOfPregnancy >= TRIMESTERS.THIRD.weeks[0] && weekOfPregnancy <= TRIMESTERS.THIRD.weeks[1]) {
    return { ...TRIMESTERS.THIRD, number: 3, week: weekOfPregnancy };
  }

  throw new Error(`Invalid pregnancy week: ${weekOfPregnancy}. Must be between 1-40.`);
}

/**
 * Check if current week is in a critical developmental period
 * 
 * @param {number} weekOfPregnancy - Current week of pregnancy
 * @returns {Object} Critical period information
 */
function isCriticalPeriod(weekOfPregnancy) {
  const trimester = getTrimester(weekOfPregnancy);
  
  // First trimester is always critical (organogenesis)
  if (trimester.number === 1) {
    return {
      isCritical: true,
      reason: 'First trimester - organ formation period',
      developments: trimester.criticalDevelopment,
      severity: 'high'
    };
  }

  // Week-specific critical periods
  const criticalWeeks = {
    // Neural tube formation
    3: { reason: 'Neural tube formation', severity: 'critical' },
    4: { reason: 'Neural tube formation', severity: 'critical' },
    5: { reason: 'Heart and limb development', severity: 'critical' },
    6: { reason: 'Heart and limb development', severity: 'critical' },
    7: { reason: 'Organ differentiation', severity: 'high' },
    8: { reason: 'Organ differentiation', severity: 'high' },
    
    // Late pregnancy - labor considerations
    37: { reason: 'Full term - prepare for labor', severity: 'moderate' },
    38: { reason: 'Full term - prepare for labor', severity: 'moderate' },
    39: { reason: 'Full term - prepare for labor', severity: 'moderate' },
    40: { reason: 'Full term - prepare for labor', severity: 'moderate' }
  };

  if (criticalWeeks[weekOfPregnancy]) {
    return {
      isCritical: true,
      ...criticalWeeks[weekOfPregnancy],
      week: weekOfPregnancy
    };
  }

  return {
    isCritical: false,
    reason: 'Not in a specifically critical period',
    severity: 'normal'
  };
}

/**
 * Calculate risk score for medication during pregnancy
 * 
 * @param {Object} medication - Medication object
 * @param {number} weekOfPregnancy - Current week of pregnancy
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(medication, weekOfPregnancy) {
  validateMedication(medication);
  validateWeek(weekOfPregnancy);

  const trimester = getTrimester(weekOfPregnancy);
  const critical = isCriticalPeriod(weekOfPregnancy);
  
  // Get FDA category
  const fdaCategory = medication.pregnancyCategory?.fda || 'C';
  const categoryInfo = FDA_CATEGORIES[fdaCategory];
  
  if (!categoryInfo) {
    throw new Error(`Invalid FDA category: ${fdaCategory}`);
  }

  // Start with base score from FDA category
  let score = categoryInfo.baseScore;

  // Apply trimester multiplier
  score = score * trimester.riskMultiplier;

  // Increase score if in critical period
  if (critical.isCritical) {
    if (critical.severity === 'critical') {
      score = score * 1.3;
    } else if (critical.severity === 'high') {
      score = score * 1.2;
    } else if (critical.severity === 'moderate') {
      score = score * 1.1;
    }
  }

  // Apply trimester-specific overrides from medication data
  const trimesterKey = `trimester${trimester.number}`;
  const trimesterData = medication.pregnancyCategory?.[trimesterKey];
  
  if (trimesterData) {
    if (trimesterData.safe === false) {
      // If explicitly marked unsafe, ensure high score
      score = Math.max(score, 70);
    }
    
    // Adjust based on trimester risk level
    if (trimesterData.risk === 'critical') {
      score = Math.max(score, 85);
    } else if (trimesterData.risk === 'high') {
      score = Math.max(score, 65);
    } else if (trimesterData.risk === 'moderate') {
      score = Math.max(score, 45);
    } else if (trimesterData.risk === 'low') {
      score = Math.min(score, 30);
    }
  }

  // Cap score at 100
  return Math.min(Math.round(score), 100);
}

/**
 * Get risk level from risk score
 * 
 * @param {number} score - Risk score (0-100)
 * @returns {string} Risk level
 */
function getRiskLevel(score) {
  if (score <= 20) return 'low';
  if (score <= 40) return 'moderate';
  if (score <= 60) return 'caution';
  if (score <= 80) return 'high';
  return 'critical';
}

/**
 * Check medication safety during pregnancy
 * Main function for safety assessment
 * 
 * @param {string} medicationName - Generic or brand name of medication
 * @param {number} weekOfPregnancy - Current week of pregnancy (1-40)
 * @returns {Object} Safety assessment result
 */
function checkMedicationSafety(medicationName, weekOfPregnancy) {
  if (!medicationName || typeof medicationName !== 'string') {
    throw new Error('Medication name is required and must be a string');
  }

  validateWeek(weekOfPregnancy);

  // Find medication in database
  const medication = findMedication(medicationName);
  
  if (!medication) {
    return {
      found: false,
      medicationName,
      message: 'Medication not found in pregnancy safety database',
      recommendation: 'Consult healthcare provider before use during pregnancy'
    };
  }

  const trimester = getTrimester(weekOfPregnancy);
  const critical = isCriticalPeriod(weekOfPregnancy);
  const riskScore = calculateRiskScore(medication, weekOfPregnancy);
  const riskLevel = getRiskLevel(riskScore);
  
  const fdaCategory = medication.pregnancyCategory?.fda || 'C';
  const categoryInfo = FDA_CATEGORIES[fdaCategory];
  
  const trimesterKey = `trimester${trimester.number}`;
  const trimesterData = medication.pregnancyCategory?.[trimesterKey];

  // Determine if safe
  const isSafe = riskScore <= 40 && (trimesterData?.safe !== false);
  
  // Build result
  const result = {
    found: true,
    medicationName: medication.name,
    genericName: medication.genericName,
    brandNames: medication.brandNames,
    
    // Pregnancy information
    weekOfPregnancy,
    trimester: {
      number: trimester.number,
      name: trimester.name,
      description: trimester.description
    },
    
    // Risk assessment
    safe: isSafe,
    fdaCategory: {
      category: fdaCategory,
      ...categoryInfo
    },
    riskScore,
    riskLevel,
    
    // Critical period info
    criticalPeriod: critical,
    
    // Trimester-specific data
    trimesterSpecific: trimesterData || null,
    
    // Warnings and alternatives
    warnings: trimesterData?.warnings || [],
    alternatives: trimesterData?.alternatives || [],
    
    // Recommendations
    recommendation: generateRecommendation(isSafe, fdaCategory, riskLevel, critical),
    
    // Provider consultation needed
    requiresProviderConsent: riskScore > 40 || fdaCategory === 'D' || fdaCategory === 'X',
    requiresObstetrician: riskScore > 60 || fdaCategory === 'X' || critical.severity === 'critical',
    
    // Contraindications
    contraindications: medication.contraindications || [],
    
    // Timestamp
    assessmentDate: new Date().toISOString()
  };

  return result;
}

/**
 * Find medication in database by name (generic or brand)
 * 
 * @param {string} medicationName - Medication name to search
 * @returns {Object|null} Medication object or null
 */
function findMedication(medicationName) {
  const searchName = medicationName.toLowerCase().trim();
  
  return medications.find(med => {
    // Check generic name
    if (med.genericName && med.genericName.toLowerCase() === searchName) {
      return true;
    }
    
    // Check name field
    if (med.name && med.name.toLowerCase() === searchName) {
      return true;
    }
    
    // Check brand names
    if (med.brandNames && Array.isArray(med.brandNames)) {
      return med.brandNames.some(brand => 
        brand.toLowerCase() === searchName
      );
    }
    
    return false;
  });
}

/**
 * Generate recommendation text based on safety assessment
 * 
 * @param {boolean} isSafe - Is medication safe
 * @param {string} fdaCategory - FDA category (A/B/C/D/X)
 * @param {string} riskLevel - Risk level
 * @param {Object} critical - Critical period info
 * @returns {string} Recommendation text
 */
function generateRecommendation(isSafe, fdaCategory, riskLevel, critical) {
  if (fdaCategory === 'X') {
    return '🚫 CONTRAINDICATED: This medication should NEVER be used during pregnancy. Consult your obstetrician immediately for safe alternatives.';
  }
  
  if (fdaCategory === 'D') {
    return '❌ HIGH RISK: This medication has known fetal risks. Use ONLY if no safer alternatives exist and benefits clearly outweigh risks. Requires obstetrician approval.';
  }
  
  if (critical.isCritical && critical.severity === 'critical' && riskLevel !== 'low') {
    return `⚠️ CRITICAL PERIOD: You are in a critical developmental period (${critical.reason}). Avoid this medication unless absolutely necessary. Consult your healthcare provider immediately.`;
  }
  
  if (fdaCategory === 'C') {
    return '⚠️ USE WITH CAUTION: This medication should only be used if benefits outweigh potential risks. Consult your healthcare provider before use.';
  }
  
  if (fdaCategory === 'B') {
    return '✅ PROBABLY SAFE: This medication is generally considered safe during pregnancy, but consult your healthcare provider to confirm.';
  }
  
  if (fdaCategory === 'A') {
    return '✅ SAFE: This medication has been studied and shown to be safe during pregnancy. You may use as directed.';
  }
  
  return 'Consult your healthcare provider before using this medication during pregnancy.';
}

/**
 * Get lactation safety information
 * 
 * @param {string} medicationName - Medication name
 * @returns {Object} Lactation safety information
 */
function getLactationSafety(medicationName) {
  const medication = findMedication(medicationName);
  
  if (!medication) {
    return {
      found: false,
      medicationName,
      recommendation: 'Consult healthcare provider before use while breastfeeding'
    };
  }

  // Check if lactation data exists in medication
  const lactationSafe = medication.lactationSafe;
  const lactationNotes = medication.lactationNotes;
  
  let safetyLevel;
  if (lactationSafe === true) {
    safetyLevel = LACTATION_SAFETY.SAFE;
  } else if (lactationSafe === false) {
    safetyLevel = LACTATION_SAFETY.UNSAFE;
  } else if (lactationSafe === 'caution') {
    safetyLevel = LACTATION_SAFETY.CAUTION;
  } else {
    safetyLevel = LACTATION_SAFETY.UNKNOWN;
  }

  return {
    found: true,
    medicationName: medication.name,
    genericName: medication.genericName,
    lactationSafe: lactationSafe,
    safety: safetyLevel,
    notes: lactationNotes || 'No additional notes available',
    recommendation: safetyLevel.recommendation
  };
}

/**
 * Get trimester-specific warnings
 * 
 * @param {string} medicationName - Medication name
 * @param {number} trimesterNumber - Trimester (1, 2, or 3)
 * @returns {Array} Array of warnings
 */
function getTrimesterWarnings(medicationName, trimesterNumber) {
  if (![1, 2, 3].includes(trimesterNumber)) {
    throw new Error('Trimester must be 1, 2, or 3');
  }

  const medication = findMedication(medicationName);
  
  if (!medication) {
    return [];
  }

  const trimesterKey = `trimester${trimesterNumber}`;
  const trimesterData = medication.pregnancyCategory?.[trimesterKey];
  
  return trimesterData?.warnings || [];
}

module.exports = {
  // Constants
  TRIMESTERS,
  FDA_CATEGORIES,
  LACTATION_SAFETY,
  
  // Core functions
  getTrimester,
  isCriticalPeriod,
  calculateRiskScore,
  getRiskLevel,
  checkMedicationSafety,
  findMedication,
  getLactationSafety,
  getTrimesterWarnings,
  
  // Helper function
  generateRecommendation
};
