import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function syncSingleUser(email) {
  const sql = postgres(DATABASE_URL);

  try {
    console.log(`🔄 Syncing role for: ${email}\n`);

    // Check approved_emails first
    const approved = await sql`
      SELECT email, role, team_name
      FROM approved_emails
      WHERE email = ${email}
    `;

    if (approved.length === 0) {
      console.error(`❌ Email ${email} not found in approved_emails table`);
      process.exit(1);
    }

    console.log('📋 Role in approved_emails:');
    console.table(approved);

    // Update user with new role from approved_emails
    const result = await sql`
      UPDATE users
      SET
        role = ${approved[0].role},
        team_name = ${approved[0].team_name}
      WHERE email = ${email}
      RETURNING email, role, team_name, is_active
    `;

    if (result.length === 0) {
      console.log('\n⚠️  User not found in users table - user needs to sign up first');
    } else {
      console.log('\n✅ User role updated in users table:');
      console.table(result);
      console.log('\n✨ User must log out and log back in for changes to take effect');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

const email = process.argv[2];
if (!email) {
  console.error('❌ Please provide an email address');
  console.log('Usage: node sync-single-user.js email@example.com');
  process.exit(1);
}

syncSingleUser(email);
