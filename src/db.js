const Database = require('better-sqlite3');
const fs = require('fs');
const path = require('path');
const { config } = require('./config');

fs.mkdirSync(config.uploadDir, { recursive: true });
const db = new Database(path.join(config.dataDir, 'shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS products(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL CHECK(category IN ('Men','Women','Unisex')),
  notes TEXT NOT NULL DEFAULT '[]',
  description TEXT NOT NULL DEFAULT '',
  color TEXT NOT NULL DEFAULT '#7a3f9a',
  shape INTEGER NOT NULL DEFAULT 0,
  sizes TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  image TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS orders(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  total REAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','delivered','cancelled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS order_items(
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  size TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_price REAL NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status, created_at);
`);

// Sample stock so the shop is not empty on first run. Edit or delete these in the admin page.
if (db.prepare('SELECT COUNT(*) c FROM products').get().c === 0) {
  const seed = [
    ['Dior', 'Sauvage', 'Men', ['Bergamot', 'Pepper', 'Ambroxan'], 'Fresh, spicy and instantly recognisable.', '#2f6f8f', 2, 780],
    ['Chanel', 'Coco Mademoiselle', 'Women', ['Orange', 'Rose', 'Patchouli'], 'Elegant and bright with a warm, woody base.', '#d9a65a', 1, 950],
    ['Yves Saint Laurent', 'Libre', 'Women', ['Lavender', 'Orange blossom', 'Vanilla'], 'Floral and warm. Bold lavender meets soft vanilla.', '#8a5ab8', 0, 820],
    ['Chanel', 'Bleu de Chanel', 'Men', ['Citrus', 'Cedar', 'Incense'], 'Clean, woody and polished.', '#25497a', 2, 900],
    ['Creed', 'Aventus', 'Men', ['Pineapple', 'Birch', 'Musk'], 'Fruity, smoky and long-lasting.', '#5f7a52', 0, 2400],
    ['Maison Francis Kurkdjian', 'Baccarat Rouge 540', 'Unisex', ['Saffron', 'Amberwood', 'Cedar'], 'Airy, sweet and glowing.', '#c9707a', 1, 2600],
    ['Tom Ford', 'Black Orchid', 'Unisex', ['Truffle', 'Black orchid', 'Patchouli'], 'Dark, rich and dramatic.', '#2a1a3a', 0, 1300],
    ['Lattafa', 'Khamrah', 'Unisex', ['Cinnamon', 'Date', 'Praline'], 'Sweet, spiced and cosy.', '#a8622a', 1, 350],
  ];
  const ins = db.prepare(`INSERT INTO products(brand,name,category,notes,description,color,shape,sizes,stock)
    VALUES(?,?,?,?,?,?,?,?,10)`);
  db.transaction(() => {
    for (const [b, n, c, notes, d, col, sh, p] of seed) {
      const sizes = [{ label: '50ml', price: p }, { label: '100ml', price: Math.round((p * 1.6) / 10) * 10 }];
      ins.run(b, n, c, JSON.stringify(notes), d, col, sh, JSON.stringify(sizes));
    }
  })();
}

module.exports = db;
