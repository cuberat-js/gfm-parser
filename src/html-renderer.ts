/**
 * HTML renderer for AST
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
  UnorderedList,
  OrderedList,
  ListItem,
  TextNode,
  Emphasis,
  StrongEmphasis,
  CodeSpan,
  Link,
  Image,
  Linebreak,
  Softbreak,
  HtmlInline,
  Strikethrough,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  FootnoteDefinition,
  FootnoteReference,
} from "./ast.js";
import { escapeHtml, generateHeadingId } from "./utils.js";
import hljs from "highlight.js";
import { renderMermaid } from "@mermaid-js/mermaid-cli";
import puppeteer from "puppeteer";
// @ts-ignore
import octiconsModule from "@primer/octicons";

/**
 * Renders mermaid diagram to SVG using the mermaid-js module
 * @param content - The mermaid diagram content
 * @returns {Promise<string | null>} The rendered SVG string or null if rendering failed
 */
async function renderMermaidToSvg(content: string): Promise<string | null> {
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | null = null;
  try {
    browser = await puppeteer.launch({ headless: true });
    const result = await renderMermaid(browser, content, "svg");
    if (result && result.data) {
      const svgText = Buffer.from(result.data).toString("utf-8");
      return svgText;
    }
    return null;
  } catch (error) {
    // Log but don't fail - will fall back to code block
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {
        // Ignore close errors
      });
    }
  }
}

// Type for extensions that can modify the rendering of HTML for AST nodes.
export type HtmlRenderExtension = (
  node: ASTNode,
  renderer: HtmlRenderer,
) => string | null;

// HTML renderer for Markdown AST nodes.
export class HtmlRenderer {
  private extensions: HtmlRenderExtension[] = [];
  private inTightList: boolean = false;
  private fragmentMode: boolean = false;
  private darkMode: boolean = false;
  private customCss?: string;
  private headerLinks: boolean = true;
  private usedHeaderIds: Map<string, number> = new Map();

  constructor(options?: {
    fragmentMode?: boolean;
    darkMode?: boolean;
    customCss?: string;
    headerLinks?: boolean;
  }) {
    this.fragmentMode = options?.fragmentMode ?? false;
    this.darkMode = options?.darkMode ?? false;
    this.customCss = options?.customCss;
    this.headerLinks = options?.headerLinks ?? true;
  }

  /**
   * Adds an extension to the HTML renderer. Extensions can modify the rendering
   * of AST nodes.
   * @param extension - The extension function to add
   */
  addExtension(extension: HtmlRenderExtension): void {
    this.extensions.push(extension);
  }

  /**
   * Returns the default CSS for the HTML renderer.
   * @returns {string} The default CSS content
   */
  static getDefaultCss(): string {
    return `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  color: #000000;
}
a {
  text-decoration: underline;
  color: #000000;
}
code {
  /* background-color: #f5f5f5; */
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
}
pre {
  background-color: #f5f5f5;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
pre code {
  background-color: transparent;
  padding: 0;
}
.markdown-alert {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin: 12px 0;
  border-left: 4px solid #ccc;
  border-radius: 4px;
}
.markdown-alert-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
.markdown-alert-icon svg {
  width: 20px;
  height: 20px;
}
.markdown-alert-note {
  border-left-color: #0969da;
  background-color: #f7f9fd;
}
.markdown-alert-note .markdown-alert-icon svg {
  color: #0969da;
}
.markdown-alert-tip {
  border-left-color: #1a7f0f;
  background-color: #f7f9fd;
}
.markdown-alert-tip .markdown-alert-icon svg {
  color: #1a7f0f;
}
.markdown-alert-important {
  border-left-color: #8250df;
  background-color: #f7f9fd;
}
.markdown-alert-important .markdown-alert-icon svg {
  color: #8250df;
}
.markdown-alert-warning {
  border-left-color: #bf8700;
  background-color: #fffbeb;
}
.markdown-alert-warning .markdown-alert-icon svg {
  color: #bf8700;
}
.markdown-alert-caution {
  border-left-color: #d1242f;
  background-color: #fff0f0;
}
.markdown-alert-caution .markdown-alert-icon svg {
  color: #d1242f;
}
.markdown-alert-content {
  flex: 1;
}
.markdown-alert-title {
  font-weight: bold;
  margin-bottom: 8px;
  margin-top: 0;
}
blockquote {
  border-left: 4px solid #ddd;
  margin: 0;
  padding-left: 16px;
  color: #666;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}
th, td {
  border: 1px solid #ddd;
  padding: 12px;
  text-align: left;
}
th {
  background-color: #f5f5f5;
  font-weight: bold;
}
input[type="checkbox"] {
  margin-right: 8px;
}
a {
  text-decoration: underline;
}
.header-link {
  text-decoration: none;
  color: #000000;
}
.header-link:hover {
  text-decoration: underline;
}
h1, h2, h3, h4, h5, h6 {
  position: relative;
}
.footnote-backref {
  text-decoration: underline;
  margin-left: 4px;
  font-size: 0.6em;
  color: #000000;
}
.footnote-ref {
  text-decoration: none;
  /* margin-right: 8px; */
  font-size: 0.9em;
  color: #000000;
}
section.footnotes {
  border-top: 1px solid #ddd;
  margin-top: 12px;
  padding-top: 12px;
}
section.footnotes ul {
  list-style: none;
  padding-left: 0;
}
.mermaid {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}
.mermaid svg {
  max-width: 100%;
  height: auto;
}`;
  }

  /**
   * Returns the CSS for dark mode for the HTML renderer.
   * @returns {string} The dark mode CSS content
   */
  static getDarkModeCss(): string {
    return `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
  line-height: 1.6;
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  background-color: #1a1a1a;
  color: #e0e0e0;
}
a {
  text-decoration: underline;
  color: #e0e0e0;
}
code {
  /* background-color: #2d2d2d; */
  padding: 2px 6px;
  border-radius: 3px;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
  color: #a0a0a0;
}
pre {
  background-color: #2d2d2d;
  padding: 12px;
  border-radius: 6px;
  overflow-x: auto;
}
pre code {
  background-color: transparent;
  padding: 0;
}
.markdown-alert {
  display: flex;
  gap: 12px;
  padding: 12px;
  margin: 12px 0;
  border-left: 6px solid #555;
  border-radius: 4px;
}
.markdown-alert-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
}
.markdown-alert-icon svg {
  width: 20px;
  height: 20px;
}
.markdown-alert-icon svg path {
  fill: #ffffff !important;
}
.markdown-alert-note {
  border-left-color: #3b82f6;
  background-color: #1e3a5f;
}
.markdown-alert-tip {
  border-left-color: #22c55e;
  background-color: #1f3a1f;
  /* background-color: #3ebd61; */
}
.markdown-alert-important {
  border-left-color: #a855f7;
  background-color: #3a1a5f;
}
.markdown-alert-warning {
  border-left-color: #f59e0b;
  background-color: #3a3022;
}
.markdown-alert-caution {
  border-left-color: #ef4444;
  background-color: #3a1a1a;
}
.markdown-alert-content {
  flex: 1;
}
.markdown-alert-title {
  font-weight: bold;
  margin-bottom: 8px;
  margin-top: 0;
}
blockquote {
  border-left: 4px solid #555;
  margin: 0;
  padding-left: 16px;
  color: #999;
}
table {
  border-collapse: collapse;
  width: 100%;
  margin: 12px 0;
}
th, td {
  border: 1px solid #444;
  padding: 12px;
  text-align: left;
}
th {
  background-color: #2d2d2d;
  font-weight: bold;
  color: #e0e0e0;
}
input[type="checkbox"] {
  margin-right: 8px;
}
a {
  text-decoration: underline;
}
.header-link {
  text-decoration: none;
  color: #e0e0e0;
}
.header-link:hover {
  text-decoration: underline;
}
h1, h2, h3, h4, h5, h6 {
  position: relative;
  color: #e0e0e0;
}
.footnote-backref {
  text-decoration: underline;
  margin-left: 4px;
  font-size: 0.6em;
  color: #e0e0e0;
}
.footnote-ref {
  text-decoration: none;
  /* margin-right: 8px; */
  font-size: 0.9em;
  color: #e0e0e0;
}
section.footnotes {
  border-top: 1px solid #444;
  margin-top: 12px;
  padding-top: 12px;
  width: 100%;
}
section.footnotes ul {
  list-style: none;
  padding-left: 0;
}
.mermaid {
  display: flex;
  justify-content: center;
  margin: 20px 0;
}
.mermaid svg {
  max-width: 100%;
  height: auto;
}`;
  }

  /**
   * Renders the given AST to an HTML string. If fragmentMode is true, only the body content is returned.
   * @param ast - The document AST to render
   * @returns {Promise<string>} The rendered HTML string
   */
  async render(ast: Document): Promise<string> {
    // Reset header ID tracking for each render
    this.usedHeaderIds.clear();
    const bodyContent = await this.renderNode(ast);

    if (this.fragmentMode) {
      return bodyContent;
    }

    // Generate full HTML document
    const title = this.extractTitle(ast);
    return this.generateFullHtmlDocument(title, bodyContent);
  }

  /**
   * Extracts the title from the AST by finding the first heading.
   * @param ast - The document AST to extract from
   * @returns {string} The extracted title text or "Document" if no heading found
   */
  private extractTitle(ast: Document): string {
    // Find the first heading and extract its text content
    for (const child of ast.children) {
      if (child.type === "heading") {
        const heading = child as Heading;
        return this.extractTextContent(heading);
      }
    }
    return "Document";
  }

  /**
   * Extracts the text content from the given AST node, recursively.
   * @param node - The AST node to extract text from
   * @returns {string} The extracted text content
   */
  private extractTextContent(node: ASTNode): string {
    if (node.type === "text") {
      return (node as TextNode).content;
    }
    if ("children" in node && Array.isArray(node.children)) {
      return (node.children as ASTNode[])
        .map((child) => this.extractTextContent(child))
        .join("");
    }
    return "";
  }

  /**
   * Generates the full HTML document with the given title and body content.
   * @param title - The document title
   * @param bodyContent - The HTML content for the document body
   * @returns {string} The complete HTML document
   */
  private generateFullHtmlDocument(title: string, bodyContent: string): string {
    const highlightCss = this.darkMode
      ? "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css"
      : "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/default.min.css";

    const css =
      this.customCss ||
      (this.darkMode
        ? HtmlRenderer.getDarkModeCss()
        : HtmlRenderer.getDefaultCss());

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <link rel="stylesheet" href="${highlightCss}">
  <style>
${css}
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;
  }

  /**
   * Renders the given AST node to an HTML string, using extensions if
   * available.
   * @param node - The AST node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderNode(node: ASTNode): Promise<string> {
    // Try extensions first
    for (const extension of this.extensions) {
      const result = extension(node, this);
      if (result !== null) {
        return result;
      }
    }

    // Default rendering
    switch (node.type) {
      case "document":
        return await this.renderDocument(node as Document);
      case "paragraph":
        return await this.renderParagraph(node as Paragraph);
      case "heading":
        return await this.renderHeading(node as Heading);
      case "thematic-break":
        return this.renderThematicBreak(node as ThematicBreak);
      case "fenced-code-block":
        return await this.renderFencedCodeBlock(node as FencedCodeBlock);
      case "indented-code-block":
        return this.renderIndentedCodeBlock(node as IndentedCodeBlock);
      case "html-block":
        return this.renderHtmlBlock(node as HtmlBlock);
      case "block-quote":
        return await this.renderBlockQuote(node as BlockQuote);
      case "alert":
        return await this.renderAlert(node as Alert);
      case "unordered-list":
        return await this.renderUnorderedList(node as UnorderedList);
      case "ordered-list":
        return await this.renderOrderedList(node as OrderedList);
      case "list-item":
        return await this.renderListItem(node as ListItem);
      case "text":
        return this.renderText(node as TextNode);
      case "emphasis":
        return await this.renderEmphasis(node as Emphasis);
      case "strong-emphasis":
        return await this.renderStrongEmphasis(node as StrongEmphasis);
      case "code-span":
        return this.renderCodeSpan(node as CodeSpan);
      case "link":
        return await this.renderLink(node as Link);
      case "image":
        return await this.renderImage(node as Image);
      case "linebreak":
        return this.renderLinebreak(node as Linebreak);
      case "softbreak":
        return this.renderSoftbreak(node as Softbreak);
      case "html-inline":
        return this.renderHtmlInline(node as HtmlInline);
      case "strikethrough":
        return await this.renderStrikethrough(node as Strikethrough);
      case "table":
        return await this.renderTable(node as Table);
      case "table-head":
        return await this.renderTableHead(node as TableHead);
      case "table-body":
        return this.renderTableBody(node as TableBody);
      case "table-row":
        return this.renderTableRow(node as TableRow);
      case "table-cell":
        return this.renderTableCell(node as TableCell);
      case "footnote-definition":
        return await this.renderFootnoteDefinition(node as FootnoteDefinition);
      case "footnote-reference":
        return this.renderFootnoteReference(node as FootnoteReference);
      default:
        return "";
    }
  }

  /**
   * Renders the document node to an HTML string.
   * @param node - The document node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderDocument(node: Document): Promise<string> {
    const results = [];
    const footnoteDefinitions: ASTNode[] = [];

    // Separate footnote definitions from other content
    for (const child of node.children) {
      if (child.type === "footnote-definition") {
        footnoteDefinitions.push(child);
      } else {
        results.push(await this.renderNode(child));
      }
    }

    // Add footnotes section at the end if there are any footnotes
    if (footnoteDefinitions.length > 0) {
      results.push('<section class="footnotes">\n<ul>\n');
      for (const def of footnoteDefinitions) {
        results.push(await this.renderNode(def));
      }
      results.push("</ul>\n</section>\n");
    }

    return results.join("");
  }

  /**
   * Renders a paragraph node to an HTML string.
   * @param node - The paragraph node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderParagraph(node: Paragraph): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    if (this.inTightList) {
      return `${content}\n`;
    }
    return `<p>${content}</p>\n`;
  }

  /**
   * Renders a heading node to an HTML string.
   * @param node - The heading node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  /**
   * Renders a heading node to an HTML string.
   * Includes GitHub-style anchor links by default.
   * @param node - The heading node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderHeading(node: Heading): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    const tag = `h${node.level}`;

    if (this.headerLinks) {
      let id = generateHeadingId(content);

      // Check if this ID has been used before
      if (this.usedHeaderIds.has(id)) {
        // Increment the counter for this ID
        const count = this.usedHeaderIds.get(id)! + 1;
        this.usedHeaderIds.set(id, count);
        id = `${id}-${count}`;
      } else {
        // Mark this ID as used
        this.usedHeaderIds.set(id, 0);
      }

      return `<${tag} id="${id}"><a href="#${id}" class="header-link">${content}</a></${tag}>\n`;
    }

    return `<${tag}>${content}</${tag}>\n`;
  }

  /**
   * Renders a thematic break node to an HTML string.
   * @param node - The thematic break node to render
   * @returns {string} The rendered HTML string
   */
  private renderThematicBreak(node: ThematicBreak): string {
    return "<hr />\n";
  }

  /**
   * Renders a fenced code block node to an HTML string.
   * @param node - The fenced code block node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderFencedCodeBlock(node: FencedCodeBlock): Promise<string> {
    const content = node.content;

    // Handle mermaid diagrams - render server-side to SVG using CLI
    if (node.language === "mermaid") {
      const svg = await renderMermaidToSvg(content);
      if (svg) {
        // Embed the SVG directly in the HTML
        return `<div class="mermaid">${svg}</div>\n`;
      } else {
        // Fall back to code block if rendering fails
        console.warn(`Mermaid rendering failed for diagram`);
        return `<pre><code class="language-mermaid">${escapeHtml(content)}</code></pre>\n`;
      }
    }

    // Handle regular code blocks with syntax highlighting
    let highlighted: string;

    if (node.language) {
      try {
        // Try to highlight with the specified language
        highlighted = hljs.highlight(content, {
          language: node.language,
          ignoreIllegals: true,
        }).value;
      } catch {
        // If language is not supported, try auto-detection
        try {
          highlighted = hljs.highlightAuto(content).value;
        } catch {
          // If all else fails, escape and return plain text
          highlighted = escapeHtml(content);
        }
      }
      return `<pre><code class="hljs language-${escapeHtml(node.language)}">${highlighted}</code></pre>\n`;
    } else {
      // No language specified, use auto-detection
      try {
        highlighted = hljs.highlightAuto(content).value;
        return `<pre><code class="hljs">${highlighted}</code></pre>\n`;
      } catch {
        // Fall back to escaped content
        highlighted = escapeHtml(content);
        return `<pre><code>${highlighted}</code></pre>\n`;
      }
    }
  }

  /**
   * Renders an indented code block node to an HTML string.
   * @param node - The indented code block node to render
   * @returns {string} The rendered HTML string
   */
  private renderIndentedCodeBlock(node: IndentedCodeBlock): string {
    const content = escapeHtml(node.content);
    return `<pre><code>${content}</code></pre>\n`;
  }

  /**
   * Renders an HTML block node to an HTML string.
   * @param node - The HTML block node to render
   * @returns {string} The rendered HTML string
   */
  private renderHtmlBlock(node: HtmlBlock): string {
    return node.content + "\n";
  }

  /**
   * Renders a block quote node to an HTML string.
   * @param node - The block quote node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderBlockQuote(node: BlockQuote): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<blockquote>\n${content}</blockquote>\n`;
  }

  /**
   * Returns the SVG icon for the given alert type, if available.
   * @param alertType - The alert type (note, tip, important, warning, caution)
   * @returns {string} The SVG icon HTML or empty string if not found
   */
  private getAlertIcon(alertType: string): string {
    const iconMap: { [key: string]: string } = {
      note: "info",
      tip: "light-bulb",
      important: "report",
      warning: "alert",
      caution: "stop",
    };

    const iconName = iconMap[alertType.toLowerCase()];
    if (!iconName) {
      return "";
    }

    const octicons = (octiconsModule as any).default || (octiconsModule as any);
    if (!octicons || !(iconName in octicons)) {
      return "";
    }

    const icon = octicons[iconName];
    if (icon && icon.toSVG) {
      return icon.toSVG({ width: 20, height: 20 });
    } else if (icon && icon.svg) {
      return icon.svg;
    }
    return "";
  }

  /**
   * Renders an alert node to an HTML string.
   * @param node - The alert node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderAlert(node: Alert): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    const alertType = node.alertType.toUpperCase();
    const icon = this.getAlertIcon(node.alertType);
    const iconHtml = icon
      ? `<div class="markdown-alert-icon">${icon}</div>`
      : "";
    return `<div class="markdown-alert markdown-alert-${node.alertType}" role="alert">\n${iconHtml}<div class="markdown-alert-content"><p class="markdown-alert-title"><strong>${alertType}</strong></p>\n${content}</div></div>\n`;
  }

  /**
   * Renders an unordered list node to an HTML string.
   * @param node - The unordered list node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderUnorderedList(node: UnorderedList): Promise<string> {
    const wasTight = this.inTightList;
    this.inTightList = node.tight;

    const items = [];
    for (const child of node.children) {
      const listItem = child as ListItem;
      const parts = [];
      for (const c of listItem.children) {
        parts.push(await this.renderNode(c));
      }
      const itemContent = parts.join("");
      const checkbox =
        listItem.checked !== undefined
          ? this.renderCheckbox(listItem.checked)
          : "";
      items.push(`<li>${checkbox}${itemContent}</li>`);
    }

    this.inTightList = wasTight;
    return `<ul>\n${items.join("")}\n</ul>\n`;
  }

  /**
   * Renders an ordered list node to an HTML string.
   * @param node - The ordered list node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderOrderedList(node: OrderedList): Promise<string> {
    const wasTight = this.inTightList;
    this.inTightList = node.tight;

    const start = node.startNumber !== 1 ? ` start="${node.startNumber}"` : "";
    const items = [];
    for (const child of node.children) {
      const listItem = child as ListItem;
      const parts = [];
      for (const c of listItem.children) {
        parts.push(await this.renderNode(c));
      }
      const itemContent = parts.join("");
      const checkbox =
        listItem.checked !== undefined
          ? this.renderCheckbox(listItem.checked)
          : "";
      items.push(`<li>${checkbox}${itemContent}</li>`);
    }

    this.inTightList = wasTight;
    return `<ol${start}>\n${items.join("")}\n</ol>\n`;
  }

  /**
   * Renders a checkbox input element for the given checked state.
   * @param checked - Whether the checkbox is checked
   * @returns {string} The rendered checkbox HTML
   */
  private renderCheckbox(checked: boolean): string {
    const checkedAttr = checked ? ' checked=""' : "";
    return `<input disabled="" type="checkbox"${checkedAttr}> `;
  }

  /**
   * Renders a list item node to an HTML string.
   * @param node - The list item node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderListItem(node: ListItem): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    return parts.join("");
  }

  /**
   * Renders a text node to an HTML string.
   * @param node - The text node to render
   * @returns {string} The rendered HTML string
   */
  private renderText(node: TextNode): string {
    return escapeHtml(node.content);
  }

  /**
   * Renders an emphasis node to an HTML string.
   * @param node - The emphasis node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderEmphasis(node: Emphasis): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<em>${content}</em>`;
  }

  /**
   * Renders a strong emphasis node to an HTML string.
   * @param node - The strong emphasis node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderStrongEmphasis(node: StrongEmphasis): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<strong>${content}</strong>`;
  }

  /**
   * Renders a code span node to an HTML string.
   * @param node - The code span node to render
   * @returns {string} The rendered HTML string
   */
  private renderCodeSpan(node: CodeSpan): string {
    return `<code>${escapeHtml(node.content)}</code>`;
  }

  /**
   * Renders a link node to an HTML string.
   * @param node - The link node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderLink(node: Link): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    const title = node.title ? ` title="${escapeHtml(node.title)}"` : "";
    return `<a href="${escapeHtml(node.destination)}"${title}>${content}</a>`;
  }

  /**
   * Renders an image node to an HTML string.
   * @param node - The image node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderImage(node: Image): Promise<string> {
    const title = node.title ? ` title="${escapeHtml(node.title)}"` : "";
    return `<img src="${escapeHtml(node.destination)}" alt="${escapeHtml(node.altText)}"${title} />`;
  }

  /**
   * Renders a line break node to an HTML string.
   * @param node - The line break node to render
   * @returns {string} The rendered HTML string
   */
  private renderLinebreak(node: Linebreak): string {
    return "<br />";
  }

  /**
   * Renders a soft break node to an HTML string.
   * @param node - The soft break node to render
   * @returns {string} The rendered HTML string
   */
  private renderSoftbreak(node: Softbreak): string {
    return "\n";
  }

  /**
   * Renders an inline HTML node to an HTML string.
   * @param node - The inline HTML node to render
   * @returns {string} The rendered HTML string
   */
  private renderHtmlInline(node: HtmlInline): string {
    return node.content;
  }

  /**
   * Renders a strikethrough node to an HTML string.
   * @param node - The strikethrough node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderStrikethrough(node: Strikethrough): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<del>${content}</del>`;
  }

  /**
   * Renders a table node to an HTML string.
   * @param node - The table node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderTable(node: Table): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<table>\n${content}</table>\n`;
  }

  /**
   * Renders a table head node to an HTML string.
   * @param node - The table head node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderTableHead(node: TableHead): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<thead>\n${content}</thead>\n`;
  }

  /**
   * Renders a table body node to an HTML string.
   * @param node - The table body node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderTableBody(node: TableBody): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<tbody>\n${content}</tbody>\n`;
  }

  /**
   * Renders a table row node to an HTML string.
   * @param node - The table row node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderTableRow(node: TableRow): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    return `<tr>\n${content}</tr>\n`;
  }

  /**
   * Renders a table cell node to an HTML string.
   * @param node - The table cell node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderTableCell(node: TableCell): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }
    const content = parts.join("");
    const tag = node.isHeader ? "th" : "td";
    const align = node.alignment ? ` style="text-align:${node.alignment}"` : "";
    return `<${tag}${align}>${content}</${tag}>\n`;
  }

  /**
   * Renders a footnote definition node to an HTML string.
   * @param node - The footnote definition node to render
   * @returns {Promise<string>} The rendered HTML string
   */
  private async renderFootnoteDefinition(
    node: FootnoteDefinition,
  ): Promise<string> {
    const parts = [];
    for (const child of node.children) {
      parts.push(await this.renderNode(child));
    }

    const marker = escapeHtml(node.label);
    const content = parts.join("").trim();
    const id = `fn-${marker}`;
    const backrefId = `fnref-${marker}`;

    // If content is already wrapped in <p>, just add backref inside
    if (content.startsWith("<p>") && content.endsWith("</p>")) {
      return `<li id="${id}"><p><sup>${marker}</sup>${content.slice(3, -4)} <a href="#${backrefId}" class="footnote-backref">↩</a></p></li>\n`;
    }
    return `<li id="${id}"><p><sup>${marker}</sup>${content} <a href="#${backrefId}" class="footnote-backref">↩</a></p></li>\n`;
  }

  /**
   * Renders a footnote reference node to an HTML string.
   * @param node - The footnote reference node to render
   * @returns {string} The rendered HTML string
   */
  private renderFootnoteReference(node: FootnoteReference): string {
    const marker = escapeHtml(node.label);
    const id = `fnref-${marker}`;
    const refId = `fn-${marker}`;
    return `<sup><a href="#${refId}" id="${id}" class="footnote-ref">${marker}</a></sup>`;
  }
}
