import { readFileSync, writeFileSync } from 'fs';

const MY_SITE_URL = process.env.MY_SITE_URL || 'https://www.qixz.cn/';
const TIMEOUT = 30000;

const VALID_ARCHS = [
  '服务器', '国内 CDN', '虚拟主机',
  'Astro', 'Cloudflare', 'Deno Deploy', 'EdgeOne', 'Esa',
  'GitHub Pages', 'Golang', 'Gridea', 'Halo', 'Hexo', 'HTML',
  'Hugo', 'Jekyll', 'Mix Space', 'Netlify', 'Next.js', 'NotionNext',
  'Nuxt', 'PHP', 'Python', 'React', 'Typecho', 'Vercel',
  'VitePress', 'Vue', 'VuePress', 'WordPress', 'Zebaur',
];

let github = null;
let context = null;

function setGithub(gh, ctx) {
  github = gh;
  context = ctx;
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: 'follow',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...options.headers,
      },
    });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

async function checkSiteConnectivity(url) {
  try {
    const response = await fetchWithTimeout(url);
    return {
      status: response.ok ? 'pass' : 'fail',
      message: response.ok ? `HTTP ${response.status}` : `HTTP ${response.status}`,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: error.name === 'AbortError' ? '请求超时' : (error.message || '无法访问'),
    };
  }
}

async function checkLinkBack(linkPageUrl, mySiteUrl) {
  if (!linkPageUrl) {
    return { status: 'fail', message: '未提供友链页面地址' };
  }

  try {
    const response = await fetchWithTimeout(linkPageUrl);
    if (!response.ok) {
      return { status: 'fail', message: `HTTP ${response.status}` };
    }

    const html = await response.text();
    const patterns = [
      mySiteUrl,
      mySiteUrl.replace(/^https?:\/\//, ''),
      mySiteUrl.replace(/\/$/, ''),
    ];

    const found = patterns.some(p => html.toLowerCase().includes(p.toLowerCase()));
    
    if (found) {
      return { status: 'pass', message: '已找到本站链接' };
    }

    const isDynamic = /data-svelte|data-vue|ng-app|react-root|__NEXT_DATA__|__NUXT__/i.test(html);
    if (isDynamic) {
      return { status: 'warn', message: '页面可能为动态渲染' };
    }

    return { status: 'fail', message: '未找到本站链接' };
  } catch (error) {
    return {
      status: 'fail',
      message: error.name === 'AbortError' ? '请求超时' : (error.message || '无法访问'),
    };
  }
}

async function checkAvatarValid(avatarUrl) {
  if (!avatarUrl) {
    return { status: 'fail', message: '未提供头像链接' };
  }

  try {
    const response = await fetchWithTimeout(avatarUrl, { method: 'HEAD' });
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      if (contentType?.startsWith('image/')) {
        return { status: 'pass', message: '头像可访问' };
      }
      return { status: 'warn', message: `非图片: ${contentType || 'unknown'}` };
    }
    return { status: 'fail', message: `HTTP ${response.status}` };
  } catch (error) {
    return {
      status: 'fail',
      message: error.name === 'AbortError' ? '请求超时' : (error.message || '无法访问'),
    };
  }
}

function checkArchs(archsStr) {
  if (!archsStr || !archsStr.trim()) {
    return { status: 'pass', message: '未填写', validArchs: [], invalidArchs: [] };
  }

  const archs = archsStr.split(',').map(a => a.trim()).filter(a => a);
  const validArchs = archs.filter(a => VALID_ARCHS.includes(a));
  const invalidArchs = archs.filter(a => !VALID_ARCHS.includes(a));

  if (invalidArchs.length === 0) {
    return { status: 'pass', message: validArchs.join(', '), validArchs, invalidArchs };
  }

  return { 
    status: 'fail', 
    message: `无效: ${invalidArchs.join(', ')}`, 
    validArchs, 
    invalidArchs 
  };
}

async function verifyOriginalIssue(originalIssueId, actor, owner) {
  const isOwner = actor === owner;
  
  if (isOwner) {
    return { 
      status: 'pass', 
      message: '仓库所有者', 
      isOwner: true,
      originalIssueNumber: originalIssueId,
      originalLink: null,
      originalPassed: false,
    };
  }

  if (!originalIssueId) {
    return { 
      status: 'fail', 
      message: '缺少原始 Issue 编号', 
      isOwner: false,
      originalIssueNumber: null,
      originalLink: null,
      originalPassed: false,
    };
  }

  if (!github || !context) {
    return {
      status: 'fail',
      message: 'GitHub API 不可用',
      isOwner: false,
      originalIssueNumber: originalIssueId,
      originalLink: null,
      originalPassed: false,
    };
  }

  try {
    const issue = await github.rest.issues.get({
      owner: context.repo.owner,
      repo: context.repo.repo,
      issue_number: parseInt(originalIssueId),
    });

    const hasPassedLabel = issue.data.labels.some(l => l.name === 'friend-link/passed');
    
    let originalLink = null;
    if (issue.data.body) {
      const linkMatch = issue.data.body.match(/###\s*博客地址\s*\n\n?([^#\n]+)/i);
      if (linkMatch) {
        originalLink = linkMatch[1].trim();
      }
    }

    return {
      status: hasPassedLabel ? 'pass' : 'fail',
      message: hasPassedLabel ? '原 Issue 已通过' : '原 Issue 未通过',
      isOwner: false,
      originalIssueNumber: originalIssueId,
      originalLink,
      originalPassed: hasPassedLabel,
    };
  } catch (error) {
    return {
      status: 'fail',
      message: `无法获取原 Issue: ${error.message}`,
      isOwner: false,
      originalIssueNumber: originalIssueId,
      originalLink: null,
      originalPassed: false,
    };
  }
}

async function main() {
  let data = {};
  try {
    data = JSON.parse(readFileSync('issue-data.json', 'utf8'));
  } catch (e) {
    console.error('Failed to read issue-data.json:', e.message);
  }

  const action = data.action;
  const actor = data.actor;
  const owner = data.owner;

  let siteConnectivity = { status: 'skip', message: '跳过' };
  let linkBack = { status: 'skip', message: '跳过' };
  let avatarValid = { status: 'skip', message: '跳过' };
  let archsValid = { status: 'skip', message: '跳过' };
  let identity = { status: 'skip', message: '跳过' };

  if (action === 'add') {
    [siteConnectivity, linkBack, avatarValid, archsValid] = await Promise.all([
      checkSiteConnectivity(data.link),
      checkLinkBack(data.linkPage, MY_SITE_URL),
      checkAvatarValid(data.avatar),
      Promise.resolve(checkArchs(data.archs)),
    ]);
  } else if (action === 'update') {
    identity = await verifyOriginalIssue(data.originalIssueId, actor, owner);
    if (identity.status === 'pass') {
      [siteConnectivity, avatarValid, archsValid] = await Promise.all([
        data.link ? checkSiteConnectivity(data.link) : Promise.resolve({ status: 'skip', message: '跳过' }),
        data.avatar ? checkAvatarValid(data.avatar) : Promise.resolve({ status: 'skip', message: '跳过' }),
        Promise.resolve(checkArchs(data.archs)),
      ]);
    }
  } else if (action === 'remove') {
    identity = await verifyOriginalIssue(data.originalIssueId, actor, owner);
  }

  const requiresReview = 
    action === 'add' ? (linkBack.status === 'warn') :
    action === 'update' || action === 'remove' ? identity.status !== 'pass' :
    false;

  const allPassed = !requiresReview && 
    siteConnectivity.status !== 'fail' && 
    linkBack.status !== 'fail' && 
    avatarValid.status !== 'fail' &&
    archsValid.status !== 'fail';

  const result = {
    data,
    action,
    siteConnectivity,
    linkBack,
    avatarValid,
    archsValid,
    identity,
    allPassed,
    requiresReview,
    checkedAt: new Date().toISOString(),
  };

  writeFileSync('check-result.json', JSON.stringify(result, null, 2));
  console.log('Check result:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
