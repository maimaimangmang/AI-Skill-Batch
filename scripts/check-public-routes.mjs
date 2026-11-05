import { spawn } from 'node:child_process';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { get } from 'node:http';

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
function checkCatalogOrder(html) {
  const body = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  const featured = body.indexOf('class="featured"');
  const filters = body.indexOf('class="market-category-filter"');
  const toolbar = body.indexOf('class="market-toolbar"');
  assert.ok(featured >= 0 && filters > featured && toolbar > filters, 'Recommendations must remain above filters and catalog results');
}
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
    assert.match(await home.text(), /发现 AI Skills/);
    const quote = await read('/api/balance');
    assert.equal(quote.status, 401);
  }
  for (const [path, destination] of [
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
  for (const prefix of ['', '/en']) {
    const home = await read(prefix || '/');
    const homeBody = (await home.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.equal((homeBody.match(/id="home-faq-title"/g) || []).length, 1, `Home must keep one FAQ: ${prefix || '/'}`);
    for (const route of ['/skills', '/skills/text-to-image', '/favorites', '/cases', '/batch-image-generation', '/use-cases/images', '/missing-page-check']) {
      const path = prefix + route;
      const response = await read(path);
      assert.equal(response.status, route === '/missing-page-check' ? 404 : 200, path);
      const body = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.doesNotMatch(body, /home-faq|batch-faq|\u5e38\u89c1\u95ee\u9898|Common questions|Batch image generation FAQ/, `Only home may show FAQ: ${path}`);
    }
  }
  const detail = await read('/skills/text-to-image');
  assert.equal(detail.status, 200);
  const html = await detail.text();
  for (const text of ['图片提示词', '任务表', '填写说明与工作流信息', '需要准备什么', '生成说明', '校验并预估费用']) assert.ok(html.includes(text), `Missing SSR content: ${text}`);
  assert.match(html, /rel="canonical" href="https:\/\/loomskill.com\/skills\/text-to-image"/);
  const alias = await read('/skills/text-image-v1');
  assert.equal(alias.status, 308);
  assert.equal(alias.headers.get('location'), '/skills/text-to-image');
  for (const path of ['/app', '/app?skill=text-image-v1', '/app?demo=1', '/login', '/login?skill=text-image-v1']) {
    const removed = await read(path);
    assert.equal(removed.status, 404, `Removed entry must return 404: ${path}`);
    assert.equal(removed.headers.get('location'), null);
    assert.match(await removed.text(), /name="robots" content="noindex"/);
  }
  const oldDemoHome = await read('/?demo=1');
  assert.equal(oldDemoHome.status, 200);
  assert.equal(oldDemoHome.headers.get('location'), null);
  assert.match(await oldDemoHome.text(), /发现 AI Skills/);
  const taskDemo = await read('/tasks?demo=1');
  assert.equal(taskDemo.status, 307);
  assert.equal(taskDemo.headers.get('location'), '/?connect=1');
  const firstPage = await read('/skills?page=1');
  assert.equal(firstPage.status, 308);
  assert.equal(firstPage.headers.get('location'), '/skills');
  for (const path of ['/missing-page-check', '/skills/missing-skill-check', '/skills?page=99999']) {
    const missing = await read(path);
    assert.equal(missing.status, 404, path);
    assert.equal(missing.headers.get('location'), null);
    const html = await missing.text();
    // Next can stream the localized error boundary; status and noindex must be immediate.
    assert.match(html, /noindex/);
  }
  // English must be rendered on the server, with stable URLs and matching SEO.
  for (const [path, title] of [
    ['/en', 'Discover and Run AI Skills'], ['/en/skills', 'AI Skill Workflow Directory'],
    ['/en/skills/text-to-image', 'Text to Image'], ['/en/batch-image-generation', 'AI Batch Image Generator'],
    ['/en/favorites', 'Favorites'],
  ]) {
    const response = await read(path);
    assert.equal(response.status, 200, path);
    const body = await response.text();
    assert.match(body, /<html lang="en"/, path);
    assert.ok(body.toLowerCase().includes(title.toLowerCase()), `Missing English title: ${path}`);
    assert.ok(body.includes('href="/en/skills"'), `Navigation must retain English: ${path}`);
    if (!path.endsWith('favorites')) {
      assert.ok(body.includes(`rel="canonical" href="https://loomskill.com${path}"`), path);
      assert.match(body, /hrefLang="en"/, path);
      assert.match(body, /hrefLang="zh-CN"/, path);
    }
  }
  for (const [path, destination] of [
    ['/en/tasks', '/en?connect=1'], ['/en/tasks/run_ABC-123', '/en?connect=1&next=%2Fen%2Ftasks%2Frun_ABC-123'],
    ['/en/settings', '/en?connect=1&next=%2Fen%2Fsettings'],
  ]) {
    const response = await read(path);
    assert.equal(response.status, 307, path);
    assert.equal(response.headers.get('location'), destination);
  }
  for (const [path, destination] of [
    ['/en/skills/text-image-v1', '/en/skills/text-to-image'], ['/en/skills?page=1', '/en/skills'],
    ['/zh-CN/skills', '/skills'],
  ]) {
    const response = await read(path);
    assert.equal(response.status, 308, path);
    assert.equal(response.headers.get('location'), destination);
  }
  for (const path of ['/en/missing-page-check', '/en/skills/missing-skill-check', '/en/tasks/invalid%20id']) {
    const response = await read(path);
    assert.equal(response.status, 404, path);
    const body = await response.text();
    assert.match(body, /noindex/, path);
  }
  const englishCatalog = (await (await read('/en/skills')).text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
  checkCatalogOrder(englishCatalog);
  for (const source of ['电商爆款图复刻', 'Angel亚马逊电商套图生成器', '通用文生图']) {
    assert.ok(!englishCatalog.includes(source), `Untranslated recommendation: ${source}`);
  }
  const search = await read('/en/skills?q=product');
  assert.equal(search.status, 200);
  const searchBody = await search.text();
  assert.match(searchBody, /action="\/en\/skills"/);
  checkCatalogOrder(searchBody);
  const secondPage = await read('/en/skills?page=2');
  assert.equal(secondPage.status, 200);
  const secondPageBody = await secondPage.text();
  assert.match(secondPageBody, /href="\/en\/skills\?page=3"/);
  checkCatalogOrder(secondPageBody);
  const sitemap = await read('/sitemap.xml');
  assert.equal(sitemap.status, 200);
  const xml = await sitemap.text();
  assert.match(xml, /https:\/\/loomskill.com\/en\/skills\/text-to-image/);
  assert.match(xml, /hreflang="en"/);
  for (const prefix of ['', '/en']) {
    const path = `${prefix}/ai-product-photography`;
    const response = await read(path);
    assert.equal(response.status, 404, path);
    assert.match(await response.text(), /noindex/, path);
    assert.ok(!xml.includes(`https://loomskill.com${path}</loc>`), 'Removed tutorial must not appear in sitemap');
  }
  for (const category of ['images', 'video', 'writing', 'presentations']) {
    for (const prefix of ['', '/en']) {
      const path = `${prefix}/use-cases/${category}`;
      const response = await read(path);
      assert.equal(response.status, 200, path);
      const body = (await response.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
      assert.ok(body.includes(`rel="canonical" href="https://loomskill.com${path}"`));
      assert.ok(xml.includes(`https://loomskill.com${path}</loc>`));
      assert.ok(body.includes(`href="${prefix}/skills?category=${category}"`));
      if (prefix) assert.doesNotMatch(body.replace(/<button[^>]*lang="zh-CN"[^>]*>[\s\S]*?<\/button>/g, '').replace(/<[^>]+>/g, ''), /[\u4e00-\u9fff]/, `Untranslated guide: ${path}`);
    }
    const filtered = await read(`/en/skills?category=${category}`);
    assert.equal(filtered.status, 200);
    const body = await filtered.text();
    checkCatalogOrder(body);
    assert.match(body, /noindex/);
    assert.ok(body.includes(`name="category" value="${category}"`));
  }
  for (const prefix of ['', '/en']) {
    const filtered = await read(`${prefix}/skills?category=content_creation&billing=subscription`);
    assert.equal(filtered.status, 200);
    const body = (await filtered.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    assert.match(body, /name="billing" value="subscription"/);
    checkCatalogOrder(body);
    assert.match(body, /noindex/);
    assert.match(body, /class="skill-category-tag"/);
    assert.doesNotMatch(body, /class="skill-billing-tag/);
    assert.ok(body.includes(prefix ? '/ 30 days' : '/ 30 天'));
    assert.ok(body.includes('01a066df-e851-7803-9a88-dce670c58c7d'));
    const detail = await read(`${prefix}/skills/01a066df-e851-7803-9a88-dce670c58c7d`);
    assert.equal(detail.status, 200);
    const content = (await detail.text()).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
    for (const text of prefix ? ['Monthly subscription', 'Includes 2 Skills', 'Model usage is billed separately'] : ['月度订阅', '包含 2 个 Skill', '模型费用仍另计']) assert.ok(content.includes(text), text);
  }
  assert.equal((await read('/skills?billing=invalid')).status, 404);
  for (const category of ['industry_expertise', 'development_design']) {
    const response = await fetch(`http://127.0.0.1:${port}/skills?category=${category}`, { headers: { RSC: '1' }, signal: AbortSignal.timeout(30000) });
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type') || '', /text\/x-component/);
    assert.ok((await response.text()).includes(`"category":"${category}"`), 'Client navigation must receive the requested category');
  }
  assert.equal((await read('/skills?category=invalid')).status, 404);
  assert.equal((await read('/use-cases/invalid')).status, 404);
  assert.equal((await read('/loomdesk-mark.svg')).status, 200);
  for (const path of ['/', '/skills/text-to-image?ref=www-check', '/skills?page=2&q=image', '/missing-page-check']) {
    // Node fetch may normalize Host; send the real host header with node:http.
    const www = await new Promise((resolve, reject) => {
      const req = get({ hostname: '127.0.0.1', port, path, headers: { host: 'www.loomskill.com' } }, response => {
        response.resume();
        response.on('end', () => resolve({ status: response.statusCode, headers: new Headers(response.headers) }));
      });
      req.setTimeout(30000, () => req.destroy(new Error('Domain redirect check timed out')));
      req.on('error', reject);
    });
    assert.equal(www.status, 308, path);
    assert.equal(new URL(www.headers.get('location')).href, new URL('https://loomskill.com' + path).href);
  }
  console.log('Chinese and English SSR, canonical URLs, hreflang, search, pagination, redirects, protected APIs and connection handoffs verified.');
} finally {
  server.kill('SIGTERM');
  await Promise.race([once(server, 'exit'), new Promise(resolve => setTimeout(resolve, 3000))]);
  if (server.exitCode === null) server.kill('SIGKILL');
}
