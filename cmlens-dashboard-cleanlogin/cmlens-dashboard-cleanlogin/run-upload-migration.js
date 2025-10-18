import postgres from 'postgres';
import { readFileSync } from 'fs';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function runMigration() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🚀 Running migration: 003_upload_logs_and_cache.sql...\n');
    const migrationSQL = readFileSync('migrations/003_upload_logs_and_cache.sql', 'utf-8');

    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!\n');

    // Verify tables were created
    console.log('📊 Verifying tables...\n');

    const tables = await sql`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('upload_logs', 'agent_data_cache')
      ORDER BY table_name
    `;

    console.log('Tables created:');
    console.table(tables);

    // Check upload_logs structure
    console.log('\n📋 upload_logs table structure:');
    const uploadLogsColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'upload_logs'
      ORDER BY ordinal_position
    `;
    console.table(uploadLogsColumns);

    // Check agent_data_cache structure
    console.log('\n📋 agent_data_cache table structure:');
    const cacheColumns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'agent_data_cache'
      ORDER BY ordinal_position
    `;
    console.table(cacheColumns);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
