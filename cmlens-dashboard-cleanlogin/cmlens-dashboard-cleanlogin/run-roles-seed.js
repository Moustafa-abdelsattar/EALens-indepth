import postgres from 'postgres';
import { readFileSync } from 'fs';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function runSeed() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('📋 Running seed: approved_emails_with_roles.sql...\n');
    const seedSQL = readFileSync('seeds/approved_emails_with_roles.sql', 'utf-8');

    // Execute the entire SQL (postgres driver handles multiple statements)
    await sql.unsafe(seedSQL);

    console.log('✅ Seed completed!\n');

    // Display results
    console.log('📊 Current approved emails with roles:');
    const emails = await sql`
      SELECT
        email,
        CASE role
          WHEN 0 THEN 'No Access'
          WHEN 1 THEN 'Team Viewer'
          WHEN 2 THEN 'Uploader'
          WHEN 3 THEN 'Developer'
        END as role_name,
        team_name
      FROM approved_emails
      ORDER BY role DESC, team_name, email
    `;

    console.table(emails);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runSeed();
