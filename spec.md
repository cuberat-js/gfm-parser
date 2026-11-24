# Markdown Parser

`markdownjs` is an application, implemented in TypeScript, that:

* Parses a GitHub-flavored Markdown file (filename provided on the command-line via the `--markdown-in` option) and generates an AST representing the Markdown document. If a filename is provided by the `--ast-out` command-line option, output the AST in JSON format to that file. If a filename is provided by the `--html-out` command-line option, render the AST as HTML. Render the AST as Markdown if a Markdown file name is specified by the `--markdown-out` option.
* Given an AST (via a file specified by the `--ast-in` option) in JSON format, renders the AST as HTML if an HTML file name is specified by the `--html-out` option, or as Markdown if a Markdown file name is specified by the `--markdown-out` option.

## Command-line Option Parsing

The application uses [Commander.js](https://www.npmjs.com/package/commander) to parse command-line options. Include a help message that is output to standard output when either the `-h` or `--help` option is provided on the command-line.

## AST

AST is an abstract syntax tree representing the Markdown document. The nodes in the AST contain enough information to render the Markdown in its original form from the AST, as well as to render the AST as HTML. Information in the AST includes source line numbers, the type of node, as well as the more general structure type (e.g., block, leaf block, container block, inline), as well as any other information required to render the AST as HTML or Markdown.

## Markdown Parsing

The application implements the GitHub-flavored Markdown parser from first principles using the specifications from the [GitHub Flavored Markdown Spec](https://github.github.com/gfm/). It does not use a third-party Markdown parser.

Unit tests are implemented for every scenario mentioned in the [GitHub Flavored Markdown Spec](https://github.github.com/gfm/) to ensure full implementation of the specification. This includes tests that prove the HTML rendering matches the [GitHub Flavored Markdown Spec](https://github.github.com/gfm/).

## Rendering

The application supports rendering an AST as Markdown or HTML. In both cases, it supports extensions (specific to the output format), in the form of functions, that facilitate the following:

* Modify any part of an AST node just before rendering.
* Override the output when rendering a node, with the ability to fallback to the default.

### Safety

Ensure that HTML output is safely encoded such that it does not conflict with HTML tags.

## Makefile

Create a Makefile with two targets:

* `build`: builds the application.
* `install`: installs the application.
* `test`: runs the unit tests.
