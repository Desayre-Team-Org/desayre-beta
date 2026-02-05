import bcrypt from 'bcryptjs';

async function generateAdminPassword() {
  const password = process.argv[2] || 'admin123';
  const hash = await bcrypt.hash(password, 12);
  console.log('\n========================================');
  console.log('Password:', password);
  console.log('Hash:', hash);
  console.log('========================================\n');
  console.log('Adicione este hash ao seu .env.local:');
  console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
}

generateAdminPassword();
