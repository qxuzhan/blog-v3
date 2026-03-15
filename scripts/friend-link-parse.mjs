import { writeFileSync } from 'fs';

const body = process.env.ISSUE_BODY || '';
const issueNumber = process.env.ISSUE_NUMBER || '';
const issueTitle = process.env.ISSUE_TITLE || '';
const actor = process.env.ACTOR || '';
const owner = process.env.OWNER || '';
const label = process.env.LABEL || '';

function parseField(body, label) {
  const patterns = [
    new RegExp(`### ${label}\\s*\\n\\n([^\\n#]+)`, 'i'),
    new RegExp(`### ${label}\\s*\\n([^\\n#]+)`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = body.match(pattern);
    if (match) {
      const value = match[1].trim();
      if (value === '_No response_') return '';
      return value;
    }
  }
  return '';
}

const action = label.replace('friend-link/', '');

const data = {
  issueNumber,
  issueTitle,
  action,
  actor,
  owner,
  author: parseField(body, '博主昵称'),
  title: parseField(body, '博客名称'),
  desc: parseField(body, '博客Slogan'),
  link: parseField(body, '博客地址'),
  linkPage: parseField(body, '友链页面地址'),
  avatar: parseField(body, '头像链接'),
  feed: parseField(body, '订阅源'),
  sitenick: parseField(body, '网站趣称'),
  archs: parseField(body, '技术架构'),
  comment: parseField(body, '备注'),
  originalIssueId: parseField(body, '原始申请 Issue 编号'),
};

console.log('PARSED_DATA=' + JSON.stringify(data));

writeFileSync('issue-data.json', JSON.stringify(data, null, 2));
console.log('Issue data saved to issue-data.json');
