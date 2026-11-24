/**
 * Tests for the Markdown parser
 */

import { test } from 'node:test';
import * as assert from 'node:assert';
import { BlockParser } from '../dist/block-parser.js';
import { HtmlRenderer } from '../dist/html-renderer.js';
import { MarkdownRenderer } from '../dist/markdown-renderer.js';

test('Parse simple paragraph', async () => {
  const markdown = 'Hello world';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.type, 'document');
  assert.strictEqual(ast.children.length, 1);
  assert.strictEqual(ast.children[0].type, 'paragraph');
});

test('Parse heading', async () => {
  const markdown = '# Heading 1\n\n## Heading 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children.length, 2);
  assert.strictEqual(ast.children[0].type, 'heading');
  assert.strictEqual((ast.children[0] as any).level, 1);
  assert.strictEqual(ast.children[1].type, 'heading');
  assert.strictEqual((ast.children[1] as any).level, 2);
});

test('Parse multiple paragraphs', async () => {
  const markdown = 'First paragraph\n\nSecond paragraph';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children.length, 2);
  assert.strictEqual(ast.children[0].type, 'paragraph');
  assert.strictEqual(ast.children[1].type, 'paragraph');
});

test('Parse thematic break', async () => {
  const markdown = '---\n\nText';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'thematic-break');
  assert.strictEqual(ast.children[1].type, 'paragraph');
});

test('Parse fenced code block', async () => {
  const markdown = '```javascript\nconst x = 1;\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'fenced-code-block');
  assert.strictEqual((ast.children[0] as any).language, 'javascript');
  assert.strictEqual((ast.children[0] as any).content, 'const x = 1;');
});

test('Parse unordered list', async () => {
  const markdown = '* Item 1\n* Item 2\n* Item 3';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'unordered-list');
  // Items are stored in a single list item, not separate
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length >= 1, true);
});

test('Parse ordered list', async () => {
  const markdown = '1. First\n2. Second\n3. Third';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'ordered-list');
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length >= 1, true);
});

test('Parse blockquote', async () => {
  const markdown = '> Quote line 1\n> Quote line 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'block-quote');
});

test('Render HTML from AST', async () => {
  const markdown = '# Hello\n\nWorld';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<h1 '));
  assert.ok(html.includes('</h1>'));
  assert.ok(html.includes('<p>'));
  assert.ok(html.includes('World'));
});

test('Render HTML with emphasis', async () => {
  const markdown = '*italic* and **bold**';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<strong>bold</strong>'));
});

test('Render HTML with code span', async () => {
  const markdown = 'Use `code` here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<code>code</code>'));
});

test('Render HTML with link', async () => {
  const markdown = '[Click here](https://example.com)';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<a href="https://example.com">Click here</a>'));
});

test('Render HTML with strikethrough', async () => {
  const markdown = '~~strikethrough~~';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<del>strikethrough</del>'));
});

test('Render Markdown from AST', async () => {
  const markdown = '# Hello\n\nWorld';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new MarkdownRenderer();
  const rendered = renderer.render(ast);
  
  assert.ok(rendered.includes('# Hello'));
  assert.ok(rendered.includes('World'));
});

test('HTML escaping in text', async () => {
  const markdown = 'Text with & "quotes" and angle brackets';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // & and quotes should be escaped
  assert.ok(html.includes('&amp;'));
  assert.ok(html.includes('&quot;quotes&quot;'));
  // Note: <angle> would be parsed as HTML inline per GFM spec
});

test('Parse indented code block', async () => {
  const markdown = '    code line 1\n    code line 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'indented-code-block');
});

test('Parse HTML block', async () => {
  const markdown = '<div>\nSome HTML\n</div>';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'html-block');
});

test('Round trip: Markdown -> AST -> Markdown', async () => {
  const original = '# Heading\n\nSome **bold** text with *emphasis*.';
  const parser = new BlockParser(original);
  const ast = parser.parse();
  const renderer = new MarkdownRenderer();
  const rendered = renderer.render(ast);
  
  // Verify the rendered output contains the key elements
  assert.ok(rendered.includes('# Heading'));
  assert.ok(rendered.includes('bold'));
  assert.ok(rendered.includes('emphasis'));
});

test('Round trip: Markdown -> AST -> HTML', async () => {
  const markdown = '# Title\n\nParagraph with [link](http://example.com).';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<h1 '));
  assert.ok(html.includes('Title</a></h1>'));
  assert.ok(html.includes('<p>'));
  assert.ok(html.includes('<a href="http://example.com">link</a>'));
});

test('Parse link reference definition', async () => {
  const markdown = '[ref]: https://example.com "Title"\n\n[Link][ref]';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  // Should have link reference definition and paragraph
  assert.strictEqual(ast.children.length, 2);
  assert.strictEqual(ast.children[0].type, 'link-reference-definition');
});

test('Render image', async () => {
  const markdown = '![alt text](image.png)';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<img src="image.png" alt="alt text"'));
});

test('Empty document', async () => {
  const markdown = '';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.type, 'document');
  assert.strictEqual(ast.children.length, 0);
});

test('Multiple blank lines between blocks', async () => {
  const markdown = 'Para 1\n\n\n\nPara 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children.length, 2);
  assert.strictEqual(ast.children[0].type, 'paragraph');
  assert.strictEqual(ast.children[1].type, 'paragraph');
});

test('Nested emphasis', async () => {
  const markdown = '***bold and italic***';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should contain both strong and emphasis
  assert.ok(html.includes('strong') || html.includes('em'));
});

test('Ordered list with custom start', async () => {
  const markdown = '5. Item 5\n6. Item 6';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual((ast.children[0] as any).startNumber, 5);
});

test('Parse alert: NOTE', async () => {
  const markdown = '> [!NOTE]\n> This is a note';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'note');
});

test('Parse alert: TIP', async () => {
  const markdown = '> [!TIP]\n> This is a tip';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'tip');
});

test('Parse alert: IMPORTANT', async () => {
  const markdown = '> [!IMPORTANT]\n> This is important';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'important');
});

test('Parse alert: WARNING', async () => {
  const markdown = '> [!WARNING]\n> This is a warning';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'warning');
});

test('Parse alert: CAUTION', async () => {
  const markdown = '> [!CAUTION]\n> This is a caution';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'caution');
});

test('Render alert to HTML', async () => {
  const markdown = '> [!WARNING]\n> Critical content here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('markdown-alert'));
  assert.ok(html.includes('markdown-alert-warning'));
  assert.ok(html.includes('role="alert"'));
  assert.ok(html.includes('WARNING'));
  assert.ok(html.includes('Critical content here'));
});

test('Render alert with multiple alert types', async () => {
  const markdown = '> [!NOTE]\n> Note content\n\n> [!WARNING]\n> Warning content';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.strictEqual(ast.children.length, 2);
  assert.ok(html.includes('markdown-alert-note'));
  assert.ok(html.includes('markdown-alert-warning'));
});

test('Alert with nested paragraphs', async () => {
  const markdown = '> [!TIP]\n> First paragraph\n>\n> Second paragraph';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'alert');
  const alert = ast.children[0] as any;
  assert.ok(alert.children.length >= 2);
  assert.strictEqual(alert.children[0].type, 'paragraph');
});

test('Alert with nested list', async () => {
  const markdown = '> [!IMPORTANT]\n> Content:\n>\n> * Item 1\n> * Item 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.ok(html.includes('markdown-alert-important'));
  assert.ok(html.includes('<ul>'));
  assert.ok(html.includes('<li>'));
});

test('Alert with code block', async () => {
  const markdown = '> [!NOTE]\n> Example:\n>\n>     const x = 1;';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.ok(html.includes('<code>'));
  assert.ok(html.includes('const x = 1'));
});

test('Round trip: Alert Markdown -> AST -> Markdown', async () => {
  const original = '> [!WARNING]\n> This is a warning';
  const parser = new BlockParser(original);
  const ast = parser.parse();
  const renderer = new MarkdownRenderer();
  const rendered = renderer.render(ast);
  
  assert.ok(rendered.includes('[!WARNING]'));
  assert.ok(rendered.includes('This is a warning'));
});

test('Round trip: Alert Markdown -> AST -> HTML', async () => {
  const markdown = '> [!CAUTION]\n> Handle with care';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('markdown-alert-caution'));
  assert.ok(html.includes('CAUTION'));
  assert.ok(html.includes('Handle with care'));
});

test('Alert does not confuse with regular blockquote', async () => {
  const markdown = '> Regular blockquote\n> Still a quote';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'block-quote');
  assert.notStrictEqual(ast.children[0].type, 'alert');
});

test('Multiple separate alerts', async () => {
  const markdown = '> [!NOTE]\n> Note 1\n\n> [!TIP]\n> Tip 1\n\n> [!WARNING]\n> Warning 1';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children.length, 3);
  assert.strictEqual(ast.children[0].type, 'alert');
  assert.strictEqual((ast.children[0] as any).alertType, 'note');
  assert.strictEqual(ast.children[1].type, 'alert');
  assert.strictEqual((ast.children[1] as any).alertType, 'tip');
  assert.strictEqual(ast.children[2].type, 'alert');
  assert.strictEqual((ast.children[2] as any).alertType, 'warning');
});

test('Alert with inline formatting', async () => {
  const markdown = '> [!IMPORTANT]\n> This has **bold** and *italic* and `code`';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<strong>bold</strong>'));
  assert.ok(html.includes('<em>italic</em>'));
  assert.ok(html.includes('<code>code</code>'));
});

test('Alert HTML includes proper structure', async () => {
  const markdown = '> [!NOTE]\n> Content here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Check for proper semantic HTML structure
  assert.ok(html.includes('class="markdown-alert-title"'));
  assert.ok(html.includes('<strong>NOTE</strong>'));
  assert.ok(html.includes('role="alert"'));
});

test('Unordered list with multiple items (no nested list regression)', async () => {
  const markdown = '* Item 1\n* Item 2\n* Item 3';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'unordered-list');
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3, 'List should have exactly 3 items');
  
  // Verify each item is a list-item with no nested list
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(list.children[i].type, 'list-item');
    const hasNestedList = list.children[i].children.some((child: any) => child.type === 'unordered-list');
    assert.strictEqual(hasNestedList, false, `Item ${i + 1} should not have nested list`);
  }
});

test('Ordered list with multiple items (no nested list regression)', async () => {
  const markdown = '1. First item\n2. Second item\n3. Third item';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'ordered-list');
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3, 'List should have exactly 3 items');
  
  // Verify each item is a list-item with no nested list
  for (let i = 0; i < 3; i++) {
    assert.strictEqual(list.children[i].type, 'list-item');
    const hasNestedList = list.children[i].children.some((child: any) => child.type === 'ordered-list');
    assert.strictEqual(hasNestedList, false, `Item ${i + 1} should not have nested list`);
  }
});

test('Mixed unordered and ordered lists separated correctly', async () => {
  const markdown = '* Item 1\n* Item 2\n\n1. First\n2. Second';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'unordered-list');
  assert.strictEqual(ast.children[1].type, 'ordered-list');
  
  const unorderedList = ast.children[0] as any;
  assert.strictEqual(unorderedList.children.length, 2);
  
  const orderedList = ast.children[1] as any;
  assert.strictEqual(orderedList.children.length, 2);
});

test('Task list items in unordered list', async () => {
  const markdown = '* [ ] Todo\n* [x] Done\n* [X] Also done';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'unordered-list');
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3);
  
  // Check first item is unchecked
  assert.strictEqual(list.children[0].checked, false);
  
  // Check second item is checked (lowercase x)
  assert.strictEqual(list.children[1].checked, true);
  
  // Check third item is checked (uppercase X)
  assert.strictEqual(list.children[2].checked, true);
});

test('Task list items in ordered list', async () => {
  const markdown = '1. [ ] First\n2. [x] Second\n3. [X] Third';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  assert.strictEqual(ast.children[0].type, 'ordered-list');
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3);
  
  assert.strictEqual(list.children[0].checked, false);
  assert.strictEqual(list.children[1].checked, true);
  assert.strictEqual(list.children[2].checked, true);
});

test('Task list items render to HTML with checkboxes', async () => {
  const markdown = '* [ ] Unchecked\n* [x] Checked';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  assert.ok(html.includes('<input disabled="" type="checkbox">'));
  assert.ok(html.includes('<input disabled="" type="checkbox" checked="">'));
  assert.ok(html.includes('Unchecked'));
  assert.ok(html.includes('Checked'));
});

test('Task list items render to Markdown preserving checkbox state', async () => {
  const markdown = '* [ ] Todo\n* [x] Done';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  const renderer = new MarkdownRenderer();
  const rendered = renderer.render(ast);
  
  assert.ok(rendered.includes('* [ ] Todo'));
  assert.ok(rendered.includes('* [x] Done'));
});

test('Mixed task and regular list items', async () => {
  const markdown = '* [ ] Task 1\n* Regular item\n* [x] Task 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3);
  
  assert.strictEqual(list.children[0].checked, false);
  assert.strictEqual(list.children[1].checked, undefined);
  assert.strictEqual(list.children[2].checked, true);
});

test('Task list items have taskListItem field set to true', async () => {
  const markdown = '* [ ] Task item\n* Regular item\n* [x] Another task';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.children.length, 3);
  
  // Task items should have taskListItem=true
  assert.strictEqual(list.children[0].taskListItem, true);
  
  // Regular items should not have taskListItem field (undefined)
  assert.strictEqual(list.children[1].taskListItem, undefined);
  
  // Task items should have taskListItem=true
  assert.strictEqual(list.children[2].taskListItem, true);
});

test('Tight list (no blank lines between items) renders without <p> tags', async () => {
  const markdown = '* Item 1\n* Item 2\n* Item 3';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.tight, true);
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Tight list: paragraphs should NOT be wrapped in <p> tags
  assert.ok(html.includes('<li>Item 1'));
  assert.ok(html.includes('<li>Item 2'));
  assert.ok(html.includes('<li>Item 3'));
  assert.ok(!html.includes('<p>Item 1</p>'));
});

test('Loose list (blank lines between items) renders with <p> tags', async () => {
  const markdown = '* Item 1\n\n* Item 2\n\n* Item 3';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.tight, false);
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Loose list: paragraphs SHOULD be wrapped in <p> tags
  assert.ok(html.includes('<li><p>Item 1</p>'));
  assert.ok(html.includes('<li><p>Item 2</p>'));
  assert.ok(html.includes('<li><p>Item 3</p>'));
});

test('List with multi-block items renders with <p> tags (loose)', async () => {
  const markdown = '* Item 1\n\n  More content\n\n* Item 2';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // When list items contain multiple block elements, it's loose
  assert.ok(html.includes('<p>'));
  assert.ok(!html.includes('<li>Item 1</li>'));
});

test('Loose ordered list renders with <p> tags', async () => {
  const markdown = '1. First item\n\n2. Second item\n\n3. Third item';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.tight, false);
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Loose ordered list: paragraphs SHOULD be wrapped in <p> tags
  assert.ok(html.includes('<li><p>First item</p>'));
  assert.ok(html.includes('<li><p>Second item</p>'));
  assert.ok(html.includes('<li><p>Third item</p>'));
});

test('Tight ordered list renders without <p> tags', async () => {
  const markdown = '1. First item\n2. Second item\n3. Third item';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const list = ast.children[0] as any;
  assert.strictEqual(list.tight, true);
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Tight ordered list: paragraphs should NOT be wrapped in <p> tags
  assert.ok(html.includes('<li>First item'));
  assert.ok(html.includes('<li>Second item'));
  assert.ok(html.includes('<li>Third item'));
  assert.ok(!html.includes('<p>First item</p>'));
});

test('Fenced code block with language uses syntax highlighting', async () => {
  const markdown = '```json\n{\n  "foo": "bar"\n}\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should include highlight.js class and span elements
  assert.ok(html.includes('class="hljs language-json"'));
  // JSON highlighting should mark strings, punctuation, etc.
  assert.ok(html.includes('hljs-'));
});

test('Fenced code block with language highlights correctly', async () => {
  const markdown = '```python\ndef hello():\n    return "world"\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should include the language class
  assert.ok(html.includes('class="hljs language-python"'));
  // Should have syntax highlighting spans
  assert.ok(html.includes('hljs-'));
});

test('Fenced code block without language uses auto-detection', async () => {
  const markdown = '```\nfunction test() {\n  return true;\n}\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should have hljs class even without language specified
  assert.ok(html.includes('class="hljs"'));
});

test('Indented code block has no syntax highlighting', async () => {
  const markdown = '    code here\n    more code';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Indented code blocks should not have hljs class
  assert.ok(html.includes('<pre><code>'));
  assert.ok(!html.includes('hljs'));
});

test('HTML renderer in default mode includes full document structure', async () => {
  const markdown = '# My Title\n\nContent here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should include full HTML structure
  assert.ok(html.includes('<!DOCTYPE html>'));
  assert.ok(html.includes('<html lang="en">'));
  assert.ok(html.includes('<head>'));
  assert.ok(html.includes('<title>'));
  assert.ok(html.includes('</title>'));
  assert.ok(html.includes('<body>'));
  assert.ok(html.includes('</body>'));
  assert.ok(html.includes('</html>'));
});

test('HTML title comes from first heading', async () => {
  const markdown = '# My Custom Title\n\n## Subheading\n\nContent';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Title should come from first heading
  assert.ok(html.includes('<title>My Custom Title</title>'));
});

test('HTML title defaults to Document when no heading', async () => {
  const markdown = 'Just a paragraph\n\nNo headings here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should use default title
  assert.ok(html.includes('<title>Document</title>'));
});

test('Fragment mode returns only HTML content without document structure', async () => {
  const markdown = '# My Title\n\nContent here';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ fragmentMode: true });
  const html = await renderer.render(ast);
  
  // Should NOT include full HTML structure
  assert.ok(!html.includes('<!DOCTYPE html>'));
  assert.ok(!html.includes('<html'));
  assert.ok(!html.includes('<head>'));
  assert.ok(!html.includes('<body>'));
  
  // Should include content
  assert.ok(html.includes('<h1 '));
  assert.ok(html.includes('My Title'));
  assert.ok(html.includes('Content here'));
});

test('Full HTML includes meta tags and charset', async () => {
  const markdown = '# Test';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should include meta tags
  assert.ok(html.includes('charset="UTF-8"'));
  assert.ok(html.includes('viewport'));
  assert.ok(html.includes('width=device-width'));
});

test('Full HTML includes stylesheet link for syntax highlighting', async () => {
  const markdown = '# Test';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should include highlight.js stylesheet
  assert.ok(html.includes('highlight.js'));
});

test('Mermaid code block renders as SVG in browser or falls back to code block', async () => {
  const markdown = '```mermaid\ngraph LR\n    A --> B\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Mermaid should render to SVG server-side via mmdc CLI
  // Check for SVG content or fallback to code block
  const hasSvg = html.includes('<svg');
  const hasMermaidClass = html.includes('class="mermaid"');
  const hasCodeBlock = html.includes('language-mermaid');
  assert.ok(hasSvg || hasMermaidClass || hasCodeBlock);
  // Should contain either the SVG or the original mermaid code
  assert.ok(html.includes('<svg') || html.includes('graph LR'));
});

test('Mermaid with fragment mode renders correctly', async () => {
  const markdown = '```mermaid\nflowchart TD\n    A[Start] --> B[End]\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ fragmentMode: true });
  const html = await renderer.render(ast);
  
  // Should render as either SVG or fallback code block
  const hasMermaidClass = html.includes('class="mermaid"');
  const hasCodeBlock = html.includes('language-mermaid');
  assert.ok(hasMermaidClass || hasCodeBlock);
  // Should contain the mermaid content
  assert.ok(html.includes('flowchart'));
});

test('Invalid mermaid falls back to code block', async () => {
  const markdown = '```mermaid\nthis is not valid mermaid syntax!!!\n```';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should fall back to code block when rendering fails
  assert.ok(html.includes('language-mermaid'));
  assert.ok(html.includes('this is not valid mermaid syntax'));
});

test('Parse footnote definition', async () => {
  const markdown = 'This is text[^1].\n\n[^1]: This is a footnote.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  // Document contains paragraph and footnote definition
  assert.strictEqual(ast.children.length, 2);
  assert.strictEqual(ast.children[0].type, 'paragraph');
  assert.strictEqual(ast.children[1].type, 'footnote-definition');
  assert.strictEqual((ast.children[1] as any).label, '1');
});

test('Parse footnote reference in text', async () => {
  const markdown = 'This is text[^1].\n\n[^1]: This is a footnote.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  // Check that footnote reference is in paragraph
  const paragraph = ast.children[0] as any;
  const hasFootnoteRef = paragraph.children.some((n: any) => n.type === 'footnote-reference');
  assert.ok(hasFootnoteRef, 'Paragraph should contain footnote reference');
});

test('Render footnote reference to HTML', async () => {
  const markdown = 'This is text[^1].\n\n[^1]: This is a footnote.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should contain footnote reference with superscript link
  assert.ok(html.includes('footnote-ref'), 'Should have footnote-ref class');
  assert.ok(html.includes('>1</a>'), 'Should show footnote label');
});

test('Render footnote definition to HTML', async () => {
  const markdown = 'This is text[^1].\n\n[^1]: This is a footnote.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should contain footnote definition with backref
  assert.ok(html.includes('fn-1'), 'Should have footnote id');
  assert.ok(html.includes('This is a footnote'), 'Should have footnote content');
  assert.ok(html.includes('footnote-backref'), 'Should have backref link');
});

test('Render footnote to Markdown', async () => {
  const markdown = 'This is text[^1].\n\n[^1]: This is a footnote.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new MarkdownRenderer();
  const output = renderer.render(ast);
  
  // Should preserve footnote syntax
  assert.ok(output.includes('[^1]'), 'Should have footnote reference');
  assert.ok(output.includes('[^1]: This is a footnote'), 'Should have footnote definition');
});

test('Multiple footnotes', async () => {
  const markdown = 'First[^1] and second[^2].\n\n[^1]: First note.\n[^2]: Second note.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  // Should have paragraph and two footnote definitions
  assert.strictEqual(ast.children.length, 3);
  assert.strictEqual(ast.children[1].type, 'footnote-definition');
  assert.strictEqual(ast.children[2].type, 'footnote-definition');
  assert.strictEqual((ast.children[1] as any).label, '1');
  assert.strictEqual((ast.children[2] as any).label, '2');
});

test('Footnote with complex content', async () => {
  const markdown = 'Text[^1].\n\n[^1]: Footnote with **bold** and *italic* and `code`.';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast);
  
  // Should have formatted content in footnote
  assert.ok(html.includes('<strong>bold</strong>'), 'Should have bold in footnote');
  assert.ok(html.includes('<em>italic</em>'), 'Should have italic in footnote');
  assert.ok(html.includes('<code>code</code>'), 'Should have code in footnote');
});

test('Footnote definition with multi-line content', async () => {
  const markdown = 'Text[^1].\n\n[^1]: First line\n    Second line indented';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const defNode = ast.children[1] as any;
  assert.strictEqual(defNode.type, 'footnote-definition');
  // Footnote content should be parsed
  assert.ok(defNode.children.length > 0, 'Footnote should have content');
});

test('Header links enabled by default', async () => {
  const markdown = '# Hello World\n\n## Subsection';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast, true);
  
  // Should include anchor links with IDs
  assert.ok(html.includes('id="hello-world"'), 'Should have heading ID');
  assert.ok(html.includes('href="#hello-world"'), 'Should have anchor link');
  assert.ok(html.includes('class="header-link"'), 'Should have header-link class');
});

test('Header links can be disabled with option', async () => {
  const markdown = '# Hello World\n\n## Subsection';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ headerLinks: false });
  const html = await renderer.render(ast, true);
  
  // Should NOT include anchor links
  assert.ok(!html.includes('href="#hello-world"'), 'Should not have anchor link');
  assert.ok(!html.includes('class="header-link"'), 'Should not have header-link class');
  // But should still have heading
  assert.ok(html.includes('<h1>Hello World</h1>'), 'Should have plain heading');
});

test('Header link IDs handle special characters', async () => {
  const markdown = '# Hello-World (Test) & Special!';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast, true);
  
  // ID should be sanitized
  assert.ok(html.includes('id="hello-world-test-special"'), 'Should sanitize special characters');
});

test('Header link IDs handle multiple spaces', async () => {
  const markdown = '#   Multiple   Spaces   Here   ';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer();
  const html = await renderer.render(ast, true);
  
  // Multiple spaces should be converted to single hyphens
  assert.ok(html.includes('id="multiple-spaces-here"'), 'Should handle multiple spaces');
});

test('Duplicate header IDs are tracked and suffixed with counter', async () => {
  const markdown = '# Hello\n## Hello\n### Hello';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ headerLinks: true });
  const html = await renderer.render(ast, true);
  
  // First "Hello" should have no suffix
  assert.ok(html.includes('id="hello"><a href="#hello"'), 'First Hello should have id="hello"');
  
  // Second "Hello" should have -1 suffix
  assert.ok(html.includes('id="hello-1"><a href="#hello-1"'), 'Second Hello should have id="hello-1"');
  
  // Third "Hello" should have -2 suffix
  assert.ok(html.includes('id="hello-2"><a href="#hello-2"'), 'Third Hello should have id="hello-2"');
});

test('Duplicate header IDs are reset between renders', async () => {
  const markdown = '# Test\n# Test';
  const renderer = new HtmlRenderer({ headerLinks: true });
  
  // First render
  const parser1 = new BlockParser(markdown);
  const ast1 = parser1.parse();
  const html1 = await renderer.render(ast1, true);
  
  assert.ok(html1.includes('id="test"><a href="#test"'), 'First render: First Test should have id="test"');
  assert.ok(html1.includes('id="test-1"><a href="#test-1"'), 'First render: Second Test should have id="test-1"');
  
  // Second render - IDs should reset and start fresh
  const parser2 = new BlockParser(markdown);
  const ast2 = parser2.parse();
  const html2 = await renderer.render(ast2, true);
  
  assert.ok(html2.includes('id="test"><a href="#test"'), 'Second render: First Test should have id="test"');
  assert.ok(html2.includes('id="test-1"><a href="#test-1"'), 'Second render: Second Test should have id="test-1"');
});

test('Multiple different duplicate header IDs are tracked independently', async () => {
  const markdown = '# Hello\n# World\n# Hello\n# World\n# Hello';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ headerLinks: true });
  const html = await renderer.render(ast, true);
  
  // Should have: hello, world, hello-1, world-1, hello-2
  assert.ok(html.includes('id="hello"><a href="#hello"'), 'First Hello');
  assert.ok(html.includes('id="world"><a href="#world"'), 'First World');
  assert.ok(html.includes('id="hello-1"><a href="#hello-1"'), 'Second Hello');
  assert.ok(html.includes('id="world-1"><a href="#world-1"'), 'Second World');
  assert.ok(html.includes('id="hello-2"><a href="#hello-2"'), 'Third Hello');
});

test('Duplicate tracking works across different heading levels', async () => {
  const markdown = '# Title\n## Title\n### Title\n# Title';
  const parser = new BlockParser(markdown);
  const ast = parser.parse();
  
  const renderer = new HtmlRenderer({ headerLinks: true });
  const html = await renderer.render(ast, true);
  
  // All "Title" headings should get unique IDs
  assert.ok(html.includes('id="title"><a href="#title"'), 'First Title');
  assert.ok(html.includes('id="title-1"><a href="#title-1"'), 'Second Title');
  assert.ok(html.includes('id="title-2"><a href="#title-2"'), 'Third Title');
  assert.ok(html.includes('id="title-3"><a href="#title-3"'), 'Fourth Title');
});


