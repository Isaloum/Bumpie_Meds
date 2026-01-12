/**
 * MindTrackAI Integration Example
 */

const BumpieMeds = require('../src/index');

// Initialize once at app startup
const meds = BumpieMeds.initialize({
  enableAudit: true,
  cacheEnabled: true
});

/**
 * Validate medication for pregnant patient
 * @param {string} medName - Medication name from form
 * @param {Object} patientData - Patient information
 * @returns {Promise<Object>} Validation result
 */
async function validatePregnancyMedication(medName, patientData) {
  // Skip if not pregnant
  if (!patientData.isPregnant) {
    return { 
      safe: true, 
      message: 'Not applicable - patient not pregnant' 
    };
  }

  try {
    // Check safety
    const result = await meds.checkSafety(medName, patientData.weekOfPregnancy, {
      patientId: hashPatientId(patientData.id),
      context: { 
        app: 'MindTrackAI',
        version: '1.0.0',
        formType: 'medication_entry'
      }
    });

    // Return validation result
    return {
      safe: result.safe,
      category: result.category,
      riskLevel: result.riskLevel,
      warnings: result.warnings,
      alternatives: result.alternatives,
      categoryInfo: result.categoryInfo,
      message: result.safe 
        ? `${medName} is generally safe in trimester ${result.trimester}`
        : `⚠️ ${medName} may not be safe. Consult your doctor.`
    };

  } catch (error) {
    if (error.code === 'MEDICATION_NOT_FOUND') {
      // Medication not in database - show warning
      return {
        safe: null,
        message: '⚠️ Medication not found in pregnancy safety database. Please consult your healthcare provider.',
        shouldConsult: true
      };
    }
    throw error;
  }
}

/**
 * Display warning UI in MindTrackAI
 * @param {Object} validationResult - Result from validatePregnancyMedication
 */
function displayWarningUI(validationResult) {
  if (validationResult.safe === false) {
    // Show red warning banner
    showAlert({
      type: 'danger',
      title: '⚠️ Pregnancy Safety Warning',
      message: validationResult.warnings.join('. '),
      actions: [
        {
          label: 'See Alternatives',
          onClick: () => showAlternatives(validationResult.alternatives)
        },
        {
          label: 'Contact Doctor',
          onClick: () => openDoctorContact()
        }
      ]
    });
  } else if (validationResult.safe === null) {
    // Show yellow warning for unknown meds
    showAlert({
      type: 'warning',
      message: validationResult.message
    });
  } else if (validationResult.warnings.length > 0) {
    // Show blue info banner for safe meds with warnings
    showAlert({
      type: 'info',
      message: validationResult.warnings.join('. ')
    });
  }
}

/**
 * Hash patient ID for privacy
 * @param {string} patientId - Raw patient ID
 * @returns {string} Hashed ID
 */
function hashPatientId(patientId) {
  // Simple hash for demo - use proper crypto in production
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(patientId).digest('hex').substring(0, 16);
}

// Example usage in medication form
async function onMedicationFormSubmit(formData) {
  const patientData = {
    id: 'user123',
    isPregnant: true,
    weekOfPregnancy: 24,
    trimester: 2
  };

  // Validate medication
  const validation = await validatePregnancyMedication(formData.medName, patientData);

  // Show UI warnings if needed
  displayWarningUI(validation);

  // Allow submission even if unsafe (with warning shown)
  // Doctor can make final decision
  return {
    allowed: true,
    validation
  };
}

module.exports = {
  validatePregnancyMedication,
  displayWarningUI,
  onMedicationFormSubmit
};
