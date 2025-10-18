// Script to set up authentication tables in PostgreSQL
import postgres from 'postgres';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function setupAuth() {
  console.log('Connecting to database...');
  const sql = postgres(DATABASE_URL);

  try {
    // Read migration file
    const migrationSQL = readFileSync(join(__dirname, 'migrations', '001_auth_setup.sql'), 'utf-8');

    console.log('Running migration...');
    await sql.unsafe(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Check if tables were created
    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;

    console.log('\n📋 Tables in database:');
    tables.forEach(t => console.log(`  - ${t.table_name}`));

    // Check approved_emails count
    const emailCount = await sql`SELECT COUNT(*) as count FROM approved_emails`;
    console.log(`\n📧 Approved emails count: ${emailCount[0].count}`);

    if (emailCount[0].count === 0) {
      console.log('\n⚠️  No approved emails found. You need to add emails to the approved_emails table.');
      console.log('   Run the seed file or add emails manually.');
    }

  } catch (error) {
    console.error('❌ Error setting up authentication:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

setupAuth();
