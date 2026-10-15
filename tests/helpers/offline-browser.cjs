// Nur per NODE_OPTIONS=--require aktivieren. Alle externen Browsertransporte sperren.
const { chromium, firefox, webkit } = require('playwright');
for (const type of [chromium, firefox, webkit]) {
  const original = type.launch.bind(type);
  type.launch = async function (options = {}) {
    return original({
      ...options,
      proxy: { server: 'http://127.0.0.1:1', bypass: '127.0.0.1,localhost' },
    });
  };
}
