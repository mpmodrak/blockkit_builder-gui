import { useEffect, useRef } from 'react';
import FitImage from './FitImage';
import { LIMITS, createActionId, isHttpUrl } from '../model/message';

const inputClass = 'w-full rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-[#4A154B]';

function Counter({ value, max }) {
  const length = String(value ?? '').length;
  const tone = length >= max ? 'text-[#e01e5a]' : length >= max * 0.9 ? 'text-[#8a5a00]' : 'text-muted';
  return <span className={`text-xs tabular-nums ${tone}`}>{length}/{max}</span>;
}

function Field({ label, htmlFor, counter, hint, children }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-semibold text-ink">{label}</label>
        {counter}
      </div>
      {children}
      {hint && <p className="text-xs leading-relaxed text-muted">{hint}</p>}
    </div>
  );
}

function choiceClass(active) {
  return `rounded-md px-2.5 py-1 text-xs font-semibold ${active ? 'bg-white text-ink shadow-sm' : 'text-muted hover:text-ink'}`;
}

function wrapSelection(value, start, end, before, after, placeholder) {
  const selected = value.slice(start, end);
  const inner = selected || placeholder;
  const next = `${value.slice(0, start)}${before}${inner}${after}${value.slice(end)}`;
  const selectionStart = start + before.length;
  return { next, selectionStart, selectionEnd: selectionStart + inner.length };
}

function prefixLines(value, start, end) {
  const selected = value.slice(start, end) || 'List item';
  const inner = selected.split('\n').map((line) => (line.startsWith('• ') ? line : `• ${line}`)).join('\n');
  const next = `${value.slice(0, start)}${inner}${value.slice(end)}`;
  return { next, selectionStart: start, selectionEnd: start + inner.length };
}

const BLOCK_TITLES = {
  header: 'Header',
  section: 'Section',
  image: 'Image',
  divider: 'Divider',
  context: 'Context',
  actions: 'Actions',
};

export default function Inspector({ block, issues, onChange }) {
  const textRef = useRef(null);
  const pending = useRef(null);

  useEffect(() => {
    if (!pending.current || !textRef.current || pending.current.blockId !== block?.id) return;
    const [start, end] = pending.current.range;
    pending.current = null;
    textRef.current.focus();
    textRef.current.setSelectionRange(start, end);
  }, [block]);

  if (!block) {
    return (
      <div className="p-5" data-testid="inspector">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6b3f]">Properties</p>
        <h2 className="mt-2 font-serif text-[28px] leading-none text-ink">Nothing selected</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Click a block in the preview to edit it. The form here writes the Slack payload for you.
        </p>
      </div>
    );
  }

  const notes = issues.filter((issue) => issue.blockId === block.id);

  function update(patch) {
    onChange({ ...block, ...patch });
  }

  function applyFormat(mutator) {
    const element = textRef.current;
    const start = element ? element.selectionStart : block.text.length;
    const end = element ? element.selectionEnd : block.text.length;
    const result = mutator(block.text || '', start, end);
    pending.current = { blockId: block.id, range: [result.selectionStart, result.selectionEnd] };
    update({ text: result.next });
  }

  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="inspector">
      <div className="border-b border-line px-5 py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6b3f]">Properties</p>
        <h2 className="mt-1 font-serif text-[28px] leading-none text-ink">{BLOCK_TITLES[block.type]}</h2>
      </div>
      <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
        {notes.length > 0 && (
          <div className="rounded-xl border border-[#ead7a6] bg-[#fff8ea] px-3 py-2 text-sm leading-relaxed text-[#6d5314]" role="status">
            {notes.map((issue) => <p key={issue.message}>{issue.message}</p>)}
          </div>
        )}
        {block.type === 'header' && (
          <>
            <Field
              label="Headline"
              htmlFor="header-text"
              counter={<Counter value={block.text} max={LIMITS.header} />}
              hint="Plain text only, up to 150 characters. This is the large bold line."
            >
              <input
                id="header-text"
                className={inputClass}
                maxLength={LIMITS.header}
                value={block.text}
                onChange={(event) => update({ text: event.target.value })}
              />
            </Field>
            <Field label="Heading level" htmlFor="header-level" hint="Leave this on Standard unless you need a specific heading level.">
              <select
                id="header-level"
                className={inputClass}
                value={block.level || ''}
                onChange={(event) => update({ level: event.target.value ? Number(event.target.value) : undefined })}
              >
                <option value="">Standard</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
              </select>
            </Field>
            <EmojiToggle checked={block.emoji !== false} onChange={(emoji) => update({ emoji })} />
          </>
        )}

        {block.type === 'section' && (
          <>
            <div className="inline-flex rounded-lg border border-line bg-[#f3eee6] p-0.5">
              <button type="button" className={choiceClass(block.textType !== 'plain_text')} onClick={() => update({ textType: 'mrkdwn' })}>Slack formatting</button>
              <button type="button" className={choiceClass(block.textType === 'plain_text')} onClick={() => update({ textType: 'plain_text' })}>Plain text</button>
            </div>
            {block.textType !== 'plain_text' && (
              <div className="flex flex-wrap gap-1" role="toolbar" aria-label="Formatting">
                <FormatButton label="Bold" onClick={() => applyFormat((value, start, end) => wrapSelection(value, start, end, '*', '*', 'bold'))}>B</FormatButton>
                <FormatButton label="Italic" className="italic" onClick={() => applyFormat((value, start, end) => wrapSelection(value, start, end, '_', '_', 'italic'))}>I</FormatButton>
                <FormatButton label="Strikethrough" className="line-through" onClick={() => applyFormat((value, start, end) => wrapSelection(value, start, end, '~', '~', 'strike'))}>S</FormatButton>
                <FormatButton label="Code" onClick={() => applyFormat((value, start, end) => wrapSelection(value, start, end, '`', '`', 'code'))}>Code</FormatButton>
                <FormatButton label="Link" onClick={() => applyFormat((value, start, end) => wrapSelection(value, start, end, '<https://example.com|', '>', 'link text'))}>Link</FormatButton>
                <FormatButton label="List" onClick={() => applyFormat(prefixLines)}>List</FormatButton>
              </div>
            )}
            <Field
              label="Text"
              htmlFor="section-text"
              counter={<Counter value={block.text} max={LIMITS.section} />}
              hint={block.textType === 'plain_text'
                ? 'Shown exactly as typed.'
                : 'Use the buttons above, or type *bold*, _italic_, ~strike~, `code`, and <https://example.com|links>.'}
            >
              <textarea
                id="section-text"
                ref={textRef}
                rows={8}
                maxLength={LIMITS.section}
                className={`${inputClass} resize-y leading-relaxed`}
                value={block.text}
                onChange={(event) => update({ text: event.target.value })}
              />
            </Field>
            {block.textType === 'plain_text' && (
              <EmojiToggle checked={block.emoji !== false} onChange={(emoji) => update({ emoji })} />
            )}
            <AccessoryEditor block={block} update={update} />
            {block.fields?.length > 0 && (
              <FieldsEditor fields={block.fields} onChange={(fields) => update({ fields })} />
            )}
          </>
        )}

        {block.type === 'image' && (
          <>
            <Field label="Title" htmlFor="image-title" counter={<Counter value={block.title} max={LIMITS.title} />} hint="Optional. Leave it blank to show the image on its own.">
              <input id="image-title" className={inputClass} maxLength={LIMITS.title} value={block.title} onChange={(event) => update({ title: event.target.value })} />
            </Field>
            <Field label="Image URL" htmlFor="image-url" counter={<Counter value={block.imageUrl} max={LIMITS.imageUrl} />} hint="A public https link to a PNG, JPG, or GIF.">
              <input id="image-url" className={inputClass} maxLength={LIMITS.imageUrl} value={block.imageUrl} placeholder="https://" onChange={(event) => update({ imageUrl: event.target.value })} />
            </Field>
            <Field label="Alt text" htmlFor="image-alt" counter={<Counter value={block.altText} max={LIMITS.alt} />} hint="Describe the image for someone who cannot see it. Slack requires this.">
              <input id="image-alt" className={inputClass} maxLength={LIMITS.alt} value={block.altText} onChange={(event) => update({ altText: event.target.value })} />
            </Field>
            <div>
              <p className="mb-1.5 text-sm font-semibold text-ink">Preview</p>
              <FitImage src={block.imageUrl} alt={block.altText || 'Image preview'} className="max-h-40 w-full rounded-lg bg-[#f4f4f4] object-contain" />
            </div>
          </>
        )}

        {block.type === 'divider' && (
          <p className="text-sm leading-relaxed text-muted">
            A divider has no settings. It is a single line, useful when a message is getting long.
          </p>
        )}

        {block.type === 'context' && (
          <ContextEditor elements={block.elements || []} onChange={(elements) => update({ elements })} />
        )}

        {block.type === 'actions' && (
          <ActionsEditor buttons={block.buttons || []} onChange={(buttons) => update({ buttons })} />
        )}
      </div>
    </div>
  );
}

function FormatButton({ children, label, onClick, className = '' }) {
  return (
    <button
      type="button"
      aria-label={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={`rounded-md border border-line bg-white px-2 py-1 text-xs font-semibold text-ink hover:border-[#c8ad8a] ${className}`}
    >
      {children}
    </button>
  );
}

function EmojiToggle({ checked, onChange }) {
  return (
    <label className="flex items-start gap-2 text-sm text-ink">
      <input type="checkbox" className="mt-1" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <span>Turn :shortcodes: like :tada: into emoji when Slack posts this.</span>
    </label>
  );
}

function AccessoryEditor({ block, update }) {
  const kind = block.accessory?.kind || 'none';

  function setKind(next) {
    if (next === 'none') {
      update({ accessory: null });
      return;
    }
    if (next === 'button') {
      update({
        accessory: {
          kind: 'button',
          label: 'Open',
          style: 'primary',
          url: '',
          actionId: createActionId(),
          value: '',
        },
      });
      return;
    }
    update({ accessory: { kind: 'image', imageUrl: '', altText: '' } });
  }

  return (
    <div className="space-y-3">
      <Field label="Accessory" htmlFor="accessory-kind" hint="Optional. A button or a small image sits on the right of this section.">
        <select id="accessory-kind" className={inputClass} value={kind} onChange={(event) => setKind(event.target.value)}>
          <option value="none">None</option>
          <option value="button">Button</option>
          <option value="image">Thumbnail</option>
        </select>
      </Field>
      {kind === 'button' && (
        <ButtonFields
          button={block.accessory}
          idPrefix="accessory"
          onChange={(accessory) => update({ accessory: { ...block.accessory, ...accessory } })}
        />
      )}
      {kind === 'image' && (
        <>
          <Field label="Thumbnail URL" htmlFor="thumb-url" hint="Public https link. Slack shows it as a small image.">
            <input
              id="thumb-url"
              className={inputClass}
              value={block.accessory.imageUrl}
              placeholder="https://"
              onChange={(event) => update({ accessory: { ...block.accessory, imageUrl: event.target.value } })}
            />
          </Field>
          <Field label="Thumbnail alt text" htmlFor="thumb-alt">
            <input
              id="thumb-alt"
              className={inputClass}
              maxLength={LIMITS.alt}
              value={block.accessory.altText}
              onChange={(event) => update({ accessory: { ...block.accessory, altText: event.target.value } })}
            />
          </Field>
          <FitImage src={block.accessory.imageUrl} alt={block.accessory.altText || 'Thumbnail preview'} className="h-[72px] w-[72px] rounded-md object-cover" />
        </>
      )}
    </div>
  );
}

function ButtonFields({ button, idPrefix, onChange }) {
  const url = button.url || '';
  return (
    <div className="space-y-3 rounded-xl border border-line bg-white/60 p-3">
      <Field label="Label" htmlFor={`${idPrefix}-label`} counter={<Counter value={button.label} max={LIMITS.button} />}>
        <input
          id={`${idPrefix}-label`}
          className={inputClass}
          maxLength={LIMITS.button}
          value={button.label}
          onChange={(event) => onChange({ label: event.target.value })}
        />
      </Field>
      <Field label="Style" htmlFor={`${idPrefix}-style`} hint="Default is gray, primary is green, and danger is red.">
        <select
          id={`${idPrefix}-style`}
          className={inputClass}
          value={button.style || 'default'}
          onChange={(event) => onChange({ style: event.target.value })}
        >
          <option value="default">Default</option>
          <option value="primary">Primary</option>
          <option value="danger">Danger</option>
        </select>
      </Field>
      <Field
        label="Link"
        htmlFor={`${idPrefix}-url`}
        hint={url && !isHttpUrl(url) ? 'Add a full link starting with https://, or leave this blank.' : 'Optional. Slack opens this link when the button is clicked.'}
      >
        <input
          id={`${idPrefix}-url`}
          className={inputClass}
          maxLength={LIMITS.url}
          value={url}
          placeholder="https://"
          onChange={(event) => onChange({ url: event.target.value })}
        />
      </Field>
    </div>
  );
}

function FieldsEditor({ fields, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold text-ink">Side-by-side fields</p>
      {fields.map((field, index) => (
        <div key={index} className="space-y-2">
          <textarea
            aria-label={`Field ${index + 1}`}
            rows={3}
            maxLength={LIMITS.field}
            className={inputClass}
            value={field.text}
            onChange={(event) => {
              const next = fields.slice();
              next[index] = { ...field, text: event.target.value };
              onChange(next);
            }}
          />
          <button
            type="button"
            className="text-xs font-semibold text-[#8a8175] hover:text-[#e01e5a]"
            onClick={() => onChange(fields.filter((_, fieldIndex) => fieldIndex !== index))}
          >
            Remove field
          </button>
        </div>
      ))}
    </div>
  );
}

function ContextEditor({ elements, onChange }) {
  const textCount = elements.filter((element) => element.kind !== 'image').length;
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        Quiet footer text. Good for an owner, a channel, or a timestamp. Up to 10 pieces.
      </p>
      {elements.map((element, index) => (
        element.kind === 'image' ? (
          <div key={index} className="rounded-xl border border-line bg-white px-3 py-2 text-sm">
            <p className="font-semibold">Image kept from import</p>
            <p className="text-muted">{element.altText || 'No alt text'}</p>
            <button type="button" className="mt-1 text-xs font-semibold text-[#8a8175] hover:text-[#e01e5a]" onClick={() => onChange(elements.filter((_, item) => item !== index))}>Remove</button>
          </div>
        ) : (
          <Field key={index} label={`Line ${index + 1}`} htmlFor={`context-${index}`} counter={<Counter value={element.text} max={LIMITS.context} />}>
            <textarea
              id={`context-${index}`}
              rows={2}
              maxLength={LIMITS.context}
              className={inputClass}
              value={element.text}
              onChange={(event) => {
                const next = elements.slice();
                next[index] = { ...element, text: event.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="text-xs font-semibold text-[#8a8175] hover:text-[#e01e5a] disabled:opacity-40"
              disabled={textCount <= 1 && elements.length <= 1}
              onClick={() => onChange(elements.filter((_, item) => item !== index))}
            >
              Remove line
            </button>
          </Field>
        )
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-[#4A154B] disabled:opacity-40"
        disabled={elements.length >= LIMITS.contextElements}
        onClick={() => onChange([...elements, { kind: 'text', text: 'More detail', textType: 'mrkdwn', emoji: true }])}
      >
        Add a line
      </button>
    </div>
  );
}

function ActionsEditor({ buttons, onChange }) {
  return (
    <div className="space-y-3">
      <p className="text-xs leading-relaxed text-muted">
        A row of buttons. Use one primary button for the action you want people to take.
      </p>
      {buttons.map((button, index) => (
        <div key={button.actionId || index}>
          <div className="mb-1 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">Button {index + 1}</p>
            <button
              type="button"
              className="text-xs font-semibold text-[#8a8175] hover:text-[#e01e5a] disabled:opacity-40"
              disabled={buttons.length <= 1}
              onClick={() => onChange(buttons.filter((_, item) => item !== index))}
            >
              Remove
            </button>
          </div>
          <ButtonFields
            button={button}
            idPrefix={`action-${index}`}
            onChange={(patch) => {
              const next = buttons.slice();
              next[index] = { ...button, ...patch };
              onChange(next);
            }}
          />
        </div>
      ))}
      <button
        type="button"
        className="text-sm font-semibold text-[#4A154B] disabled:opacity-40"
        disabled={buttons.length >= LIMITS.actions}
        onClick={() => onChange([...buttons, { label: 'New button', style: 'default', url: '', actionId: createActionId(), value: '' }])}
      >
        Add a button
      </button>
    </div>
  );
}
