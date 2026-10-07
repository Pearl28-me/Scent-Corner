const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const multer = require('multer');
const { z } = require('zod');
const db = require('../db');
const { config } = require('../config');
const { parse, HttpError } = require('../middleware/errors');

const toProduct = (r) => ({
  id: r.id, brand: r.brand, name: r.name, category: r.category,
  notes: JSON.parse(r.notes), description: r.description, color: r.color, shape: r.shape,
  sizes: JSON.parse(r.sizes), stock: r.stock, active: !!r.active,
  image: r.image ? '/uploads/' + r.image : null,
});

const schema = z.object({
  brand: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  category: z.enum(['Men', 'Women', 'Unisex']),
  notes: z.array(z.string().trim().min(1).max(40)).max(8).default([]),
  description: z.string().max(600).default(''),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use a hex colour like #7a3f9a').default('#7a3f9a'),
  shape: z.number().int().min(0).max(2).default(0),
  sizes: z.array(z.object({
    label: z.string().trim().min(1).max(20),
    price: z.number().positive().max(100000),
  })).min(1, 'Add at least one size and price').max(6),
  stock: z.number().int().min(0).max(100000).default(0),
  active: z.boolean().default(true),
});

// ---- Public: what customers see ----
const publicRouter = express.Router();
publicRouter.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM products WHERE active=1 ORDER BY id').all();
  res.json(rows.map(toProduct));
});

// ---- Admin: manage the catalogue ----
const adminRouter = express.Router();

const upload = multer({
  storage: multer.diskStorage({
    destination: config.uploadDir,
    filename: (req, file, cb) => {
      const ext = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' }[file.mimetype];
      cb(null, crypto.randomBytes(12).toString('hex') + ext);
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) =>
    cb(['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype) ? null : new HttpError(400, 'Upload a JPG, PNG or WebP image.'), true),
});

const find = (id) => {
  const r = db.prepare('SELECT * FROM products WHERE id=?').get(id);
  if (!r) throw new HttpError(404, 'Perfume not found.');
  return r;
};
const removeFile = (name) => { if (name) fs.unlink(path.join(config.uploadDir, name), () => {}); };

adminRouter.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM products ORDER BY id DESC').all().map(toProduct));
});

adminRouter.post('/', (req, res) => {
  const d = parse(schema, req.body);
  const { lastInsertRowid } = db.prepare(`INSERT INTO products(brand,name,category,notes,description,color,shape,sizes,stock,active)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(d.brand, d.name, d.category, JSON.stringify(d.notes), d.description, d.color, d.shape, JSON.stringify(d.sizes), d.stock, d.active ? 1 : 0);
  res.status(201).json(toProduct(find(lastInsertRowid)));
});

adminRouter.put('/:id', (req, res) => {
  find(req.params.id);
  const d = parse(schema, req.body);
  db.prepare(`UPDATE products SET brand=?,name=?,category=?,notes=?,description=?,color=?,shape=?,sizes=?,stock=?,active=? WHERE id=?`)
    .run(d.brand, d.name, d.category, JSON.stringify(d.notes), d.description, d.color, d.shape, JSON.stringify(d.sizes), d.stock, d.active ? 1 : 0, req.params.id);
  res.json(toProduct(find(req.params.id)));
});

adminRouter.delete('/:id', (req, res) => {
  const p = find(req.params.id);
  db.prepare('DELETE FROM products WHERE id=?').run(p.id);
  removeFile(p.image);
  res.json({ ok: true });
});

adminRouter.post('/:id/image', (req, res, next) => {
  const p = find(req.params.id);
  upload.single('image')(req, res, (err) => {
    if (err) return next(err);
    if (!req.file) return next(new HttpError(400, 'Choose an image to upload.'));
    db.prepare('UPDATE products SET image=? WHERE id=?').run(req.file.filename, p.id);
    removeFile(p.image);
    res.json(toProduct(find(p.id)));
  });
});

module.exports = { publicRouter, adminRouter };
