/**
 * Markdown renderer for AST
 */

import { ASTNode, Document, Paragraph, Heading, ThematicBreak, FencedCodeBlock, IndentedCodeBlock, HtmlBlock, BlockQuote, Alert, UnorderedList, OrderedList, ListItem, TextNode, Emphasis, StrongEmphasis, CodeSpan, Link, Image, Linebreak, Softbreak, HtmlInline, Strikethrough, Table, TableHead, TableBody, TableRow, TableCell, FootnoteDefinition, FootnoteReference } from './ast.js';

export type MarkdownRenderExtension = (node: ASTNode, renderer: MarkdownRenderer) => string | null;

export class MarkdownRenderer {
  private extensions: MarkdownRenderExtension[] = [];

  addExtension(extension: MarkdownRenderExtension): void {
    this.extensions.push(extension);
  }

  render(ast: Document): string {
    return this.renderNode(ast);
  }

  private renderNode(node: ASTNode): string {
    // Try extensions first
    for (const extension of this.extensions) {
      const result = extension(node, this);
      if (result !== null) {
        return result;
      }
    }

    // Default rendering
    switch (node.type) {
      case 'document':
        return this.renderDocument(node as Document);
      case 'paragraph':
        return this.renderParagraph(node as Paragraph);
      case 'heading':
        return this.renderHeading(node as Heading);
      case 'thematic-break':
        return this.renderThematicBreak(node as ThematicBreak);
      case 'fenced-code-block':
        return this.renderFencedCodeBlock(node as FencedCodeBlock);
      case 'indented-code-block':
        return this.renderIndentedCodeBlock(node as IndentedCodeBlock);
      case 'html-block':
        return this.renderHtmlBlock(node as HtmlBlock);
      case 'block-quote':
        return this.renderBlockQuote(node as BlockQuote);
      case 'alert':
        return this.renderAlert(node as Alert);
      case 'unordered-list':
        return this.renderUnorderedList(node as UnorderedList);
      case 'ordered-list':
        return this.renderOrderedList(node as OrderedList);
      case 'list-item':
        return this.renderListItem(node as ListItem);
      case 'text':
        return this.renderText(node as TextNode);
      case 'emphasis':
        return this.renderEmphasis(node as Emphasis);
      case 'strong-emphasis':
        return this.renderStrongEmphasis(node as StrongEmphasis);
      case 'code-span':
        return this.renderCodeSpan(node as CodeSpan);
      case 'link':
        return this.renderLink(node as Link);
      case 'image':
        return this.renderImage(node as Image);
      case 'linebreak':
        return this.renderLinebreak(node as Linebreak);
      case 'softbreak':
        return this.renderSoftbreak(node as Softbreak);
      case 'html-inline':
        return this.renderHtmlInline(node as HtmlInline);
      case 'strikethrough':
        return this.renderStrikethrough(node as Strikethrough);
      case 'table':
        return this.renderTable(node as Table);
      case 'table-head':
        return this.renderTableHead(node as TableHead);
      case 'table-body':
        return this.renderTableBody(node as TableBody);
      case 'table-row':
        return this.renderTableRow(node as TableRow);
      case 'table-cell':
        return this.renderTableCell(node as TableCell);
      case 'footnote-definition':
        return this.renderFootnoteDefinition(node as FootnoteDefinition);
      case 'footnote-reference':
        return this.renderFootnoteReference(node as FootnoteReference);
      default:
        return '';
    }
  }

  private renderDocument(node: Document): string {
    return node.children.map(child => this.renderNode(child)).join('');
  }

  private renderParagraph(node: Paragraph): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return `${content}\n\n`;
  }

  private renderHeading(node: Heading): string {
    const hashes = '#'.repeat(node.level);
    const content = node.children.map(child => this.renderNode(child)).join('');
    return `${hashes} ${content}\n\n`;
  }

  private renderThematicBreak(node: ThematicBreak): string {
    return '---\n\n';
  }

  private renderFencedCodeBlock(node: FencedCodeBlock): string {
    const fence = node.fenceChar.repeat(node.fenceLength);
    const language = node.language || '';
    return `${fence}${language}\n${node.content}\n${fence}\n\n`;
  }

  private renderIndentedCodeBlock(node: IndentedCodeBlock): string {
    const indented = node.content
      .split('\n')
      .map(line => '    ' + line)
      .join('\n');
    return `${indented}\n\n`;
  }

  private renderHtmlBlock(node: HtmlBlock): string {
    return node.content + '\n\n';
  }

  private renderBlockQuote(node: BlockQuote): string {
    const content = node.children
      .map(child => this.renderNode(child))
      .join('')
      .trim()
      .split('\n')
      .map(line => '> ' + line)
      .join('\n');
    return `${content}\n\n`;
  }

  private renderAlert(node: Alert): string {
    const alertType = node.alertType.toUpperCase();
    const content = node.children
      .map(child => this.renderNode(child))
      .join('')
      .trim()
      .split('\n')
      .map(line => '> ' + line)
      .join('\n');
    return `> [!${alertType}]\n${content}\n\n`;
  }

  private renderUnorderedList(node: UnorderedList): string {
    const items = node.children.map((child, index) => {
      const listItem = child as ListItem;
      const itemContent = listItem.children
        .map(c => this.renderNode(c))
        .join('')
        .trim();
      const checkbox = listItem.checked !== undefined ? this.renderCheckboxMarkdown(listItem.checked) : '';
      return `* ${checkbox}${itemContent}`;
    }).join('\n');
    return `${items}\n\n`;
  }

  private renderOrderedList(node: OrderedList): string {
    const items = node.children.map((child, index) => {
      const number = node.startNumber + index;
      const listItem = child as ListItem;
      const itemContent = listItem.children
        .map(c => this.renderNode(c))
        .join('')
        .trim();
      const checkbox = listItem.checked !== undefined ? this.renderCheckboxMarkdown(listItem.checked) : '';
      return `${number}. ${checkbox}${itemContent}`;
    }).join('\n');
    return `${items}\n\n`;
  }

  private renderCheckboxMarkdown(checked: boolean): string {
    const mark = checked ? 'x' : ' ';
    return `[${mark}] `;
  }

  private renderListItem(node: ListItem): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return content;
  }

  private renderText(node: TextNode): string {
    return node.content;
  }

  private renderEmphasis(node: Emphasis): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return `*${content}*`;
  }

  private renderStrongEmphasis(node: StrongEmphasis): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return `**${content}**`;
  }

  private renderCodeSpan(node: CodeSpan): string {
    return `\`${node.content}\``;
  }

  private renderLink(node: Link): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    const title = node.title ? ` "${node.title}"` : '';
    return `[${content}](${node.destination}${title})`;
  }

  private renderImage(node: Image): string {
    const title = node.title ? ` "${node.title}"` : '';
    return `![${node.altText}](${node.destination}${title})`;
  }

  private renderLinebreak(node: Linebreak): string {
    return '  \n';
  }

  private renderSoftbreak(node: Softbreak): string {
    return '\n';
  }

  private renderHtmlInline(node: HtmlInline): string {
    return node.content;
  }

  private renderStrikethrough(node: Strikethrough): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return `~~${content}~~`;
  }

  private renderTable(node: Table): string {
    return node.children.map(child => this.renderNode(child)).join('');
  }

  private renderTableHead(node: TableHead): string {
    const rows = node.children.map(child => this.renderNode(child)).join('');
    // Extract alignment from cells for delimiter row
    const headerRow = node.children[0] as TableRow;
    if (!headerRow) return rows;
    
    const alignments = (headerRow.children as TableCell[]).map(cell => {
      const align = cell.alignment;
      if (align === 'center') return ':---:';
      if (align === 'right') return '---:';
      if (align === 'left') return ':---';
      return '---';
    });
    
    const delimiter = `| ${alignments.join(' | ')} |\n`;
    return rows + delimiter;
  }

  private renderTableBody(node: TableBody): string {
    return node.children.map(child => this.renderNode(child)).join('');
  }

  private renderTableRow(node: TableRow): string {
    const cells = node.children.map(child => this.renderNode(child)).join(' | ');
    return `| ${cells} |\n`;
  }

  private renderTableCell(node: TableCell): string {
    const content = node.children.map(child => this.renderNode(child)).join('');
    return content;
  }

  private renderFootnoteDefinition(node: FootnoteDefinition): string {
    const content = node.children.map(child => this.renderNode(child)).join('').trim();
    return `[^${node.label}]: ${content}\n`;
  }

  private renderFootnoteReference(node: FootnoteReference): string {
    return `[^${node.label}]`;
  }
}
