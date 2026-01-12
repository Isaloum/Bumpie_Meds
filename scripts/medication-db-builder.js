/**
 * Medication Database Builder
 * 
 * Enriches basic medication data with FDA/RxNorm information
 * Creates comprehensive database for MindTrackAI and Bumpie_Meds
 * 
 * Usage: node scripts/medication-db-builder.js
 */

const https = require('https');
const fs = require('fs').promises;
const path = require('path');

// ============================================
// CONFIGURATION
// ============================================

const CONFIG = {
  inputFile: path.join(__dirname, 'input-medications.json'),
  outputFile: path.join(__dirname, 'medications-enriched.json'),
  bumpieOutputFile: path.join(__dirname, '../src/data/medications.json'),
  mindtrackOutputFile: path.join(__dirname, 'medications-mindtrack.json'),
  
  // API endpoints
  rxnormAPI: 'https://rxnav.nlm.nih.gov/REST',
  fdaAPI: 'https://api.fda.gov/drug',
  
  // Rate limiting
  delayBetweenRequests: 500, // ms
  retryAttempts: 3
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Make HTTPS GET request
 * @param {string} url - API URL
 * @returns {Promise<Object>} JSON response
 */
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve({ error: 'Invalid JSON', raw: data });
        }
      });
    }).on('error', reject);
  });
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Parse medication name into generic vs brand
 * @param {string} medicationName - Drug name
 * @returns {Object} { isGeneric, name }
 */
function parseGenericVsBrand(medicationName) {
  // Common brand name patterns (usually capitalized)
  const brandPatterns = [
    /^[A-Z][a-z]+$/,  // Single capitalized word (Tylenol, Advil)
    /^[A-Z][a-z]+\s[A-Z][a-z]+$/, // Two capitalized words
  ];
  
  // Generic names usually lowercase or scientific
  const isLikelyBrand = brandPatterns.some(pattern => pattern.test(medicationName));
  
  return {
    isGeneric: !isLikelyBrand,
    name: medicationName,
    normalized: medicationName.toLowerCase().trim()
  };
}

/**
 * Look up drug in RxNorm database
 * @param {string} drugName - Drug name to search
 * @returns {Promise<Object>} RxNorm data
 */
async function lookupRxNorm(drugName) {
  try {
    const encoded = encodeURIComponent(drugName);
    const url = `${CONFIG.rxnormAPI}/approximateTerm.json?term=${encoded}&maxEntries=5`;
    
    console.log(`  → Searching RxNorm for: ${drugName}`);
    const data = await httpsGet(url);
    
    if (!data.approximateGroup?.candidate) {
      return { found: false, error: 'No results' };
    }
    
    const candidates = data.approximateGroup.candidate;
    const bestMatch = candidates[0]; // Take first match
    
    // Get detailed info using RxCUI
    const detailUrl = `${CONFIG.rxnormAPI}/rxcui/${bestMatch.rxcui}/allProperties.json?prop=all`;
    const details = await httpsGet(detailUrl);
    
    return {
      found: true,
      rxcui: bestMatch.rxcui,
      name: bestMatch.candidate,
      score: bestMatch.score,
      details: details.propConceptGroup || {}
    };
  } catch (error) {
    console.error(`  ✗ RxNorm lookup failed: ${error.message}`);
    return { found: false, error: error.message };
  }
}

/**
 * Look up NDC codes for a drug
 * @param {string} rxcui - RxNorm concept ID
 * @returns {Promise<Array<string>>} NDC codes
 */
async function lookupNDC(rxcui) {
  try {
    const url = `${CONFIG.rxnormAPI}/rxcui/${rxcui}/ndcs.json`;
    console.log(`  → Fetching NDC codes for RxCUI: ${rxcui}`);
    
    const data = await httpsGet(url);
    
    if (!data.ndcGroup?.ndcList?.ndc) {
      return [];
    }
    
    return data.ndcGroup.ndcList.ndc.slice(0, 5); // Limit to 5 NDCs
  } catch (error) {
    console.error(`  ✗ NDC lookup failed: ${error.message}`);
    return [];
  }
}

/**
 * Get related drugs (brand names, generics)
 * @param {string} rxcui - RxNorm concept ID
 * @returns {Promise<Object>} Related drug names
 */
async function getRelatedDrugs(rxcui) {
  try {
    const url = `${CONFIG.rxnormAPI}/rxcui/${rxcui}/related.json?tty=BN+SBD+BPCK`;
    console.log(`  → Fetching related drugs for RxCUI: ${rxcui}`);
    
    const data = await httpsGet(url);
    
    const brandNames = [];
    
    if (data.relatedGroup?.conceptGroup) {
      data.relatedGroup.conceptGroup.forEach(group => {
        if (group.conceptProperties) {
          group.conceptProperties.forEach(concept => {
            if (concept.tty === 'BN') { // Brand Name
              brandNames.push(concept.name);
            }
          });
        }
      });
    }
    
    return {
      brandNames: [...new Set(brandNames)] // Remove duplicates
    };
  } catch (error) {
    console.error(`  ✗ Related drugs lookup failed: ${error.message}`);
    return { brandNames: [] };
  }
}

/**
 * Validate medication structure
 * @param {Object} medication - Medication object
 * @returns {Object} Validation result
 */
function validateStructure(medication) {
  const required = ['genericName', 'category'];
  const missing = required.filter(field => !medication[field]);
  
  if (missing.length > 0) {
    return {
      valid: false,
      errors: [`Missing required fields: ${missing.join(', ')}`]
    };
  }
  
  const warnings = [];
  
  if (!medication.rxnormId) warnings.push('No RxNorm ID');
  if (!medication.brandNames || medication.brandNames.length === 0) {
    warnings.push('No brand names');
  }
  if (!medication.ndcCodes || medication.ndcCodes.length === 0) {
    warnings.push('No NDC codes');
  }
  
  return {
    valid: true,
    errors: [],
    warnings
  };
}

/**
 * Enrich single medication with API data
 * @param {Object} baseMed - Basic medication data
 * @param {number} index - Index for ID generation
 * @returns {Promise<Object>} Enriched medication
 */
async function enrichMedication(baseMed, index) {
  console.log(`\n[${index + 1}] Enriching: ${baseMed.genericName}`);
  
  const enriched = {
    id: index + 1,
    genericName: baseMed.genericName,
    brandNames: baseMed.brandNames || [],
    category: baseMed.category || 'Uncategorized',
    manufacturer: baseMed.manufacturer || 'Multiple manufacturers',
    dosages: baseMed.dosages || [],
    forms: baseMed.forms || ['Tablet'],
    frequency: baseMed.frequency || 'As directed',
    maxDailyDose: baseMed.maxDailyDose || 'Consult physician',
    fdaApprovalDate: baseMed.fdaApprovalDate || null,
    ndcCodes: [],
    rxnormId: null,
    
    // Pregnancy/Lactation info for Bumpie_Meds
    pregnancy_category: baseMed.pregnancy_category || 'N',
    lactation_safe: baseMed.lactation_safe !== undefined ? baseMed.lactation_safe : null,
    trimester_restrictions: baseMed.trimester_restrictions || 'consult_physician',
    
    // Metadata
    lastUpdated: new Date().toISOString(),
    dataSource: 'RxNorm API',
    verified: false
  };
  
  try {
    // Look up in RxNorm
    const rxnormData = await lookupRxNorm(baseMed.genericName);
    await sleep(CONFIG.delayBetweenRequests);
    
    if (rxnormData.found) {
      enriched.rxnormId = rxnormData.rxcui;
      console.log(`  ✓ RxNorm ID: ${rxnormData.rxcui}`);
      
      // Get NDC codes
      const ndcCodes = await lookupNDC(rxnormData.rxcui);
      await sleep(CONFIG.delayBetweenRequests);
      
      enriched.ndcCodes = ndcCodes;
      if (ndcCodes.length > 0) {
        console.log(`  ✓ Found ${ndcCodes.length} NDC codes`);
      }
      
      // Get related drugs (brand names)
      const related = await getRelatedDrugs(rxnormData.rxcui);
      await sleep(CONFIG.delayBetweenRequests);
      
      if (related.brandNames.length > 0) {
        enriched.brandNames = [
          ...new Set([...enriched.brandNames, ...related.brandNames])
        ];
        console.log(`  ✓ Found ${enriched.brandNames.length} brand names`);
      }
    } else {
      console.log(`  ⚠ RxNorm lookup failed, using manual data only`);
    }
    
    // Validate
    const validation = validateStructure(enriched);
    if (validation.warnings.length > 0) {
      console.log(`  ⚠ Warnings: ${validation.warnings.join(', ')}`);
    }
    
    console.log(`  ✓ Enrichment complete`);
    
  } catch (error) {
    console.error(`  ✗ Error enriching ${baseMed.genericName}: ${error.message}`);
  }
  
  return enriched;
}

/**
 * Export data for Bumpie_Meds (pregnancy module)
 * @param {Array} medications - Enriched medications
 * @returns {Array} Formatted for Bumpie_Meds
 */
function exportForBumpie(medications) {
  return medications.map(med => ({
    id: `med_rxcui_${med.rxnormId || med.id}`,
    rxcui: med.rxnormId || String(med.id),
    name: med.genericName,
    genericName: med.genericName,
    brandNames: med.brandNames,
    pregnancyCategory: {
      fda: med.pregnancy_category,
      trimester1: {
        safe: ['A', 'B'].includes(med.pregnancy_category),
        risk: med.pregnancy_category === 'A' ? 'minimal' : 
              med.pregnancy_category === 'B' ? 'low' :
              med.pregnancy_category === 'C' ? 'moderate' :
              med.pregnancy_category === 'D' ? 'high' : 'severe',
        warnings: [],
        alternatives: []
      },
      trimester2: {
        safe: ['A', 'B'].includes(med.pregnancy_category),
        risk: med.pregnancy_category === 'A' ? 'minimal' : 
              med.pregnancy_category === 'B' ? 'low' :
              med.pregnancy_category === 'C' ? 'moderate' :
              med.pregnancy_category === 'D' ? 'high' : 'severe',
        warnings: [],
        alternatives: []
      },
      trimester3: {
        safe: ['A', 'B'].includes(med.pregnancy_category),
        risk: med.pregnancy_category === 'A' ? 'minimal' : 
              med.pregnancy_category === 'B' ? 'low' :
              med.pregnancy_category === 'C' ? 'moderate' :
              med.pregnancy_category === 'D' ? 'high' : 'severe',
        warnings: [],
        alternatives: []
      }
    },
    contraindications: [],
    sources: [
      {
        type: 'RxNorm',
        url: `https://rxnav.nlm.nih.gov/REST/rxcui/${med.rxnormId}`,
        date: new Date().toISOString().split('T')[0]
      }
    ],
    lastUpdated: med.lastUpdated,
    verified: med.verified
  }));
}

/**
 * Export data for MindTrackAI (general tracking)
 * @param {Array} medications - Enriched medications
 * @returns {Array} Formatted for MindTrackAI
 */
function exportForMindTrack(medications) {
  return medications.map(med => ({
    id: med.id,
    name: med.genericName,
    brandNames: med.brandNames,
    category: med.category,
    dosages: med.dosages,
    forms: med.forms,
    frequency: med.frequency,
    manufacturer: med.manufacturer,
    rxnormId: med.rxnormId,
    ndcCodes: med.ndcCodes
  }));
}

// ============================================
// MAIN PROCESS
// ============================================

async function main() {
  console.log('='.repeat(60));
  console.log('MEDICATION DATABASE BUILDER');
  console.log('='.repeat(60));
  
  try {
    // Load input data
    console.log('\n📥 Loading input medications...');
    const inputData = await fs.readFile(CONFIG.inputFile, 'utf8');
    const inputMedications = JSON.parse(inputData);
    console.log(`✓ Loaded ${inputMedications.length} medications`);
    
    // Enrich each medication
    console.log('\n🔄 Enriching medications with RxNorm data...');
    const enriched = [];
    
    for (let i = 0; i < inputMedications.length; i++) {
      const med = await enrichMedication(inputMedications[i], i);
      enriched.push(med);
    }
    
    console.log(`\n✓ Enriched ${enriched.length} medications`);
    
    // Export full enriched data
    console.log('\n💾 Saving enriched database...');
    await fs.writeFile(
      CONFIG.outputFile,
      JSON.stringify(enriched, null, 2),
      'utf8'
    );
    console.log(`✓ Saved to: ${CONFIG.outputFile}`);
    
    // Export for Bumpie_Meds
    console.log('\n🤰 Exporting for Bumpie_Meds...');
    const bumpieData = exportForBumpie(enriched);
    await fs.writeFile(
      CONFIG.bumpieOutputFile,
      JSON.stringify(bumpieData, null, 2),
      'utf8'
    );
    console.log(`✓ Saved to: ${CONFIG.bumpieOutputFile}`);
    
    // Export for MindTrackAI
    console.log('\n🧠 Exporting for MindTrackAI...');
    const mindtrackData = exportForMindTrack(enriched);
    await fs.writeFile(
      CONFIG.mindtrackOutputFile,
      JSON.stringify(mindtrackData, null, 2),
      'utf8'
    );
    console.log(`✓ Saved to: ${CONFIG.mindtrackOutputFile}`);
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total medications: ${enriched.length}`);
    console.log(`With RxNorm IDs: ${enriched.filter(m => m.rxnormId).length}`);
    console.log(`With NDC codes: ${enriched.filter(m => m.ndcCodes.length > 0).length}`);
    console.log(`With brand names: ${enriched.filter(m => m.brandNames.length > 0).length}`);
    console.log('\n✅ Database build complete!');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  parseGenericVsBrand,
  lookupRxNorm,
  lookupNDC,
  validateStructure,
  enrichMedication,
  exportForBumpie,
  exportForMindTrack
};
