/**
 * Utility functions for the Markdown parser
 */

export function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

export function isWhitespaceNoNewline(char: string): boolean {
  return /[ \t\r]/.test(char);
}

export function isAsciiDigit(char: string): boolean {
  return /\d/.test(char);
}

export function isAsciiLetter(char: string): boolean {
  return /[a-zA-Z]/.test(char);
}

export function isAsciiAlphanumeric(char: string): boolean {
  return /[a-zA-Z0-9]/.test(char);
}

export function isPunctuation(char: string): boolean {
  return /[!-\/:-@\[-`{-~]/.test(char);
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
  };
  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'g'), char);
  }
  return result;
}

export function normalizeLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[\s]+/g, ' ');
}

export interface LineInfo {
  content: string;
  indent: number;
  isBlank: boolean;
  lineNumber: number;
}

export function parseLines(markdown: string): LineInfo[] {
  const lines = markdown.split(/\r\n|\r|\n/);
  return lines.map((content, index) => {
    const leadingSpaces = content.match(/^ */)?.[0].length || 0;
    const isBlank = /^\s*$/.test(content);
    return {
      content,
      indent: leadingSpaces,
      isBlank,
      lineNumber: index,
    };
  });
}

export function stripIndent(content: string, indent: number): string {
  if (indent === 0) return content;
  const lines = content.split('\n');
  return lines
    .map(line => {
      if (line.length === 0) return line;
      return line.substring(Math.min(indent, line.length));
    })
    .join('\n');
}

/**
 * Generates a GitHub-style heading ID from heading text.
 * Converts text to lowercase, removes HTML tags, replaces spaces with hyphens,
 * and removes most special characters.
 * @param text - The heading text (may contain HTML tags)
 * @returns {string} The generated heading ID
 */
export function generateHeadingId(text: string): string {
  // Remove HTML tags and entities
  let cleanText = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&[a-z]+;/g, '') // Remove HTML entities like &amp;
    .trim();
  
  // Convert to lowercase and replace spaces with hyphens
  let id = cleanText
    .toLowerCase()
    .replace(/\s+/g, '-')
    // Remove most special characters, keeping only alphanumeric and hyphens
    .replace(/[^\w\-]/g, '')
    // Replace multiple consecutive hyphens with single hyphen
    .replace(/\-+/g, '-')
    // Remove leading and trailing hyphens
    .replace(/^\-+|\-+$/g, '');
  
  return id;
}
