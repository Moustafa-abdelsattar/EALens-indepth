import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function checkUser() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('Checking islammohamed@51talk.com...\n');

    // Check in users table
    const user = await sql`
      SELECT id, email, role, team_name, is_active, created_at
      FROM users
      WHERE email = 'islammohamed@51talk.com'
    `;

    if (user.length === 0) {
      console.log('❌ User not found in users table. User needs to sign up first.');
    } else {
      console.log('✅ User found in users table:');
      console.table(user);
    }

    // Check in approved_emails table
    const approved = await sql`
      SELECT email, role, team_name
      FROM approved_emails
      WHERE email = 'islammohamed@51talk.com'
    `;

    console.log('\n📋 Approved email entry:');
    console.table(approved);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

checkUser();
