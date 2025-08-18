#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function createClient() {
    const projectRef = process.env.NEW_PROJECT_REF;
    const password = process.env.NEW_DB_PASSWORD;
    
    if (!projectRef || !password) {
        throw new Error(`Missing environment variables: NEW_PROJECT_REF=${projectRef}, NEW_DB_PASSWORD=${password ? '[SET]' : '[MISSING]'}`);
    }
    
    // Use exact format from developer folder working connection
    // Format: postgresql://postgres.PROJECT_REF:password@pooler:5432/postgres?sslmode=require
    const connectionConfigs = [
        {
            name: 'EU West 3 Pooler (Supavisor format)',
            host: `aws-0-eu-west-3.pooler.supabase.com`,
            port: 5432,
            user: `postgres.${projectRef}`,
            database: 'postgres',
            password: password,
            ssl: { rejectUnauthorized: false }
        },
        {
            name: 'EU Central 1 Pooler (developer format)', 
            host: `aws-0-eu-central-1.pooler.supabase.com`,
            port: 5432,
            user: `postgres.${projectRef}`,
            database: 'postgres', 
            password: password,
            ssl: { rejectUnauthorized: false }
        },
        {
            name: 'US West 1 Pooler (Supavisor format)',
            host: `aws-0-us-west-1.pooler.supabase.com`, 
            port: 5432,
            user: `postgres.${projectRef}`,
            database: 'postgres',
            password: password,
            ssl: { rejectUnauthorized: false }
        }
    ];

    for (const config of connectionConfigs) {
        try {
            console.log(`Trying: ${config.name}`);
            const client = new Client(config);
            await client.connect();
            console.log(`Successfully connected using: ${config.name}`);
            return client;
        } catch (error) {
            console.log(`${config.name} failed: ${error.message}`);
            continue;
        }
    }
    
    throw new Error('Failed to connect using any pooler configuration');
}

async function testConnection() {
    try {
        const client = await createClient();
        const result = await client.query('SELECT version()');
        await client.end();
        console.log('Connection successful');
        process.exit(0);
    } catch (error) {
        console.error('Connection failed:', error.message);
        process.exit(1);
    }
}

async function executeFile(filePath) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error(`File not found: ${filePath}`);
            process.exit(1);
        }
        
        const sql = fs.readFileSync(filePath, 'utf8');
        const client = await createClient();
        
        console.log(`Executing SQL file: ${filePath}`);
        await client.query(sql);
        await client.end();
        
        console.log('SQL execution successful');
        process.exit(0);
    } catch (error) {
        console.error('SQL execution failed:', error.message);
        process.exit(1);
    }
}

const command = process.argv[2];
const filePath = process.argv[3];

switch (command) {
    case 'test':
        testConnection();
        break;
    case 'execute':
        if (!filePath) {
            console.error('Usage: node db-helper.js execute <file-path>');
            process.exit(1);
        }
        executeFile(filePath);
        break;
    default:
        console.error('Usage: node db-helper.js <test|execute> [file-path]');
        process.exit(1);
}