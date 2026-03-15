import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { execSync } from 'child_process';

const FEEDS_FILE = process.env.FEEDS_FILE || 'app/feeds.ts';
const ACTION = process.env.ACTION || 'add';

function setOutput(name, value) {
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `${name}=${value}\n`);
  }
}

function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

function createEntry(data) {
  return {
    author: data.author || '',
    sitenick: data.sitenick || '',
    title: data.title || '',
    desc: data.desc || '',
    link: data.link || '',
    feed: data.feed || '',
    icon: data.avatar || '',
    avatar: data.avatar || '',
    archs: data.validArchs || [],
    date: getTodayDate(),
    comment: data.comment || '',
  };
}

function formatEntry(entry, indent = '\t\t\t') {
  const lines = ['{'];
  lines.push(`${indent}author: '${escape(entry.author)}',`);
  lines.push(`${indent}sitenick: '${escape(entry.sitenick)}',`);
  lines.push(`${indent}title: '${escape(entry.title)}',`);
  lines.push(`${indent}desc: '${escape(entry.desc)}',`);
  lines.push(`${indent}link: '${escape(entry.link)}',`);
  lines.push(`${indent}feed: '${escape(entry.feed)}',`);
  lines.push(`${indent}icon: '${escape(entry.icon)}',`);
  lines.push(`${indent}avatar: '${escape(entry.avatar)}',`);
  if (entry.archs?.length) {
    lines.push(`${indent}archs: [${entry.archs.map(a => `'${escape(a)}'`).join(', ')}],`);
  }
  lines.push(`${indent}date: '${entry.date}',`);
  if (entry.comment) {
    lines.push(`${indent}comment: '${escape(entry.comment)}',`);
  }
  lines.push(`${indent.slice(0, -1)}},`);
  return lines.join('\n');
}

function escape(str) {
  if (!str) return '';
  return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n');
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function findEntry(content, link) {
  const pattern = new RegExp(`link:\\s*['"\`]${escapeRegExp(link)}['"\`]`, 'i');
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      let start = -1;
      for (let j = i; j >= 0; j--) {
        if (lines[j].includes('{') && !lines[j].includes('}')) {
          start = j;
          break;
        }
      }
      if (start === -1) continue;
      
      let braces = 0, found = false, end = start;
      for (let j = start; j < lines.length; j++) {
        for (const c of lines[j]) {
          if (c === '{') { braces++; found = true; }
          if (c === '}') { braces--; if (found && braces === 0) { end = j; break; } }
        }
        if (found && braces === 0) break;
      }
      return { start, end };
    }
  }
  return null;
}

function findGroupEnd(content, groupName) {
  const pattern = new RegExp(`name:\\s*['"\`]${escapeRegExp(groupName)}['"\`]`);
  const lines = content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    if (pattern.test(lines[i])) {
      for (let j = i; j < lines.length; j++) {
        if (lines[j].includes('entries: [')) {
          let brackets = 0, found = false;
          for (let k = j; k < lines.length; k++) {
            for (const c of lines[k]) {
              if (c === '[') { brackets++; found = true; }
              if (c === ']') { brackets--; if (found && brackets === 0) return k; }
            }
          }
        }
      }
    }
  }
  return -1;
}

function addEntry(content, data) {
  const entry = createEntry(data);
  const existing = findEntry(content, data.link);
  if (existing) return { success: false, message: '友链已存在' };
  
  const idx = findGroupEnd(content, '『网上邻居』');
  if (idx === -1) return { success: false, message: '未找到分组' };
  
  const lines = content.split('\n');
  lines.splice(idx, 0, formatEntry(entry, '\t\t\t'));
  return { success: true, content: lines.join('\n'), entry };
}

function removeEntry(content, link) {
  const pos = findEntry(content, link);
  if (!pos) return { success: false, message: '未找到友链' };
  
  const lines = content.split('\n');
  lines.splice(pos.start, pos.end - pos.start + 1);
  return { success: true, content: lines.join('\n') };
}

function updateEntry(content, data, originalLink) {
  const link = originalLink || data.link;
  const pos = findEntry(content, link);
  if (!pos) return { success: false, message: '未找到友链' };
  
  const mergedData = { ...data, link };
  const entry = createEntry(mergedData);
  const lines = content.split('\n');
  
  lines.splice(pos.start, pos.end - pos.start + 1, formatEntry(entry, '\t\t\t'));
  return { success: true, content: lines.join('\n'), entry };
}

function gitCommit(msg) {
  try {
    execSync('git config user.name "github-actions[bot]"', { stdio: 'inherit' });
    execSync('git config user.email "github-actions[bot]@users.noreply.github.com"', { stdio: 'inherit' });
    execSync(`git add ${FEEDS_FILE}`, { stdio: 'inherit' });
    execSync(`git commit -m "${msg}"`, { stdio: 'inherit' });
    execSync('git push', { stdio: 'inherit' });
    return true;
  } catch (e) {
    console.error('Git error:', e.message);
    return false;
  }
}

function main() {
  let result = {};
  try {
    result = JSON.parse(readFileSync('check-result.json', 'utf8'));
  } catch (e) {
    console.error('Failed to read check-result.json:', e.message);
    process.exit(1);
  }

  const data = result.data || {};
  const action = result.action;
  const originalLink = result.identity?.originalLink;

  if (!data.link && action !== 'remove') {
    console.error('No link found');
    process.exit(1);
  }

  let content;
  try {
    content = readFileSync(FEEDS_FILE, 'utf8');
  } catch (e) {
    console.error('Failed to read feeds file:', e.message);
    process.exit(1);
  }

  let opResult, commitMsg;

  if (action === 'add') {
    opResult = addEntry(content, { ...data, validArchs: result.archsValid?.validArchs });
    commitMsg = `feat(friend-link): add ${data.author}'s blog\n\nCloses #${data.issueNumber}`;
  } else if (action === 'remove') {
    const linkToRemove = originalLink || data.link;
    opResult = removeEntry(content, linkToRemove);
    commitMsg = `feat(friend-link): remove ${data.author || linkToRemove}'s blog\n\nCloses #${data.issueNumber}`;
  } else if (action === 'update') {
    opResult = updateEntry(content, { ...data, validArchs: result.archsValid?.validArchs }, originalLink);
    commitMsg = `feat(friend-link): update ${data.author}'s blog\n\nCloses #${data.issueNumber}`;
  } else {
    console.log('Unknown action:', action);
    process.exit(1);
  }

  if (!opResult.success) {
    setOutput('result', `❌ ${opResult.message}`);
    process.exit(0);
  }

  writeFileSync(FEEDS_FILE, opResult.content);
  
  if (gitCommit(commitMsg)) {
    setOutput('result', `✅ 友链已${action === 'add' ? '添加' : action === 'remove' ? '移除' : '更新'}`);
  } else {
    setOutput('result', '⚠️ 文件已修改但提交失败');
  }
}

main();
