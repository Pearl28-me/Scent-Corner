const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { checkLogin, signToken } = require('../middleware/auth');
const { parse, HttpError } = require('../middleware/errors');

const limiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, message: { error: 'Too many login attempts. Wait 15 minutes and try again.' } });
const schema = z.object({ email: z.string().max(200), password: z.string().max(200) });

router.post('/login', limiter, (req, res) => {
  const { email, password } = parse(schema, req.body);
  if (!checkLogin(email, password)) throw new HttpError(401, 'Wrong email or password.');
  res.json({ token: signToken() });
});

module.exports = router;
