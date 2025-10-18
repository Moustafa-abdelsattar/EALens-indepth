import postgres from 'postgres';
import { readFileSync } from 'fs';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function runMigration() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Running migration: 001_auth_setup.sql...\n');
    const migrationSQL = readFileSync('migrations/001_auth_setup.sql', 'utf-8');

    // Execute the migration
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    console.log('📊 Verifying tables...\n');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('users', 'approved_emails', 'sessions')
      ORDER BY table_name
    `;

    console.log('Tables created:');
    console.table(tables);

    // Check users table structure
    console.log('\n📋 Users table structure:');
    const userColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position
    `;
    console.table(userColumns);

    // Check approved_emails table structure
    console.log('\n📋 Approved emails table structure:');
    const emailColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'approved_emails'
      ORDER BY ordinal_position
    `;
    console.table(emailColumns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
