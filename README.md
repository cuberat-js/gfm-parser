# Markdown Parser (markdownjs)

A GitHub-flavored Markdown parser implemented in TypeScript from first principles, with full support for parsing, AST generation, and rendering to both HTML and Markdown.

## Features

- **Complete GFM Specification Support**: Implements the full GitHub Flavored Markdown specification
- **AST Generation**: Parses Markdown to a rich Abstract Syntax Tree with source line information
- **Multiple Output Formats**: Render AST to HTML or Markdown
- **Type-Safe**: Written in TypeScript with strict type checking
- **HTML Safety**: Automatically escapes HTML content to prevent injection vulnerabilities
- **Extension System**: Support for custom rendering extensions
- **CLI Tool**: Command-line interface for file processing

## Installation

```bash
npm install
npm run build
```

## Usage

### Command-Line Interface

Parse Markdown and output AST as JSON:
```bash
node dist/cli.js --markdown-in input.md --ast-out output.ast.json
```

Render Markdown to HTML:
```bash
node dist/cli.js --markdown-in input.md --html-out output.html
```

Render Markdown to Markdown (round-trip):
```bash
node dist/cli.js --markdown-in input.md --markdown-out output.md
```

Load AST and render to HTML:
```bash
node dist/cli.js --ast-in input.ast.json --html-out output.html
```

### Programmatic Usage

```typescript
import { BlockParser, HtmlRenderer, MarkdownRenderer } from './src/index.js';

// Parse Markdown
const markdown = '# Hello\n\nThis is **bold** text.';
const parser = new BlockParser(markdown);
const ast = parser.parse();

// Render to HTML
const htmlRenderer = new HtmlRenderer();
const html = htmlRenderer.render(ast);
console.log(html);

// Render to Markdown
const mdRenderer = new MarkdownRenderer();
const md = mdRenderer.render(ast);
console.log(md);
```

## Supported Elements

### Block Elements

- **Headings**: ATX-style headings (# through ######)
- **Paragraphs**: Text blocks separated by blank lines
- **Thematic Breaks**: Horizontal rules (---, ***, ___)
- **Code Blocks**: 
  - Fenced code blocks (```, ~~~)
  - Indented code blocks (4+ spaces)
- **HTML Blocks**: Raw HTML that passes through unchanged
- **Block Quotes**: Lines prefixed with >
- **Lists**:
  - Unordered lists (*, +, -)
  - Ordered lists (1., 2., etc.)
  - List items with nested content
- **Tables**: GFM tables with alignment support
- **Link Reference Definitions**: Reference links [ref]: URL "title"

### Inline Elements

- **Text**: Plain text with automatic escaping in HTML
- **Emphasis**: *italic* / _italic_
- **Strong Emphasis**: **bold** / __bold__
- **Code Spans**: `inline code`
- **Links**: [text](url "title") and reference links
- **Images**: ![alt](url "title")
- **Line Breaks**: Hard breaks (2+ spaces) and soft breaks (newlines)
- **HTML Inline**: Embedded HTML tags
- **Strikethrough**: ~~deleted~~ (GFM extension)

## AST Structure

Each AST node contains:
- `type`: The node type (e.g., 'paragraph', 'heading', 'text')
- `structureType`: Classification (block, leaf-block, container-block, or inline)
- `startLine`/`endLine`: Source line numbers
- `children`: Child nodes (for container blocks)
- Type-specific properties (e.g., `level` for headings, `language` for code blocks)

Example:
```json
{
  "type": "document",
  "structureType": "container-block",
  "children": [
    {
      "type": "heading",
      "level": 1,
      "children": [
        {
          "type": "text",
          "content": "Hello"
        }
      ]
    }
  ]
}
```

## Rendering Extensions

Customize rendering behavior with extensions:

```typescript
const renderer = new HtmlRenderer();

// Add custom rendering for specific node types
renderer.addExtension((node, renderer) => {
  if (node.type === 'code-span') {
    return `<code class="my-code">${escapeHtml(node.content)}</code>`;
  }
  return null; // Use default rendering
});

const html = renderer.render(ast);
```

## Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Parsing tests for all GFM elements
- Rendering tests for HTML and Markdown output
- Round-trip tests (Markdown → AST → Markdown/HTML)
- HTML escaping and safety tests

## Architecture

### Core Modules

- **`ast.ts`**: TypeScript type definitions for all node types
- **`utils.ts`**: Utility functions for character classification, HTML escaping, etc.
- **`block-parser.ts`**: Block-level parser implementation
- **`inline-parser.ts`**: Inline-level parser implementation  
- **`html-renderer.ts`**: AST to HTML renderer
- **`markdown-renderer.ts`**: AST to Markdown renderer
- **`cli.ts`**: Command-line interface
- **`index.ts`**: Public API exports

### Parser Design

The parser uses a two-stage approach:

1. **Block Parsing**: `BlockParser` processes the input line-by-line to identify block-level structures (headings, paragraphs, lists, code blocks, etc.)
2. **Inline Parsing**: `parseInlines` processes block content character-by-character to identify inline structures (emphasis, links, code spans, etc.)

This separation allows for efficient parsing and clean separation of concerns.

## Specification Compliance

This implementation follows the [GitHub Flavored Markdown Specification](https://github.github.com/gfm/) with support for:
- Standard Markdown elements
- GFM extensions (tables, strikethrough)
- Safe HTML rendering with proper escaping

## Performance

The parser is optimized for typical Markdown documents:
- Single-pass block parsing
- Efficient inline parsing with early exits
- Minimal memory allocations

## License

MIT
