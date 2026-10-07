const crypto = require('crypto');
const express = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const db = require('../db');
const { parse, HttpError } = require('../middleware/errors');

const STATUSES = ['pending', 'confirmed', 'delivered', 'cancelled'];

const orderSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name').max(80),
  phone: z.string().trim().min(7, 'Enter a valid phone number').max(20).regex(/^[+\d\s()-]+$/, 'Enter a valid phone number'),
  address: z.string().trim().min(5, 'Enter your delivery address').max(300),
  note: z.string().trim().max(300).optional().default(''),
  items: z.array(z.object({
    productId: z.number().int(),
    size: z.string().max(20),
    qty: z.number().int().min(1).max(20),
  })).min(1, 'Your cart is empty').max(30),
});

const toOrder = (o) => {
  const items = db.prepare('SELECT name,size,qty,unit_price FROM order_items WHERE order_id=?').all(o.id)
    .map((i) => ({ name: i.name, size: i.size, qty: i.qty, unitPrice: i.unit_price, lineTotal: i.unit_price * i.qty }));
  return { id: o.id, code: o.code, name: o.customer_name, phone: o.phone, address: o.address, note: o.note, total: o.total, status: o.status, createdAt: o.created_at, items };
};
const getOrder = (id) => toOrder(db.prepare('SELECT * FROM orders WHERE id=?').get(id));

function newCode() {
  for (;;) {
    const c = 'SC-' + crypto.randomBytes(3).toString('hex').toUpperCase();
    if (!db.prepare('SELECT 1 FROM orders WHERE code=?').get(c)) return c;
  }
}

// Prices always come from the database, never from the browser.
const createOrder = db.transaction((d) => {
  const wanted = new Map();
  const lines = [];
  for (const it of d.items) {
    const p = db.prepare('SELECT * FROM products WHERE id=? AND active=1').get(it.productId);
    if (!p) throw new HttpError(400, 'One of the perfumes is no longer available. Refresh the page and try again.');
    const size = JSON.parse(p.sizes).find((s) => s.label === it.size);
    if (!size) throw new HttpError(400, `${p.name} is not available in ${it.size}.`);
    wanted.set(p.id, (wanted.get(p.id) || 0) + it.qty);
    if (wanted.get(p.id) > p.stock) {
      throw new HttpError(409, p.stock ? `Only ${p.stock} of ${p.brand} ${p.name} left.` : `${p.brand} ${p.name} is sold out.`);
    }
    lines.push({ p, size, qty: it.qty });
  }
  const total = lines.reduce((t, l) => t + l.size.price * l.qty, 0);
  const { lastInsertRowid } = db.prepare('INSERT INTO orders(code,customer_name,phone,address,note,total) VALUES(?,?,?,?,?,?)')
    .run(newCode(), d.name, d.phone, d.address, d.note, total);
  const addItem = db.prepare('INSERT INTO order_items(order_id,product_id,name,size,qty,unit_price) VALUES(?,?,?,?,?,?)');
  for (const l of lines) addItem.run(lastInsertRowid, l.p.id, `${l.p.brand} ${l.p.name}`, l.size.label, l.qty, l.size.price);
  for (const [id, q] of wanted) db.prepare('UPDATE products SET stock=stock-? WHERE id=?').run(q, id);
  return getOrder(lastInsertRowid);
});

// ---- Public: place an order ----
const publicRouter = express.Router();
const limiter = rateLimit({ windowMs: 60 * 60 * 1000, limit: 20, message: { error: 'Too many orders from this connection. Try again later.' } });
publicRouter.post('/', limiter, (req, res) => {
  res.status(201).json(createOrder(parse(orderSchema, req.body)));
});

// ---- Admin: view and update orders ----
const adminRouter = express.Router();

adminRouter.get('/', (req, res) => {
  const { status } = req.query;
  if (status && !STATUSES.includes(status)) throw new HttpError(400, 'Unknown status.');
  const rows = status
    ? db.prepare('SELECT * FROM orders WHERE status=? ORDER BY id DESC LIMIT 200').all(status)
    : db.prepare('SELECT * FROM orders ORDER BY id DESC LIMIT 200').all();
  res.json(rows.map(toOrder));
});

const changeStatus = db.transaction((id, status) => {
  const o = db.prepare('SELECT * FROM orders WHERE id=?').get(id);
  if (!o) throw new HttpError(404, 'Order not found.');
  if (o.status === 'cancelled' && status !== 'cancelled') throw new HttpError(400, "Cancelled orders can't be reopened. Ask the customer to place a new order.");
  if (status === 'cancelled' && o.status !== 'cancelled') {
    // Put the stock back
    for (const i of db.prepare('SELECT product_id,qty FROM order_items WHERE order_id=?').all(id)) {
      if (i.product_id) db.prepare('UPDATE products SET stock=stock+? WHERE id=?').run(i.qty, i.product_id);
    }
  }
  db.prepare('UPDATE orders SET status=? WHERE id=?').run(status, id);
  return getOrder(id);
});

adminRouter.patch('/:id/status', (req, res) => {
  const { status } = parse(z.object({ status: z.enum(STATUSES) }), req.body);
  res.json(changeStatus(req.params.id, status));
});

module.exports = { publicRouter, adminRouter };
