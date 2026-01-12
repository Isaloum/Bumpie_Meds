# Bumpie_Meds - Pregnancy Medication Safety Module
## Architecture & Design Document

**Version:** 1.0  
**Date:** January 11, 2026  
**Status:** Planning Stage  
**Purpose:** Reusable Node.js module for tracking medication safety during pregnancy

---

## 1. PROJECT STRUCTURE

```
bumpie-meds/
├── package.json
├── README.md
├── LICENSE
├── .gitignore
├── .npmignore
│
├── src/
│   ├── index.js                    # Main entry point
│   ├── models/
│   │   ├── Medication.js           # Medication model
│   │   ├── PregnancyCategory.js    # FDA pregnancy categories
│   │   └── AuditLog.js             # Audit logging model
│   │
│   ├── services/
│   │   ├── SafetyChecker.js        # Core safety checking logic
│   │   ├── TrimesterAnalyzer.js    # Trimester-specific warnings
│   │   ├── AuditService.js         # Logging & audit trail
│   │   └── ReportGenerator.js      # Export reports for doctors
│   │
│   ├── data/
│   │   ├── medications.json        # Pregnancy safety database
│   │   ├── categories.json         # FDA category definitions
│   │   └── trimester-risks.json    # Trimester-specific data
│   │
│   └── utils/
│       ├── validators.js           # Input validation
│       ├── formatters.js           # Data formatting
│       └── constants.js            # Constants & enums
│
├── tests/
│   ├── unit/
│   │   ├── SafetyChecker.test.js
│   │   ├── TrimesterAnalyzer.test.js
│   │   ├── AuditService.test.js
│   │   └── ReportGenerator.test.js
│   │
│   ├── integration/
│   │   └── workflow.test.js
│   │
│   └── fixtures/
│       ├── test-medications.json
│       └── test-cases.json
│
├── docs/
│   ├── API.md                      # API documentation
│   ├── FDA_COMPLIANCE.md           # FDA compliance guide
│   ├── INTEGRATION.md              # How to integrate
│   └── CHANGELOG.md
│
└── examples/
    ├── basic-usage.js
    ├── mindtrackai-integration.js
    └── report-generation.js
```

---

## 2. DATA MODELS

### 2.1 Medication Model
```json
{
  "id": "med_rxcui_1234567",
  "rxcui": "1234567",
  "name": "Aspirin",
  "genericName": "Acetylsalicylic Acid",
  "brandNames": ["Bayer Aspirin", "Ecotrin"],
  "pregnancyCategory": {
    "fda": "D",
    "trimester1": {
      "safe": false,
      "risk": "high",
      "warnings": [
        "May cause birth defects in first trimester",
        "Consult physician before use"
      ],
      "alternatives": ["Acetaminophen"]
    },
    "trimester2": {
      "safe": true,
      "risk": "low",
      "warnings": ["Low-dose may be acceptable with doctor approval"],
      "maxDosage": "81mg daily"
    },
    "trimester3": {
      "safe": false,
      "risk": "high",
      "warnings": [
        "Risk of premature closure of ductus arteriosus",
        "Bleeding complications during delivery"
      ],
      "alternatives": ["Acetaminophen"]
    }
  },
  "contraindications": [
    "Third trimester pregnancy",
    "History of bleeding disorders"
  ],
  "sources": [
    {
      "type": "FDA",
      "url": "https://www.fda.gov/...",
      "date": "2024-01-15"
    },
    {
      "type": "ACOG",
      "url": "https://www.acog.org/...",
      "date": "2023-11-20"
    }
  ],
  "lastUpdated": "2025-12-01T00:00:00Z",
  "verified": true
}
```

### 2.2 FDA Pregnancy Categories
```json
{
  "categories": {
    "A": {
      "code": "A",
      "label": "Adequate and well-controlled studies",
      "description": "Adequate and well-controlled studies in pregnant women have not shown an increased risk of fetal abnormalities",
      "riskLevel": "minimal",
      "color": "#10b981",
      "icon": "✅"
    },
    "B": {
      "code": "B",
      "label": "Animal studies show no risk",
      "description": "Animal reproduction studies have not demonstrated a fetal risk, but no adequate studies in pregnant women",
      "riskLevel": "low",
      "color": "#3b82f6",
      "icon": "ℹ️"
    },
    "C": {
      "code": "C",
      "label": "Risk cannot be ruled out",
      "description": "Animal studies have shown adverse effect, but no adequate human studies. Benefits may outweigh risks",
      "riskLevel": "moderate",
      "color": "#f59e0b",
      "icon": "⚠️"
    },
    "D": {
      "code": "D",
      "label": "Positive evidence of risk",
      "description": "Studies show risk to human fetus. Use only if benefits outweigh serious risks",
      "riskLevel": "high",
      "color": "#ef4444",
      "icon": "❌"
    },
    "X": {
      "code": "X",
      "label": "Contraindicated in pregnancy",
      "description": "Studies show fetal abnormalities. Risks clearly outweigh any possible benefit",
      "riskLevel": "severe",
      "color": "#991b1b",
      "icon": "🚫"
    },
    "N": {
      "code": "N",
      "label": "Not classified",
      "description": "FDA has not classified this medication for pregnancy safety",
      "riskLevel": "unknown",
      "color": "#6b7280",
      "icon": "❓"
    }
  }
}
```

### 2.3 Trimester Definitions
```json
{
  "trimesters": {
    "first": {
      "number": 1,
      "name": "First Trimester",
      "weeksRange": [1, 13],
      "description": "Weeks 1-13 (months 1-3)",
      "criticalPeriod": true,
      "organogenesis": true,
      "warnings": "Most critical period for birth defects. Organ formation occurs.",
      "checkFrequency": "weekly"
    },
    "second": {
      "number": 2,
      "name": "Second Trimester",
      "weeksRange": [14, 27],
      "description": "Weeks 14-27 (months 4-6)",
      "criticalPeriod": false,
      "organogenesis": false,
      "warnings": "Growth and development period. Some medications may be safer.",
      "checkFrequency": "biweekly"
    },
    "third": {
      "number": 3,
      "name": "Third Trimester",
      "weeksRange": [28, 40],
      "description": "Weeks 28-40+ (months 7-9)",
      "criticalPeriod": false,
      "organogenesis": false,
      "warnings": "Final growth. Some medications may affect labor/delivery.",
      "checkFrequency": "weekly"
    }
  }
}
```

### 2.4 Audit Log Entry
```json
{
  "id": "audit_20260111_abc123",
  "timestamp": "2026-01-11T20:45:00.000Z",
  "action": "SAFETY_CHECK",
  "medication": {
    "rxcui": "1234567",
    "name": "Aspirin",
    "dosage": "81mg"
  },
  "patient": {
    "id": "patient_hash_xyz789",
    "weekOfPregnancy": 24,
    "trimester": 2,
    "ageRange": "25-30"
  },
  "result": {
    "safe": true,
    "category": "D",
    "riskLevel": "low",
    "warnings": ["Low-dose may be acceptable with doctor approval"],
    "recommendedAction": "Consult physician"
  },
  "context": {
    "app": "MindTrackAI",
    "version": "1.0.0",
    "userAgent": "Mozilla/5.0...",
    "ipHash": "hashed_ip_address"
  },
  "metadata": {
    "processingTimeMs": 45,
    "dataVersion": "2025-12-01",
    "complianceLevel": "FDA_APPROVED"
  }
}
```

---

## 3. CORE FUNCTIONS

### 3.1 Main API (index.js)
```javascript
/**
 * Initialize Bumpie_Meds module
 * @param {Object} config - Configuration options
 * @returns {Object} API instance
 */
function initialize(config = {}) {
  // Returns configured instance
}

/**
 * Check medication safety during pregnancy
 * @param {string} medicationId - RxCUI or medication name
 * @param {number} weekOfPregnancy - Current week (1-40+)
 * @param {Object} options - Additional options
 * @returns {Promise<SafetyResult>}
 */
async function checkSafety(medicationId, weekOfPregnancy, options) {
  // Returns safety assessment
}

/**
 * Get trimester-specific information
 * @param {string} medicationId - RxCUI or medication name
 * @param {number} trimester - Trimester number (1, 2, or 3)
 * @returns {Promise<TrimesterInfo>}
 */
async function getTrimesterInfo(medicationId, trimester) {
  // Returns trimester-specific data
}

/**
 * Find safe alternatives
 * @param {string} medicationId - Unsafe medication
 * @param {number} weekOfPregnancy - Current week
 * @returns {Promise<Array<Medication>>}
 */
async function findAlternatives(medicationId, weekOfPregnancy) {
  // Returns safe alternatives
}

/**
 * Generate doctor report
 * @param {string} patientId - Patient identifier (hashed)
 * @param {Date} startDate - Report start date
 * @param {Date} endDate - Report end date
 * @returns {Promise<Report>}
 */
async function generateReport(patientId, startDate, endDate) {
  // Returns PDF/JSON report
}

/**
 * Get audit logs
 * @param {Object} filters - Filter criteria
 * @returns {Promise<Array<AuditLog>>}
 */
async function getAuditLogs(filters) {
  // Returns filtered audit logs
}
```

### 3.2 SafetyChecker Service
```javascript
class SafetyChecker {
  /**
   * Check if medication is safe
   * @param {Object} medication - Medication data
   * @param {number} weekOfPregnancy - Week of pregnancy
   * @returns {SafetyResult}
   */
  checkSafety(medication, weekOfPregnancy) {
    // Determine trimester
    // Check category
    // Get trimester-specific warnings
    // Calculate risk level
    // Return result + alternatives
  }

  /**
   * Validate medication data
   * @param {Object} medication - Medication to validate
   * @returns {boolean}
   */
  validateMedication(medication) {
    // Ensure required fields exist
    // Validate data structure
  }

  /**
   * Calculate risk score
   * @param {Object} medication - Medication data
   * @param {number} trimester - Trimester number
   * @returns {number} Risk score 0-100
   */
  calculateRiskScore(medication, trimester) {
    // Algorithm for risk calculation
  }
}
```

### 3.3 TrimesterAnalyzer Service
```javascript
class TrimesterAnalyzer {
  /**
   * Get current trimester from week
   * @param {number} weekOfPregnancy - Week (1-40+)
   * @returns {number} Trimester (1, 2, or 3)
   */
  getTrimester(weekOfPregnancy) {
    // Returns trimester number
  }

  /**
   * Get trimester-specific warnings
   * @param {Object} medication - Medication data
   * @param {number} trimester - Trimester number
   * @returns {Array<string>} Warnings
   */
  getWarnings(medication, trimester) {
    // Returns array of warnings
  }

  /**
   * Check if in critical period
   * @param {number} weekOfPregnancy - Week number
   * @returns {boolean}
   */
  isCriticalPeriod(weekOfPregnancy) {
    // First trimester is most critical
  }
}
```

### 3.4 AuditService
```javascript
class AuditService {
  /**
   * Log safety check
   * @param {Object} checkData - Safety check data
   * @returns {Promise<string>} Log ID
   */
  async logCheck(checkData) {
    // Create audit entry
    // Store to database/file
    // Return log ID
  }

  /**
   * Query audit logs
   * @param {Object} filters - Query filters
   * @returns {Promise<Array<AuditLog>>}
   */
  async query(filters) {
    // Filter by date, patient, medication
    // Return matching logs
  }

  /**
   * Export audit trail
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} format - 'json' or 'csv'
   * @returns {Promise<Buffer>}
   */
  async export(startDate, endDate, format) {
    // Generate exportable audit trail
  }
}
```

### 3.5 ReportGenerator Service
```javascript
class ReportGenerator {
  /**
   * Generate PDF report for doctor
   * @param {string} patientId - Patient ID (hashed)
   * @param {Array<AuditLog>} logs - Medication checks
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePDF(patientId, logs) {
    // Create formatted PDF
    // Include all checks
    // Add warnings/recommendations
  }

  /**
   * Generate JSON summary
   * @param {string} patientId - Patient ID
   * @param {Array<AuditLog>} logs - Medication checks
   * @returns {Object} JSON summary
   */
  generateJSON(patientId, logs) {
    // Structured data for API consumers
  }

  /**
   * Generate CSV export
   * @param {Array<AuditLog>} logs - Medication checks
   * @returns {string} CSV content
   */
  generateCSV(logs) {
    // Simple CSV format
  }
}
```

---

## 4. USAGE EXAMPLES

### 4.1 Basic Usage
```javascript
const BumpieMeds = require('bumpie-meds');

// Initialize
const meds = BumpieMeds.initialize({
  dataPath: './data',
  logLevel: 'info',
  enableAudit: true
});

// Check medication safety
const result = await meds.checkSafety('aspirin', 24);
console.log(result);
// {
//   safe: true,
//   category: 'D',
//   riskLevel: 'low',
//   trimester: 2,
//   warnings: ['Low-dose may be acceptable...'],
//   alternatives: []
// }

// Get trimester info
const info = await meds.getTrimesterInfo('aspirin', 1);
console.log(info.warnings);
// ['May cause birth defects in first trimester']
```

### 4.2 MindTrackAI Integration
```javascript
// In MindTrackAI's medication form
const BumpieMeds = require('bumpie-meds');
const meds = BumpieMeds.initialize();

async function validatePregnancyMedication(medName, patientData) {
  if (!patientData.isPregnant) return { safe: true };
  
  const weekOfPregnancy = patientData.weekOfPregnancy;
  const result = await meds.checkSafety(medName, weekOfPregnancy, {
    patientId: hashPatientId(patientData.id),
    context: { app: 'MindTrackAI' }
  });
  
  if (!result.safe) {
    // Show warning to user
    displayWarning(result.warnings);
    // Suggest alternatives
    if (result.alternatives.length > 0) {
      suggestAlternatives(result.alternatives);
    }
  }
  
  return result;
}
```

---

## 5. TESTING STRATEGY

### 5.1 Unit Tests (Target: 95% coverage)

**SafetyChecker Tests:**
- ✅ Correctly identifies FDA categories
- ✅ Calculates trimester from week number
- ✅ Returns appropriate warnings per trimester
- ✅ Handles invalid medication IDs
- ✅ Validates risk score calculation

**TrimesterAnalyzer Tests:**
- ✅ Correct trimester detection (weeks 1-40+)
- ✅ Edge cases (week 0, week 45)
- ✅ Critical period identification
- ✅ Warning generation per trimester

**AuditService Tests:**
- ✅ Logs created with correct structure
- ✅ Query filters work correctly
- ✅ Export formats (JSON/CSV) valid
- ✅ Timestamp accuracy
- ✅ Patient ID hashing

**ReportGenerator Tests:**
- ✅ PDF generation succeeds
- ✅ JSON format valid
- ✅ CSV format correct
- ✅ Includes all required fields
- ✅ Handles empty data

### 5.2 Integration Tests

**Workflow Tests:**
- ✅ End-to-end safety check flow
- ✅ Multi-medication checking
- ✅ Report generation pipeline
- ✅ Audit trail creation
- ✅ Error handling

### 5.3 Test Cases

```javascript
// Critical test scenarios
const testCases = [
  {
    name: "Category X in first trimester",
    medication: "Isotretinoin",
    week: 8,
    expected: { safe: false, riskLevel: 'severe' }
  },
  {
    name: "Category B throughout pregnancy",
    medication: "Acetaminophen",
    week: 20,
    expected: { safe: true, riskLevel: 'low' }
  },
  {
    name: "Aspirin in third trimester",
    medication: "Aspirin",
    week: 35,
    expected: { safe: false, riskLevel: 'high' }
  },
  {
    name: "Unknown medication",
    medication: "InvalidMed123",
    week: 15,
    expected: { error: 'MEDICATION_NOT_FOUND' }
  }
];
```

### 5.4 Coverage Targets
- **Unit Tests:** 95%+
- **Integration Tests:** 85%+
- **Overall:** 90%+
- **Critical Paths:** 100%

---

## 6. FDA COMPLIANCE CHECKLIST

### 6.1 Data Requirements
- [ ] All medications have FDA pregnancy category
- [ ] Source citations for safety data (FDA, ACOG, peer-reviewed)
- [ ] Last update timestamps on all data
- [ ] Verification flag for reviewed entries
- [ ] Version control for data updates

### 6.2 Audit Trail Requirements
- [ ] Log every safety check performed
- [ ] Include timestamp (ISO 8601 format)
- [ ] Record medication details (name, dosage, RxCUI)
- [ ] Store patient context (week, trimester, hashed ID)
- [ ] Track result and recommendations
- [ ] Log app version and data version
- [ ] Immutable logs (append-only)
- [ ] Minimum 7-year retention

### 6.3 Disclaimers & Warnings
```javascript
const REQUIRED_DISCLAIMER = `
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
`;
```

### 6.4 Data Source Documentation
- [ ] Primary source: FDA Drug Safety Database
- [ ] Secondary sources: ACOG guidelines, medical literature
- [ ] Update frequency: Quarterly minimum
- [ ] Review process documented
- [ ] Change log maintained

### 6.5 User Consent & Privacy
- [ ] Terms of service include disclaimer
- [ ] Privacy policy covers data collection
- [ ] Patient IDs hashed (no PII stored)
- [ ] Compliance with HIPAA (if applicable)
- [ ] User acknowledges limitations before use

### 6.6 Error Handling
- [ ] Graceful degradation if data unavailable
- [ ] Clear error messages
- [ ] Default to "consult doctor" if uncertain
- [ ] Never give false reassurance
- [ ] Log all errors for review

---

## 7. DATA UPDATE PROCESS

### 7.1 Update Workflow
```
1. Monitor FDA updates quarterly
2. Review new pregnancy category assignments
3. Update medications.json
4. Increment data version
5. Run full test suite
6. Update CHANGELOG
7. Deploy new version
8. Notify integrators
```

### 7.2 Version Control
```json
{
  "dataVersion": "2026.01",
  "lastUpdate": "2026-01-01T00:00:00Z",
  "medications": 15432,
  "verified": 15400,
  "pending": 32,
  "changes": [
    {
      "date": "2026-01-01",
      "type": "CATEGORY_UPDATE",
      "medication": "Zolpidem",
      "oldCategory": "C",
      "newCategory": "B",
      "source": "FDA update Dec 2025"
    }
  ]
}
```

---

## 8. INTEGRATION GUIDE

### 8.1 Installation
```bash
npm install bumpie-meds
```

### 8.2 Configuration
```javascript
const BumpieMeds = require('bumpie-meds');

const meds = BumpieMeds.initialize({
  // Data storage
  dataPath: './data/pregnancy-meds',
  
  // Logging
  logLevel: 'info', // 'debug' | 'info' | 'warn' | 'error'
  enableAudit: true,
  
  // Audit retention
  auditRetentionYears: 7,
  
  // Performance
  cacheEnabled: true,
  cacheTTL: 3600, // seconds
  
  // Compliance
  showDisclaimer: true,
  requireConsent: true
});
```

### 8.3 Error Handling
```javascript
try {
  const result = await meds.checkSafety('aspirin', 24);
} catch (error) {
  if (error.code === 'MEDICATION_NOT_FOUND') {
    // Handle unknown medication
  } else if (error.code === 'INVALID_WEEK') {
    // Handle invalid week number
  } else {
    // Handle general errors
  }
}
```

---

## 9. PERFORMANCE CONSIDERATIONS

### 9.1 Caching Strategy
- Cache medication data in memory
- TTL: 1 hour (configurable)
- Invalidate on data updates
- LRU eviction for memory management

### 9.2 Database
- JSON files for simplicity (v1)
- Consider SQLite/PostgreSQL for production
- Index on RxCUI and medication name
- Partition audit logs by month

### 9.3 Optimization
- Lazy load medication database
- Async operations for all I/O
- Batch audit log writes
- Compress audit logs older than 30 days

---

## 10. ROADMAP

### Phase 1 (Current) - Core Module
- ✅ Define architecture
- ⏳ Implement core functions
- ⏳ Build test suite
- ⏳ Create medication database (top 500 drugs)
- ⏳ FDA compliance review

### Phase 2 - Enhanced Features
- Drug interaction checking
- Multi-medication analysis
- Real-time FDA updates API
- Mobile SDK (React Native)

### Phase 3 - Advanced
- AI-powered risk prediction
- Clinical trial data integration
- International guidelines (EU, Canada)
- Telemedicine integration

---

## 11. PACKAGE.JSON

```json
{
  "name": "bumpie-meds",
  "version": "1.0.0",
  "description": "Pregnancy medication safety module for healthcare apps",
  "main": "src/index.js",
  "scripts": {
    "test": "jest --coverage",
    "test:watch": "jest --watch",
    "lint": "eslint src/**/*.js",
    "build": "node scripts/build-data.js",
    "validate": "node scripts/validate-data.js"
  },
  "keywords": [
    "pregnancy",
    "medication",
    "safety",
    "healthcare",
    "fda",
    "maternal-health"
  ],
  "author": "Your Name",
  "license": "MIT",
  "dependencies": {
    "rxnorm-js": "^2.0.0",
    "date-fns": "^3.0.0"
  },
  "devDependencies": {
    "jest": "^29.0.0",
    "eslint": "^8.0.0",
    "pdfkit": "^0.14.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 12. NEXT STEPS

1. **Review & Approve** this architecture
2. **Create repository** (bumpie-meds)
3. **Build data pipeline** (scrape FDA data)
4. **Implement core services** (SafetyChecker first)
5. **Write tests** (TDD approach)
6. **FDA compliance review** (legal review)
7. **Beta testing** (integrate with MindTrackAI)
8. **Publish to npm** (v1.0.0)

---

**Questions? Concerns? Ready to start coding?**
