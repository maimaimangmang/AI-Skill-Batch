import test from 'node:test';
import assert from 'node:assert/strict';
import { getSkillCategory, matchesSkillCategory } from '../lib/skill-categories';
test('task categories distinguish scripts, images and presentation preparation', () => {
  assert.ok(matchesSkillCategory({ displayName: '通用文生图', outputType: '图片' }, 'images'));
  assert.ok(matchesSkillCategory({ displayName: 'Short video', outputType: 'video' }, 'video'));
  assert.ok(matchesSkillCategory({ displayName: '学生课堂汇报提纲技能' }, 'presentations'));
  assert.ok(matchesSkillCategory({ displayName: '口播脚本生成' }, 'writing'));
  assert.ok(matchesSkillCategory({ displayName: '口播脚本生成' }, 'video'));
  assert.equal(matchesSkillCategory({ displayName: '代码审查员' }, 'images'), false);
  assert.equal(matchesSkillCategory({ displayName: '视频脚本' }, 'images'), false);
  assert.equal(getSkillCategory('invalid'), undefined);
});
