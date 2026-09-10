import { Pool } from 'pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

interface SeedUser {
  email: string;
  role: 'staff' | 'manager' | 'company_admin' | 'platform';
  displayName: string;
}

const users: SeedUser[] = [
  { email: 'staff@acme.test', role: 'staff', displayName: 'Demo Staff' },
  { email: 'manager@acme.test', role: 'manager', displayName: 'Demo Manager' },
  { email: 'admin@acme.test', role: 'company_admin', displayName: 'Demo Company Admin' },
  { email: 'platform@acme.test', role: 'platform', displayName: 'Demo Platform Admin' },
];

async function seed(): Promise<void> {
  const plainPassword = 'Password123!';
  const saltRounds = 10;
  const hash = await bcrypt.hash(plainPassword, saltRounds);

  for (const user of users) {
    await pool.query(
      `INSERT INTO users (email, password_hash, role, display_name, status)
       VALUES ($1, $2, $3, $4, 'active')
       ON CONFLICT (email) DO NOTHING`,
      [user.email, hash, user.role, user.displayName]
    );
  }

  console.log('Database successfully seeded.');
  await pool.end();
}

seed().catch((err) => {
  console.error('Seeding error:', err);
  process.exit(1);
});
