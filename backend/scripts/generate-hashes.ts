import bcrypt from 'bcrypt';

async function generateSeedHashes(): void {
  const saltRounds: number = 10;
  const demoPassword: string = 'Password123!';

  const hash: string = await bcrypt.hash(demoPassword, saltRounds);
  console.log(`Plain Password: ${demoPassword}`);
  console.log(`Bcrypt Hash: ${hash}`);
}

generateSeedHashes();
