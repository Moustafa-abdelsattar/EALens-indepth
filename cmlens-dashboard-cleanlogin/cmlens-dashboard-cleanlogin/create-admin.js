import postgres from 'postgres';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

async function createAdminUser() {
  console.log('Connecting to database...');
  const sql = postgres(DATABASE_URL);

  try {
    console.log('Creating admin user...');

    const email = 'admin@admin.com';
    const password = 'admin';
    const role = 3; // Developer role (full access)

    // Hash the password
    const passwordHash = await bcrypt.hash(password, 10);

    // First, add to approved emails if not exists
    await sql`
      INSERT INTO approved_emails (email, role, team_name)
      VALUES (${email}, ${role}, NULL)
      ON CONFLICT (email) DO UPDATE SET role = ${role}
    `;
    console.log('✅ Added/updated admin in approved emails');

    // Check if user already exists and upsert
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role, team_name, is_active)
      VALUES (${email}, ${passwordHash}, 'Admin', 'User', ${role}, NULL, true)
      ON CONFLICT (email)
      DO UPDATE SET
        password_hash = ${passwordHash},
        role = ${role},
        is_active = true,
        updated_at = NOW()
    `;
    console.log('✅ Created/updated admin user');

    console.log('\n🔐 Admin credentials:');
    console.log('   Email: admin@admin.com');
    console.log('   Password: admin');
    console.log('   Role: Developer (full access)');
    console.log('\n✅ You can now login at http://localhost:5000');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

createAdminUser();
