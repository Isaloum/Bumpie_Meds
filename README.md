# Bumpie_Meds 🤰💊

**Pregnancy-safe medication tracker & auditor**

A reusable Node.js module that checks medication safety across pregnancy trimesters, maintains FDA-compliant audit logs, and integrates seamlessly into healthcare applications.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org)

---

## ✨ Features

- ✅ **Trimester-Specific Safety Checks** - Analyzes medication risks for each pregnancy trimester
- 📊 **FDA Pregnancy Categories** - Uses official A/B/C/D/X classification system
- 📝 **Audit Trail** - Logs all checks for regulatory compliance (7-year retention)
- 🔄 **Safe Alternatives** - Suggests safer medication options
- 📄 **Doctor Reports** - Generate PDF/JSON/CSV reports for healthcare providers
- 🚀 **Easy Integration** - Works with MindTrackAI and other health apps
- 🔒 **Privacy-First** - Hashed patient IDs, no PII stored

---

## 📦 Installation

```bash
npm install bumpie-meds
```

---

## 🚀 Quick Start

```javascript
const BumpieMeds = require('bumpie-meds');

// Initialize
const meds = BumpieMeds.initialize({
  enableAudit: true
});

// Check medication safety
const result = await meds.checkSafety('Aspirin', 24); // Week 24 of pregnancy

console.log(result);
// {
//   safe: true,
//   category: 'D',
//   riskLevel: 'low',
//   trimester: 2,
//   warnings: ['Low-dose may be acceptable with doctor approval'],
//   alternatives: []
// }
```

---

## 📖 Usage Examples

### Basic Safety Check

```javascript
const meds = BumpieMeds.initialize();

// Check if Acetaminophen is safe at week 8 (first trimester)
const result = await meds.checkSafety('Acetaminophen', 8);

if (result.safe) {
  console.log(`✅ ${result.medication.name} is safe`);
} else {
  console.log(`⚠️ Warning: ${result.warnings.join(', ')}`);
  console.log(`Alternatives: ${result.alternatives.join(', ')}`);
}
```

### Find Safe Alternatives

```javascript
// Find alternatives for Ibuprofen in third trimester
const alternatives = await meds.findAlternatives('Ibuprofen', 32);

alternatives.forEach(alt => {
  console.log(`${alt.name} - Category ${alt.category}`);
});
// Output: Acetaminophen - Category B
```

### Generate Doctor Report

```javascript
// Generate report for last 30 days
const report = await meds.generateReport(
  'patient_hash_123',
  new Date('2026-01-01'),
  new Date('2026-01-30'),
  'json'
);

console.log(`Total checks: ${report.period.totalChecks}`);
console.log(`Safe medications: ${report.summary.safeMedications}`);
console.log(`Unsafe medications: ${report.summary.unsafeMedications}`);
```

---

## 🔗 Integration with MindTrackAI

```javascript
const BumpieMeds = require('bumpie-meds');
const meds = BumpieMeds.initialize({ enableAudit: true });

async function validateMedication(medName, patientData) {
  if (!patientData.isPregnant) return { safe: true };
  
  const result = await meds.checkSafety(
    medName, 
    patientData.weekOfPregnancy,
    {
      patientId: hashPatientId(patientData.id),
      context: { app: 'MindTrackAI' }
    }
  );
  
  if (!result.safe) {
    showWarning(result.warnings);
    suggestAlternatives(result.alternatives);
  }
  
  return result;
}
```

See [examples/mindtrackai-integration.js](examples/mindtrackai-integration.js) for complete integration code.

---

## 📋 API Reference

### `initialize(config)`

Initialize the module with configuration options.

**Parameters:**
- `config.enableAudit` (boolean) - Enable audit logging (default: true)
- `config.cacheEnabled` (boolean) - Enable result caching (default: true)
- `config.cacheTTL` (number) - Cache time-to-live in seconds (default: 3600)
- `config.logLevel` (string) - Log level: 'debug' | 'info' | 'warn' | 'error'

### `checkSafety(medicationId, weekOfPregnancy, options)`

Check if medication is safe during pregnancy.

**Parameters:**
- `medicationId` (string) - Medication name or RxCUI
- `weekOfPregnancy` (number) - Current week (1-40+)
- `options.patientId` (string) - Hashed patient identifier
- `options.context` (object) - Additional context for audit log

**Returns:** Promise<SafetyResult>

### `findAlternatives(medicationId, weekOfPregnancy)`

Find safe medication alternatives.

**Returns:** Promise<Array<Alternative>>

### `generateReport(patientId, startDate, endDate, format)`

Generate medication safety report.

**Parameters:**
- `format` - 'pdf' | 'json' | 'csv'

**Returns:** Promise<Buffer|Object|string>

---

## 🗂️ FDA Pregnancy Categories

| Category | Description | Risk Level |
|----------|-------------|------------|
| **A** | Adequate studies show no risk | Minimal |
| **B** | Animal studies show no risk | Low |
| **C** | Risk cannot be ruled out | Moderate |
| **D** | Positive evidence of risk | High |
| **X** | Contraindicated in pregnancy | Severe |
| **N** | Not classified | Unknown |

---

## 🧪 Testing

```bash
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run only unit tests
npm run test:unit

# Run integration tests
npm run test:integration
```

**Coverage Target:** 90%+

---

## 📁 Project Structure

```
bumpie-meds/
├── src/
│   ├── index.js                 # Main entry point
│   ├── services/
│   │   ├── SafetyChecker.js     # Core safety logic
│   │   ├── TrimesterAnalyzer.js # Trimester analysis
│   │   ├── AuditService.js      # Audit logging
│   │   └── ReportGenerator.js   # Report generation
│   ├── data/
│   │   ├── medications.json     # Medication database
│   │   └── audit-logs.json      # Audit trail
│   └── utils/
│       ├── constants.js         # FDA categories, etc.
│       └── validators.js        # Input validation
├── tests/
│   ├── unit/
│   └── integration/
├── examples/
│   ├── basic-usage.js
│   └── mindtrackai-integration.js
└── docs/
    └── ARCHITECTURE.md
```

---

## 📚 Documentation

- [Architecture Document](docs/ARCHITECTURE.md) - Complete technical design
- [FDA Compliance Guide](docs/ARCHITECTURE.md#6-fda-compliance-checklist)
- [API Reference](docs/ARCHITECTURE.md#3-core-functions)

---

## ⚖️ Legal & Compliance

### Medical Disclaimer

**IMPORTANT:** This tool provides general information based on FDA classifications. It is **NOT** a substitute for professional medical advice.

**ALWAYS consult with a qualified healthcare provider before:**
- Starting any medication
- Stopping current medication  
- Changing medication dosage

Individual circumstances vary. Only your doctor can assess your specific situation.

### Data Sources

- **Primary:** FDA Drug Safety Database
- **Secondary:** ACOG Guidelines, Peer-reviewed literature
- **Update Frequency:** Quarterly minimum
- **Data Version:** 2026.01

### Audit Compliance

- 7-year audit trail retention
- Immutable logs (append-only)
- HIPAA-compliant patient ID hashing
- Full audit export (JSON/CSV)

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Add tests for new features
4. Ensure 90%+ coverage
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🔗 Links

- **GitHub:** https://github.com/Isaloum/Bumpie_Meds
- **Issues:** https://github.com/Isaloum/Bumpie_Meds/issues
- **MindTrackAI:** https://github.com/Isaloum/MindTrackAI

---

## 📧 Support

For questions or issues:
- Open a GitHub issue
- Email: [Your email]

---

**Made with ❤️ for maternal health**
