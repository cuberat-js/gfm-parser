/**
 * Inline-level parser for Markdown content
 */

import { ASTNode, TextNode, Emphasis, StrongEmphasis, CodeSpan, Link, Image, Linebreak, Softbreak, HtmlInline, Strikethrough, FootnoteReference } from './ast.js';
import { escapeHtml, normalizeLabel } from './utils.js';

export function parseInlines(
  content: string,
  linkReferences: Map<string, { destination: string; title?: string }>,
  startLine: number = 1,
  footnotes?: Map<string, ASTNode[]>
): ASTNode[] {
  const parser = new InlineParser(content, linkReferences, startLine, footnotes);
  return parser.parse();
}

class InlineParser {
  private content: string;
  private index: number = 0;
  private linkReferences: Map<string, { destination: string; title?: string }>;
  private footnotes: Map<string, ASTNode[]>;
  private startLine: number;

  constructor(content: string, linkReferences: Map<string, { destination: string; title?: string }>, startLine: number = 1, footnotes?: Map<string, ASTNode[]>) {
    this.content = content;
    this.linkReferences = linkReferences;
    this.footnotes = footnotes || new Map();
    this.startLine = startLine;
  }

  parse(): ASTNode[] {
    const nodes: ASTNode[] = [];

    while (this.index < this.content.length) {
      // Handle line breaks
      if (this.content[this.index] === '\n') {
        // Check for hard line break (two or more spaces before newline)
        let spaceCount = 0;
        let tempIndex = this.index - 1;
        while (tempIndex >= 0 && this.content[tempIndex] === ' ' && spaceCount < 2) {
          spaceCount++;
          tempIndex--;
        }

        if (spaceCount >= 2) {
          nodes.push({
            type: 'linebreak',
            structureType: 'inline',
            startLine: this.startLine,
            endLine: this.startLine,
          } as Linebreak);
        } else {
          nodes.push({
            type: 'softbreak',
            structureType: 'inline',
            startLine: this.startLine,
            endLine: this.startLine,
          } as Softbreak);
        }
        this.index++;
        continue;
      }

      // Try code span
      const codeSpan = this.tryCodeSpan();
      if (codeSpan) {
        nodes.push(codeSpan);
        continue;
      }

      // Try emphasis/strong emphasis
      const emphasis = this.tryEmphasis();
      if (emphasis) {
        nodes.push(emphasis);
        continue;
      }

      // Try link
      const link = this.tryLink();
      if (link) {
        nodes.push(link);
        continue;
      }

      // Try image
      const image = this.tryImage();
      if (image) {
        nodes.push(image);
        continue;
      }

      // Try HTML inline
      const htmlInline = this.tryHtmlInline();
      if (htmlInline) {
        nodes.push(htmlInline);
        continue;
      }

      // Try strikethrough
      const strikethrough = this.tryStrikethrough();
      if (strikethrough) {
        nodes.push(strikethrough);
        continue;
      }

      // Try footnote reference
      const footnoteRef = this.tryFootnoteReference();
      if (footnoteRef) {
        nodes.push(footnoteRef);
        continue;
      }

      // Otherwise, collect plain text
      const textNode = this.collectText();
      if (textNode) {
        nodes.push(textNode);
      } else {
        // Safety: if no text collected, skip this character to avoid infinite loop
        this.index++;
      }
    }

    return nodes;
  }

  private tryCodeSpan(): CodeSpan | null {
    if (this.content[this.index] !== '`') return null;

    let backtickCount = 0;
    let tempIndex = this.index;
    while (tempIndex < this.content.length && this.content[tempIndex] === '`') {
      backtickCount++;
      tempIndex++;
    }

    const openingIndex = tempIndex;
    let closingIndex = -1;
    let searchIndex = openingIndex;

    while (searchIndex < this.content.length) {
      if (this.content[searchIndex] === '`') {
        let closingCount = 0;
        let checkIndex = searchIndex;
        while (checkIndex < this.content.length && this.content[checkIndex] === '`') {
          closingCount++;
          checkIndex++;
        }

        if (closingCount === backtickCount) {
          closingIndex = searchIndex;
          break;
        }

        searchIndex = checkIndex;
      } else {
        searchIndex++;
      }
    }

    if (closingIndex === -1) return null;

    const content = this.content.substring(openingIndex, closingIndex)
      .replace(/^ /, '')
      .replace(/ $/, '');

    this.index = closingIndex + backtickCount;

    return {
      type: 'code-span',
      structureType: 'inline',
      startLine: this.startLine,
      endLine: this.startLine,
      content,
    } as CodeSpan;
  }

  private tryEmphasis(): Emphasis | StrongEmphasis | null {
    const char = this.content[this.index];
    if (char !== '*' && char !== '_') return null;

    let emphasisCount = 0;
    let tempIndex = this.index;
    while (tempIndex < this.content.length && this.content[tempIndex] === char) {
      emphasisCount++;
      tempIndex++;
    }

    const minCount = emphasisCount >= 2 ? 2 : 1;
    const actualCount = minCount === 2 ? 2 : 1;
    const openingIndex = this.index + actualCount;

    let closingIndex = -1;
    let searchIndex = openingIndex;

    while (searchIndex < this.content.length) {
      if (this.content[searchIndex] === char) {
        let closingCount = 0;
        let checkIndex = searchIndex;
        while (checkIndex < this.content.length && this.content[checkIndex] === char) {
          closingCount++;
          checkIndex++;
        }

        if (closingCount >= actualCount) {
          closingIndex = searchIndex;
          break;
        }

        searchIndex = checkIndex;
      } else {
        searchIndex++;
      }
    }

    if (closingIndex === -1) return null;

    const innerContent = this.content.substring(openingIndex, closingIndex);
    const children = parseInlines(innerContent, this.linkReferences, this.startLine, this.footnotes);
    this.index = closingIndex + actualCount;

    if (actualCount === 2) {
      return {
        type: 'strong-emphasis',
        structureType: 'inline',
        startLine: this.startLine,
        endLine: this.startLine,
        children,
      } as StrongEmphasis;
    } else {
      return {
        type: 'emphasis',
        structureType: 'inline',
        startLine: this.startLine,
        endLine: this.startLine,
        children,
      } as Emphasis;
    }
  }

  private tryLink(): Link | null {
    if (this.content[this.index] !== '[') return null;

    const openBracket = this.index;
    let closeBracket = -1;
    let bracketDepth = 1;
    let searchIndex = this.index + 1;

    while (searchIndex < this.content.length && bracketDepth > 0) {
      if (this.content[searchIndex] === '[') {
        bracketDepth++;
      } else if (this.content[searchIndex] === ']') {
        bracketDepth--;
        if (bracketDepth === 0) {
          closeBracket = searchIndex;
          break;
        }
      }
      searchIndex++;
    }

    if (closeBracket === -1) return null;

    const linkText = this.content.substring(openBracket + 1, closeBracket);
    let destination = '';
    let title = '';

    // Try inline link
    if (this.content[closeBracket + 1] === '(') {
      let closeParenIndex = closeBracket + 2;
      const linkContentStart = closeParenIndex;

      while (closeParenIndex < this.content.length && this.content[closeParenIndex] !== ')') {
        closeParenIndex++;
      }

      if (closeParenIndex < this.content.length) {
        const linkContent = this.content.substring(linkContentStart, closeParenIndex).trim();
        const linkMatch = linkContent.match(/^(\S+?)(?:\s+["'](.+?)["'])?$/);
        if (linkMatch) {
          destination = linkMatch[1];
          title = linkMatch[2] || '';
          this.index = closeParenIndex + 1;

          const children = parseInlines(linkText, this.linkReferences, this.startLine, this.footnotes);
          return {
            type: 'link',
            structureType: 'inline',
            startLine: this.startLine,
            endLine: this.startLine,
            destination,
            title: title || undefined,
            children,
          } as Link;
        }
      }
    }

    // Try reference link
    const labelMatch = this.content.substring(closeBracket + 1).match(/^\[([^\]]*)\]/);
    if (labelMatch) {
      let refLabel = labelMatch[1] || linkText;
      const normalizedLabel = normalizeLabel(refLabel);
      const ref = this.linkReferences.get(normalizedLabel);

      if (ref) {
        this.index = closeBracket + 1 + labelMatch[0].length;
        const children = parseInlines(linkText, this.linkReferences, this.startLine, this.footnotes);
        return {
          type: 'link',
          structureType: 'inline',
          startLine: this.startLine,
          endLine: this.startLine,
          destination: ref.destination,
          title: ref.title,
          children,
        } as Link;
      }
    }

    return null;
  }

  private tryImage(): Image | null {
    if (this.content[this.index] !== '!' || this.content[this.index + 1] !== '[') return null;

    const openBracket = this.index + 1;
    let closeBracket = -1;
    let bracketDepth = 1;
    let searchIndex = openBracket + 1;

    while (searchIndex < this.content.length && bracketDepth > 0) {
      if (this.content[searchIndex] === '[') {
        bracketDepth++;
      } else if (this.content[searchIndex] === ']') {
        bracketDepth--;
        if (bracketDepth === 0) {
          closeBracket = searchIndex;
          break;
        }
      }
      searchIndex++;
    }

    if (closeBracket === -1) return null;

    const altText = this.content.substring(openBracket + 1, closeBracket);
    let destination = '';

    // Try inline image
    if (this.content[closeBracket + 1] === '(') {
      let closeParenIndex = closeBracket + 2;
      const linkContentStart = closeParenIndex;

      while (closeParenIndex < this.content.length && this.content[closeParenIndex] !== ')') {
        closeParenIndex++;
      }

      if (closeParenIndex < this.content.length) {
        destination = this.content.substring(linkContentStart, closeParenIndex).trim();
        this.index = closeParenIndex + 1;

        return {
          type: 'image',
          structureType: 'inline',
          startLine: this.startLine,
          endLine: this.startLine,
          destination,
          altText,
        } as Image;
      }
    }

    return null;
  }

  private tryHtmlInline(): HtmlInline | null {
    if (this.content[this.index] !== '<') return null;

    const startIndex = this.index;
    let endIndex = this.content.indexOf('>', this.index + 1);

    if (endIndex === -1) return null;

    const htmlContent = this.content.substring(startIndex, endIndex + 1);

    // Check if it's a valid HTML tag or entity
    if (/^<[a-zA-Z\/#!?]/.test(htmlContent)) {
      this.index = endIndex + 1;
      return {
        type: 'html-inline',
        structureType: 'inline',
        startLine: this.startLine,
        endLine: this.startLine,
        content: htmlContent,
      } as HtmlInline;
    }

    return null;
  }

  private tryStrikethrough(): Strikethrough | null {
    if (!this.content.startsWith('~~', this.index)) return null;

    const openingIndex = this.index + 2;
    const closingIndex = this.content.indexOf('~~', openingIndex);

    if (closingIndex === -1) return null;

    const innerContent = this.content.substring(openingIndex, closingIndex);
    const children = parseInlines(innerContent, this.linkReferences, this.startLine, this.footnotes);
    this.index = closingIndex + 2;

    return {
      type: 'strikethrough',
      structureType: 'inline',
      startLine: this.startLine,
      endLine: this.startLine,
      children,
    } as Strikethrough;
  }

  /**
   * Parses footnote references: [^label]
   */
  private tryFootnoteReference(): FootnoteReference | null {
    if (this.content[this.index] !== '[') return null;
    if (this.content[this.index + 1] !== '^') return null;

    let closeBracket = -1;
    for (let i = this.index + 2; i < this.content.length; i++) {
      if (this.content[i] === ']') {
        closeBracket = i;
        break;
      }
    }

    if (closeBracket === -1) return null;

    const label = this.content.substring(this.index + 2, closeBracket);
    if (!label) return null;

    const normalizedLabel = normalizeLabel(label);
    if (!this.footnotes.has(normalizedLabel)) return null;

    this.index = closeBracket + 1;

    return {
      type: 'footnote-reference',
      structureType: 'inline',
      startLine: this.startLine,
      endLine: this.startLine,
      label,
    } as FootnoteReference;
  }

  private collectText(): TextNode | null {
    let endIndex = this.index;

    while (endIndex < this.content.length) {
      const char = this.content[endIndex];
      if (char === '`' || char === '*' || char === '_' || char === '[' || char === '!' || char === '<' || char === '~' || char === '\n') {
        break;
      }
      endIndex++;
    }

    if (endIndex === this.index) return null;

    const content = this.content.substring(this.index, endIndex);
    this.index = endIndex;

    return {
      type: 'text',
      structureType: 'inline',
      startLine: this.startLine,
      endLine: this.startLine,
      content,
    } as TextNode;
  }
}
