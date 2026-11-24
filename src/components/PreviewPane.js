import FitImage from './FitImage';
import RichText from './RichText';

const BLOCK_LABELS = {
  header: 'Header',
  section: 'Section',
  image: 'Image',
  divider: 'Divider',
  context: 'Context',
  actions: 'Actions',
};

function slackButtonClass(style) {
  const base = 'inline-flex h-8 items-center rounded-md border bg-white px-3 text-[15px] font-bold leading-none';
  if (style === 'primary') return `${base} border-[#b7ddd0] text-[#007a5a]`;
  if (style === 'danger') return `${base} border-[#f3c1d0] text-[#e01e5a]`;
  return `${base} border-[#d0d0d0] text-[#1d1c1d]`;
}

function SlackButton({ element }) {
  return (
    <button type="button" className={slackButtonClass(element.style)} title={element.url || undefined}>
      {element.text?.text}
    </button>
  );
}

function SlackImage({ slack, thumb = false }) {
  const className = thumb
    ? 'h-[72px] w-[72px] shrink-0 rounded-md object-cover'
    : 'max-h-[220px] max-w-full rounded-lg object-contain';
  return (
    <FitImage
      src={slack.image_url || ''}
      alt={slack.alt_text || ''}
      className={className}
    />
  );
}

function SlackBlock({ slack }) {
  if (!slack) return null;

  if (slack.type === 'header') {
    const size = { 1: 'text-[22px]', 2: 'text-[18px]', 3: 'text-[16px]', 4: 'text-[15px]' }[slack.level] || 'text-[18px]';
    return (
      <div role="heading" aria-level={slack.level || 2} className={`${size} font-black leading-snug text-[#1d1c1d]`}>
        {slack.text?.text}
      </div>
    );
  }

  if (slack.type === 'divider') {
    return <hr className="my-1 border-0 border-t border-[#e8e8e8]" />;
  }

  if (slack.type === 'image') {
    return (
      <figure>
        {slack.title?.text && (
          <figcaption className="mb-1 text-[15px] font-bold text-[#1d1c1d]">{slack.title.text}</figcaption>
        )}
        <SlackImage slack={slack} />
      </figure>
    );
  }

  if (slack.type === 'context') {
    return (
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] leading-snug text-[#616061]">
        {slack.elements.map((element, index) => (
          element.type === 'image'
            ? <SlackImage key={index} slack={element} thumb />
            : (
              <RichText
                key={index}
                text={element.text}
                plain={element.type === 'plain_text'}
              />
            )
        ))}
      </div>
    );
  }

  if (slack.type === 'actions') {
    return (
      <div className="flex flex-wrap gap-2">
        {slack.elements.map((element, index) => <SlackButton key={index} element={element} />)}
      </div>
    );
  }

  const body = (
    <div>
      {slack.text && (
        <RichText text={slack.text.text} plain={slack.text.type === 'plain_text'} />
      )}
      {slack.fields?.length > 0 && (
        <div className={`grid grid-cols-2 gap-x-4 gap-y-2 ${slack.text ? 'mt-2' : ''}`}>
          {slack.fields.map((field, index) => (
            <RichText key={index} text={field.text} plain={field.type === 'plain_text'} />
          ))}
        </div>
      )}
    </div>
  );

  if (!slack.accessory) return body;

  return (
    <div className="flex items-start gap-3">
      <div className="min-w-0 flex-1">{body}</div>
      {slack.accessory.type === 'button'
        ? <SlackButton element={slack.accessory} />
        : <SlackImage slack={slack.accessory} thumb />}
    </div>
  );
}

function ToolbarButton({ children, onClick, disabled, label, tone = 'default' }) {
  const toneClass = tone === 'danger'
    ? 'hover:bg-[#fdecef] hover:text-[#e01e5a]'
    : 'hover:bg-[#eef1f8] hover:text-[#040810]';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={`px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-[#3d4a63] disabled:cursor-not-allowed disabled:opacity-35 ${toneClass}`}
    >
      {children}
    </button>
  );
}

export default function PreviewPane({
  blocks,
  views,
  issues,
  selectedId,
  dropIndex,
  onSelect,
  onMove,
  onDuplicate,
  onDelete,
  onBlockDragStart,
  onBlockDragEnd,
  onRowDragOver,
  onCanvasDragOver,
  onDrop,
}) {
  return (
    <div
      className="flex h-full min-h-0 flex-col"
      onDragOver={onCanvasDragOver}
      onDrop={onDrop}
      data-testid="slack-canvas"
    >
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted">Live preview</p>
            <p className="mt-1 text-[28px] font-semibold leading-none tracking-tight text-ink"># announcements</p>
          </div>
          <p className="pb-1 text-sm text-muted" data-testid="preview-count">
            {blocks.length === 1 ? '1 block' : `${blocks.length} blocks`}
          </p>
        </div>

        <article className="border border-[#e8e8e8] bg-white px-4 py-3 text-[#1d1c1d]" style={{ colorScheme: 'light' }}>
          <div className="flex gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center bg-[#2432ff] font-mono text-sm font-bold text-white" aria-hidden="true">
              N
            </div>
            <div className="min-w-0 flex-1 font-slack text-[#1d1c1d]">
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-black text-[#1d1c1d]">Northwind</span>
                <span className="rounded border border-[#e2e2e2] bg-[#f8f8f8] px-1 py-px text-[10px] font-bold tracking-wide text-[#616061]">APP</span>
                <span className="text-xs text-[#616061]">9:41 AM</span>
              </div>

              {blocks.length === 0 ? (
                <div className="mt-3 rounded-lg border border-dashed border-[#e6e6e6] px-4 py-8 text-center">
                  <p className="text-[15px] font-bold text-[#1d1c1d]">This message is empty</p>
                  <p className="mt-1 text-sm text-[#616061]">
                    Choose a template, or drag a block here. Nothing is posted to Slack.
                  </p>
                </div>
              ) : (
                <div className="mt-1 space-y-2">
                  {blocks.map((block, index) => {
                    const selected = block.id === selectedId;
                    const view = views[index];
                    const problem = issues.find((issue) => issue.blockId === block.id && issue.severity === 'error');
                    return (
                      <div key={block.id}>
                        {dropIndex === index && <div className="mb-2 h-0.5 bg-[#2432ff]" data-testid="drop-indicator" />}
                        <div
                          role="group"
                          tabIndex={0}
                          aria-label={BLOCK_LABELS[block.type]}
                          data-testid="block-row"
                          data-block-type={block.type}
                          data-block-id={block.id}
                          onClick={() => onSelect(block.id)}
                          onKeyDown={(event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onSelect(block.id);
                            }
                          }}
                          onDragOver={(event) => onRowDragOver(event, index)}
                          className={`outline-none ${selected ? 'ring-2 ring-[#2432ff] ring-offset-2 ring-offset-white' : 'hover:bg-[#fafafa]'}`}
                        >
                          {selected && (
                            <div className="mb-1.5 flex items-center justify-between gap-2 px-1">
                              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#5c6b86]">
                                {BLOCK_LABELS[block.type]}
                              </span>
                              <div className="flex items-center border border-[#d5def2] bg-white">
                                <button
                                  type="button"
                                  draggable
                                  aria-label={`Drag to reorder ${BLOCK_LABELS[block.type]}`}
                                  data-testid="drag-handle"
                                  className="cursor-grab px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide text-[#3d4a63] active:cursor-grabbing"
                                  onClick={(event) => event.stopPropagation()}
                                  onDragStart={(event) => onBlockDragStart(event, index)}
                                  onDragEnd={onBlockDragEnd}
                                >
                                  Move
                                </button>
                                <ToolbarButton label="Move up" disabled={index === 0} onClick={(event) => { event.stopPropagation(); onMove(index, -1); }}>Up</ToolbarButton>
                                <ToolbarButton label="Move down" disabled={index === blocks.length - 1} onClick={(event) => { event.stopPropagation(); onMove(index, 1); }}>Down</ToolbarButton>
                                <ToolbarButton label="Duplicate block" onClick={(event) => { event.stopPropagation(); onDuplicate(index); }}>Duplicate</ToolbarButton>
                                <ToolbarButton label="Delete block" tone="danger" onClick={(event) => { event.stopPropagation(); onDelete(block.id); }}>Delete</ToolbarButton>
                              </div>
                            </div>
                          )}
                          <div className="px-1 py-0.5">
                            {view?.slack ? (
                              <SlackBlock slack={view.slack} />
                            ) : (
                              <div className="border border-dashed border-[#2432ff] bg-[#f4f6ff] px-3 py-2 text-sm text-[#2432ff]" data-testid="omitted-block">
                                {problem?.message || 'This block is not in the Slack payload yet.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {dropIndex === blocks.length && <div className="h-0.5 bg-[#2432ff]" data-testid="drop-indicator" />}
                </div>
              )}
            </div>
          </div>
        </article>
        <p className="mx-auto mt-3 max-w-[640px] text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
          Preview renders Slack formatting, buttons, and images. Copy the payload when it looks right.
        </p>
      </div>
    </div>
  );
}
