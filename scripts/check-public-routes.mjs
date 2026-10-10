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
    assert.equal(app.status, 307);
    assert.equal(app.headers.get('location'), '/login?skill=text-image-v1');
  }
  const detail = await read('/skills/text-to-image');
  assert.equal(detail.status, 200);
  assert.match(await detail.text(), /图片提示词/);
  console.log('Container public home, Skill detail, and authentication routes verified.');
} finally {
  server.kill('SIGTERM');
  await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
