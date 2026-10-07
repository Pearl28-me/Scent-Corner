# Perfume shop: storefront + backend

A Node.js server that runs the shop website, stores products and orders in a SQLite database, and gives the owner an admin page.

## Run it on your computer
1. Install Node.js 18 or newer from nodejs.org.
2. In this folder run `npm install`.
3. Copy `.env.example` to `.env` and set `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `SHOP_NAME` and `WHATSAPP` (country code + number, no plus sign, e.g. `233241234567`).
4. Run `npm start`.
5. Open http://localhost:3000 for the shop and http://localhost:3000/admin.html for the admin page.

Run `npm test` to check that everything works (it uses a temporary database).

## What the owner can do in the admin page
- See new orders, call customers, and move each order through pending, confirmed, delivered or cancelled.
- Add, edit, hide and delete perfumes, set sizes and prices, set stock, and upload a bottle photo.
- See pending orders, delivered sales and low stock at a glance.

Stock goes down when an order is placed and goes back up if the order is cancelled. A cancelled order cannot be reopened.

## Project layout
```
src/server.js            starts the server
src/app.js               security headers, routes, static files
src/config.js            reads .env
src/db.js                tables and sample products
src/middleware/          login check, error handling
src/routes/products.js   public product list + admin product management + photo upload
src/routes/orders.js     place order (public) + manage orders (admin)
src/routes/auth.js       admin login
src/routes/admin.js      admin stats, protects all /api/admin routes
public/index.html        the shop
public/admin.html        the admin page
test/smoke.js            automated checks
```

## API
Public
- `GET /api/config` shop name, WhatsApp number, currency
- `GET /api/products` perfumes that are shown on the shop
- `POST /api/orders` place an order: `{name, phone, address, note?, items:[{productId, size, qty}]}`. Prices are always taken from the database.

Admin (send `Authorization: Bearer <token>`)
- `POST /api/auth/login` `{email, password}` returns a token valid for 12 hours
- `GET/POST /api/admin/products`, `PUT/DELETE /api/admin/products/:id`, `POST /api/admin/products/:id/image`
- `GET /api/admin/orders?status=pending`, `PATCH /api/admin/orders/:id/status`
- `GET /api/admin/stats`

## Put it online
Use a host that runs Node and has a disk that survives restarts (Render, Railway, Fly.io or a small VPS). The database and photos are files, so without a persistent disk they would be wiped on each deploy.
1. Push this folder to GitHub (the `.gitignore` keeps `.env` and `data` out).
2. Create a web service, build command `npm install`, start command `npm start`.
3. Set the environment variables from `.env.example`, plus `NODE_ENV=production`, a long random `JWT_SECRET`, and `DATA_DIR` pointing at the persistent disk.
4. Use HTTPS (the hosts above provide it) so the admin password is never sent in the clear.
5. Back up the `DATA_DIR` folder regularly. It holds all orders.

## Good next steps
- Online payment with Paystack (cards and Mobile Money).
- An SMS or email alert to the owner when an order arrives.
- Delivery fees by area.
