/**
 * Block-level parser for Markdown documents
 */

import {
  ASTNode,
  Document,
  Paragraph,
  Heading,
  ThematicBreak,
  FencedCodeBlock,
  IndentedCodeBlock,
  HtmlBlock,
  BlockQuote,
  Alert,
  AlertType,
  UnorderedList,
  OrderedList,
  ListItem,
  LinkReferenceDefinition,
  FootnoteDefinition,
} from "./ast.js";
import { LineInfo, parseLines, stripIndent, normalizeLabel } from "./utils.js";
import { parseInlines } from "./inline-parser.js";

/**
 * Parses the Markdown document into an AST of block-level elements.
 */
export class BlockParser {
  private lines: LineInfo[];
  private index: number = 0;
  private linkReferences: Map<string, { destination: string; title?: string }> =
    new Map();
  private footnotes: Map<string, ASTNode[]> = new Map();
  public getFootnotes(): Map<string, ASTNode[]> {
    return this.footnotes;
  }

  /**
   * Initializes the block parser with the given Markdown content.
   * @param {string} markdown - The Markdown content to parse.
   */
  constructor(markdown: string) {
    this.lines = parseLines(markdown);
  }

  /**
   * Parses the entire Markdown document and returns the root Document node.
   * @returns{Document} - The root Document node of the parsed AST.
   */
  parse(): Document {
    // First pass: collect all footnote definitions
    this.collectFootnotes();
    
    // Reset index for main parsing
    this.index = 0;
    
    const children: ASTNode[] = [];

    while (this.index < this.lines.length) {
      if (this.lines[this.index].isBlank) {
        this.index++;
        continue;
      }

      const node = this.parseBlock();
      if (node) {
        children.push(node);
      }
    }

    return {
      type: "document",
      structureType: "container-block",
      startLine: this.lines.length > 0 ? 1 : 0,
      endLine: this.lines.length,
      children,
    };
  }

  /**
   * First pass: collects all footnote definitions from the document.
   */
  private collectFootnotes(): void {
    const tempIndex = this.index;
    this.index = 0;
    
    while (this.index < this.lines.length) {
      if (this.lines[this.index].isBlank) {
        this.index++;
        continue;
      }

      const footnote = this.parseFootnoteDefinition();
      if (!footnote) {
        // Skip this line if it's not a footnote definition
        this.index++;
      }
      // If it is a footnote, parseFootnoteDefinition already advanced the index
    }
    
    this.index = tempIndex;
  }

  private parseBlock(): ASTNode | null {
    if (this.index >= this.lines.length) return null;

    const line = this.lines[this.index];
    if (line.isBlank) return null;

    // Try to parse different block types
    let node: ASTNode | null = this.parseATXHeading();
    if (node) return node;

    node = this.parseThematicBreak();
    if (node) return node;

    node = this.parseFencedCodeBlock();
    if (node) return node;

    node = this.parseHtmlBlock();
    if (node) return node;

    node = this.parseLinkReferenceDefinition();
    if (node) return node;

    node = this.parseFootnoteDefinition();
    if (node) return node;

    node = this.parseAlert();
    if (node) return node;

    node = this.parseBlockQuote();
    if (node) return node;

    node = this.parseList();
    if (node) return node;

    node = this.parseTable();
    if (node) return node;

    node = this.parseIndentedCodeBlock();
    if (node) return node;

    node = this.parseParagraph();
    return node;
  }

  private parseATXHeading(): Heading | null {
    const line = this.lines[this.index];
    const match = line.content.match(/^(#{1,6})(?:\s+(.+?))?(?:\s+#*)?$/);

    if (!match) return null;

    const level = match[1].length;
    const content = match[2] || "";
    const startLine = this.index + 1;
    this.index++;

    const children = parseInlines(content, this.linkReferences, startLine, this.footnotes);

    return {
      type: "heading",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      level,
      children,
    };
  }

  private parseThematicBreak(): ThematicBreak | null {
    const line = this.lines[this.index];
    const content = line.content.trim();

    // Check for thematic break patterns
    if (
      /^(\*[ \t]*){3,}$/.test(content) ||
      /^(-[ \t]*){3,}$/.test(content) ||
      /^(_[ \t]*){3,}$/.test(content)
    ) {
      const startLine = this.index + 1;
      this.index++;
      return {
        type: "thematic-break",
        structureType: "leaf-block",
        startLine,
        endLine: this.index,
      };
    }

    return null;
  }

  private parseFencedCodeBlock(): FencedCodeBlock | null {
    const line = this.lines[this.index];
    const match = line.content.match(/^( {0,3})(`{3,}|~{3,})(?:([^\n`]*))?$/);

    if (!match) return null;

    const indent = match[1].length;
    const fenceChar = match[2][0];
    const fenceLength = match[2].length;
    const language = match[3]?.trim() || "";
    const startLine = this.index + 1;
    this.index++;

    let content = "";
    while (this.index < this.lines.length) {
      const currentLine = this.lines[this.index];
      const closingMatch = currentLine.content.match(
        new RegExp(`^${fenceChar}{${fenceLength},}$`),
      );

      if (closingMatch) {
        this.index++;
        break;
      }

      if (content) content += "\n";
      content += currentLine.content;
      this.index++;
    }

    return {
      type: "fenced-code-block",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      language: language || undefined,
      content,
      fenceChar,
      fenceLength,
    };
  }

  private parseHtmlBlock(): HtmlBlock | null {
    const line = this.lines[this.index];
    const content = line.content;

    // HTML block conditions from GFM spec
    const htmlBlockPatterns = [
      /^<(script|style|pre)(\s|>|$)/i,
      /^<!--/,
      /^<\?/,
      /^<!([A-Z])/,
      /^<!\[CDATA\[/,
      /^<\/?([a-zA-Z][a-zA-Z0-9-]*)([ \t>\/]|$)/,
      /^<\/([a-zA-Z][a-zA-Z0-9-]*)>[ \t]*$/,
    ];

    let matchedPattern = -1;
    for (let i = 0; i < htmlBlockPatterns.length; i++) {
      if (htmlBlockPatterns[i].test(content)) {
        matchedPattern = i;
        break;
      }
    }

    if (matchedPattern === -1) return null;

    const startLine = this.index + 1;
    let htmlContent = content;
    this.index++;

    // Accumulate HTML block content based on end conditions
    if (matchedPattern <= 4) {
      const endPattern =
        matchedPattern === 0
          ? /\<\/(script|style|pre)>/i
          : matchedPattern === 1
            ? /-->/
            : matchedPattern === 2
              ? /\?>/
              : matchedPattern === 3
                ? />[\s]*$/
                : /\]\]>/;

      while (this.index < this.lines.length) {
        const nextLine = this.lines[this.index];
        htmlContent += "\n" + nextLine.content;
        this.index++;

        if (endPattern.test(nextLine.content)) break;
      }
    } else {
      // For patterns 5 and 6, stop at blank line
      while (
        this.index < this.lines.length &&
        !this.lines[this.index].isBlank
      ) {
        htmlContent += "\n" + this.lines[this.index].content;
        this.index++;
      }
    }

    return {
      type: "html-block",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      content: htmlContent,
    };
  }

  private parseLinkReferenceDefinition(): LinkReferenceDefinition | null {
    const line = this.lines[this.index];
    const match = line.content.match(
      /^ {0,3}\[([^\[\]]+)\]:\s*(\S+)(?:\s+["'(](.+?)["')])?$/,
    );

    if (!match) return null;

    const label = match[1];
    const destination = match[2];
    const title = match[3];
    const startLine = this.index + 1;
    this.index++;

    const normalizedLabel = normalizeLabel(label);
    this.linkReferences.set(normalizedLabel, { destination, title });

    return {
      type: "link-reference-definition",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      label,
      destination,
      title,
    };
  }

  /**
   * Parses footnote definitions: [^label]: content
   * Footnote content can span multiple lines if indented.
   */
  private parseFootnoteDefinition(): FootnoteDefinition | null {
    const line = this.lines[this.index];
    const match = line.content.match(/^ {0,3}\[\^([^\[\]]+)\]:\s*(.*)$/);

    if (!match) return null;

    const label = match[1];
    const startLine = this.index + 1;
    const contentStart = match[2];
    this.index++;

    // Collect all lines that are part of this footnote
    // Continuation lines must be indented by at least 4 spaces
    let footnoteContent = contentStart;
    while (this.index < this.lines.length) {
      const nextLine = this.lines[this.index];
      if (nextLine.isBlank) {
        // Check if there's more content after blank lines
        if (this.index + 1 < this.lines.length) {
          const lookAhead = this.lines[this.index + 1];
          if (
            lookAhead.content.startsWith("    ") ||
            lookAhead.content.startsWith("\t")
          ) {
            footnoteContent += "\n";
            this.index++;
            continue;
          }
        }
        break;
      }

      if (nextLine.content.startsWith("    ") || nextLine.content.startsWith("\t")) {
        footnoteContent +=
          "\n" + nextLine.content.replace(/^( {4}|\t)/, "");
        this.index++;
      } else if (nextLine.content.match(/^ {0,3}\[\^/)) {
        // Start of another footnote definition
        break;
      } else {
        // Not indented and not a footnote - end of this footnote
        break;
      }
    }

    // Parse the footnote content as blocks
    const tempParser = new BlockParser(footnoteContent);
    const contentAst = tempParser.parse();
    const children = contentAst.children;

    const normalizedLabel = normalizeLabel(label);
    this.footnotes.set(normalizedLabel, children);

    return {
      type: "footnote-definition",
      structureType: "container-block",
      startLine,
      endLine: this.index,
      label,
      children,
    };
  }

  private parseAlert(): Alert | null {
    const line = this.lines[this.index];

    if (!line.content.startsWith(">")) return null;

    // Check if this is an alert: > [!TYPE]
    const alertMatch = line.content.match(/^>\s*\[!([A-Z]+)\]\s*$/);
    if (!alertMatch) return null;

    const alertTypeStr = alertMatch[1].toLowerCase();
    const validAlertTypes: AlertType[] = [
      "note",
      "tip",
      "important",
      "warning",
      "caution",
    ];

    if (!validAlertTypes.includes(alertTypeStr as AlertType)) return null;

    const alertType = alertTypeStr as AlertType;
    const startLine = this.index + 1;
    this.index++;

    let alertContent = "";
    let lastWasBlank = false;

    // Continue reading lines that are part of the alert (lines starting with >)
    // Stop at first blank line after content
    while (this.index < this.lines.length) {
      const currentLine = this.lines[this.index];

      if (currentLine.isBlank) {
        if (alertContent.trim()) {
          // We have content and now hit a blank line, end the alert
          this.index++;
          break;
        }
        // Blank lines before content are ignored
        this.index++;
        continue;
      }

      if (!currentLine.content.startsWith(">")) {
        // Non-blockquote line ends the alert
        break;
      }

      // Add content from blockquote line
      const content = currentLine.content.substring(1).replace(/^ /, "");
      alertContent += content + "\n";
      this.index++;
    }

    const nestedParser = new BlockParser(alertContent);
    const children = nestedParser.parse().children;

    return {
      type: "alert",
      structureType: "container-block",
      startLine,
      endLine: this.index,
      alertType,
      children,
    };
  }

  private parseBlockQuote(): BlockQuote | null {
    const line = this.lines[this.index];

    if (!line.content.startsWith(">")) return null;

    const startLine = this.index + 1;
    let quoteContent = "";

    while (
      this.index < this.lines.length &&
      (this.lines[this.index].content.startsWith(">") ||
        this.lines[this.index].isBlank)
    ) {
      const currentLine = this.lines[this.index];
      if (currentLine.content.startsWith(">")) {
        quoteContent +=
          currentLine.content.substring(1).replace(/^ /, "") + "\n";
      } else {
        quoteContent += "\n";
      }
      this.index++;
    }

    const nestedParser = new BlockParser(quoteContent);
    const children = nestedParser.parse().children;

    return {
      type: "block-quote",
      structureType: "container-block",
      startLine,
      endLine: this.index,
      children,
    };
  }

  private parseList(): UnorderedList | OrderedList | null {
    const line = this.lines[this.index];

    // Try unordered list
    let match = line.content.match(/^( {0,3})([*+-])( |\t|$)/);
    if (match) {
      return this.parseUnorderedList(match[1].length);
    }

    // Try ordered list
    match = line.content.match(/^( {0,3})(\d+)([.)])( |\t|$)/);
    if (match) {
      const startNumber = parseInt(match[2]);
      return this.parseOrderedList(match[1].length, startNumber);
    }

    return null;
  }

  private parseUnorderedList(baseIndent: number): UnorderedList {
    const startLine = this.index + 1;
    const items: ListItem[] = [];
    let tight = true;

    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line.isBlank) {
        // Check if blank line is followed by another list item
        let nextIndex = this.index + 1;
        while (nextIndex < this.lines.length && this.lines[nextIndex].isBlank) {
          nextIndex++;
        }

        if (nextIndex < this.lines.length) {
          const nextLine = this.lines[nextIndex];
          const match = nextLine.content.match(/^( {0,3})([*+-])( |\t|$)/);
          // If next non-blank line is a list item at this level, it's loose
          if (match && match[1].length === baseIndent) {
            tight = false;
          }
        }

        this.index++;
        continue;
      }

      const match = line.content.match(/^( {0,3})([*+-])( |\t|$)/);
      if (!match || match[1].length !== baseIndent) break;

      const itemContent = line.content.substring(match[0].length);
      const itemStartLine = this.index + 1;
      this.index++;

      let fullContent = itemContent;
      const itemIndent = baseIndent + match[2].length + 1;
      let hasBlankLineInItem = false;

      while (this.index < this.lines.length) {
        const nextLine = this.lines[this.index];
        if (nextLine.isBlank) {
          // Check if this blank line is part of the item or ends it
          if (this.index + 1 < this.lines.length) {
            const lineAfterBlank = this.lines[this.index + 1];
            const listMarkerMatch =
              lineAfterBlank.content.match(/^( {0,3})([*+-])/);
            // If next non-blank line is a list marker at baseIndent or less, item ends
            if (listMarkerMatch && listMarkerMatch[1].length <= baseIndent)
              break;
            // If next non-blank line has less indent, item ends
            if (lineAfterBlank.indent < itemIndent) break;
            // Otherwise, blank line is part of item
            hasBlankLineInItem = true;
            fullContent += "\n";
          }
          this.index++;
          continue;
        }

        // Break if line is a list marker at baseIndent or less
        const listMarkerMatch = nextLine.content.match(/^( {0,3})([*+-])/);
        if (listMarkerMatch && listMarkerMatch[1].length <= baseIndent) break;
        // Break if line has less indent than itemIndent (and is not part of the item)
        if (nextLine.indent < itemIndent) break;

        fullContent += "\n" + nextLine.content;
        this.index++;
      }

      // If item has blank lines, the whole list is loose
      if (hasBlankLineInItem) {
        tight = false;
      }

      // Check for task list item marker before parsing inlines
      let isChecked: boolean | undefined;
      let isTaskListItem = false;
      let contentWithoutMarker = fullContent;
      const taskMarkerMatch = fullContent.match(/^(\s*)\[( |x|X)\]\s/);
      if (taskMarkerMatch) {
        isChecked = taskMarkerMatch[2].toLowerCase() === "x";
        isTaskListItem = true;
        contentWithoutMarker = fullContent.substring(taskMarkerMatch[0].length);
      }

      const itemParser = new BlockParser(contentWithoutMarker);
      const children = itemParser.parse().children;

      const listItem: ListItem = {
        type: "list-item",
        structureType: "container-block",
        startLine: itemStartLine,
        endLine: this.index,
        checked: isChecked,
        taskListItem: isTaskListItem ? true : undefined,
        children,
      };

      items.push(listItem);
    }

    return {
      type: "unordered-list",
      structureType: "container-block",
      startLine,
      endLine: this.index,
      tight,
      children: items,
    };
  }

  private parseOrderedList(
    baseIndent: number,
    startNumber: number,
  ): OrderedList {
    const startLine = this.index + 1;
    const items: ListItem[] = [];
    let tight = true;

    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line.isBlank) {
        // Check if blank line is followed by another list item
        let nextIndex = this.index + 1;
        while (nextIndex < this.lines.length && this.lines[nextIndex].isBlank) {
          nextIndex++;
        }

        if (nextIndex < this.lines.length) {
          const nextLine = this.lines[nextIndex];
          const match = nextLine.content.match(/^( {0,3})(\d+)([.)])( |\t|$)/);
          // If next non-blank line is a list item at this level, it's loose
          if (match && match[1].length === baseIndent) {
            tight = false;
          }
        }

        this.index++;
        continue;
      }

      const match = line.content.match(/^( {0,3})(\d+)([.)])( |\t|$)/);
      if (!match || match[1].length !== baseIndent) break;

      const itemContent = line.content.substring(match[0].length);
      const itemStartLine = this.index + 1;
      this.index++;

      let fullContent = itemContent;
      const itemIndent = baseIndent + match[2].length + match[3].length + 1;
      let hasBlankLineInItem = false;

      while (this.index < this.lines.length) {
        const nextLine = this.lines[this.index];
        if (nextLine.isBlank) {
          // Check if this blank line is part of the item or ends it
          if (this.index + 1 < this.lines.length) {
            const lineAfterBlank = this.lines[this.index + 1];
            const listMarkerMatch =
              lineAfterBlank.content.match(/^( {0,3})(\d+)([.)])/);
            // If next non-blank line is a list marker at baseIndent or less, item ends
            if (listMarkerMatch && listMarkerMatch[1].length <= baseIndent)
              break;
            // If next non-blank line has less indent, item ends
            if (lineAfterBlank.indent < itemIndent) break;
            // Otherwise, blank line is part of item
            hasBlankLineInItem = true;
            fullContent += "\n";
          }
          this.index++;
          continue;
        }

        // Break if line is a list marker at baseIndent or less
        const listMarkerMatch = nextLine.content.match(/^( {0,3})(\d+)([.)])/);
        if (listMarkerMatch && listMarkerMatch[1].length <= baseIndent) break;
        // Break if line has less indent than itemIndent (and is not part of the item)
        if (nextLine.indent < itemIndent) break;

        fullContent += "\n" + nextLine.content;
        this.index++;
      }

      // If item has blank lines, the whole list is loose
      if (hasBlankLineInItem) {
        tight = false;
      }

      // Check for task list item marker before parsing inlines
      let isChecked: boolean | undefined;
      let isTaskListItem = false;
      let contentWithoutMarker = fullContent;
      const taskMarkerMatch = fullContent.match(/^(\s*)\[( |x|X)\]\s/);
      if (taskMarkerMatch) {
        isChecked = taskMarkerMatch[2].toLowerCase() === "x";
        isTaskListItem = true;
        contentWithoutMarker = fullContent.substring(taskMarkerMatch[0].length);
      }

      const itemParser = new BlockParser(contentWithoutMarker);
      const children = itemParser.parse().children;

      const listItem: ListItem = {
        type: "list-item",
        structureType: "container-block",
        startLine: itemStartLine,
        endLine: this.index,
        checked: isChecked,
        taskListItem: isTaskListItem ? true : undefined,
        children,
      };

      items.push(listItem);
    }

    return {
      type: "ordered-list",
      structureType: "container-block",
      startLine,
      endLine: this.index,
      tight,
      startNumber,
      children: items,
    };
  }

  private parseTable(): ASTNode | null {
    const line = this.lines[this.index];

    // Check if this line starts with | or contains |
    if (!line.content.includes("|")) return null;

    // Look ahead for a delimiter row
    if (this.index + 1 >= this.lines.length) return null;

    const nextLine = this.lines[this.index + 1];
    const delimiterPattern = /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)*\|?\s*$/;

    if (!delimiterPattern.test(nextLine.content)) return null;

    // Parse header row
    const headerCells = this.parseTableRow(line.content);
    if (!headerCells) return null;

    // Parse delimiter row to determine alignment
    const alignments = this.parseTableDelimiterRow(nextLine.content);
    if (!alignments || alignments.length !== headerCells.length) return null;

    const startLine = this.index + 1;
    this.index += 2;

    // Parse body rows
    const bodyRows: ASTNode[] = [];
    while (
      this.index < this.lines.length &&
      this.lines[this.index].content.includes("|")
    ) {
      const rowCells = this.parseTableRow(this.lines[this.index].content);
      if (!rowCells || rowCells.length !== headerCells.length) break;

      const cells = rowCells.map((content, idx) => ({
        type: "table-cell" as const,
        structureType: "leaf-block" as const,
        startLine: this.index + 1,
        endLine: this.index + 1,
        alignment: alignments[idx],
        isHeader: false,
        children: parseInlines(content, this.linkReferences, this.index, this.footnotes),
      }));

      bodyRows.push({
        type: "table-row" as const,
        structureType: "container-block" as const,
        startLine: this.index + 1,
        endLine: this.index + 1,
        children: cells,
      });

      this.index++;
    }

    // Create header row
    const headerRow: ASTNode = {
      type: "table-row",
      structureType: "container-block",
      startLine,
      endLine: startLine,
      children: headerCells.map((content, idx) => ({
        type: "table-cell" as const,
        structureType: "leaf-block" as const,
        startLine,
        endLine: startLine,
        alignment: alignments[idx],
        isHeader: true,
        children: parseInlines(content, this.linkReferences, startLine, this.footnotes),
      })),
    };

    return {
      type: "table" as const,
      structureType: "container-block" as const,
      startLine,
      endLine: this.index,
      children: [
        {
          type: "table-head" as const,
          structureType: "container-block" as const,
          startLine,
          endLine: startLine,
          children: [headerRow],
        },
        {
          type: "table-body" as const,
          structureType: "container-block" as const,
          startLine: startLine + 2,
          endLine: this.index,
          children: bodyRows,
        },
      ],
    };
  }

  private parseTableRow(content: string): string[] | null {
    const cells = content.split("|").map((cell) => cell.trim());
    // Remove empty cells at start/end (from leading/trailing |)
    if (cells[0] === "") cells.shift();
    if (cells[cells.length - 1] === "") cells.pop();

    if (cells.length === 0) return null;
    return cells;
  }

  private parseTableDelimiterRow(
    content: string,
  ): ("left" | "center" | "right" | null)[] | null {
    const cells = content.split("|").map((cell) => cell.trim());
    // Remove empty cells at start/end
    if (cells[0] === "") cells.shift();
    if (cells[cells.length - 1] === "") cells.pop();

    if (cells.length === 0) return null;

    const alignments: ("left" | "center" | "right" | null)[] = [];
    for (const cell of cells) {
      if (!/^:?-+:?$/.test(cell)) return null;

      const left = cell.startsWith(":");
      const right = cell.endsWith(":");

      if (left && right) {
        alignments.push("center");
      } else if (right) {
        alignments.push("right");
      } else if (left) {
        alignments.push("left");
      } else {
        alignments.push(null);
      }
    }

    return alignments;
  }

  private parseIndentedCodeBlock(): IndentedCodeBlock | null {
    const line = this.lines[this.index];

    if (line.indent < 4) return null;

    const startLine = this.index + 1;
    let content = "";

    while (this.index < this.lines.length) {
      const currentLine = this.lines[this.index];
      if (currentLine.isBlank) {
        content += "\n";
        this.index++;
        continue;
      }

      if (currentLine.indent < 4) break;

      if (content) content += "\n";
      content += currentLine.content.substring(4);
      this.index++;
    }

    return {
      type: "indented-code-block",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      content: content.trim(),
    };
  }

  private parseParagraph(): Paragraph {
    const startLine = this.index + 1;
    let content = "";

    while (this.index < this.lines.length) {
      const line = this.lines[this.index];
      if (line.isBlank) break;

      // Check if this line starts a new block
      if (
        content &&
        (line.content.match(/^(#{1,6})(?:\s|$)/) ||
          line.content.match(/^(\*[ \t]*){3,}$/) ||
          line.content.match(/^( {0,3})([*+-])( |\t)/) ||
          line.content.match(/^( {0,3})(\d+)([.)])( |\t)/) ||
          line.content.match(/^>/) ||
          line.content.match(/^(`{3,}|~{3,})/))
      ) {
        break;
      }

      if (content) content += "\n";
      content += line.content;
      this.index++;
    }

    const children = parseInlines(content, this.linkReferences, startLine, this.footnotes);

    return {
      type: "paragraph",
      structureType: "leaf-block",
      startLine,
      endLine: this.index,
      children,
    };
  }

  getLinkReferences(): Map<string, { destination: string; title?: string }> {
    return this.linkReferences;
  }
}
