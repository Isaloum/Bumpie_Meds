/**
 * Basic usage example for Bumpie_Meds
 */

const BumpieMeds = require('../src/index');

async function main() {
  // Initialize module
  const meds = BumpieMeds.initialize({
    enableAudit: true,
    logLevel: 'info'
  });

  console.log('=== Bumpie_Meds Basic Usage Example ===\n');

  try {
    // Check Acetaminophen (Tylenol) safety at week 24 (2nd trimester)
    console.log('1. Checking Acetaminophen at week 24...');
    const result1 = await meds.checkSafety('Acetaminophen', 24);
    console.log(`   Safe: ${result1.safe}`);
    console.log(`   Category: ${result1.category}`);
    console.log(`   Risk Level: ${result1.riskLevel}`);
    console.log(`   Warnings: ${result1.warnings.join(', ')}\n`);

    // Check Aspirin in first trimester (risky)
    console.log('2. Checking Aspirin at week 8 (1st trimester)...');
    const result2 = await meds.checkSafety('Aspirin', 8);
    console.log(`   Safe: ${result2.safe}`);
    console.log(`   Category: ${result2.category}`);
    console.log(`   Risk Level: ${result2.riskLevel}`);
    console.log(`   Warnings: ${result2.warnings.join(', ')}`);
    console.log(`   Alternatives: ${result2.alternatives.join(', ')}\n`);

    // Check Isotretinoin (Category X - NEVER safe)
    console.log('3. Checking Isotretinoin at week 15...');
    const result3 = await meds.checkSafety('Isotretinoin', 15);
    console.log(`   Safe: ${result3.safe}`);
    console.log(`   Category: ${result3.category}`);
    console.log(`   Risk Level: ${result3.riskLevel}`);
    console.log(`   Warnings: ${result3.warnings.join(', ')}\n`);

    // Get alternatives for unsafe medication
    console.log('4. Finding alternatives for Ibuprofen at week 30...');
    const alternatives = await meds.findAlternatives('Ibuprofen', 30);
    console.log(`   Found ${alternatives.length} safe alternatives:`);
    alternatives.forEach(alt => {
      console.log(`   - ${alt.name} (Category ${alt.category}, Risk: ${alt.riskLevel})`);
    });

    // Generate report
    console.log('\n5. Generating JSON report...');
    const report = await meds.generateReport(
      'patient123',
      new Date('2026-01-01'),
      new Date('2026-01-11'),
      'json'
    );
    console.log(`   Report ID: ${report.reportId}`);
    console.log(`   Total checks: ${report.period.totalChecks}`);
    console.log(`   Safe medications: ${report.summary.safeMedications}`);
    console.log(`   Unsafe medications: ${report.summary.unsafeMedications}`);

    console.log('\n=== Disclaimer ===');
    console.log(meds.getDisclaimer());

  } catch (error) {
    console.error('Error:', error.message);
    console.error('Code:', error.code);
  }
}

main();
