const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { config } = require('../config');

const hash = bcrypt.hashSync(config.adminPassword, 10);

const checkLogin = (email, password) =>
  String(email).toLowerCase() === config.adminEmail && bcrypt.compareSync(String(password), hash);

const signToken = () => jwt.sign({ role: 'admin' }, config.jwtSecret, { expiresIn: '12h' });

function requireAdmin(req, res, next) {
  const token = (req.headers.authorization || '').replace(/^Bearer /, '');
  try { jwt.verify(token, config.jwtSecret); next(); }
  catch { res.status(401).json({ error: 'Please log in again.' }); }
}

module.exports = { checkLogin, signToken, requireAdmin };
