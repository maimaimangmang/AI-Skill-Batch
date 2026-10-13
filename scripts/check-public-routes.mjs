import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { once } from 'node:events';

// Validate routes in the actual container build environment before publishing.
// No credentials, user data, or paid execution endpoints are used.
const port = 12799;
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', String(port)], {
  stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, NODE_ENV: 'production' },
});
let logs = '';
server.stdout.on('data', chunk => { logs += chunk; });
server.stderr.on('data', chunk => { logs += chunk; });
async function read(path) { return fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(30000) }); }
try {
  let ready = false;
  for (let i = 0; i < 50; i++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${logs}`);
    try { if ((await read('/api/session')).ok) { ready = true; break; } } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  assert.ok(ready, `Server did not start: ${logs}`);
  for (let i = 0; i < 2; i++) {
    const home = await read('/');
    assert.equal(home.status, 200, `Public home must not redirect: ${home.status} ${home.headers.get('location')}`);
    assert.match(await home.text(), /AI批量生成/);
    const app = await read('/app?skill=text-image-v1');
    assert.equal(app.status, 308);
    assert.equal(app.headers.get('location'), '/skills/text-to-image');
    const privateApp = await read('/app');
    assert.equal(privateApp.status, 308);
    assert.equal(privateApp.headers.get('location'), '/tasks');
    const quote = await read('/api/balance');
    assert.equal(quote.status, 401);
  }
  for (const [path, destination] of [
    ['/login', '/?connect=1'],
    ['/login?skill=text-image-v1', '/skills/text-to-image'],
    ['/login?skill=https%3A%2F%2Fevil.test', '/?connect=1'],
    ['/tasks', '/?connect=1'],
    ['/tasks/run_ABC-123', '/?connect=1&next=%2Ftasks%2Frun_ABC-123'],
    ['/settings', '/?connect=1&next=%2Fsettings'],
  ]) {
    const response = await read(path);
    assert.equal(response.status, 307, `Unexpected status for ${path}`);
    assert.equal(response.headers.get('location'), destination, `Connection must preserve only the intended destination for ${path}`);
  }
  for (const path of ['/tasks/invalid%20id', '/tasks/run%3Fdemo%3D1', `/tasks/${'a'.repeat(181)}`]) {
    assert.equal((await read(path)).status, 404, `Invalid task identifier should be rejected before connection: ${path}`);
  }
  for (const path of ['/api/runs', '/api/runs/run_ABC-123', '/api/runs/run_ABC-123/results', '/api/runs/run_ABC-123/workbook']) {
    const response = await read(path);
    assert.equal(response.status, 401, `Task data must require a session: ${path}`);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    assert.equal(typeof (await response.json()).error, 'string');
  }
  const connectionHome = await read('/?connect=1');
  assert.equal(connectionHome.status, 200);
  assert.ok(!(await connectionHome.text()).includes('class="login-page"'));
  const detail = await read('/skills/text-to-image');
  assert.equal(detail.status, 200);
  const html = await detail.text();
  for (const text of ['图片提示词', '任务表', '需要准备什么', '生成说明', '常见问题', '继续探索', '校验并预估费用']) assert.ok(html.includes(text), `Missing SSR content: ${text}`);
  assert.match(html, /rel="canonical" href="https:\/\/loomskill.com\/skills\/text-to-image"/);
  const alias = await read('/skills/text-image-v1');
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get('location'), '/skills/text-to-image');
  assert.equal((await read('/app?demo=1')).status, 200);
  console.log('Container public Skill pages, canonical task routes, protected task APIs, and connection handoffs verified.');
} finally {
  server.kill('SIGTERM');
  await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
