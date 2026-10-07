const { config } = require('./config');
const app = require('./app');

app.listen(config.port, () => {
  console.log(`Shop running at http://localhost:${config.port}`);
  console.log(`Admin page:      http://localhost:${config.port}/admin.html`);
});
