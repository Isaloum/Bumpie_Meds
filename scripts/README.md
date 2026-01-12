# Medication Database Builder

Automated tool to enrich medication data with FDA/RxNorm information.

## What It Does

1. Takes simple medication list (name, brand, category)
2. Queries **RxNorm API** (NIH) for official data
3. Fetches:
   - RxNorm Concept ID (RxCUI)
   - NDC codes (National Drug Codes)
   - Brand names
   - Related medications
4. Exports to multiple formats:
   - **Bumpie_Meds** (pregnancy safety module)
   - **MindTrackAI** (general tracking)
   - Full enriched database

## Quick Start

```bash
# Run the builder
cd Bumpie_Meds
node scripts/medication-db-builder.js
```

## Input Format

Edit `scripts/input-medications.json`:

```json
[
  {
    "genericName": "Lisinopril",
    "brandNames": ["Prinivil", "Zestril"],
    "category": "ACE Inhibitor/Blood Pressure",
    "manufacturer": "AstraZeneca",
    "dosages": ["2.5mg", "5mg", "10mg", "20mg"],
    "forms": ["Tablet"],
    "frequency": "Once daily",
    "maxDailyDose": "40mg",
    "fdaApprovalDate": "1987-01-01",
    "pregnancy_category": "D",
    "lactation_safe": false,
    "trimester_restrictions": "avoid_all"
  }
]
```

## Output Files

1. **`medications-enriched.json`** - Full database with all API data
2. **`../src/data/medications.json`** - Formatted for Bumpie_Meds
3. **`medications-mindtrack.json`** - Formatted for MindTrackAI

## API Rate Limiting

- 500ms delay between requests
- 3 retry attempts per request
- Respectful to NIH RxNorm API

## Functions Reference

### `parseGenericVsBrand(medicationName)`
Determines if a drug name is generic or brand.

```javascript
const result = parseGenericVsBrand('Tylenol');
// { isGeneric: false, name: 'Tylenol', normalized: 'tylenol' }
```

### `lookupRxNorm(drugName)`
Searches RxNorm database for drug information.

```javascript
const data = await lookupRxNorm('Lisinopril');
// { found: true, rxcui: '36437', name: 'Lisinopril', ... }
```

### `lookupNDC(rxcui)`
Gets NDC codes for a drug using its RxCUI.

```javascript
const ndcs = await lookupNDC('36437');
// ['00310-0517', '00093-5052', ...]
```

### `getRelatedDrugs(rxcui)`
Finds brand names and related medications.

```javascript
const related = await getRelatedDrugs('36437');
// { brandNames: ['Prinivil', 'Zestril'] }
```

### `validateStructure(medication)`
Validates medication object has required fields.

```javascript
const validation = validateStructure(med);
// { valid: true, errors: [], warnings: ['No NDC codes'] }
```

### `enrichMedication(baseMed, index)`
Main enrichment function - calls all APIs and combines data.

### `exportForBumpie(medications)`
Formats data for Bumpie_Meds pregnancy module.

### `exportForMindTrack(medications)`
Formats data for MindTrackAI general tracking.

## Adding New Medications

1. Edit `scripts/input-medications.json`
2. Add your medication with basic info
3. Run: `node scripts/medication-db-builder.js`
4. Script automatically enriches and exports

## Example Workflow

```bash
# 1. Add new medication to input file
echo '[{
  "genericName": "Amoxicillin",
  "brandNames": ["Amoxil"],
  "category": "Antibiotic",
  "pregnancy_category": "B"
}]' > scripts/input-medications.json

# 2. Run builder
node scripts/medication-db-builder.js

# 3. Check output
cat scripts/medications-enriched.json
```

## Error Handling

- **API failures**: Script continues with manual data only
- **Rate limiting**: Automatic delays prevent throttling
- **Validation**: Warns about missing data but doesn't fail
- **Retries**: 3 attempts for each API call

## Data Sources

- **RxNorm API**: https://rxnav.nlm.nih.gov/REST
- **FDA NDC Directory**: Via RxNorm

## Pregnancy Categories

| Code | Meaning | Example |
|------|---------|---------|
| A | Controlled studies show no risk | Levothyroxine |
| B | No evidence of risk in humans | Acetaminophen |
| C | Risk cannot be ruled out | Omeprazole |
| D | Positive evidence of risk | Lisinopril |
| X | Contraindicated in pregnancy | Atorvastatin |

## Troubleshooting

**No RxNorm data found:**
- Check spelling of generic name
- Try alternative names
- Check if drug is FDA-approved

**Missing NDC codes:**
- Some older drugs may not have NDC codes
- Generic-only medications may have limited NDC data

**API timeout:**
- Check internet connection
- Verify RxNorm API is accessible
- Increase `delayBetweenRequests` in config

## License

MIT
