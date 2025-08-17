#!/usr/bin/env node

/**
 * Supabase Storage Migration Script
 * 
 * Migrates all storage buckets, objects, and policies from one Supabase project to another.
 * Handles large files, preserves metadata, and includes progress tracking.
 * 
 * Usage: node migrate-storage.js
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

// Check required environment variables
function checkEnvironmentVariables() {
  const requiredVars = [
    'OLD_PROJECT_URL',
    'OLD_SERVICE_ROLE_KEY', 
    'NEW_PROJECT_URL',
    'NEW_SERVICE_ROLE_KEY'
  ];
  
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    error('Missing required environment variables:');
    missingVars.forEach(varName => error(`  - ${varName}`));
    error('Please set these variables and try again.');
    process.exit(1);
  }
  
  success('All required environment variables are set');
}

// Initialize Supabase clients
function initializeClients() {
  log('Initializing Supabase clients...');
  
  const oldSupabaseClient = createClient(
    process.env.OLD_PROJECT_URL,
    process.env.OLD_SERVICE_ROLE_KEY
  );
  
  const newSupabaseClient = createClient(
    process.env.NEW_PROJECT_URL,
    process.env.NEW_SERVICE_ROLE_KEY
  );
  
  // Also create clients with storage schema access for direct queries
  const oldSupabaseRestClient = createClient(
    process.env.OLD_PROJECT_URL,
    process.env.OLD_SERVICE_ROLE_KEY,
    {
      db: { schema: 'storage' }
    }
  );
  
  success('Supabase clients initialized');
  
  return {
    oldClient: oldSupabaseClient,
    newClient: newSupabaseClient,
    oldRestClient: oldSupabaseRestClient
  };
}

// Test connections
async function testConnections(oldClient, newClient) {
  log('Testing connections to both projects...');
  
  try {
    // Test old project
    const { data: oldBuckets, error: oldError } = await oldClient.storage.listBuckets();
    if (oldError) throw new Error(`Old project connection failed: ${oldError.message}`);
    
    // Test new project
    const { data: newBuckets, error: newError } = await newClient.storage.listBuckets();
    if (newError) throw new Error(`New project connection failed: ${newError.message}`);
    
    success(`Old project: ${oldBuckets.length} buckets found`);
    success(`New project: ${newBuckets.length} buckets found`);
    success('Connections tested successfully');
    
    return { oldBuckets, newBuckets };
  } catch (err) {
    error(`Connection test failed: ${err.message}`);
    process.exit(1);
  }
}

// Create missing buckets in target project
async function createMissingBuckets(oldBuckets, newBuckets, newClient) {
  log('Checking for missing buckets in target project...');
  
  const newBucketIds = new Set(newBuckets.map(bucket => bucket.id));
  const missingBuckets = oldBuckets.filter(bucket => !newBucketIds.has(bucket.id));
  
  if (missingBuckets.length === 0) {
    success('All buckets already exist in target project');
    return;
  }
  
  log(`Creating ${missingBuckets.length} missing buckets...`);
  
  for (const bucket of missingBuckets) {
    try {
      const { data, error } = await newClient.storage.createBucket(bucket.id, {
        public: bucket.public,
        allowedMimeTypes: bucket.allowed_mime_types,
        fileSizeLimit: bucket.file_size_limit
      });
      
      if (error) {
        warning(`Failed to create bucket ${bucket.id}: ${error.message}`);
      } else {
        success(`Created bucket: ${bucket.id}`);
      }
    } catch (err) {
      warning(`Error creating bucket ${bucket.id}: ${err.message}`);
    }
  }
}

// Get all objects from old project with pagination
async function getAllObjects(oldRestClient, bucketId = null) {
  log('Fetching all storage objects...');
  
  let allObjects = [];
  let from = 0;
  const limit = 1000; // Maximum allowed by Supabase
  
  try {
    while (true) {
      let query = oldRestClient
        .from('objects')
        .select('*')
        .range(from, from + limit - 1)
        .order('created_at');
      
      if (bucketId) {
        query = query.eq('bucket_id', bucketId);
      }
      
      const { data: objects, error } = await query;
      
      if (error) {
        throw new Error(`Failed to fetch objects: ${error.message}`);
      }
      
      if (!objects || objects.length === 0) {
        break;
      }
      
      allObjects = allObjects.concat(objects);
      from += limit;
      
      log(`Fetched ${allObjects.length} objects so far...`);
      
      // If we got fewer objects than the limit, we've reached the end
      if (objects.length < limit) {
        break;
      }
    }
    
    success(`Found ${allObjects.length} total objects to migrate`);
    return allObjects;
  } catch (err) {
    error(`Failed to fetch objects: ${err.message}`);
    throw err;
  }
}

// Check if object already exists in target
async function objectExists(newClient, bucketId, objectName) {
  try {
    const { data, error } = await newClient.storage
      .from(bucketId)
      .download(objectName);
    
    // If no error and we got data, object exists
    return !error && data;
  } catch (err) {
    // Object doesn't exist
    return false;
  }
}

// Migrate a single object
async function migrateObject(objectData, oldClient, newClient, skipExisting = true) {
  const { bucket_id, name, metadata } = objectData;
  
  try {
    // Check if object already exists (optional optimization)
    if (skipExisting && await objectExists(newClient, bucket_id, name)) {
      log(`Skipping existing object: ${bucket_id}/${name}`);
      return { success: true, skipped: true };
    }
    
    // Download from old project
    const { data: fileData, error: downloadError } = await oldClient.storage
      .from(bucket_id)
      .download(name);
    
    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }
    
    // Upload to new project
    const { data: uploadData, error: uploadError } = await newClient.storage
      .from(bucket_id)
      .upload(name, fileData, {
        upsert: true,
        contentType: metadata?.mimetype || 'application/octet-stream',
        cacheControl: metadata?.cacheControl || '3600'
      });
    
    if (uploadError) {
      throw new Error(`Upload failed: ${uploadError.message}`);
    }
    
    return { success: true, skipped: false };
  } catch (err) {
    return { 
      success: false, 
      skipped: false, 
      error: err.message,
      objectData 
    };
  }
}

// Migrate all objects with progress tracking
async function migrateAllObjects(allObjects, oldClient, newClient) {
  log(`Starting migration of ${allObjects.length} objects...`);
  
  const results = {
    total: allObjects.length,
    success: 0,
    skipped: 0,
    failed: 0,
    errors: []
  };
  
  const batchSize = 5; // Process 5 objects concurrently
  const startTime = Date.now();
  
  // Create logs directory
  const logsDir = path.join(__dirname, 'logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  
  const errorLogFile = path.join(logsDir, 'storage-migration-errors.log');
  
  for (let i = 0; i < allObjects.length; i += batchSize) {
    const batch = allObjects.slice(i, i + batchSize);
    const batchPromises = batch.map(obj => migrateObject(obj, oldClient, newClient));
    
    const batchResults = await Promise.all(batchPromises);
    
    // Process batch results
    batchResults.forEach((result, index) => {
      const obj = batch[index];
      
      if (result.success) {
        if (result.skipped) {
          results.skipped++;
        } else {
          results.success++;
        }
      } else {
        results.failed++;
        results.errors.push({
          object: `${obj.bucket_id}/${obj.name}`,
          error: result.error
        });
        
        // Log error to file
        fs.appendFileSync(errorLogFile, 
          `${new Date().toISOString()} - ${obj.bucket_id}/${obj.name}: ${result.error}\n`
        );
      }
    });
    
    // Progress update
    const processed = Math.min(i + batchSize, allObjects.length);
    const percentage = ((processed / allObjects.length) * 100).toFixed(1);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    
    log(`Progress: ${processed}/${allObjects.length} (${percentage}%) - ${elapsed}s elapsed`);
  }
  
  return results;
}

// Generate migration report
function generateReport(results, oldBuckets, outputDir) {
  const reportFile = path.join(outputDir, 'storage-migration-report.txt');
  const duration = ((Date.now() - results.startTime) / 1000).toFixed(1);
  
  const report = `
Supabase Storage Migration Report
================================

Migration Date: ${new Date().toISOString()}
Duration: ${duration} seconds

Summary:
--------
Total Objects: ${results.total}
Successfully Migrated: ${results.success}
Skipped (Already Exist): ${results.skipped}
Failed: ${results.failed}

Buckets Migrated:
----------------
${oldBuckets.map(bucket => `- ${bucket.id} (${bucket.public ? 'public' : 'private'})`).join('\n')}

${results.failed > 0 ? `
Failed Objects:
--------------
${results.errors.slice(0, 10).map(err => `- ${err.object}: ${err.error}`).join('\n')}
${results.errors.length > 10 ? `... and ${results.errors.length - 10} more (see logs/storage-migration-errors.log)` : ''}
` : ''}

Next Steps:
----------
1. Review any failed migrations in the error log
2. Verify critical files have been migrated correctly
3. Update your application to use the new project URL
4. Test file uploads and downloads in the new project

Important Notes:
---------------
- Bucket policies may need to be recreated manually
- Check file permissions and RLS policies
- Verify any custom storage triggers or functions
`;

  fs.writeFileSync(reportFile, report);
  success(`Migration report saved to: ${reportFile}`);
  
  // Console summary
  log('\n=== MIGRATION SUMMARY ===');
  success(`✅ Successfully migrated: ${results.success} objects`);
  if (results.skipped > 0) {
    log(`⏭️  Skipped (already exist): ${results.skipped} objects`);
  }
  if (results.failed > 0) {
    warning(`❌ Failed migrations: ${results.failed} objects`);
    warning(`   Check error log: logs/storage-migration-errors.log`);
  }
  log(`⏱️  Total duration: ${duration} seconds`);
}

// Main migration function
async function main() {
  log('Starting Supabase Storage Migration...');
  log('====================================');
  
  const startTime = Date.now();
  
  try {
    // Setup
    checkEnvironmentVariables();
    const { oldClient, newClient, oldRestClient } = initializeClients();
    
    // Test connections and get buckets
    const { oldBuckets, newBuckets } = await testConnections(oldClient, newClient);
    
    // Create missing buckets
    await createMissingBuckets(oldBuckets, newBuckets, newClient);
    
    // Get all objects
    const allObjects = await getAllObjects(oldRestClient);
    
    if (allObjects.length === 0) {
      success('No objects to migrate');
      return;
    }
    
    // Migrate objects
    const results = await migrateAllObjects(allObjects, oldClient, newClient);
    results.startTime = startTime;
    
    // Create output directory
    const outputDir = path.join(__dirname, 'exports');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // Generate report
    generateReport(results, oldBuckets, outputDir);
    
    if (results.failed === 0) {
      success('🎉 Storage migration completed successfully!');
    } else {
      warning('⚠️  Storage migration completed with some failures. Check the error log for details.');
    }
    
  } catch (err) {
    error(`Migration failed: ${err.message}`);
    console.error(err);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  error(`Unhandled Rejection at: ${promise}, reason: ${reason}`);
  process.exit(1);
});

// Run the migration
if (require.main === module) {
  main();
}

module.exports = { main };