import { decorateEmoji, parseMrkdwn } from '../model/mrkdwn';

function Inline({ nodes }) {
  return nodes.map((node, index) => {
    const key = `${node.type}-${index}`;
    if (node.type === 'text') return <span key={key}>{decorateEmoji(node.text)}</span>;
    if (node.type === 'break') return <br key={key} />;
    if (node.type === 'code') {
      return (
        <code
          key={key}
          className="mx-0.5 rounded-sm border border-[#ebebeb] bg-[#f7f7f7] px-1 py-px font-mono text-[12px] text-[#e01e5a]"
        >
          {node.text}
        </code>
      );
    }
    if (node.type === 'bold') {
      return <strong key={key} className="font-bold"><Inline nodes={node.children} /></strong>;
    }
    if (node.type === 'italic') {
      return <em key={key} className="italic"><Inline nodes={node.children} /></em>;
    }
    if (node.type === 'strike') {
      return <s key={key} className="line-through"><Inline nodes={node.children} /></s>;
    }
    if (node.type === 'mention') {
      return (
        <span key={key} className="rounded bg-[#e7f5fa] px-1 font-medium text-[#1264a3]">
          {decorateEmoji(node.text)}
        </span>
      );
    }
    if (node.type === 'link') {
      return (
        <a
          key={key}
          href={node.href}
          target="_blank"
          rel="noreferrer"
          className="text-[#1264a3] hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          <Inline nodes={node.children} />
        </a>
      );
    }
    return null;
  });
}

function Block({ block }) {
  if (block.type === 'code') {
    return (
      <pre className="my-1 overflow-x-auto rounded-md border border-[#ebebeb] bg-[#f7f7f7] px-3 py-2 font-mono text-[12px] leading-relaxed text-[#1d1c1d]">
        {block.text}
      </pre>
    );
  }
  if (block.type === 'quote') {
    return (
      <blockquote className="my-1 border-l-4 border-[#e8e8e8] pl-3 text-[#1d1c1d]">
        {block.children.map((child, index) => <Block key={index} block={child} />)}
      </blockquote>
    );
  }
  if (block.type === 'list') {
    const Tag = block.ordered ? 'ol' : 'ul';
    return (
      <Tag className={`my-1 space-y-0.5 pl-5 ${block.ordered ? 'list-decimal' : 'list-disc'}`}>
        {block.items.map((item, index) => (
          <li key={index}><Inline nodes={item} /></li>
        ))}
      </Tag>
    );
  }
  return (
    <p className="my-0">
      <Inline nodes={block.children || []} />
    </p>
  );
}

export default function RichText({ text, plain = false }) {
  if (plain) {
    return <span className="whitespace-pre-wrap">{decorateEmoji(text)}</span>;
  }
  const blocks = parseMrkdwn(text);
  if (blocks.length === 0) return null;
  return (
    <div className="space-y-2">
      {blocks.map((block, index) => <Block key={index} block={block} />)}
    </div>
  );
}
