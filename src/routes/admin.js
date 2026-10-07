const router = require('express').Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/auth');

router.use(requireAdmin);
router.use('/products', require('./products').adminRouter);
router.use('/orders', require('./orders').adminRouter);

router.get('/stats', (req, res) => {
  const one = (sql) => db.prepare(sql).get();
  res.json({
    pendingOrders: one("SELECT COUNT(*) c FROM orders WHERE status='pending'").c,
    totalOrders: one('SELECT COUNT(*) c FROM orders').c,
    revenueDelivered: one("SELECT COALESCE(SUM(total),0) s FROM orders WHERE status='delivered'").s,
    lowStock: db.prepare('SELECT id,brand,name,stock FROM products WHERE active=1 AND stock<=3 ORDER BY stock').all(),
  });
});

module.exports = router;
