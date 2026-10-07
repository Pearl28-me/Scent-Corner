// Run with: npm test  (uses a temporary database)
const os = require('os'), fs = require('fs'), path = require('path'), assert = require('assert');
process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'shop-'));
process.env.ADMIN_EMAIL = 'test@example.com';
process.env.ADMIN_PASSWORD = 'test-password-123';
const app = require('../src/app');

const server = app.listen(0, async () => {
  const base = `http://localhost:${server.address().port}`;
  const call = async (method, url, body, token) => {
    const r = await fetch(base + url, {
      method,
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    return { status: r.status, data: await r.json() };
  };
  try {
    assert.strictEqual((await call('GET', '/api/health')).status, 200);
    const products = (await call('GET', '/api/products')).data;
    assert.strictEqual(products.length, 8);
    const p = products[0];

    assert.strictEqual((await call('POST', '/api/auth/login', { email: 'test@example.com', password: 'wrong' })).status, 401);
    const { token } = (await call('POST', '/api/auth/login', { email: 'test@example.com', password: 'test-password-123' })).data;
    assert.ok(token);
    assert.strictEqual((await call('GET', '/api/admin/orders')).status, 401);

    const order = { name: 'Ama Mensah', phone: '0201234567', address: 'East Legon, Accra', items: [{ productId: p.id, size: '50ml', qty: 2 }] };
    assert.strictEqual((await call('POST', '/api/orders', { ...order, items: [] })).status, 400);
    const o = await call('POST', '/api/orders', order);
    assert.strictEqual(o.status, 201);
    assert.strictEqual(o.data.total, p.sizes[0].price * 2);
    assert.strictEqual((await call('GET', '/api/products')).data[0].stock, 8);

    const over = await call('POST', '/api/orders', { ...order, items: [{ productId: p.id, size: '50ml', qty: 9 }] });
    assert.strictEqual(over.status, 409);

    const c = await call('PATCH', `/api/admin/orders/${o.data.id}/status`, { status: 'cancelled' }, token);
    assert.strictEqual(c.data.status, 'cancelled');
    assert.strictEqual((await call('GET', '/api/products')).data[0].stock, 10);
    assert.strictEqual((await call('PATCH', `/api/admin/orders/${o.data.id}/status`, { status: 'pending' }, token)).status, 400);

    const np = await call('POST', '/api/admin/products', { brand: 'Test', name: 'Scent', category: 'Men', sizes: [{ label: '30ml', price: 100 }], stock: 5 }, token);
    assert.strictEqual(np.status, 201);
    const up = await call('PUT', `/api/admin/products/${np.data.id}`, { ...np.data, stock: 2 }, token);
    assert.strictEqual(up.data.stock, 2);
    assert.strictEqual((await call('DELETE', `/api/admin/products/${np.data.id}`, null, token)).status, 200);
    assert.strictEqual((await call('GET', '/api/admin/stats', null, token)).status, 200);
    console.log('All checks passed.');
    server.close(); process.exit(0);
  } catch (e) { console.error('FAILED:', e.message); process.exit(1); }
});
