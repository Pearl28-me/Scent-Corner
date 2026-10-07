require('dotenv').config();
const crypto = require('crypto');
const path = require('path');

const isProd = process.env.NODE_ENV === 'production';
const dataDir = path.resolve(process.env.DATA_DIR || path.join(__dirname, '..', 'data'));

if (!process.env.ADMIN_PASSWORD || process.env.ADMIN_PASSWORD.length < 8) {
  console.error('Set ADMIN_PASSWORD (at least 8 characters) in your .env file.');
  process.exit(1);
}
let jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) {
  if (isProd) { console.error('Set JWT_SECRET in production.'); process.exit(1); }
  jwtSecret = crypto.randomBytes(32).toString('hex');
  console.warn('JWT_SECRET not set: admin logins will reset whenever the server restarts.');
}

module.exports = {
  config: {
    port: Number(process.env.PORT) || 3000,
    dataDir,
    uploadDir: path.join(dataDir, 'uploads'),
    jwtSecret,
    adminEmail: (process.env.ADMIN_EMAIL || 'admin@example.com').toLowerCase(),
    adminPassword: process.env.ADMIN_PASSWORD,
    shopName: process.env.SHOP_NAME || 'Scent Corner',
    whatsapp: (process.env.WHATSAPP || '233256306835').replace(/\D/g, ''),
    currency: process.env.CURRENCY || 'GH₵',
  },
};
