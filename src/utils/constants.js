/**
 * Constants used throughout the application
 */

const FDA_DISCLAIMER = `
IMPORTANT MEDICAL DISCLAIMER:
This tool provides general information about medication safety during 
pregnancy based on FDA classifications and medical literature. It is 
NOT a substitute for professional medical advice, diagnosis, or 
treatment.

ALWAYS consult with a qualified healthcare provider before:
- Starting any new medication
- Stopping current medication
- Changing medication dosage

Individual circumstances vary. Your doctor can assess your specific 
situation and provide personalized recommendations.

In case of emergency, call 911 or contact your healthcare provider 
immediately.

Data Version: 2026.01
Last Updated: January 2026
`;

const FDA_CATEGORIES = {
  A: {
    code: 'A',
    label: 'Adequate and well-controlled studies',
    description: 'Adequate and well-controlled studies in pregnant women have not shown an increased risk of fetal abnormalities',
    riskLevel: 'minimal',
    color: '#10b981',
    icon: '✅'
  },
  B: {
    code: 'B',
    label: 'Animal studies show no risk',
    description: 'Animal reproduction studies have not demonstrated a fetal risk, but no adequate studies in pregnant women',
    riskLevel: 'low',
    color: '#3b82f6',
    icon: 'ℹ️'
  },
  C: {
    code: 'C',
    label: 'Risk cannot be ruled out',
    description: 'Animal studies have shown adverse effect, but no adequate human studies. Benefits may outweigh risks',
    riskLevel: 'moderate',
    color: '#f59e0b',
    icon: '⚠️'
  },
  D: {
    code: 'D',
    label: 'Positive evidence of risk',
    description: 'Studies show risk to human fetus. Use only if benefits outweigh serious risks',
    riskLevel: 'high',
    color: '#ef4444',
    icon: '❌'
  },
  X: {
    code: 'X',
    label: 'Contraindicated in pregnancy',
    description: 'Studies show fetal abnormalities. Risks clearly outweigh any possible benefit',
    riskLevel: 'severe',
    color: '#991b1b',
    icon: '🚫'
  },
  N: {
    code: 'N',
    label: 'Not classified',
    description: 'FDA has not classified this medication for pregnancy safety',
    riskLevel: 'unknown',
    color: '#6b7280',
    icon: '❓'
  }
};

const TRIMESTERS = {
  1: {
    number: 1,
    name: 'First Trimester',
    weeksRange: [1, 13],
    description: 'Weeks 1-13 (months 1-3)',
    criticalPeriod: true,
    organogenesis: true,
    warnings: 'Most critical period for birth defects. Organ formation occurs.',
    checkFrequency: 'weekly'
  },
  2: {
    number: 2,
    name: 'Second Trimester',
    weeksRange: [14, 27],
    description: 'Weeks 14-27 (months 4-6)',
    criticalPeriod: false,
    organogenesis: false,
    warnings: 'Growth and development period. Some medications may be safer.',
    checkFrequency: 'biweekly'
  },
  3: {
    number: 3,
    name: 'Third Trimester',
    weeksRange: [28, 40],
    description: 'Weeks 28-40+ (months 7-9)',
    criticalPeriod: false,
    organogenesis: false,
    warnings: 'Final growth. Some medications may affect labor/delivery.',
    checkFrequency: 'weekly'
  }
};

const ERROR_CODES = {
  MEDICATION_NOT_FOUND: 'MEDICATION_NOT_FOUND',
  INVALID_WEEK: 'INVALID_WEEK',
  INVALID_TRIMESTER: 'INVALID_TRIMESTER',
  INVALID_CONFIG: 'INVALID_CONFIG',
  DATA_LOAD_ERROR: 'DATA_LOAD_ERROR',
  AUDIT_ERROR: 'AUDIT_ERROR'
};

const DEFAULT_CONFIG = {
  dataPath: './src/data',
  logLevel: 'info',
  enableAudit: true,
  auditRetentionYears: 7,
  cacheEnabled: true,
  cacheTTL: 3600,
  showDisclaimer: true,
  requireConsent: false
};

module.exports = {
  FDA_DISCLAIMER,
  FDA_CATEGORIES,
  TRIMESTERS,
  ERROR_CODES,
  DEFAULT_CONFIG
};
