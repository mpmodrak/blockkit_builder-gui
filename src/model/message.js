export const LIMITS = {
  blocks: 50,
  header: 150,
  section: 3000,
  button: 75,
  url: 3000,
  alt: 2000,
  title: 2000,
  imageUrl: 3000,
  context: 3000,
  contextElements: 10,
  actions: 25,
  actionId: 255,
  field: 2000,
  fields: 10,
  blockId: 255,
  value: 2000,
};

const BLOCK_TYPES = ['header', 'section', 'image', 'divider', 'context', 'actions'];

let idCounter = 0;

export function createId() {
  idCounter += 1;
  return `ui_${Date.now().toString(36)}_${idCounter.toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createActionId() {
  idCounter += 1;
  return `btn_${idCounter.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

export function isHttpUrl(value) {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > LIMITS.url) return false;
  try {
    const url = new URL(trimmed);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
}

function clip(value, max) {
  const text = String(value ?? '');
  return text.length > max ? text.slice(0, max) : text;
}

function plainText(text, max, emoji = true) {
  return {
    type: 'plain_text',
    text: clip(text, max),
    emoji: Boolean(emoji),
  };
}

function mrkdwnText(text, max) {
  return {
    type: 'mrkdwn',
    text: clip(text, max),
  };
}

export function createBlock(type, overrides = {}) {
  const bases = {
    header: { text: 'Headline', emoji: true },
    section: {
      text: 'Write the message in the words you would actually post.',
      textType: 'mrkdwn',
      emoji: true,
      accessory: null,
    },
    image: {
      title: '',
      imageUrl: '',
      altText: '',
    },
    divider: {},
    context: {
      elements: [{ kind: 'text', text: 'Posted just now', textType: 'mrkdwn', emoji: true }],
    },
    actions: {
      buttons: [
        { label: 'Open', style: 'primary', url: '', actionId: createActionId() },
        { label: 'Dismiss', style: 'default', url: '', actionId: createActionId() },
      ],
    },
  };

  if (!bases[type]) return null;
  return {
    ...bases[type],
    ...overrides,
    id: createId(),
    type,
  };
}

export function duplicateBlock(block) {
  const clone = JSON.parse(JSON.stringify(block));
  clone.id = createId();
  delete clone.blockId;
  if (clone.accessory?.kind === 'button') {
    clone.accessory = { ...clone.accessory, actionId: createActionId() };
  }
  if (Array.isArray(clone.buttons)) {
    clone.buttons = clone.buttons.map((button) => ({ ...button, actionId: createActionId() }));
  }
  return clone;
}

export function moveBlock(blocks, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= blocks.length) return blocks;
  const next = blocks.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

/**
 * Move an item so it lands in the gap `to`, where `to` is an index in the
 * list *before* removal (0..length). Dropping on the item's own gap is a no-op.
 */
export function reorder(list, from, to) {
  if (to === from || to === from + 1) return list.slice();
  const next = list.slice();
  const [item] = next.splice(from, 1);
  const adjusted = to > from ? to - 1 : to;
  next.splice(Math.max(0, Math.min(adjusted, next.length)), 0, item);
  return next;
}

function slackBlockId(block) {
  if (typeof block.blockId !== 'string') return undefined;
  const value = block.blockId.trim();
  if (!value) return undefined;
  return value.slice(0, LIMITS.blockId);
}

function withBlockId(slack, block) {
  const blockId = slackBlockId(block);
  if (!blockId) return slack;
  return { type: slack.type, block_id: blockId, ...restWithoutType(slack) };
}

function restWithoutType(slack) {
  const { type, ...rest } = slack;
  return rest;
}

function serializeButton(button, seen) {
  const label = clip(String(button.label ?? '').trim(), LIMITS.button);
  if (!label) return { button: null, warning: 'A button with no label was left out.' };

  let actionId = clip(String(button.actionId || createActionId()).trim(), LIMITS.actionId);
  if (!actionId) actionId = createActionId();
  let unique = actionId;
  let suffix = 2;
  while (seen.has(unique)) {
    unique = `${actionId.slice(0, LIMITS.actionId - 3)}_${suffix}`;
    suffix += 1;
  }
  seen.add(unique);

  const slack = {
    type: 'button',
    text: plainText(label, LIMITS.button, true),
    action_id: unique,
  };

  if (button.style === 'primary' || button.style === 'danger') {
    slack.style = button.style;
  }

  let warning = null;
  const url = String(button.url ?? '').trim();
  if (url) {
    if (isHttpUrl(url)) slack.url = url;
    else warning = `“${label}” needs a full http(s) link, so the URL was left out.`;
  }

  const value = String(button.value ?? '').trim();
  if (value) slack.value = clip(value, LIMITS.value);

  return { button: slack, warning };
}

function serializeImageElement(image) {
  const alt = clip(String(image.altText ?? '').trim(), LIMITS.alt);
  if (!alt) return { element: null, warning: 'An image needs alt text before it can be posted.' };

  const element = { type: 'image', alt_text: alt };
  const url = String(image.imageUrl ?? '').trim();
  if (isHttpUrl(url)) {
    element.image_url = url;
    return { element, warning: null };
  }
  if (image.slackFile && (image.slackFile.url || image.slackFile.id)) {
    element.slack_file = image.slackFile.id
      ? { id: String(image.slackFile.id) }
      : { url: String(image.slackFile.url) };
    return { element, warning: null };
  }
  return { element: null, warning: 'An image URL needs to start with http:// or https://.' };
}

function serializeTextElement(element, max) {
  const text = String(element.text ?? '').trim();
  if (!text) return null;
  if (element.textType === 'plain_text') return plainText(text, max, element.emoji !== false);
  return mrkdwnText(text, max);
}

export function serializeBlock(block) {
  const issues = [];
  if (!block || !BLOCK_TYPES.includes(block.type)) {
    return { slack: null, issues: ['This block type is not supported.'] };
  }

  if (block.type === 'divider') {
    return { slack: withBlockId({ type: 'divider' }, block), issues };
  }

  if (block.type === 'header') {
    const text = String(block.text ?? '').trim();
    if (!text) {
      return { slack: null, issues: ['Add headline text to include this header.'] };
    }
    const slack = {
      type: 'header',
      text: plainText(text, LIMITS.header, block.emoji !== false),
    };
    const level = Number(block.level);
    if (level >= 1 && level <= 4) slack.level = level;
    if (text.length > LIMITS.header) issues.push('The headline was shortened to 150 characters.');
    return { slack: withBlockId(slack, block), issues };
  }

  if (block.type === 'image') {
    const image = serializeImageElement(block);
    if (!image.element) return { slack: null, issues: [image.warning] };
    const slack = { type: 'image' };
    const title = String(block.title ?? '').trim();
    if (title) {
      slack.title = plainText(title, LIMITS.title, true);
      if (title.length > LIMITS.title) issues.push('The image title was shortened to 2000 characters.');
    }
    if (image.element.slack_file) slack.slack_file = image.element.slack_file;
    if (image.element.image_url) slack.image_url = image.element.image_url;
    slack.alt_text = image.element.alt_text;
    return { slack: withBlockId(slack, block), issues };
  }

  if (block.type === 'context') {
    const elements = [];
    (block.elements || []).slice(0, LIMITS.contextElements).forEach((element) => {
      if (element.kind === 'image') {
        const image = serializeImageElement(element);
        if (image.element) elements.push(image.element);
        else if (image.warning) issues.push(image.warning);
        return;
      }
      const text = serializeTextElement(element, LIMITS.context);
      if (text) elements.push(text);
    });
    if (elements.length === 0) {
      return { slack: null, issues: ['Add footer text to include this context block.'] };
    }
    return { slack: withBlockId({ type: 'context', elements }, block), issues };
  }

  if (block.type === 'actions') {
    const seen = new Set();
    const elements = [];
    (block.buttons || []).slice(0, LIMITS.actions).forEach((button) => {
      const result = serializeButton(button, seen);
      if (result.warning) issues.push(result.warning);
      if (result.button) elements.push(result.button);
    });
    const primaryCount = elements.filter((element) => element.style === 'primary').length;
    if (primaryCount > 1) {
      issues.push('Slack recommends only one primary button in a group.');
    }
    if (elements.length === 0) {
      return { slack: null, issues: issues.length ? issues : ['Add a button label to include this actions block.'] };
    }
    return { slack: withBlockId({ type: 'actions', elements }, block), issues };
  }

  const fields = (block.fields || [])
    .slice(0, LIMITS.fields)
    .map((field) => serializeTextElement(field, LIMITS.field))
    .filter(Boolean);

  const text = String(block.text ?? '').trim();
  const slack = { type: 'section' };
  if (text) {
    slack.text = block.textType === 'plain_text'
      ? plainText(text, LIMITS.section, block.emoji !== false)
      : mrkdwnText(text, LIMITS.section);
    if (text.length > LIMITS.section) issues.push('The section was shortened to 3000 characters.');
  }
  if (fields.length) slack.fields = fields;

  if (block.accessory?.kind === 'button') {
    const seen = new Set();
    const result = serializeButton(block.accessory, seen);
    if (result.warning) issues.push(result.warning);
    if (result.button) slack.accessory = result.button;
  } else if (block.accessory?.kind === 'image') {
    const image = serializeImageElement(block.accessory);
    if (image.warning && !image.element) issues.push(image.warning);
    if (image.element) slack.accessory = image.element;
  }

  if (!slack.text && !slack.fields) {
    return {
      slack: null,
      issues: issues.length ? issues : ['Add section text to include this block.'],
    };
  }

  return { slack: withBlockId(slack, block), issues };
}

export function compileMessage(blocks) {
  const issues = [];
  const views = [];
  const slackBlocks = [];

  (blocks || []).forEach((block) => {
    if (slackBlocks.length >= LIMITS.blocks) {
      issues.push({
        blockId: block.id,
        severity: 'error',
        message: 'Slack messages include at most 50 blocks. This one was left out.',
      });
      views.push({ id: block.id, slack: null });
      return;
    }

    const result = serializeBlock(block);
    result.issues.forEach((message) => {
      const omitted = !result.slack;
      issues.push({
        blockId: block.id,
        severity: omitted ? 'error' : 'warning',
        message,
      });
    });
    if (result.slack) slackBlocks.push(result.slack);
    views.push({ id: block.id, slack: result.slack });
  });

  const payload = { blocks: slackBlocks };
  return { payload, issues, views };
}

export function builderUrl(payload) {
  return `https://app.slack.com/block-kit-builder/#${encodeURIComponent(JSON.stringify(payload))}`;
}

function asObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
}

function importTextObject(value) {
  const object = asObject(value);
  if (!object) {
    if (typeof value === 'string' && value.trim()) {
      return { text: value.trim(), textType: 'mrkdwn', emoji: true };
    }
    return null;
  }
  const text = typeof object.text === 'string' ? object.text : '';
  if (!text.trim()) return null;
  const textType = object.type === 'plain_text' ? 'plain_text' : 'mrkdwn';
  return {
    text,
    textType,
    emoji: object.emoji !== false,
  };
}

function importButton(value) {
  const object = asObject(value);
  if (!object || object.type !== 'button') return null;
  const text = importTextObject(object.text);
  return {
    label: text?.text?.trim() || 'Button',
    style: object.style === 'primary' || object.style === 'danger' ? object.style : 'default',
    url: typeof object.url === 'string' ? object.url : '',
    actionId: typeof object.action_id === 'string' && object.action_id.trim()
      ? object.action_id.trim().slice(0, LIMITS.actionId)
      : createActionId(),
    value: typeof object.value === 'string' ? object.value : '',
  };
}

function importSlackFile(value) {
  const object = asObject(value);
  if (!object) return null;
  if (typeof object.id === 'string' && object.id.trim()) return { id: object.id.trim() };
  if (typeof object.url === 'string' && object.url.trim()) return { url: object.url.trim() };
  return null;
}

function importImageElement(value) {
  const object = asObject(value);
  if (!object || object.type !== 'image') return null;
  return {
    kind: 'image',
    imageUrl: typeof object.image_url === 'string' ? object.image_url : '',
    altText: typeof object.alt_text === 'string' ? object.alt_text : '',
    slackFile: importSlackFile(object.slack_file),
  };
}

function packImport(block, notes = []) {
  return { block, notes };
}

function importBlock(value) {
  const object = asObject(value);
  if (!object || !BLOCK_TYPES.includes(object.type)) return null;

  const base = {
    id: createId(),
    type: object.type,
  };
  if (typeof object.block_id === 'string' && object.block_id.trim()) {
    base.blockId = object.block_id.trim().slice(0, LIMITS.blockId);
  }

  if (object.type === 'divider') return packImport(base);

  if (object.type === 'header') {
    const text = importTextObject(object.text);
    return packImport({
      ...base,
      text: text?.text || '',
      emoji: text ? text.emoji : true,
      level: [1, 2, 3, 4].includes(object.level) ? object.level : undefined,
    });
  }

  if (object.type === 'image') {
    return packImport({
      ...base,
      title: importTextObject(object.title)?.text || '',
      imageUrl: typeof object.image_url === 'string' ? object.image_url : '',
      altText: typeof object.alt_text === 'string' ? object.alt_text : '',
      slackFile: importSlackFile(object.slack_file),
    });
  }

  if (object.type === 'context') {
    const elements = [];
    (Array.isArray(object.elements) ? object.elements : []).slice(0, LIMITS.contextElements).forEach((element) => {
      const image = importImageElement(element);
      if (image) {
        elements.push(image);
        return;
      }
      const text = importTextObject(element);
      if (text) elements.push({ kind: 'text', ...text });
    });
    return packImport({ ...base, elements });
  }

  if (object.type === 'actions') {
    const notes = [];
    const buttons = [];
    (Array.isArray(object.elements) ? object.elements : []).slice(0, LIMITS.actions).forEach((element) => {
      const button = importButton(element);
      if (button) buttons.push(button);
      else if (element?.type) notes.push(`Dropped an unsupported ${element.type} from actions.`);
    });
    return packImport({ ...base, buttons }, notes);
  }

  const text = importTextObject(object.text);
  const fields = (Array.isArray(object.fields) ? object.fields : [])
    .slice(0, LIMITS.fields)
    .map(importTextObject)
    .filter(Boolean);
  let accessory = null;
  const notes = [];
  if (object.accessory?.type === 'button') {
    const button = importButton(object.accessory);
    if (button) accessory = { kind: 'button', ...button };
  } else if (object.accessory?.type === 'image') {
    const image = importImageElement(object.accessory);
    if (image) accessory = image;
  } else if (object.accessory) {
    notes.push(`Dropped an unsupported ${object.accessory.type || 'accessory'} on a section.`);
  }

  return packImport({
    ...base,
    text: text?.text || '',
    textType: text?.textType || 'mrkdwn',
    emoji: text ? text.emoji : true,
    fields,
    accessory,
  }, notes);
}

export function importPayload(raw) {
  let data;
  try {
    data = JSON.parse(String(raw ?? '').trim());
  } catch (error) {
    return { ok: false, error: 'That text is not valid JSON.' };
  }

  let source = null;
  if (Array.isArray(data)) source = data;
  else if (data && Array.isArray(data.blocks)) source = data.blocks;
  else if (data && typeof data.type === 'string') source = [data];

  if (!source) {
    return {
      ok: false,
      error: 'Paste Slack Block Kit JSON shaped like { "blocks": [ ... ] }.',
    };
  }

  const blocks = [];
  const skipped = [];
  const warnings = [];
  source.forEach((entry, index) => {
    const imported = importBlock(entry);
    if (imported?.block) {
      blocks.push(imported.block);
      warnings.push(...imported.notes);
    } else {
      skipped.push(entry && entry.type ? String(entry.type) : `item ${index + 1}`);
    }
  });

  if (blocks.length === 0) {
    return {
      ok: false,
      error: skipped.length
        ? 'None of those blocks are supported in this editor yet.'
        : 'The payload did not include any blocks.',
    };
  }

  return { ok: true, blocks, skipped, warnings };
}

const TEXT_KEYS = new Set(['type', 'text', 'emoji', 'verbatim']);

function checkText(value, path, errors, { max, plainOnly = false, mrkdwnOnly = false }) {
  if (!value || typeof value !== 'object') {
    errors.push(`${path} must be a text object.`);
    return;
  }
  if (value.type !== 'plain_text' && value.type !== 'mrkdwn') {
    errors.push(`${path}.type must be plain_text or mrkdwn.`);
  }
  if (plainOnly && value.type !== 'plain_text') errors.push(`${path} must be plain_text.`);
  if (mrkdwnOnly && value.type !== 'mrkdwn') errors.push(`${path} must be mrkdwn.`);
  if (typeof value.text !== 'string' || value.text.length < 1 || value.text.length > max) {
    errors.push(`${path}.text must be 1–${max} characters.`);
  }
  if (value.type === 'mrkdwn' && Object.prototype.hasOwnProperty.call(value, 'emoji')) {
    errors.push(`${path} mrkdwn cannot include emoji.`);
  }
  if (value.emoji !== undefined && typeof value.emoji !== 'boolean') {
    errors.push(`${path}.emoji must be a boolean.`);
  }
  Object.keys(value).forEach((key) => {
    if (!TEXT_KEYS.has(key)) errors.push(`${path} has unsupported field ${key}.`);
  });
}

function checkUrl(value, path, errors) {
  if (typeof value !== 'string' || !isHttpUrl(value)) {
    errors.push(`${path} must be an http(s) URL.`);
  }
}

function checkButton(value, path, errors) {
  if (!value || value.type !== 'button') {
    errors.push(`${path} must be a button.`);
    return;
  }
  checkText(value.text, `${path}.text`, errors, { max: LIMITS.button, plainOnly: true });
  if (value.style !== undefined && value.style !== 'primary' && value.style !== 'danger') {
    errors.push(`${path}.style must be primary or danger when set.`);
  }
  if (value.url !== undefined) checkUrl(value.url, `${path}.url`, errors);
  if (value.action_id !== undefined && (typeof value.action_id !== 'string' || value.action_id.length < 1 || value.action_id.length > LIMITS.actionId)) {
    errors.push(`${path}.action_id must be 1–255 characters.`);
  }
  if (value.value !== undefined && (typeof value.value !== 'string' || value.value.length > LIMITS.value)) {
    errors.push(`${path}.value is too long.`);
  }
  const allowed = new Set(['type', 'text', 'action_id', 'url', 'value', 'style']);
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) errors.push(`${path} has unsupported field ${key}.`);
  });
}

function checkImageSource(value, path, errors) {
  const hasUrl = typeof value.image_url === 'string';
  const hasFile = value.slack_file && typeof value.slack_file === 'object';
  if (!hasUrl && !hasFile) errors.push(`${path} needs image_url or slack_file.`);
  if (hasUrl) checkUrl(value.image_url, `${path}.image_url`, errors);
  if (typeof value.alt_text !== 'string' || value.alt_text.length < 1 || value.alt_text.length > LIMITS.alt) {
    errors.push(`${path}.alt_text must be 1–2000 characters.`);
  }
}

function allowedOnly(value, allowed, path, errors) {
  Object.keys(value).forEach((key) => {
    if (!allowed.has(key)) errors.push(`${path} has unsupported field ${key}.`);
  });
}

export function validateSlackPayload(payload) {
  const errors = [];
  if (!payload || !Array.isArray(payload.blocks)) {
    return ['Payload must be { "blocks": [] }.'];
  }
  if (Object.keys(payload).some((key) => key !== 'blocks')) {
    errors.push('Payload should only contain blocks.');
  }
  if (payload.blocks.length > LIMITS.blocks) errors.push('A message can contain at most 50 blocks.');

  payload.blocks.forEach((block, index) => {
    const path = `blocks[${index}]`;
    if (!block || typeof block !== 'object') {
      errors.push(`${path} must be an object.`);
      return;
    }
    if (Object.prototype.hasOwnProperty.call(block, 'id')) {
      errors.push(`${path} leaks an internal id.`);
    }
    if (block.block_id !== undefined && (typeof block.block_id !== 'string' || block.block_id.length < 1 || block.block_id.length > LIMITS.blockId)) {
      errors.push(`${path}.block_id must be 1–255 characters.`);
    }

    if (block.type === 'divider') {
      allowedOnly(block, new Set(['type', 'block_id']), path, errors);
      return;
    }
    if (block.type === 'header') {
      allowedOnly(block, new Set(['type', 'block_id', 'text', 'level']), path, errors);
      checkText(block.text, `${path}.text`, errors, { max: LIMITS.header, plainOnly: true });
      if (block.level !== undefined && ![1, 2, 3, 4].includes(block.level)) {
        errors.push(`${path}.level must be 1–4.`);
      }
      return;
    }
    if (block.type === 'section') {
      allowedOnly(block, new Set(['type', 'block_id', 'text', 'fields', 'accessory']), path, errors);
      if (!block.text && !block.fields) errors.push(`${path} needs text or fields.`);
      if (block.text) checkText(block.text, `${path}.text`, errors, { max: LIMITS.section });
      if (block.fields) {
        if (!Array.isArray(block.fields) || block.fields.length < 1 || block.fields.length > LIMITS.fields) {
          errors.push(`${path}.fields must contain 1–10 items.`);
        } else {
          block.fields.forEach((field, fieldIndex) => {
            checkText(field, `${path}.fields[${fieldIndex}]`, errors, { max: LIMITS.field });
          });
        }
      }
      if (block.accessory?.type === 'button') checkButton(block.accessory, `${path}.accessory`, errors);
      else if (block.accessory?.type === 'image') {
        allowedOnly(block.accessory, new Set(['type', 'image_url', 'alt_text', 'slack_file']), `${path}.accessory`, errors);
        checkImageSource(block.accessory, `${path}.accessory`, errors);
      } else if (block.accessory) errors.push(`${path}.accessory is not a button or image.`);
      return;
    }
    if (block.type === 'image') {
      allowedOnly(block, new Set(['type', 'block_id', 'image_url', 'alt_text', 'title', 'slack_file']), path, errors);
      checkImageSource(block, path, errors);
      if (block.title) checkText(block.title, `${path}.title`, errors, { max: LIMITS.title, plainOnly: true });
      return;
    }
    if (block.type === 'context') {
      allowedOnly(block, new Set(['type', 'block_id', 'elements']), path, errors);
      if (!Array.isArray(block.elements) || block.elements.length < 1 || block.elements.length > LIMITS.contextElements) {
        errors.push(`${path}.elements must contain 1–10 items.`);
        return;
      }
      block.elements.forEach((element, elementIndex) => {
        const elementPath = `${path}.elements[${elementIndex}]`;
        if (element?.type === 'image') {
          allowedOnly(element, new Set(['type', 'image_url', 'alt_text', 'slack_file']), elementPath, errors);
          checkImageSource(element, elementPath, errors);
        } else {
          checkText(element, elementPath, errors, { max: LIMITS.context });
        }
      });
      return;
    }
    if (block.type === 'actions') {
      allowedOnly(block, new Set(['type', 'block_id', 'elements']), path, errors);
      if (!Array.isArray(block.elements) || block.elements.length < 1 || block.elements.length > LIMITS.actions) {
        errors.push(`${path}.elements must contain 1–25 buttons.`);
        return;
      }
      block.elements.forEach((element, elementIndex) => {
        checkButton(element, `${path}.elements[${elementIndex}]`, errors);
      });
      return;
    }
    errors.push(`${path} has unsupported type ${block.type}.`);
  });

  return errors;
}

export function readDragPayload(raw) {
  if (typeof raw !== 'string') return null;
  if (raw.startsWith('new:')) {
    const type = raw.slice(4);
    return BLOCK_TYPES.includes(type) ? { kind: 'new', type } : null;
  }
  if (raw.startsWith('move:')) {
    const index = Number(raw.slice(5));
    return Number.isInteger(index) && index >= 0 ? { kind: 'move', index } : null;
  }
  return null;
}
