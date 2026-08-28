const test = require('node:test');
const assert = require('node:assert/strict');
const { buildServer } = require('../server');

test('serves the Global Blue palette for the public job-search interface', async () => {
  const server = buildServer({ scanRunner: async () => ({ found: 0, sources: {} }) });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const response = await fetch(`http://127.0.0.1:${server.address().port}/styles.css`);
  const css = await response.text();
  await new Promise(resolve => server.close(resolve));

  assert.equal(response.status, 200);
  assert.match(css, /--canvas:\s*#f7f9fc/i);
  assert.match(css, /--primary:\s*#2563eb/i);
  assert.match(css, /--confirmed:\s*#0f766e/i);
  assert.match(css, /--warning:\s*#c77800/i);
  assert.match(css, /--danger:\s*#c2415b/i);
  assert.match(css, /button:focus-visible[^}]*var\(--focus\)/i);
  assert.match(css, /\.match\{color:var\(--confirmed\)/i);
  assert.match(css, /\.gap\{color:var\(--danger\)/i);
  assert.match(css, /\.score\.strong,\.score\.potential\{border-color:var\(--warning\)/i);
});
