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
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#211c16]/45 p-4 sm:p-6" onMouseDown={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="payload-title"
        data-testid="payload-dialog"
        className="flex h-[min(760px,calc(100vh-32px))] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-[#fbf7f1] shadow-[0_24px_80px_rgba(33,28,22,0.28)]"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#8d6b3f]">Export and import</p>
            <h2 id="payload-title" className="mt-1 font-serif text-[28px] leading-none text-ink">Slack payload</h2>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={builder}
              target="_blank"
              rel="noreferrer"
              aria-label="Open in Slack Block Kit Builder"
              data-testid="dialog-open-in-slack"
              className="inline-flex h-9 items-center rounded-lg border border-line bg-white px-3 text-sm font-semibold text-ink hover:border-[#c8ad8a]"
            >
              Open in Slack
            </a>
            <button
              type="button"
              onClick={onCopy}
              data-testid="dialog-copy-json"
              className="inline-flex h-9 items-center rounded-lg bg-[#4A154B] px-3 text-sm font-semibold text-white hover:bg-[#3d1140]"
            >
              {copied ? 'Copied' : 'Copy JSON'}
            </button>
            <button type="button" onClick={onClose} className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-semibold text-muted hover:text-ink" aria-label="Close payload">
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
              className="min-h-0 min-w-0 flex-1 overflow-auto whitespace-pre-wrap break-words rounded-xl bg-[#241c17] p-4 font-mono text-[12.5px] leading-relaxed text-[#f6efe4]"
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
              className="min-h-0 flex-1 resize-none rounded-xl border border-line bg-white p-4 font-mono text-[12.5px] leading-relaxed text-ink outline-none focus:border-[#4A154B]"
            />
            {importError && (
              <p role="alert" className="mt-2 text-sm text-[#9f1239]" data-testid="import-error">{importError}</p>
            )}
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-xs leading-relaxed text-muted">Paste a payload from Slack. Unsupported blocks are skipped.</p>
              <button
                type="button"
                data-testid="load-json"
                onClick={onImport}
                disabled={!importText.trim()}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-[#211c16] px-3 text-sm font-semibold text-[#f6efe4] disabled:opacity-40"
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
