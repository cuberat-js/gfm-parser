/**
 * AST Node types for the Markdown parser
 */

export type StructureType =
  | "block"
  | "leaf-block"
  | "container-block"
  | "inline";
export type AlertType = "note" | "tip" | "important" | "warning" | "caution";
export type NodeType =
  | "document"
  | "paragraph"
  | "heading"
  | "thematic-break"
  | "fenced-code-block"
  | "indented-code-block"
  | "html-block"
  | "link-reference-definition"
  | "footnote-definition"
  | "block-quote"
  | "alert"
  | "unordered-list"
  | "ordered-list"
  | "list-item"
  | "text"
  | "softbreak"
  | "linebreak"
  | "emphasis"
  | "strong-emphasis"
  | "code-span"
  | "link"
  | "image"
  | "html-inline"
  | "raw-html"
  | "strikethrough"
  | "footnote-reference"
  | "table"
  | "table-head"
  | "table-body"
  | "table-row"
  | "table-cell";

export interface ASTNode {
  type: NodeType;
  structureType: StructureType;
  startLine: number;
  endLine: number;
  children?: ASTNode[];
  [key: string]: any;
}

/**
 * Document represents the root of the AST for a Markdown document.
 */
export interface Document extends ASTNode {
  type: "document";
  structureType: "container-block";
  children: ASTNode[];
}

export interface Paragraph extends ASTNode {
  type: "paragraph";
  structureType: "leaf-block";
  children: ASTNode[];
}

export interface Heading extends ASTNode {
  type: "heading";
  structureType: "leaf-block";
  level: number;
  children: ASTNode[];
}

export interface ThematicBreak extends ASTNode {
  type: "thematic-break";
  structureType: "leaf-block";
}

export interface FencedCodeBlock extends ASTNode {
  type: "fenced-code-block";
  structureType: "leaf-block";
  language?: string;
  content: string;
  fenceChar: string;
  fenceLength: number;
}

export interface IndentedCodeBlock extends ASTNode {
  type: "indented-code-block";
  structureType: "leaf-block";
  content: string;
}

export interface HtmlBlock extends ASTNode {
  type: "html-block";
  structureType: "leaf-block";
  content: string;
}

export interface LinkReferenceDefinition extends ASTNode {
  type: "link-reference-definition";
  structureType: "leaf-block";
  label: string;
  destination: string;
  title?: string;
}

export interface FootnoteDefinition extends ASTNode {
  type: "footnote-definition";
  structureType: "container-block";
  label: string;
  children: ASTNode[];
}

export interface BlockQuote extends ASTNode {
  type: "block-quote";
  structureType: "container-block";
  children: ASTNode[];
}

export interface Alert extends ASTNode {
  type: "alert";
  structureType: "container-block";
  alertType: AlertType;
  children: ASTNode[];
}

export interface UnorderedList extends ASTNode {
  type: "unordered-list";
  structureType: "container-block";
  tight: boolean;
  children: ASTNode[];
}

export interface OrderedList extends ASTNode {
  type: "ordered-list";
  structureType: "container-block";
  tight: boolean;
  startNumber: number;
  children: ASTNode[];
}

export interface ListItem extends ASTNode {
  type: "list-item";
  structureType: "container-block";
  checked?: boolean;
  taskListItem?: boolean;
  children: ASTNode[];
}

export interface TextNode extends ASTNode {
  type: "text";
  structureType: "inline";
  content: string;
}

export interface Softbreak extends ASTNode {
  type: "softbreak";
  structureType: "inline";
}

export interface Linebreak extends ASTNode {
  type: "linebreak";
  structureType: "inline";
}

export interface Emphasis extends ASTNode {
  type: "emphasis";
  structureType: "inline";
  children: ASTNode[];
}

export interface StrongEmphasis extends ASTNode {
  type: "strong-emphasis";
  structureType: "inline";
  children: ASTNode[];
}

export interface CodeSpan extends ASTNode {
  type: "code-span";
  structureType: "inline";
  content: string;
}

export interface Link extends ASTNode {
  type: "link";
  structureType: "inline";
  destination: string;
  title?: string;
  children: ASTNode[];
}

export interface Image extends ASTNode {
  type: "image";
  structureType: "inline";
  destination: string;
  title?: string;
  altText: string;
}

export interface HtmlInline extends ASTNode {
  type: "html-inline";
  structureType: "inline";
  content: string;
}

export interface RawHtml extends ASTNode {
  type: "raw-html";
  structureType: "inline";
  content: string;
}

export interface Strikethrough extends ASTNode {
  type: "strikethrough";
  structureType: "inline";
  children: ASTNode[];
}

export interface FootnoteReference extends ASTNode {
  type: "footnote-reference";
  structureType: "inline";
  label: string;
}

export interface Table extends ASTNode {
  type: "table";
  structureType: "container-block";
  children: ASTNode[];
}

export interface TableHead extends ASTNode {
  type: "table-head";
  structureType: "container-block";
  children: ASTNode[];
}

export interface TableBody extends ASTNode {
  type: "table-body";
  structureType: "container-block";
  children: ASTNode[];
}

export interface TableRow extends ASTNode {
  type: "table-row";
  structureType: "container-block";
  children: ASTNode[];
}

export interface TableCell extends ASTNode {
  type: "table-cell";
  structureType: "leaf-block";
  alignment?: "left" | "center" | "right";
  isHeader: boolean;
  children: ASTNode[];
}
