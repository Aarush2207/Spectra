import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
  isUser?: boolean;
}

/**
 * Lightweight, safe Markdown renderer for chat messages.
 * Formats headings, bullet lists, numbered lists, blockquotes, code blocks,
 * bold, italic, inline code, and links into clean semantic React elements.
 */
export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  className = '',
  isUser = false,
}) => {
  // If message from user, keep simple whitespace-pre-wrap unless contains markdown
  if (isUser && !content.includes('**') && !content.includes('```') && !content.includes('- ')) {
    return <div className={`whitespace-pre-wrap ${className}`}>{content}</div>;
  }

  // Parse inline markdown tokens into React nodes
  const parseInline = (text: string): React.ReactNode[] => {
    // Regex for bold, italic, inline code, links
    const tokens: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    // Pattern for inline elements:
    // 1: `code`
    // 2: **bold** or __bold__
    // 3: *italic* or _italic_
    // 4: [link](url)
    const inlineRegex = /(`([^`]+)`)|(\*\*([^*]+)\*\*|__([^_]+)__)|(\*([^*]+)\*|_([^_]+)_)|(\[([^\]]+)\]\(([^)]+)\))/g;

    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = inlineRegex.exec(remaining)) !== null) {
      // Append text before match
      if (match.index > lastIndex) {
        tokens.push(remaining.substring(lastIndex, match.index));
      }

      if (match[2] !== undefined) {
        // Inline code
        tokens.push(
          <code
            key={`code-${keyIdx++}`}
            className="px-1.5 py-0.5 rounded bg-[#f2f2f1] text-[#8055e8] font-mono text-[0.88em] border border-[#a9a9a6]/30"
          >
            {match[2]}
          </code>
        );
      } else if (match[4] !== undefined || match[5] !== undefined) {
        // Bold
        tokens.push(
          <strong key={`bold-${keyIdx++}`} className="font-semibold text-inherit">
            {match[4] || match[5]}
          </strong>
        );
      } else if (match[7] !== undefined || match[8] !== undefined) {
        // Italic
        tokens.push(
          <em key={`italic-${keyIdx++}`} className="italic text-inherit">
            {match[7] || match[8]}
          </em>
        );
      } else if (match[10] !== undefined && match[11] !== undefined) {
        // Link
        const url = match[11];
        const isSafe = url.startsWith('http://') || url.startsWith('https://') || url.startsWith('mailto:');
        tokens.push(
          <a
            key={`link-${keyIdx++}`}
            href={isSafe ? url : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#8055e8] underline underline-offset-2 hover:opacity-80 transition-opacity"
          >
            {match[10]}
          </a>
        );
      }

      lastIndex = inlineRegex.lastIndex;
    }

    if (lastIndex < remaining.length) {
      tokens.push(remaining.substring(lastIndex));
    }

    return tokens.length > 0 ? tokens : [text];
  };

  // Split lines into blocks (headings, code blocks, lists, quotes, paragraphs)
  const lines = content.split('\n');
  const blocks: React.ReactNode[] = [];
  let currentList: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  const flushList = (key: string) => {
    if (!currentList) return;
    const ListTag = currentList.type;
    blocks.push(
      <ListTag
        key={key}
        className={`my-2 space-y-1 pl-5 ${
          currentList.type === 'ul' ? 'list-disc' : 'list-decimal'
        }`}
      >
        {currentList.items.map((item, idx) => (
          <li key={idx} className="leading-relaxed">
            {parseInline(item)}
          </li>
        ))}
      </ListTag>
    );
    currentList = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Code blocks ```
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        // End code block
        blocks.push(
          <pre
            key={`codeblock-${i}`}
            className="my-3 p-3 rounded-xl bg-[#1d1d1d] text-[#e0e0e0] font-mono text-xs overflow-x-auto border border-white/10"
          >
            <code>{codeBlockLines.join('\n')}</code>
          </pre>
        );
        inCodeBlock = false;
        codeBlockLines = [];
        codeBlockLang = '';
      } else {
        flushList(`list-before-code-${i}`);
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Unordered list item (- or *)
    const ulMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
    if (ulMatch) {
      if (currentList && currentList.type !== 'ul') {
        flushList(`flush-ol-${i}`);
      }
      if (!currentList) {
        currentList = { type: 'ul', items: [] };
      }
      currentList.items.push(ulMatch[2]);
      continue;
    }

    // Ordered list item (1. 2. etc.)
    const olMatch = line.match(/^(\s*)\d+\.\s+(.+)$/);
    if (olMatch) {
      if (currentList && currentList.type !== 'ol') {
        flushList(`flush-ul-${i}`);
      }
      if (!currentList) {
        currentList = { type: 'ol', items: [] };
      }
      currentList.items.push(olMatch[2]);
      continue;
    }

    // Flush any ongoing list if we hit non-list line
    if (currentList) {
      flushList(`list-${i}`);
    }

    // Empty line / spacer
    if (line.trim() === '') {
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      blocks.push(
        <h4 key={`h3-${i}`} className="font-bold text-sm mt-3 mb-1 text-inherit">
          {parseInline(line.substring(4))}
        </h4>
      );
    } else if (line.startsWith('## ')) {
      blocks.push(
        <h3 key={`h2-${i}`} className="font-bold text-base mt-4 mb-1.5 text-inherit">
          {parseInline(line.substring(3))}
        </h3>
      );
    } else if (line.startsWith('# ')) {
      blocks.push(
        <h2 key={`h1-${i}`} className="font-bold text-lg mt-4 mb-2 text-inherit">
          {parseInline(line.substring(2))}
        </h2>
      );
    } else if (line.startsWith('> ')) {
      // Blockquote
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 border-l-2 border-[#8055e8] italic text-inherit/90"
        >
          {parseInline(line.substring(2))}
        </blockquote>
      );
    } else {
      // Regular paragraph
      blocks.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed">
          {parseInline(line)}
        </p>
      );
    }
  }

  // Final flush if trailing list
  if (currentList) {
    flushList('final-list');
  }

  // Trailing code block if unclosed
  if (inCodeBlock && codeBlockLines.length > 0) {
    blocks.push(
      <pre
        key="unclosed-code"
        className="my-3 p-3 rounded-xl bg-[#1d1d1d] text-[#e0e0e0] font-mono text-xs overflow-x-auto border border-white/10"
      >
        <code>{codeBlockLines.join('\n')}</code>
      </pre>
    );
  }

  return <div className={`space-y-1 ${className}`}>{blocks}</div>;
};
