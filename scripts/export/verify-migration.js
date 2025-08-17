#!/usr/bin/env node

/**
 * Supabase Migration Verification Script
 * 
 * Verifies data integrity and completeness after migration
 * Compares source and target projects to ensure successful migration
 * 
 * Usage: node verify-migration.js
 * 
 * Required Environment Variables:
 * - OLD_PROJECT_URL: Source project URL
 * - OLD_SERVICE_ROLE_KEY: Source project service role key
 * - NEW_PROJECT_URL: Target project URL  
 * - NEW_SERVICE_ROLE_KEY: Target project service role key
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Logging functions
const log = (message) => console.log(`${colors.blue}[${new Date().toISOString()}] ${message}${colors.reset}`);
const success = (message) => console.log(`${colors.green}[${new Date().toISOString()}] ✅ ${message}${colors.reset}`);
const warning = (message) => console.log(`${colors.yellow}[${new Date().toISOString()}] ⚠️  ${message}${colors.reset}`);
const error = (message) => console.log(`${colors.red}[${new Date().toISOString()}] ❌ ${message}${colors.reset}`);

// Critical tables for SaaS template
const CRITICAL_TABLES = [
  'profiles',
  'tenants', 
  'organizations',
  'organization_memberships',
  'deletion_requests',
  'gdpr_audit_logs',
  'notifications'
];

// Tables to check row counts
const COUNT_TABLES = [
  'profiles',
  'tenants',
  'organizations',
  'organization_memberships'
];

// Initialize clients
function initializeClients() {
  const requiredVars = ['OLD_PROJECT_URL', 'OLD_SERVICE_ROLE_KEY', 'NEW_PROJECT_URL', 'NEW_SERVICE_ROLE_KEY'];
  const missing = requiredVars.filter(v => !process.env[v]);
  
  if (missing.length > 0) {
    error(`Missing environment variables: ${missing.join(', ')}`);
    process.exit(1);
  }

  return {
    oldClient: createClient(process.env.OLD_PROJECT_URL, process.env.OLD_SERVICE_ROLE_KEY),
    newClient: createClient(process.env.NEW_PROJECT_URL, process.env.NEW_SERVICE_ROLE_KEY)
  };
}

// Test connections
async function testConnections(oldClient, newClient) {
  log('Testing database connections...');
  
  try {
    const { error: oldError } = await oldClient.from('profiles').select('count', { count: 'exact', head: true });
    const { error: newError } = await newClient.from('profiles').select('count', { count: 'exact', head: true });
    
    if (oldError && !oldError.message.includes('relation "profiles" does not exist')) {
      throw new Error(`Old project connection failed: ${oldError.message}`);
    }
    if (newError && !newError.message.includes('relation "profiles" does not exist')) {
      throw new Error(`New project connection failed: ${newError.message}`);
    }
    
    success('Database connections verified');
  } catch (err) {
    error(`Connection test failed: ${err.message}`);
    process.exit(1);
  }
}

// Check table existence
async function checkTableExistence(oldClient, newClient) {
  log('Checking table existence...');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  for (const table of CRITICAL_TABLES) {
    try {
      const { error: oldError } = await oldClient.from(table).select('*', { head: true, count: 'exact' });
      const { error: newError } = await newClient.from(table).select('*', { head: true, count: 'exact' });
      
      const oldExists = !oldError || !oldError.message.includes('does not exist');
      const newExists = !newError || !newError.message.includes('does not exist');
      
      if (oldExists && newExists) {
        success(`Table ${table}: ✅ exists in both projects`);
        results.passed++;
        results.details.push({ table, status: 'passed', issue: null });
      } else if (!oldExists && !newExists) {
        log(`Table ${table}: ⏭️  doesn't exist in either project (ok)`);
        results.details.push({ table, status: 'skipped', issue: 'not in source' });
      } else if (oldExists && !newExists) {
        warning(`Table ${table}: ❌ exists in source but missing in target`);
        results.failed++;
        results.details.push({ table, status: 'failed', issue: 'missing in target' });
      } else {
        warning(`Table ${table}: ⚠️  exists in target but not in source`);
        results.details.push({ table, status: 'warning', issue: 'extra in target' });
      }
    } catch (err) {
      error(`Error checking table ${table}: ${err.message}`);
      results.failed++;
      results.details.push({ table, status: 'error', issue: err.message });
    }
  }
  
  return results;
}

// Compare row counts
async function compareRowCounts(oldClient, newClient) {
  log('Comparing row counts...');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  for (const table of COUNT_TABLES) {
    try {
      const { count: oldCount, error: oldError } = await oldClient
        .from(table)
        .select('*', { count: 'exact', head: true });
        
      const { count: newCount, error: newError } = await newClient
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (oldError || newError) {
        const errorMsg = oldError?.message || newError?.message;
        if (errorMsg.includes('does not exist')) {
          log(`Table ${table}: ⏭️  skipped (doesn't exist)`);
          results.details.push({ table, oldCount: 0, newCount: 0, status: 'skipped' });
          continue;
        }
        throw new Error(errorMsg);
      }
      
      if (oldCount === newCount) {
        success(`Table ${table}: ✅ ${oldCount} rows (match)`);
        results.passed++;
        results.details.push({ table, oldCount, newCount, status: 'passed' });
      } else {
        warning(`Table ${table}: ❌ ${oldCount} → ${newCount} rows (mismatch)`);
        results.failed++;
        results.details.push({ table, oldCount, newCount, status: 'failed' });
      }
    } catch (err) {
      error(`Error checking ${table}: ${err.message}`);
      results.failed++;
      results.details.push({ table, oldCount: null, newCount: null, status: 'error', error: err.message });
    }
  }
  
  return results;
}

// Sample data integrity check
async function sampleDataIntegrity(oldClient, newClient) {
  log('Performing sample data integrity checks...');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  // Check profiles table specifically (core to SaaS template)
  try {
    const { data: oldProfiles, error: oldError } = await oldClient
      .from('profiles')
      .select('id, email, first_name, last_name, tenant_id')
      .limit(10);
      
    if (oldError) {
      if (oldError.message.includes('does not exist')) {
        log('Profiles table: ⏭️  skipped (doesn\'t exist)');
        return results;
      }
      throw oldError;
    }
    
    if (!oldProfiles || oldProfiles.length === 0) {
      log('Profiles table: ⏭️  no data to verify');
      return results;
    }
    
    for (const profile of oldProfiles.slice(0, 5)) { // Check first 5
      const { data: newProfile, error: newError } = await newClient
        .from('profiles')
        .select('id, email, first_name, last_name, tenant_id')
        .eq('id', profile.id)
        .single();
      
      if (newError) {
        warning(`Profile ${profile.id}: ❌ not found in target`);
        results.failed++;
        results.details.push({ 
          type: 'profile', 
          id: profile.id, 
          status: 'failed', 
          issue: 'missing in target' 
        });
        continue;
      }
      
      // Compare key fields
      const fieldsMatch = 
        profile.email === newProfile.email &&
        profile.first_name === newProfile.first_name &&
        profile.last_name === newProfile.last_name &&
        profile.tenant_id === newProfile.tenant_id;
      
      if (fieldsMatch) {
        success(`Profile ${profile.id}: ✅ data matches`);
        results.passed++;
        results.details.push({ 
          type: 'profile', 
          id: profile.id, 
          status: 'passed' 
        });
      } else {
        warning(`Profile ${profile.id}: ❌ data mismatch`);
        results.failed++;
        results.details.push({ 
          type: 'profile', 
          id: profile.id, 
          status: 'failed', 
          issue: 'data mismatch',
          old: profile,
          new: newProfile
        });
      }
    }
  } catch (err) {
    error(`Sample data check failed: ${err.message}`);
    results.failed++;
  }
  
  return results;
}

// Check storage buckets
async function checkStorageBuckets(oldClient, newClient) {
  log('Checking storage buckets...');
  
  const results = {
    passed: 0,
    failed: 0,
    details: []
  };
  
  try {
    const { data: oldBuckets, error: oldError } = await oldClient.storage.listBuckets();
    const { data: newBuckets, error: newError } = await newClient.storage.listBuckets();
    
    if (oldError || newError) {
      throw new Error(`Storage API error: ${oldError?.message || newError?.message}`);
    }
    
    const oldBucketIds = new Set(oldBuckets.map(b => b.id));
    const newBucketIds = new Set(newBuckets.map(b => b.id));
    
    // Check if all old buckets exist in new project
    for (const bucket of oldBuckets) {
      if (newBucketIds.has(bucket.id)) {
        success(`Bucket ${bucket.id}: ✅ migrated`);
        results.passed++;
        results.details.push({ bucket: bucket.id, status: 'passed' });
      } else {
        warning(`Bucket ${bucket.id}: ❌ missing in target`);
        results.failed++;
        results.details.push({ bucket: bucket.id, status: 'failed', issue: 'missing' });
      }
    }
    
    // Check for extra buckets in new project
    for (const bucket of newBuckets) {
      if (!oldBucketIds.has(bucket.id)) {
        log(`Bucket ${bucket.id}: ⚠️  extra in target (ok)`);
        results.details.push({ bucket: bucket.id, status: 'extra' });
      }
    }
    
  } catch (err) {
    error(`Storage check failed: ${err.message}`);
    results.failed++;
    results.details.push({ type: 'storage', status: 'error', error: err.message });
  }
  
  return results;
}

// Generate verification report
function generateReport(tableCheck, countCheck, dataCheck, storageCheck) {
  const timestamp = new Date().toISOString();
  const totalPassed = tableCheck.passed + countCheck.passed + dataCheck.passed + storageCheck.passed;
  const totalFailed = tableCheck.failed + countCheck.failed + dataCheck.failed + storageCheck.failed;
  const totalChecks = totalPassed + totalFailed;
  
  const report = `
Supabase Migration Verification Report
=====================================

Verification Date: ${timestamp}
Total Checks: ${totalChecks}
Passed: ${totalPassed}
Failed: ${totalFailed}
Success Rate: ${totalChecks > 0 ? ((totalPassed / totalChecks) * 100).toFixed(1) : 0}%

TABLE EXISTENCE CHECK
--------------------
Passed: ${tableCheck.passed}
Failed: ${tableCheck.failed}

${tableCheck.details.map(d => 
  `- ${d.table}: ${d.status}${d.issue ? ` (${d.issue})` : ''}`
).join('\n')}

ROW COUNT COMPARISON
-------------------
Passed: ${countCheck.passed}
Failed: ${countCheck.failed}

${countCheck.details.map(d => 
  `- ${d.table}: ${d.oldCount} → ${d.newCount} (${d.status})`
).join('\n')}

DATA INTEGRITY SAMPLE
--------------------
Passed: ${dataCheck.passed}
Failed: ${dataCheck.failed}

${dataCheck.details.map(d => 
  `- ${d.type} ${d.id}: ${d.status}${d.issue ? ` (${d.issue})` : ''}`
).join('\n')}

STORAGE VERIFICATION
-------------------
Passed: ${storageCheck.passed}
Failed: ${storageCheck.failed}

${storageCheck.details.map(d => 
  `- ${d.bucket}: ${d.status}${d.issue ? ` (${d.issue})` : ''}`
).join('\n')}

SUMMARY
-------
${totalFailed === 0 ? 
  '🎉 Migration verification PASSED! All checks successful.' : 
  `⚠️  Migration verification completed with ${totalFailed} failures. Review the details above.`
}

NEXT STEPS
----------
${totalFailed === 0 ? `
✅ Migration appears successful
✅ Update your application environment variables
✅ Test critical user flows
✅ Update Clerk JWT template in new project
✅ Verify real-time features are working
` : `
❌ Address the failed checks above
❌ Re-run specific migration steps if needed
❌ Consider rolling back if critical data is missing
❌ Contact support if issues persist
`}

IMPORTANT REMINDERS
------------------
- Update environment variables in your application
- Recreate Clerk JWT template in new project dashboard
- Update webhook URLs in external services  
- Test all critical user journeys
- Verify GDPR deletion and grace period systems
- Check multi-tenant isolation is working
- Confirm real-time subscriptions are active
`;

  // Save report to file
  const outputDir = path.join(__dirname, 'exports');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const reportFile = path.join(outputDir, 'migration-verification-report.txt');
  fs.writeFileSync(reportFile, report);
  
  success(`Verification report saved to: ${reportFile}`);
  
  return { totalPassed, totalFailed, totalChecks };
}

// Main verification function
async function main() {
  log('Starting Supabase Migration Verification...');
  log('==========================================');
  
  try {
    const { oldClient, newClient } = initializeClients();
    
    await testConnections(oldClient, newClient);
    
    const tableCheck = await checkTableExistence(oldClient, newClient);
    const countCheck = await compareRowCounts(oldClient, newClient);
    const dataCheck = await sampleDataIntegrity(oldClient, newClient);
    const storageCheck = await checkStorageBuckets(oldClient, newClient);
    
    const { totalPassed, totalFailed, totalChecks } = generateReport(
      tableCheck, 
      countCheck, 
      dataCheck, 
      storageCheck
    );
    
    log('\n=== VERIFICATION SUMMARY ===');
    if (totalFailed === 0) {
      success(`🎉 All ${totalPassed} checks passed! Migration verified successfully.`);
    } else {
      warning(`⚠️  ${totalFailed} out of ${totalChecks} checks failed.`);
      warning('   Please review the verification report for details.');
    }
    
    process.exit(totalFailed > 0 ? 1 : 0);
    
  } catch (err) {
    error(`Verification failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  main();
}

module.exports = { main };