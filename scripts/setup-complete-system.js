#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { createClerkClient } = require('@clerk/backend');
const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

// Initialize Clerk client with secret key from .env
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY
});

// Users to create based on seed data
const usersToCreate = [
  {
    email: 'nextgendatalead@gmail.com',
    firstName: 'Emma',
    lastName: 'Johnson',
    role: 'member',
    tenantRole: 'member'
  },
  {
    email: 'imre.iddatasolutions@gmail.com',
    firstName: 'Imre',
    lastName: 'van der Berg',
    role: 'owner',
    tenantRole: 'owner'
  },
  {
    email: 'dekker.i@gmail.com',
    firstName: 'Imre',
    lastName: 'Dekker',
    role: 'admin',
    tenantRole: 'admin'
  },
  {
    email: 'imre@dappastra.com',
    firstName: 'Imre',
    lastName: 'Dappastra',
    role: 'owner',
    tenantRole: 'owner'
  }
];

async function createClerkUsers() {
  console.log('🚀 Creating Clerk users...\n');

  const createdUsers = [];

  for (const userData of usersToCreate) {
    try {
      console.log(`Creating user: ${userData.email}`);

      const user = await clerkClient.users.createUser({
        emailAddress: [userData.email],
        firstName: userData.firstName,
        lastName: userData.lastName,
        password: 'temp-password-123!', // Temporary password
        skipPasswordChecks: true, // Skip password strength requirements
        skipPasswordRequirement: false
      });

      createdUsers.push({
        ...userData,
        clerkUserId: user.id,
        clerkUser: user
      });

      console.log(`✅ Created: ${user.id} for ${userData.email}`);

    } catch (error) {
      console.log(`❌ Error creating ${userData.email}:`, error.message);

      // If user already exists, try to find them
      if (error.message.includes('already exists') || error.message.includes('taken')) {
        try {
          console.log(`🔍 User exists, searching for: ${userData.email}`);
          const userList = await clerkClient.users.getUserList({
            emailAddress: [userData.email]
          });

          if (userList.data.length > 0) {
            const existingUser = userList.data[0];
            createdUsers.push({
              ...userData,
              clerkUserId: existingUser.id,
              clerkUser: existingUser
            });
            console.log(`✅ Found existing: ${existingUser.id} for ${userData.email}`);
          }
        } catch (searchError) {
          console.log(`❌ Could not find existing user: ${searchError.message}`);
        }
      }
    }

    // Add delay to respect rate limits (20 requests per 10 seconds)
    await new Promise(resolve => setTimeout(resolve, 600)); // 600ms delay
  }

  return createdUsers;
}

async function updateSeedFile(createdUsers) {
  console.log('\n📝 Updating seed file with real Clerk user IDs...\n');

  const seedFilePath = path.join(__dirname, '../supabase/043_complete_test_coverage_seed_data.sql');

  try {
    let seedContent = await fs.readFile(seedFilePath, 'utf8');

    // Create mapping of email to real clerk_user_id
    const emailToClerkId = {};
    createdUsers.forEach(user => {
      emailToClerkId[user.email] = user.clerkUserId;
    });

    // Update each profile with real clerk_user_id
    const profileUpdates = [
      {
        oldId: 'user_techflow_member',
        email: 'nextgendatalead@gmail.com',
        newId: emailToClerkId['nextgendatalead@gmail.com']
      },
      {
        oldId: 'user_techflow_owner',
        email: 'imre.iddatasolutions@gmail.com',
        newId: emailToClerkId['imre.iddatasolutions@gmail.com']
      },
      {
        oldId: 'user_techflow_admin',
        email: 'dekker.i@gmail.com',
        newId: emailToClerkId['dekker.i@gmail.com']
      },
      {
        oldId: 'user_dataanalytics_owner',
        email: 'imre@dappastra.com',
        newId: emailToClerkId['imre@dappastra.com']
      }
    ];

    // Perform replacements
    for (const update of profileUpdates) {
      if (update.newId) {
        seedContent = seedContent.replace(
          new RegExp(update.oldId, 'g'),
          update.newId
        );
        console.log(`✅ Updated ${update.email}: ${update.oldId} → ${update.newId}`);
      } else {
        console.log(`❌ No Clerk ID found for ${update.email}`);
      }
    }

    // Write updated content back to file
    await fs.writeFile(seedFilePath, seedContent, 'utf8');
    console.log('\n✅ Seed file updated successfully!');

    return seedFilePath;

  } catch (error) {
    console.log('❌ Error updating seed file:', error.message);
    throw error;
  }
}

async function runSeedFile(seedFilePath) {
  console.log('\n🌱 Running seed file in Supabase...\n');

  try {
    // Check if Supabase CLI is available
    try {
      execSync('supabase --version', { stdio: 'ignore' });
    } catch (error) {
      throw new Error('Supabase CLI not found. Please install it or run the seed file manually in Supabase Dashboard.');
    }

    // Check if we're in a Supabase project
    if (!require('fs').existsSync('./supabase/config.toml')) {
      throw new Error('Not in a Supabase project directory. Please run from your project root or run the seed file manually.');
    }

    console.log('📁 Executing seed file via Supabase CLI...');

    // Run the seed file using supabase db push
    const command = `supabase db reset --db-url "${process.env.SUPABASE_DB_URL || process.env.DATABASE_URL}" --linked`;

    // Alternative: Execute the SQL file directly
    const sqlCommand = `psql "${process.env.SUPABASE_DB_URL || process.env.DATABASE_URL}" -f "${seedFilePath}"`;

    console.log('Running:', sqlCommand);
    execSync(sqlCommand, { stdio: 'inherit' });

    console.log('✅ Seed file executed successfully!');

  } catch (error) {
    console.log('❌ Error running seed file automatically:', error.message);
    console.log('\n🔧 Manual steps required:');
    console.log('1. Open Supabase Dashboard');
    console.log('2. Go to SQL Editor');
    console.log(`3. Run the file: ${seedFilePath}`);
    throw error;
  }
}

async function main() {
  try {
    // Check if CLERK_SECRET_KEY is set
    if (!process.env.CLERK_SECRET_KEY) {
      console.log('❌ CLERK_SECRET_KEY environment variable is required');
      process.exit(1);
    }

    console.log('🎯 Starting Complete System Setup...\n');
    console.log('⚠️  IMPORTANT: Please clear your database tables manually first!');
    console.log('   1. Open Supabase Dashboard');
    console.log('   2. Clear relevant tables (profiles, tenants, clients, time_entries, invoices, etc.)');
    console.log('   3. Press Enter to continue after clearing...\n');

    // Wait for user confirmation
    await new Promise(resolve => {
      process.stdin.once('data', () => resolve());
    });

    console.log('📋 Continuing with automated setup...\n');

    // Step 1: Create Clerk users
    const createdUsers = await createClerkUsers();

    if (createdUsers.length === 0) {
      console.log('❌ No users were created or found');
      process.exit(1);
    }

    console.log(`\n📊 Summary of created/found users:`);
    createdUsers.forEach(user => {
      console.log(`  • ${user.email}: ${user.clerkUserId} (${user.tenantRole})`);
    });

    // Step 2: Update seed file
    const seedFilePath = await updateSeedFile(createdUsers);

    // Step 3: Run seed file (with fallback to manual instructions)
    try {
      await runSeedFile(seedFilePath);
    } catch (error) {
      console.log('\n⚠️  Automated seeding failed, but that\'s OK!');
      console.log('✅ Clerk users created and seed file updated successfully.');
      console.log('\n🔧 Please run the seed file manually:');
      console.log('1. Open Supabase Dashboard → SQL Editor');
      console.log(`2. Run: ${seedFilePath}`);
      console.log('\n3. Then test your metrics dashboard!');
      return;
    }

    console.log('\n🎉 Complete System Setup Finished!');
    console.log('\n🚀 Next steps:');
    console.log('1. Go to: http://localhost:3000');
    console.log('2. Sign in as: nextgendatalead@gmail.com');
    console.log('3. Password: temp-password-123!');
    console.log('4. Check your metrics dashboard - it should show real data now!');
    console.log('5. Change your password after first login');

  } catch (error) {
    console.log('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createClerkUsers, updateSeedFile, runSeedFile };