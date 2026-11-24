export default function PayloadDialog({
  json,
  builder,
  importText,
  importError,
  onImportText,
  onImport,
  onCopy,
  onClose,
  copied,
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4 sm:p-6" style={{ background: 'var(--overlay)' }} onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payload-title"
        data-testid="payload-dialog"
        className="flex h-[min(760px,calc(100vh-32px))] w-full max-w-5xl flex-col overflow-hidden border border-line bg-panel"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-muted">Export and import</p>
            <h2 id="payload-title" className="mt-1 text-[28px] font-semibold leading-none text-ink">Slack payload</h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={builder}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Slack Block Kit Builder"
              data-testid="dialog-open-in-slack"
              className="inline-flex h-9 items-center border border-line bg-panel px-3 text-sm font-semibold text-ink hover:border-accent"
            >
              Open in Slack
            </a>
            <button
              type="button"
              onClick={onCopy}
              data-testid="dialog-copy-json"
              className="inline-flex h-9 items-center bg-accent px-3 text-sm font-semibold text-accentink hover:brightness-110"
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center px-3 text-sm font-semibold text-muted hover:text-ink" aria-label="Close payload">
              Close
            </button>
          </div>
        </div>
        <div className="grid min-h-0 min-w-0 flex-1 gap-4 p-4 lg:grid-cols-2">
          <section className="flex min-h-0 min-w-0 flex-col">
            <div className="mb-2 flex items-baseline justify-between">
              <h3 className="text-sm font-semibold text-ink">Live JSON</h3>
              <p className="text-xs text-muted">Editor ids stay out of this.</p>
            </div>
            <pre
              data-testid="payload-json"
              className="min-h-0 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words border border-line bg-desk p-4 font-mono text-[12.5px] leading-relaxed text-ink"
            >
              {json}
            </pre>
          </section>
          <section className="flex min-h-0 min-w-0 flex-col">
            <h3 className="mb-2 text-sm font-semibold text-ink">Import JSON</h3>
            <textarea
              data-testid="import-json"
              value={importText}
              onChange={(event) => onImportText(event.target.value)}
              spellCheck={false}
              placeholder={'{ "blocks": [ { "type": "section", "text": { "type": "mrkdwn", "text": "Hello *team*" } } ] }'}
              className="min-h-0 flex-1 resize-none border border-line bg-field p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-accent"
            />
            {importError && (
              <p role="alert" className="mt-2 text-sm text-danger" data-testid="import-error">{importError}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-muted">Paste a payload from Slack. Unsupported blocks are skipped.</p>
              <button
                type="button"
                data-testid="load-json"
                onClick={onImport}
                disabled={!importText.trim()}
                className="inline-flex h-9 shrink-0 items-center bg-accent px-3 text-sm font-semibold text-accentink disabled:opacity-40"
              >
                Load into editor
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
