#!/usr/bin/env node

/**
 * Command-line interface for the Markdown parser using Commander.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";

import {
  BlockParser,
  HtmlRenderer,
  MarkdownRenderer,
  Document,
} from "./index.js";

// Get the directory of the current module to access package.json
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read version from package.json
function getVersion(): string {
  try {
    const packageJsonPath = path.join(__dirname, "../package.json");
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.version;
  } catch {
    return "unknown";
  }
}

async function main(): Promise<void> {
  const program = new Command();

  program
    .name("markdown-parser")
    .description(
      "A GitHub-flavored Markdown parser that converts Markdown to AST, HTML, or Markdown",
    )
    .version(getVersion())
    .usage("[options]");

  program
    .option("-m, --markdown-in <path>", "Read Markdown from file")
    .option("-i, --ast-in <path>", "Read AST from JSON file")
    .option("-a, --ast-out <path>", "Write AST as JSON to file")
    .option("--html-out <path>", "Write HTML to file")
    .option("-d, --markdown-out <path>", "Write Markdown to file")
    .option("--css-out <path>", "Write default CSS to file")
    .option("--css-in <path>", "Read CSS from file and embed in HTML")
    .option(
      "--fragment",
      "Only render HTML content without full document structure",
    )
    .option("--dark-mode", "Use dark mode theme when rendering HTML")
    .option(
      "--no-header-links",
      "Suppress header anchor links when rendering HTML",
    );

  program.addHelpText(
    "after",
    `
Examples:
  Parse Markdown and output AST:
    $ markdown-parser --markdown-in input.md

  Parse and render to HTML (with full document structure and header links):
    $ markdown-parser --markdown-in input.md --html-out output.html

  Parse and render to HTML with dark mode:
    $ markdown-parser --markdown-in input.md --html-out output.html --dark-mode

  Parse and render to HTML without header links:
    $ markdown-parser --markdown-in input.md --html-out output.html --no-header-links

  Parse and render to HTML fragment only:
    $ markdown-parser --markdown-in input.md --html-out output.html --fragment

  Extract default CSS to file:
    $ markdown-parser --css-out styles.css

  Use custom CSS when rendering HTML:
    $ markdown-parser --markdown-in input.md --html-out output.html --css-in custom.css

  Convert between formats:
    $ markdown-parser --markdown-in input.md --markdown-out output.md

  Load AST and render to HTML:
    $ markdown-parser --ast-in ast.json --html-out output.html

Description:
  Parses Markdown to an Abstract Syntax Tree (AST) and optionally renders it
  to HTML or Markdown format. At least one input source (--markdown-in or
  --ast-in) must be provided. If no output options are specified, the AST is
  printed to stdout as JSON.

  HTML output includes a full HTML document structure by default, with the
  title taken from the first Markdown heading. Use --fragment to output only
  the HTML content without the document wrapper.

  By default, headers include GitHub-style anchor links for easy linking and
  navigation. Use --no-header-links to disable this feature.

  Use --dark-mode to render HTML with a dark theme for better readability in
  low-light conditions.

  Use --css-out to extract the default CSS to a file for customization.
  Use --css-in to specify a custom CSS file to embed in the HTML output.
`,
  );

  program.parse(process.argv);

  const options = program.opts();

  try {
    // Handle CSS output independently (no input needed)
    if (options.cssOut) {
      const cssContent = options.darkMode
        ? HtmlRenderer.getDarkModeCss()
        : HtmlRenderer.getDefaultCss();
      fs.writeFileSync(options.cssOut, cssContent);

      // If CSS output is the only operation, we're done
      if (
        !options.astOut &&
        !options.htmlOut &&
        !options.markdownOut &&
        !options.markdownIn &&
        !options.astIn
      ) {
        return;
      }
    }

    let ast: Document;

    // Parse Markdown or load AST
    if (options.markdownIn) {
      const markdown = fs.readFileSync(options.markdownIn, "utf-8");
      const parser = new BlockParser(markdown);
      ast = parser.parse();
    } else if (options.astIn) {
      const astJson = fs.readFileSync(options.astIn, "utf-8");
      ast = JSON.parse(astJson);
    } else {
      console.error("Error: Either --markdown-in or --ast-in must be provided");
      program.help();
      process.exit(1);
    }

    // Output AST as JSON
    if (options.astOut) {
      fs.writeFileSync(options.astOut, JSON.stringify(ast, null, 2));
    }

    // Render as HTML
    if (options.htmlOut) {
      const renderer = new HtmlRenderer({
        fragmentMode: options.fragment ?? false,
        darkMode: options.darkMode ?? false,
        customCss: options.cssIn
          ? fs.readFileSync(options.cssIn, "utf-8")
          : undefined,
        headerLinks: options.headerLinks ?? true,
      });
      const html = await renderer.render(ast);
      fs.writeFileSync(options.htmlOut, html);
    }

    // Render as Markdown
    if (options.markdownOut) {
      const renderer = new MarkdownRenderer();
      const markdown = renderer.render(ast);
      fs.writeFileSync(options.markdownOut, markdown);
    }

    // If no output options, print AST to stdout
    if (!options.astOut && !options.htmlOut && !options.markdownOut) {
      console.log(JSON.stringify(ast, null, 2));
    }
  } catch (error) {
    console.error(
      "Error:",
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

main();
