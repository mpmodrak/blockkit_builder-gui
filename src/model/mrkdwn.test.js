import { parseInline, parseMrkdwn } from './mrkdwn';

function textOf(nodes) {
  return nodes.map((node) => {
    if (node.type === 'text') return node.text;
    if (node.type === 'break') return '\n';
    if (node.type === 'code') return `\`${node.text}\``;
    if (node.type === 'link') return `[${textOf(node.children)}](${node.href})`;
    if (node.type === 'mention') return node.text;
    return `${node.type}(${textOf(node.children)})`;
  }).join('');
}

describe('mrkdwn preview parser', () => {
  test('formats bold, italic, strike, and code', () => {
    expect(textOf(parseInline('A *bold* _italic_ ~strike~ `code`'))).toBe(
      'A bold(bold) italic(italic) strike(strike) `code`',
    );
  });

  test('nests emphasis and keeps unmatched markers literal', () => {
    expect(textOf(parseInline('*bold _and italic_*'))).toBe('bold(bold italic(and italic))');
    expect(textOf(parseInline('just *open'))).toBe('just *open');
  });

  test('parses safe links, mentions, and ignores unsafe markup', () => {
    expect(textOf(parseInline('<https://example.com/planning|Q2 planning>'))).toBe(
      '[Q2 planning](https://example.com/planning)',
    );
    expect(textOf(parseInline('<@U123|Priya> <#C123|announcements> <!here>'))).toBe(
      '@Priya #announcements @here',
    );
    expect(textOf(parseInline('<script>alert(1)</script>'))).toBe('<script>alert(1)</script>');
    expect(textOf(parseInline('<javascript:alert(1)|nope>'))).toBe('<javascript:alert(1)|nope>');
  });

  test('parses lists, quotes, and fenced code', () => {
    const blocks = parseMrkdwn('Intro line\n\n• One *item*\n• Two\n\n> quoted _line_\n\n```\nconst a = 1;\n```');
    expect(blocks.map((block) => block.type)).toEqual(['paragraph', 'list', 'quote', 'code']);
    expect(blocks[1].ordered).toBe(false);
    expect(textOf(blocks[1].items[0])).toBe('One bold(item)');
    expect(blocks[2].children[0].type).toBe('paragraph');
    expect(blocks[3].text).toBe('const a = 1;');
  });

  test('parses numbered lists', () => {
    const blocks = parseMrkdwn('1. First\n2. Second');
    expect(blocks[0]).toMatchObject({ type: 'list', ordered: true });
    expect(blocks[0].items).toHaveLength(2);
  });
});
