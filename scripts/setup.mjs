import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
if (existsSync('.env.local')) {
  console.log('.env.local 已存在，保留现有配置。');
} else {
  writeFileSync('.env.local', [
    `SESSION_ENCRYPTION_KEY=${randomBytes(32).toString('hex')}`,
    'APP_ORIGIN=http://localhost:3000',
    'COOKIE_SECURE=false',
    'DATA_DIR=./.data',
    'LOOMLOOM_BASE_URL=https://loomloom.shengsuanyun.com',
    ''
  ].join('\n'), { mode: 0o600, flag: 'wx' });
  console.log('已生成 .env.local。请通过 http://localhost:3000 访问；公开部署前修改 APP_ORIGIN 并启用 COOKIE_SECURE=true。');
}
