import {
  builderUrl,
  compileMessage,
  createBlock,
  duplicateBlock,
  importPayload,
  moveBlock,
  readDragPayload,
  reorder,
  validateSlackPayload,
} from './message';
import {
  buildAnnouncement,
  buildIncident,
  buildProductUpdate,
} from './templates';

function compiled(blocks) {
  const result = compileMessage(blocks);
  return { ...result, json: JSON.stringify(result.payload) };
}

describe('Block Kit serialization', () => {
  test.each([
    ['announcement', buildAnnouncement],
    ['product update', buildProductUpdate],
    ['incident', buildIncident],
  ])('%s is valid Slack Block Kit and hides editor ids', (name, build) => {
    const blocks = build();
    const result = compiled(blocks);

    expect(result.issues.filter((issue) => issue.severity === 'error')).toEqual([]);
    expect(validateSlackPayload(result.payload)).toEqual([]);
    expect(result.payload).toEqual({ blocks: expect.any(Array) });
    expect(result.payload.blocks.length).toBeGreaterThan(0);
    blocks.forEach((block) => {
      expect(result.json.includes(block.id)).toBe(false);
    });
    expect(result.json.includes('"id":')).toBe(false);
  });

  test('round-trips every template through import', () => {
    [buildAnnouncement, buildProductUpdate, buildIncident].forEach((build) => {
      const original = compileMessage(build());
      const imported = importPayload(JSON.stringify(original.payload));
      expect(imported.ok).toBe(true);
      expect(compileMessage(imported.blocks).payload).toEqual(original.payload);
    });
  });

  test('omits empty titles, default button styles, and invalid urls', () => {
    const result = compileMessage([
      createBlock('image', {
        title: '   ',
        imageUrl: 'https://example.com/cat.png',
        altText: 'A cat',
      }),
      createBlock('actions', {
        buttons: [
          { label: 'Save', style: 'default', url: 'not a url', actionId: 'save_btn', value: 'save' },
          { label: 'Remove', style: 'danger', url: '', actionId: 'remove_btn' },
        ],
      }),
    ]);

    expect(result.payload.blocks[0].title).toBeUndefined();
    expect(result.payload.blocks[0].image_url).toBe('https://example.com/cat.png');
    expect(result.payload.blocks[1].elements[0].style).toBeUndefined();
    expect(result.payload.blocks[1].elements[0].url).toBeUndefined();
    expect(result.payload.blocks[1].elements[0].value).toBe('save');
    expect(result.payload.blocks[1].elements[1].style).toBe('danger');
    expect(validateSlackPayload(result.payload)).toEqual([]);
    expect(result.issues.some((issue) => issue.message.includes('http(s)'))).toBe(true);
  });

  test('leaves invalid images and empty headers out of the payload', () => {
    const result = compileMessage([
      createBlock('header', { text: '   ' }),
      createBlock('image', { title: 'Pic', imageUrl: 'ftp://example.com/a.png', altText: 'Pic' }),
      createBlock('divider'),
    ]);

    expect(result.payload.blocks).toEqual([{ type: 'divider' }]);
    expect(result.issues.filter((issue) => issue.severity === 'error')).toHaveLength(2);
    expect(validateSlackPayload(result.payload)).toEqual([]);
  });

  test('clips a headline to 150 characters', () => {
    const result = compileMessage([createBlock('header', { text: 'H'.repeat(180) })]);
    expect(result.payload.blocks[0].text.text).toHaveLength(150);
    expect(result.payload.blocks[0].text.type).toBe('plain_text');
    expect(validateSlackPayload(result.payload)).toEqual([]);
  });

  test('section accessory can be a button or a thumbnail', () => {
    const button = compileMessage([
      createBlock('section', {
        text: 'Hello *team*',
        textType: 'mrkdwn',
        accessory: {
          kind: 'button',
          label: 'Open',
          style: 'primary',
          url: 'https://example.com',
          actionId: 'open_doc',
        },
      }),
    ]);
    expect(button.payload.blocks[0].accessory).toMatchObject({
      type: 'button',
      style: 'primary',
      url: 'https://example.com',
      action_id: 'open_doc',
    });
    expect(button.payload.blocks[0].text).toEqual({ type: 'mrkdwn', text: 'Hello *team*' });

    const thumb = compileMessage([
      createBlock('section', {
        text: 'With photo',
        accessory: {
          kind: 'image',
          imageUrl: 'https://example.com/thumb.png',
          altText: 'Thumbnail',
        },
      }),
    ]);
    expect(thumb.payload.blocks[0].accessory).toEqual({
      type: 'image',
      image_url: 'https://example.com/thumb.png',
      alt_text: 'Thumbnail',
    });
    expect(validateSlackPayload(thumb.payload)).toEqual([]);
  });

  test('drops an invalid thumbnail but keeps the section text', () => {
    const result = compileMessage([
      createBlock('section', {
        text: 'Hello',
        accessory: { kind: 'image', imageUrl: 'notaurl', altText: 'x' },
      }),
    ]);
    expect(result.payload.blocks[0].text.text).toBe('Hello');
    expect(result.payload.blocks[0].accessory).toBeUndefined();
    expect(result.issues[0].severity).toBe('warning');
  });

  test('preserves imported block ids, fields, and slack files without editor ids', () => {
    const raw = {
      blocks: [
        {
          type: 'section',
          block_id: 'summary',
          text: { type: 'mrkdwn', text: 'Overview' },
          fields: [
            { type: 'mrkdwn', text: '*Owner*\nPriya' },
            { type: 'plain_text', text: 'Due Friday', emoji: true },
          ],
        },
        {
          type: 'image',
          alt_text: 'Uploaded file',
          slack_file: { id: 'F0123' },
        },
      ],
    };
    const imported = importPayload(JSON.stringify(raw));
    expect(imported.ok).toBe(true);
    const again = compileMessage(imported.blocks).payload;
    expect(again.blocks[0].block_id).toBe('summary');
    expect(again.blocks[0].fields).toHaveLength(2);
    expect(again.blocks[1].slack_file).toEqual({ id: 'F0123' });
    expect(JSON.stringify(again).includes(imported.blocks[0].id)).toBe(false);
    expect(validateSlackPayload(again)).toEqual([]);
  });
});

describe('Block Kit import', () => {
  test('accepts a payload, a raw array, or a single block', () => {
    expect(importPayload('{"blocks":[{"type":"divider"}]}').blocks).toHaveLength(1);
    expect(importPayload('[{"type":"divider"}]').blocks[0].type).toBe('divider');
    expect(importPayload('{"type":"header","text":{"type":"plain_text","text":"Hi"}}').blocks[0].text).toBe('Hi');
  });

  test('rejects junk and reports unsupported blocks', () => {
    expect(importPayload('nope').ok).toBe(false);
    expect(importPayload('{"foo":1}').ok).toBe(false);
    const mixed = importPayload(JSON.stringify({
      blocks: [{ type: 'rich_text', elements: [] }, { type: 'divider' }],
    }));
    expect(mixed.ok).toBe(true);
    expect(mixed.blocks.map((block) => block.type)).toEqual(['divider']);
    expect(mixed.skipped).toEqual(['rich_text']);
  });

  test('reports an unsupported accessory without dropping the section', () => {
    const result = importPayload(JSON.stringify({
      blocks: [{
        type: 'section',
        text: { type: 'mrkdwn', text: 'Keep me' },
        accessory: { type: 'overflow', options: [] },
      }],
    }));
    expect(result.ok).toBe(true);
    expect(result.blocks[0].text).toBe('Keep me');
    expect(result.blocks[0].accessory).toBeNull();
    expect(result.warnings[0]).toMatch(/overflow/);
  });
});

describe('editor list operations', () => {
  test('reorders by the gap index used during drag and drop', () => {
    const list = ['a', 'b', 'c', 'd'];
    expect(reorder(list, 0, 2)).toEqual(['b', 'a', 'c', 'd']);
    expect(reorder(list, 0, 4)).toEqual(['b', 'c', 'd', 'a']);
    expect(reorder(list, 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(reorder(list, 2, 1)).toEqual(['a', 'c', 'b', 'd']);
    expect(reorder(list, 1, 1)).toEqual(list);
    expect(reorder(list, 1, 2)).toEqual(list);
  });

  test('moves, duplicates, and reads drag payloads', () => {
    const blocks = [createBlock('divider'), createBlock('header', { text: 'One' })];
    expect(moveBlock(blocks, 0, 1).map((block) => block.type)).toEqual(['header', 'divider']);
    expect(moveBlock(blocks, 0, -1)).toBe(blocks);

    const copy = duplicateBlock(blocks[1]);
    expect(copy.id).not.toBe(blocks[1].id);
    expect(copy.text).toBe('One');
    expect(copy.blockId).toBeUndefined();

    const actions = createBlock('actions');
    const duplicated = duplicateBlock(actions);
    expect(duplicated.buttons[0].actionId).not.toBe(actions.buttons[0].actionId);

    expect(readDragPayload('new:section')).toEqual({ kind: 'new', type: 'section' });
    expect(readDragPayload('move:2')).toEqual({ kind: 'move', index: 2 });
    expect(readDragPayload('new:rich_text')).toBeNull();
    expect(readDragPayload('hello')).toBeNull();
  });

  test('builds a Block Kit Builder deep link', () => {
    const payload = compileMessage(buildAnnouncement()).payload;
    const url = builderUrl(payload);
    expect(url.startsWith('https://app.slack.com/block-kit-builder/#')).toBe(true);
    const decoded = JSON.parse(decodeURIComponent(url.split('#')[1]));
    expect(decoded).toEqual(payload);
  });
});
