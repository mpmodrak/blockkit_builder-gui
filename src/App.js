import { useEffect, useMemo, useRef, useState } from 'react';
import Inspector from './components/Inspector';
import PayloadDialog from './components/PayloadDialog';
import PreviewPane from './components/PreviewPane';
import {
  LIMITS,
  builderUrl,
  compileMessage,
  createBlock,
  duplicateBlock,
  importPayload,
  moveBlock,
  readDragPayload,
  reorder,
  validateSlackPayload,
} from './model/message';
import { TEMPLATES } from './model/templates';

const CATALOG = [
  { type: 'header', name: 'Header', description: 'A large plain-text headline.' },
  { type: 'section', name: 'Section', description: 'Body text, plus an optional button or thumbnail.' },
  { type: 'image', name: 'Image', description: 'A picture with a title and alt text.' },
  { type: 'divider', name: 'Divider', description: 'A quiet line between ideas.' },
  { type: 'context', name: 'Context', description: 'Muted footer or metadata.' },
  { type: 'actions', name: 'Actions', description: 'A row of buttons.' },
];

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    try {
      const element = document.createElement('textarea');
      element.value = text;
      element.setAttribute('readonly', '');
      element.style.position = 'fixed';
      element.style.left = '-9999px';
      document.body.appendChild(element);
      element.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(element);
      return ok;
    } catch (fallbackError) {
      return false;
    }
  }
}

export default function BlockKitBuilder() {
  const [blocks, setBlocks] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [dropIndex, setDropIndexState] = useState(null);
  const [pendingTemplate, setPendingTemplate] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [toast, setToast] = useState('');
  const [copied, setCopied] = useState(false);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('blockkit-theme') === 'light' ? 'light' : 'dark';
    } catch (error) {
      return 'dark';
    }
  });
  const dropIndexRef = useRef(null);
  const suppressClick = useRef(false);
  const toastTimer = useRef(null);

  const compiled = useMemo(() => {
    const result = compileMessage(blocks);
    const json = JSON.stringify(result.payload, null, 2);
    return {
      ...result,
      json,
      url: builderUrl(result.payload),
      valid: validateSlackPayload(result.payload).length === 0,
    };
  }, [blocks]);

  const selected = blocks.find((block) => block.id === selectedId) || null;
  const omitted = compiled.issues.filter((issue) => issue.severity === 'error').length;

  useEffect(() => () => clearTimeout(toastTimer.current), []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('blockkit-theme', theme);
    } catch (error) {
      // The toggle still works for this visit if storage is blocked.
    }
  }, [theme]);

  useEffect(() => {
    if (!dialogOpen) return undefined;
    function onKey(event) {
      if (event.key === 'Escape') setDialogOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dialogOpen]);

  function notify(message) {
    setToast(message);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 2400);
  }

  function setDropIndex(value) {
    dropIndexRef.current = value;
    setDropIndexState(value);
  }

  function clearDrag() {
    setDropIndex(null);
  }

  function selectAndReveal(id) {
    setSelectedId(id);
    window.requestAnimationFrame(() => {
      document.querySelector(`[data-block-id="${id}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }

  function addBlock(type, index = blocks.length) {
    if (blocks.length >= LIMITS.blocks) {
      notify('Slack messages stop at 50 blocks.');
      return;
    }
    const block = createBlock(type);
    if (!block) return;
    const next = blocks.slice();
    next.splice(Math.max(0, Math.min(index, next.length)), 0, block);
    setBlocks(next);
    selectAndReveal(block.id);
  }

  function applyTemplate(template) {
    const next = template.build();
    setBlocks(next);
    setSelectedId(next[0]?.id || null);
    setPendingTemplate(null);
  }

  function requestTemplate(template) {
    if (blocks.length === 0) {
      applyTemplate(template);
      return;
    }
    setPendingTemplate(template.id);
  }

  function updateBlock(next) {
    setBlocks((current) => current.map((block) => (block.id === next.id ? next : block)));
  }

  function deleteBlock(id) {
    const index = blocks.findIndex((block) => block.id === id);
    const next = blocks.filter((block) => block.id !== id);
    setBlocks(next);
    if (selectedId === id) {
      const neighbor = next[Math.min(index, next.length - 1)];
      setSelectedId(neighbor?.id || null);
    }
  }

  function duplicateAt(index) {
    if (blocks.length >= LIMITS.blocks) {
      notify('Slack messages stop at 50 blocks.');
      return;
    }
    const copy = duplicateBlock(blocks[index]);
    const next = blocks.slice();
    next.splice(index + 1, 0, copy);
    setBlocks(next);
    selectAndReveal(copy.id);
  }

  function onPaletteDragStart(event, type) {
    event.dataTransfer.setData('text/plain', `new:${type}`);
    event.dataTransfer.effectAllowed = 'copy';
    suppressClick.current = true;
  }

  function onPaletteDragEnd() {
    window.setTimeout(() => {
      suppressClick.current = false;
    }, 0);
    clearDrag();
  }

  function onPaletteClick(type) {
    if (suppressClick.current) {
      suppressClick.current = false;
      return;
    }
    addBlock(type);
  }

  function onBlockDragStart(event, index) {
    event.dataTransfer.setData('text/plain', `move:${index}`);
    event.dataTransfer.effectAllowed = 'move';
    event.stopPropagation();
  }

  function onRowDragOver(event, index) {
    event.preventDefault();
    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    const next = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
    if (dropIndexRef.current !== next) setDropIndex(next);
  }

  function onCanvasDragOver(event) {
    event.preventDefault();
    if (dropIndexRef.current === null) setDropIndex(blocks.length);
  }

  function onDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    const drag = readDragPayload(event.dataTransfer.getData('text/plain'));
    const index = dropIndexRef.current === null ? blocks.length : dropIndexRef.current;
    clearDrag();
    if (!drag) return;
    if (drag.kind === 'new') {
      addBlock(drag.type, index);
      return;
    }
    setBlocks(reorder(blocks, drag.index, index));
  }

  async function onCopy() {
    const ok = await copyText(compiled.json);
    if (!ok) {
      notify('Could not copy. Select the payload and copy it manually.');
      return;
    }
    setCopied(true);
    notify('Copied JSON to the clipboard.');
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => {
      setCopied(false);
      setToast('');
    }, 2000);
  }

  function onImport() {
    const result = importPayload(importText);
    if (!result.ok) {
      setImportError(result.error);
      return;
    }
    setImportError('');
    setBlocks(result.blocks);
    setSelectedId(result.blocks[0]?.id || null);
    setDialogOpen(false);
    const notes = [];
    if (result.skipped.length) notes.push(`Skipped ${result.skipped.join(', ')}.`);
    if (result.warnings.length) notes.push(result.warnings[0]);
    notify(notes.length ? `Loaded ${result.blocks.length} blocks. ${notes.join(' ')}` : `Loaded ${result.blocks.length} blocks.`);
  }

  const statusLabel = !compiled.valid
    ? 'Payload needs a fix'
    : omitted
      ? `Valid payload · ${omitted} left out`
      : 'Valid payload';

  return (
    <div className="flex h-screen min-h-0 min-w-[1180px] flex-col text-ink">
      <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-line px-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center bg-accent font-mono text-sm font-bold text-accentink">B</div>
          <div>
            <h1 className="text-[22px] font-semibold leading-none tracking-tight">Block Kit Builder</h1>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">Visual messages for Slack</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex border border-line" role="group" aria-label="Color theme">
            <button
              type="button"
              data-testid="theme-light"
              aria-pressed={theme === 'light'}
              onClick={() => setTheme('light')}
              className={`h-9 px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${theme === 'light' ? 'bg-accent text-accentink' : 'text-muted hover:text-ink'}`}
            >
              Light
            </button>
            <button
              type="button"
              data-testid="theme-dark"
              aria-pressed={theme === 'dark'}
              onClick={() => setTheme('dark')}
              className={`h-9 border-l border-line px-3 font-mono text-[10px] font-bold uppercase tracking-[0.14em] ${theme === 'dark' ? 'bg-accent text-accentink' : 'text-muted hover:text-ink'}`}
            >
              Dark
            </button>
          </div>
          <span
            className={`hidden border px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.14em] xl:inline-flex ${compiled.valid ? 'border-line text-muted' : 'border-danger text-danger'}`}
            data-testid="payload-status"
          >
            {statusLabel}
          </span>
          <button
            type="button"
            onClick={() => { setDialogOpen(true); setImportError(''); }}
            data-testid="open-import"
            className="inline-flex h-9 items-center border border-line bg-panel px-3 text-sm font-semibold hover:border-accent"
          >
            Import JSON
          </button>
          <a
            href={compiled.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open in Slack Block Kit Builder"
            data-testid="open-in-slack"
            className="inline-flex h-9 items-center border border-line bg-panel px-3 text-sm font-semibold hover:border-accent"
          >
            Open in Slack
          </a>
          <button
            type="button"
            onClick={onCopy}
            data-testid="copy-json"
            className="inline-flex h-9 items-center bg-accent px-3 text-sm font-semibold text-accentink hover:brightness-110"
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </button>
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_340px] gap-3 p-3" data-testid="stage">
        <aside aria-label="Block palette" className="flex min-h-0 flex-col overflow-hidden border border-line bg-panel">
          <div className="flex-1 space-y-6 overflow-y-auto p-4">
            <div>
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Start</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted">Pick a template, or add a block and edit it on the right.</p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                {TEMPLATES.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    data-testid={`template-${template.id}`}
                    onClick={() => requestTemplate(template)}
                    className={`border px-2.5 py-2 text-left ${pendingTemplate === template.id ? 'border-accent bg-panel2' : 'border-line bg-panel hover:border-accent'}`}
                  >
                    <span className="block text-sm font-semibold leading-tight">{template.name}</span>
                    <span className="mt-1 block text-[11px] leading-snug text-muted">{template.description}</span>
                  </button>
                ))}
              </div>
              {pendingTemplate && (
                <div className="mt-3 border border-accent bg-note p-3 text-noteink">
                  <p className="text-sm">Replace the message you are editing?</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      data-testid="confirm-replace"
                      className="bg-accent px-2.5 py-1.5 text-xs font-semibold text-accentink"
                      onClick={() => applyTemplate(TEMPLATES.find((template) => template.id === pendingTemplate))}
                    >
                      Replace
                    </button>
                    <button type="button" className="px-2.5 py-1.5 text-xs font-semibold" onClick={() => setPendingTemplate(null)}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div>
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Blocks</h2>
              <div className="mt-3 space-y-2">
                {CATALOG.map((item) => (
                  <div
                    key={item.type}
                    role="button"
                    tabIndex={0}
                    draggable
                    data-testid={`palette-${item.type}`}
                    aria-label={`Add ${item.name} block`}
                    onClick={() => onPaletteClick(item.type)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        addBlock(item.type);
                      }
                    }}
                    onDragStart={(event) => onPaletteDragStart(event, item.type)}
                    onDragEnd={onPaletteDragEnd}
                    className="cursor-grab border border-line bg-panel px-3 py-2.5 outline-none hover:border-accent focus-visible:border-accent active:cursor-grabbing"
                  >
                    <span className="block text-sm font-semibold">{item.name}</span>
                    <span className="mt-0.5 block text-xs leading-snug text-muted">{item.description}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <main aria-label="Slack preview" className="min-h-0 overflow-hidden border border-line bg-panel">
          <PreviewPane
            blocks={blocks}
            views={compiled.views}
            issues={compiled.issues}
            selectedId={selectedId}
            dropIndex={dropIndex}
            onSelect={setSelectedId}
            onMove={(index, direction) => setBlocks(moveBlock(blocks, index, direction))}
            onDuplicate={duplicateAt}
            onDelete={deleteBlock}
            onBlockDragStart={onBlockDragStart}
            onBlockDragEnd={clearDrag}
            onRowDragOver={onRowDragOver}
            onCanvasDragOver={onCanvasDragOver}
            onDrop={onDrop}
          />
        </main>

        <aside aria-label="Properties" className="min-h-0 overflow-hidden border border-line bg-panel">
          <Inspector key={theme} block={selected} issues={compiled.issues} onChange={updateBlock} />
        </aside>
      </div>

      {dialogOpen && (
        <PayloadDialog
          json={compiled.json}
          builder={compiled.url}
          importText={importText}
          importError={importError}
          onImportText={(value) => { setImportText(value); setImportError(''); }}
          onImport={onImport}
          onCopy={onCopy}
          onClose={() => setDialogOpen(false)}
          copied={copied}
        />
      )}

      <div role="status" aria-live="polite" className="pointer-events-none fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
        {toast && (
          <div data-testid="toast" className="border border-accent bg-accent px-4 py-2 font-mono text-xs font-bold uppercase tracking-[0.12em] text-accentink">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
