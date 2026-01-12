# Pregnancy Safety Module - Complete Documentation

## 🤰 Overview

The **Bumpie_Meds Pregnancy Safety Module** is a comprehensive, FDA-compliant system for assessing medication safety during pregnancy. It provides trimester-specific risk assessment, drug interaction checking, maternal condition management, and complete audit logging.

---

## 📋 Table of Contents

1. [Features](#features)
2. [Installation](#installation)
3. [Quick Start](#quick-start)
4. [Core Modules](#core-modules)
5. [API Reference](#api-reference)
6. [FDA Categories](#fda-categories)
7. [Maternal Conditions](#maternal-conditions)
8. [Trimester Guidelines](#trimester-guidelines)
9. [Audit & Compliance](#audit--compliance)
10. [Testing](#testing)
11. [Integration Examples](#integration-examples)
12. [Safety Warnings](#safety-warnings)

---

## ✨ Features

### ✅ Core Functionality
- **Trimester-Specific Risk Assessment** - Week 1-40 pregnancy tracking
- **FDA Category Classification** - A/B/C/D/X pregnancy categories
- **Drug Interaction Checking** - Pregnancy-specific interactions
- **Maternal Condition Management** - 6 major conditions supported
- **Composite Risk Scoring** - 0-100 risk calculation
- **Safe Alternatives** - Automatic alternative medication suggestions
- **Lactation Safety** - Breastfeeding safety assessment
- **Critical Period Detection** - Organ formation tracking

### 🔒 Compliance
- **FDA-Compliant Audit Logging** - 7-year retention
- **Complete Audit Trail** - Every decision logged
- **Provider Recommendations** - Escalation protocols
- **Adverse Event Tracking** - FDA reporting support

### 🎯 Supported Conditions
1. **Hypertension** - Blood pressure management
2. **Diabetes** - Blood sugar control
3. **Depression** - Mental health treatment
4. **Asthma** - Respiratory management
5. **Epilepsy** - Seizure control
6. **Thyroid Disorders** - Hormone management

---

## 📦 Installation

```bash
# Install Bumpie_Meds
npm install

# Run tests to verify
npm test
```

---

## 🚀 Quick Start

### Basic Safety Check

```javascript
const { checkMedicationSafety } = require('./src/services/pregnancy-safety-engine');

// Check if medication is safe at week 20
const result = checkMedicationSafety('Acetaminophen', 20);

console.log(result.safe); // true
console.log(result.fdaCategory.category); // 'B'
console.log(result.riskLevel); // 'low'
console.log(result.recommendation); // '✅ PROBABLY SAFE...'
```

### Check Multiple Medications

```javascript
const { calculateMultipleMedicationRisk } = require('./src/services/pregnancy-risk-calculator');

const risk = calculateMultipleMedicationRisk(
  ['Sertraline', 'Acetaminophen'],
  24 // week of pregnancy
);

console.log(risk.overallRiskLevel); // 'low'
console.log(risk.interactionRisks); // []
console.log(risk.safe); // true
```

### Assess Maternal Condition Regimen

```javascript
const { assessMedicationRegimen } = require('./src/services/pregnancy-interaction-checker');

const assessment = assessMedicationRegimen(
  ['Methyldopa'], // current medications
  'Hypertension', // maternal condition
  18 // week of pregnancy
);

console.log(assessment.optimal); // true
console.log(assessment.needsChange); // false
```

---

## 🧩 Core Modules

### 1. Pregnancy Safety Engine
**File:** `src/services/pregnancy-safety-engine.js`

Core medication safety checking with FDA category logic.

**Key Functions:**
- `checkMedicationSafety(medicationName, weekOfPregnancy)` - Main safety check
- `getTrimester(weekOfPregnancy)` - Get trimester information
- `isCriticalPeriod(weekOfPregnancy)` - Identify critical periods
- `calculateRiskScore(medication, weekOfPregnancy)` - Risk scoring
- `getLactationSafety(medicationName)` - Breastfeeding safety

**Example:**
```javascript
const result = checkMedicationSafety('Lisinopril', 15);

// Result includes:
// - safe: false
// - fdaCategory: { category: 'D', ... }
// - riskScore: 75
// - riskLevel: 'high'
// - requiresProviderConsent: true
// - warnings: [...]
// - alternatives: ['Methyldopa', 'Labetalol']
```

---

### 2. Pregnancy Interaction Checker
**File:** `src/services/pregnancy-interaction-checker.js`

Checks for dangerous drug interactions during pregnancy.

**Key Functions:**
- `checkPregnancyInteractions(medications, weekOfPregnancy)` - Check interactions
- `getSafeAlternativesForCondition(condition, trimester)` - Get safe meds
- `assessMedicationRegimen(medications, condition, week)` - Full assessment

**Example:**
```javascript
const interactions = checkPregnancyInteractions(
  ['Ibuprofen', 'Aspirin'],
  35 // third trimester
);

// Result:
// - interactionsFound: 1
// - highestSeverity: 'high'
// - safe: false
// - interactions: [{ medications, severity, effects, ... }]
```

---

### 3. Pregnancy Risk Calculator
**File:** `src/services/pregnancy-risk-calculator.js`

Calculates composite risk for multiple medications and conditions.

**Key Functions:**
- `calculateSingleMedicationRisk(medication, week)` - Single med risk
- `calculateMultipleMedicationRisk(medications, week)` - Multi-med risk
- `calculateComprehensiveRisk(medications, week, condition)` - Full assessment
- `getProviderRecommendation(riskAssessment)` - Provider guidance

**Example:**
```javascript
const risk = calculateComprehensiveRisk(
  ['Lisinopril', 'Metformin'],
  12,
  'Hypertension'
);

// Result:
// - overallRiskLevel: 'high'
// - riskScore: 75
// - hasCategoryD: true
// - conditionManagement: { needsChange: true, ... }
// - recommendations: [{ priority: 'HIGH', action: 'Review with obstetrician', ... }]
```

---

### 4. Pregnancy Audit Logger
**File:** `src/services/pregnancy-audit-logger.js`

FDA-compliant audit logging for all pregnancy medication decisions.

**Key Functions:**
- `logSafetyCheck(params)` - Log safety assessment
- `logInteractionCheck(params)` - Log interaction check
- `logRiskCalculation(params)` - Log risk calculation
- `logProviderDecision(params)` - Log provider decision
- `logAdverseEvent(params)` - Log adverse event
- `queryAuditLogs(filters)` - Query audit trail
- `exportAuditLogs(filters, format)` - Export for compliance

**Example:**
```javascript
const entry = await logSafetyCheck({
  patientId: 'patient123',
  medicationName: 'Sertraline',
  weekOfPregnancy: 20,
  trimester: 2,
  riskScore: 50,
  riskLevel: 'moderate',
  fdaCategory: 'C',
  safe: false,
  warnings: ['Use with caution'],
  recommendation: 'Consult provider',
  sessionId: 'session456'
});

// Query audit logs
const logs = await queryAuditLogs({ patientId: 'patient123' });

// Export for FDA review
const exported = await exportAuditLogs({}, 'csv');
```

---

## 📊 FDA Categories

### Category A - Safe ✅
**Description:** Controlled studies show no risk  
**Example:** Levothyroxine  
**Risk Score:** 0-20  
**Recommendation:** Safe to use during pregnancy

### Category B - Probably Safe ✅
**Description:** Animal studies OK, no human data  
**Examples:** Acetaminophen, Metformin  
**Risk Score:** 21-40  
**Recommendation:** Generally considered safe

### Category C - Use with Caution ⚠️
**Description:** Risk cannot be ruled out  
**Examples:** Sertraline, Omeprazole, Albuterol  
**Risk Score:** 41-60  
**Recommendation:** Use only if benefits outweigh risks

### Category D - Serious Risk ❌
**Description:** Evidence of fetal risk  
**Examples:** Lisinopril, Ibuprofen, Aspirin  
**Risk Score:** 61-80  
**Recommendation:** Avoid unless no alternatives exist

### Category X - CONTRAINDICATED 🚫
**Description:** Proven fetal harm  
**Examples:** Atorvastatin  
**Risk Score:** 81-100  
**Recommendation:** NEVER use during pregnancy

---

## 🏥 Maternal Conditions

### Hypertension
**First-Line Safe:** Methyldopa, Labetalol, Nifedipine  
**AVOID:** ACE Inhibitors (Lisinopril), ARBs (Losartan), Atenolol

### Diabetes
**First-Line Safe:** Insulin (all types), Metformin  
**AVOID:** Most oral hypoglycemics, GLP-1 agonists

### Depression
**First-Line Safe:** Sertraline, Fluoxetine  
**AVOID:** Paroxetine (Category D), MAO inhibitors

### Asthma
**First-Line Safe:** Albuterol, Budesonide inhaled  
**AVOID:** Systemic steroids (minimize use)

### Epilepsy
**First-Line Safe:** Lamotrigine, Levetiracetam  
**AVOID:** Valproate (highest risk), Phenytoin

### Thyroid Disorders
**First-Line Safe:** Levothyroxine, Propylthiouracil (1st trimester)  
**AVOID:** Radioactive iodine

---

## 📅 Trimester Guidelines

### First Trimester (Weeks 1-12) - HIGHEST RISK
**Critical Period:** Organ formation  
**Key Developments:** Neural tube, heart, limbs, eyes, ears  
**Risk Multiplier:** 1.5x  
**Guidance:** Avoid all non-essential medications

#### Critical Weeks:
- **Week 3-4:** Neural tube formation - CRITICAL
- **Week 5-6:** Heart and limb development - CRITICAL
- **Week 7-8:** Organ differentiation - HIGH

### Second Trimester (Weeks 13-27) - Moderate Risk
**Focus:** Growth phase  
**Key Developments:** Brain development, bone growth, organ maturation  
**Risk Multiplier:** 1.0x  
**Guidance:** Continue essential medications with monitoring

### Third Trimester (Weeks 28-40) - Focus on Labor
**Focus:** Preparation for birth  
**Key Developments:** Final organ maturation, weight gain, lung development  
**Risk Multiplier:** 1.2x  
**Guidance:** Consider neonatal effects and labor complications

#### Late Pregnancy:
- **Week 37-40:** Full term - prepare for labor

---

## 📝 Audit & Compliance

### FDA Requirements
- **7-Year Retention:** All audit logs retained for 7 years
- **Complete Trail:** Every medication decision logged
- **Adverse Events:** Critical events flagged and tracked
- **Export Capability:** CSV and JSON export for FDA review

### Audit Entry Types
1. **Safety Check** - Individual medication assessment
2. **Interaction Check** - Drug-drug interaction screening
3. **Risk Calculation** - Comprehensive risk assessment
4. **Provider Decision** - Healthcare provider decisions
5. **Patient Decision** - Patient-informed decisions
6. **Medication Started** - New medication initiated
7. **Medication Stopped** - Medication discontinued
8. **Adverse Event** - Side effects or complications
9. **Provider Consultation** - Professional consultations

### Query Audit Logs

```javascript
// Query by patient
const patientLogs = await queryAuditLogs({ patientId: 'patient123' });

// Query by date range
const recentLogs = await queryAuditLogs({
  startDate: '2026-01-01',
  endDate: '2026-01-31'
});

// Query by medication
const medLogs = await queryAuditLogs({ medicationName: 'Sertraline' });

// Get statistics
const stats = await getAuditStatistics();
console.log(stats.totalEntries);
console.log(stats.uniquePatients);
console.log(stats.criticalEvents);
```

---

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Test Coverage
```bash
npm run test:coverage
```

### Target: 85%+ Code Coverage

**Test Suites:**
- **Unit Tests:** 
  - pregnancy-safety-engine.test.js (20+ tests)
  - pregnancy-interaction-checker.test.js (15+ tests)
  - pregnancy-risk-calculator.test.js (15+ tests)
  - pregnancy-audit-logger.test.js (20+ tests)
- **Integration Tests:**
  - pregnancy-safety-workflow.test.js (15+ tests)

**Total:** 85+ tests

---

## 🔗 Integration Examples

### Integration with MindTrackAI

```javascript
// In MindTrackAI medication form
const BumpieMeds = require('bumpie-meds');
const { checkMedicationSafety } = BumpieMeds.pregnancySafety;

async function validateMedicationForPregnancy(medName, weekPregnant) {
  const result = checkMedicationSafety(medName, weekPregnant);
  
  if (!result.safe) {
    // Show warning to user
    alert(`⚠️ WARNING: ${result.recommendation}`);
    
    // Show alternatives
    if (result.alternatives.length > 0) {
      console.log('Safe alternatives:', result.alternatives);
    }
    
    // Require provider confirmation
    if (result.requiresProviderConsent) {
      return await getProviderApproval();
    }
  }
  
  return result.safe;
}
```

### Integration with Wife's App

```javascript
// Pregnancy tracking app
const { calculateComprehensiveRisk } = require('bumpie-meds/pregnancy-risk-calculator');

async function checkCurrentMedications(userProfile) {
  const risk = calculateComprehensiveRisk(
    userProfile.currentMedications,
    userProfile.weekOfPregnancy,
    userProfile.maternalCondition
  );
  
  // Display risk level
  displayRiskLevel(risk.overallRiskLevel, risk.riskScore);
  
  // Show recommendations
  risk.recommendations.forEach(rec => {
    if (rec.priority === 'CRITICAL') {
      showCriticalAlert(rec);
    } else if (rec.priority === 'HIGH') {
      showHighPriorityWarning(rec);
    }
  });
  
  // Log to audit trail
  await logRiskCalculation({
    patientId: userProfile.id,
    medications: userProfile.currentMedications,
    weekOfPregnancy: userProfile.weekOfPregnancy,
    maternalCondition: userProfile.maternalCondition,
    overallRiskLevel: risk.overallRiskLevel,
    riskScore: risk.riskScore,
    requiresProviderConsent: risk.requiresProviderConsent,
    requiresObstetrician: risk.requiresObstetrician,
    recommendations: risk.recommendations
  });
}
```

---

## ⚠️ Safety Warnings

### IMPORTANT DISCLAIMERS

**NOT A SUBSTITUTE FOR MEDICAL ADVICE**
This module provides **informational guidance** based on FDA pregnancy categories and medical literature. It is **NOT** a substitute for professional medical advice, diagnosis, or treatment.

**ALWAYS CONSULT HEALTHCARE PROVIDERS**
- All medication decisions during pregnancy should be made in consultation with qualified healthcare providers
- Obstetricians and maternal-fetal medicine specialists should be consulted for high-risk situations
- Individual patient circumstances may require different approaches

**DATA LIMITATIONS**
- Pregnancy safety data is constantly evolving
- Some medications have limited human pregnancy data
- Individual responses to medications vary

**EMERGENCY SITUATIONS**
- For medical emergencies, call 911 or seek immediate medical attention
- Do not delay emergency care to use this system

---

## 📚 References

### Medical Guidelines
- **ACOG (American College of Obstetricians and Gynecologists)** - Maternal medication guidelines
- **FDA Drug Labels** - Official pregnancy and lactation information
- **MotherToBaby** - Evidence-based pregnancy medication safety
- **RxNorm (NIH)** - Medication normalization database

### FDA Resources
- [FDA Pregnancy Categories](https://www.fda.gov/drugs/labeling-information-drug-products/pregnancy-and-lactation-labeling-drugs-final-rule)
- [FDA Adverse Event Reporting](https://www.fda.gov/safety/medwatch-fda-safety-information-and-adverse-event-reporting-program)

---

## 📞 Support & Contributing

### Report Issues
- GitHub Issues: https://github.com/Isaloum/Bumpie_Meds/issues

### Contributing
Contributions welcome! Please ensure:
- All tests pass
- Code coverage remains above 85%
- Medical accuracy verified with references

---

## 📄 License

MIT License - See LICENSE file

---

## 🎯 Version

**Current Version:** 1.0.0  
**Last Updated:** January 2026  
**Next Update:** Quarterly reviews for FDA guideline changes

---

**Built with ❤️ for maternal and fetal health**
