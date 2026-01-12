# Quick Start: Adding New Medications

## Method 1: Use the Builder (Recommended)

1. **Edit the input file:**
```bash
nano scripts/input-medications.json
```

2. **Add your medication:**
```json
{
  "genericName": "Amoxicillin",
  "brandNames": ["Amoxil", "Trimox"],
  "category": "Antibiotic/Penicillin",
  "manufacturer": "GlaxoSmithKline",
  "dosages": ["250mg", "500mg"],
  "forms": ["Capsule", "Tablet"],
  "frequency": "Three times daily",
  "maxDailyDose": "3000mg",
  "pregnancy_category": "B",
  "lactation_safe": true,
  "trimester_restrictions": "safe_all"
}
```

3. **Run the builder:**
```bash
node scripts/medication-db-builder.js
```

4. **Check the output:**
```bash
# View enriched data
cat scripts/medications-enriched.json

# View Bumpie_Meds format
cat src/data/medications.json

# View MindTrackAI format  
cat scripts/medications-mindtrack.json
```

## Method 2: Manual Addition

If you need to add one quickly without the builder:

1. **Edit Bumpie_Meds database directly:**
```bash
nano src/data/medications.json
```

2. **Add entry using this template:**
```json
{
  "id": "med_rxcui_XXXXX",
  "rxcui": "XXXXX",
  "name": "Generic Name",
  "genericName": "Generic Name",
  "brandNames": ["Brand1", "Brand2"],
  "pregnancyCategory": {
    "fda": "B",
    "trimester1": {
      "safe": true,
      "risk": "low",
      "warnings": [],
      "alternatives": []
    },
    "trimester2": {
      "safe": true,
      "risk": "low",
      "warnings": [],
      "alternatives": []
    },
    "trimester3": {
      "safe": true,
      "risk": "low",
      "warnings": [],
      "alternatives": []
    }
  },
  "contraindications": [],
  "sources": [],
  "lastUpdated": "2026-01-11T00:00:00Z",
  "verified": false
}
```

## Pregnancy Category Quick Reference

| Category | Safe? | Examples |
|----------|-------|----------|
| **A** | ✅ Yes | Levothyroxine, Prenatal vitamins |
| **B** | ✅ Usually | Acetaminophen, Metformin |
| **C** | ⚠️ Maybe | Omeprazole, Gabapentin |
| **D** | ❌ Risky | Lisinopril, Aspirin (some trimesters) |
| **X** | 🚫 Never | Atorvastatin, Isotretinoin |

## Testing Your Addition

```bash
# Run tests
npm test

# Or test manually
node -e "
const BumpieMeds = require('./src/index');
const meds = BumpieMeds.initialize();
meds.checkSafety('YOUR_MED_NAME', 24).then(console.log);
"
```

## Common Issues

**"Medication not found"**
- Check spelling matches exactly
- Try brand name instead of generic
- Verify it's in the JSON file

**NDC codes missing**
- Normal - builder may not find all NDC codes
- Can add manually if needed
- Not critical for functionality

**RxNorm ID not found**
- Check drug is FDA-approved
- Try alternative spellings
- Can proceed with manual ID

## Bulk Import

For multiple medications:

```bash
# Create CSV
cat > new-meds.csv << EOF
genericName,brandNames,category,pregnancy_category
Amoxicillin,"Amoxil,Trimox",Antibiotic,B
Ciprofloxacin,"Cipro",Antibiotic,C
EOF

# Convert to JSON (using jq or custom script)
# Then run builder
```

## Questions?

See full documentation:
- [scripts/README.md](scripts/README.md)
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
