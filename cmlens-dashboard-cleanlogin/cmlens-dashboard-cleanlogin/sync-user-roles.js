import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function syncUserRoles() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('🔄 Syncing user roles from approved_emails...\n');

    // Update all users to have the role and team from approved_emails
    const result = await sql`
      UPDATE users
      SET
        role = approved_emails.role,
        team_name = approved_emails.team_name
      FROM approved_emails
      WHERE users.email = approved_emails.email
      RETURNING users.email, users.role, users.team_name
    `;

    console.log('✅ Updated user roles:\n');
    console.table(result);

    // Show all users with their current roles
    console.log('\n📊 All users in database:');
    const allUsers = await sql`
      SELECT
        email,
        CASE role
          WHEN 0 THEN 'No Access'
          WHEN 1 THEN 'Team Viewer'
          WHEN 2 THEN 'Uploader'
          WHEN 3 THEN 'Developer'
        END as role_name,
        role,
        team_name,
        is_active,
        created_at
      FROM users
      ORDER BY role DESC, email
    `;
    console.table(allUsers);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

syncUserRoles();
