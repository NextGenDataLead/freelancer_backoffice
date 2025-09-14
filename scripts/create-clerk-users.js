#!/usr/bin/env node

// Load environment variables from .env file
require('dotenv').config();

const { createClerkClient } = require('@clerk/backend');
const fs = require('fs').promises;
const path = require('path');

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

  } catch (error) {
    console.log('❌ Error updating seed file:', error.message);
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

    console.log('🎯 Starting Clerk user creation and seed file update...\n');

    // Create users
    const createdUsers = await createClerkUsers();

    if (createdUsers.length === 0) {
      console.log('❌ No users were created or found');
      process.exit(1);
    }

    console.log(`\n📊 Summary of created/found users:`);
    createdUsers.forEach(user => {
      console.log(`  • ${user.email}: ${user.clerkUserId} (${user.tenantRole})`);
    });

    // Update seed file
    await updateSeedFile(createdUsers);

    console.log('\n🎉 Process completed successfully!');
    console.log('\nNext steps:');
    console.log('1. Clear your database tables (if needed)');
    console.log('2. Run the updated seed file: supabase/043_complete_test_coverage_seed_data.sql');
    console.log('3. Your metrics dashboard should now work with real data!');

  } catch (error) {
    console.log('\n❌ Process failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { createClerkUsers, updateSeedFile };