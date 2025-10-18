// Script to seed approved emails
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:RjqimaFbHslxlIfuckCKRLikCrujWkpt@caboose.proxy.rlwy.net:41214/railway';

// ⚠️ IMPORTANT: Replace these with your actual approved email addresses
const APPROVED_EMAILS = [
  'abdellatif01@51talk.com',
  'ayman@51talk.com',
  'abdelrahman@51talk.com',
  '51ahmed.diab@gmail.com',
  'islammohamed@51talk.com',
  'abdullahessam@51talk.com',
  'sherifa@51talk.com',
  'moustafa.mohamed159357@gmail.com',
  'yokareda10@gmail.com',
];

async function seedEmails() {
  console.log('Connecting to database...');
  const sql = postgres(DATABASE_URL);

  try {
    console.log(`\nAdding ${APPROVED_EMAILS.length} approved emails...`);

    for (const email of APPROVED_EMAILS) {
      await sql`
        INSERT INTO approved_emails (email)
        VALUES (${email.toLowerCase()})
        ON CONFLICT (email) DO NOTHING
      `;
      console.log(`  ✅ Added: ${email}`);
    }

    // Display all approved emails
    const allEmails = await sql`
      SELECT email, added_at
      FROM approved_emails
      ORDER BY added_at DESC
    `;

    console.log(`\n📧 All approved emails in database (${allEmails.length} total):`);
    allEmails.forEach(e => {
      console.log(`  - ${e.email} (added: ${e.added_at.toISOString().split('T')[0]})`);
    });

    console.log('\n✅ Email seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding emails:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

seedEmails();
