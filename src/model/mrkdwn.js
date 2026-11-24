/**
 * Slack mrkdwn preview parser.
 * Produces a small tree the React preview renders with text nodes,
 * so message text can never be injected as HTML.
 */

const EMOJI = {
  wave: '👋',
  tada: '🎉',
  white_check_mark: '✅',
  warning: '⚠️',
  rotating_light: '🚨',
  calendar: '📅',
  mega: '📣',
  rocket: '🚀',
  bulb: '💡',
  eyes: '👀',
  fire: '🔥',
  sparkles: '✨',
  memo: '📝',
  pushpin: '📌',
  link: '🔗',
  bell: '🔔',
  hourglass: '⏳',
  speech_balloon: '💬',
  dart: '🎯',
  star: '⭐',
};

export function decorateEmoji(text) {
  return String(text ?? '').replace(/:([a-z0-9_+-]+):/g, (match, name) => EMOJI[name] || match);
}

function isSafeHref(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' || url.protocol === 'mailto:';
  } catch (error) {
    return false;
  }
}

function parseAngle(inner) {
  if (inner.startsWith('@')) {
    const name = inner.includes('|') ? inner.split('|').slice(1).join('|') : inner.slice(1);
    return { type: 'mention', text: `@${name || 'someone'}` };
  }
  if (inner.startsWith('#')) {
    const name = inner.includes('|') ? inner.split('|').slice(1).join('|') : inner.slice(1);
    return { type: 'mention', text: `#${name || 'channel'}` };
  }
  if (inner.startsWith('!')) {
    const token = inner.slice(1);
    const known = { here: '@here', channel: '@channel', everyone: '@everyone' };
    return { type: 'mention', text: known[token] || `@${token}` };
  }

  const pipe = inner.indexOf('|');
  const target = pipe === -1 ? inner : inner.slice(0, pipe);
  const label = pipe === -1 ? null : inner.slice(pipe + 1);
  if (!isSafeHref(target.trim())) return null;
  return {
    type: 'link',
    href: target.trim(),
    children: parseInline(label || target.trim()),
  };
}

function findClosing(text, start, marker) {
  for (let index = start + 1; index < text.length; index += 1) {
    if (text[index] === '\n') return -1;
    if (text[index] === marker && index > start + 1) return index;
  }
  return -1;
}

export function parseInline(text) {
  const nodes = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (!buffer) return;
    nodes.push({ type: 'text', text: buffer });
    buffer = '';
  };

  while (index < text.length) {
    const char = text[index];

    if (char === '\n') {
      flush();
      nodes.push({ type: 'break' });
      index += 1;
      continue;
    }

    if (char === '`') {
      const end = text.indexOf('`', index + 1);
      if (end > index + 1 && !text.slice(index + 1, end).includes('\n')) {
        flush();
        nodes.push({ type: 'code', text: text.slice(index + 1, end) });
        index = end + 1;
        continue;
      }
    }

    if (char === '<') {
      const end = text.indexOf('>', index + 1);
      if (end !== -1) {
        const parsed = parseAngle(text.slice(index + 1, end));
        if (parsed) {
          flush();
          nodes.push(parsed);
          index = end + 1;
          continue;
        }
      }
    }

    if (char === '*' || char === '_' || char === '~') {
      const end = findClosing(text, index, char);
      if (end !== -1) {
        flush();
        const type = char === '*' ? 'bold' : char === '_' ? 'italic' : 'strike';
        nodes.push({ type, children: parseInline(text.slice(index + 1, end)) });
        index = end + 1;
        continue;
      }
    }

    buffer += char;
    index += 1;
  }

  flush();
  return nodes;
}

function splitFences(text) {
  const parts = [];
  const pattern = /```([\s\S]*?)```/g;
  let last = 0;
  let match = pattern.exec(text);
  while (match) {
    if (match.index > last) {
      parts.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    parts.push({
      kind: 'code',
      text: match[1].replace(/^\n/, '').replace(/\n$/, ''),
    });
    last = match.index + match[0].length;
    match = pattern.exec(text);
  }
  if (last < text.length) parts.push({ kind: 'text', text: text.slice(last) });
  if (parts.length === 0) parts.push({ kind: 'text', text: '' });
  return parts;
}

function parseLines(text) {
  const lines = text.split('\n');
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (line.trim() === '') {
      index += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quoted = [];
      while (index < lines.length && /^>\s?/.test(lines[index])) {
        quoted.push(lines[index].replace(/^>\s?/, ''));
        index += 1;
      }
      blocks.push({ type: 'quote', children: parseLines(quoted.join('\n')) });
      continue;
    }

    const bullet = /^(\s*)[•*-]\s+(.*)$/.exec(line);
    const numbered = /^(\s*)\d+[.)]\s+(.*)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      const items = [];
      while (index < lines.length) {
        const current = ordered
          ? /^(\s*)\d+[.)]\s+(.*)$/.exec(lines[index])
          : /^(\s*)[•*-]\s+(.*)$/.exec(lines[index]);
        if (!current) break;
        items.push(parseInline(current[2]));
        index += 1;
      }
      blocks.push({ type: 'list', ordered, items });
      continue;
    }

    const paragraph = [line];
    index += 1;
    while (
      index < lines.length
      && lines[index].trim() !== ''
      && !/^>\s?/.test(lines[index])
      && !/^(\s*)(?:[•*-]|\d+[.)])\s+/.test(lines[index])
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    blocks.push({ type: 'paragraph', children: parseInline(paragraph.join('\n')) });
  }

  return blocks;
}

export function parseMrkdwn(input) {
  const text = String(input ?? '').replace(/\r\n/g, '\n');
  const blocks = [];
  splitFences(text).forEach((part) => {
    if (part.kind === 'code') {
      blocks.push({ type: 'code', text: part.text });
      return;
    }
    blocks.push(...parseLines(part.text));
  });
  return blocks;
}
