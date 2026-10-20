#!/usr/bin/env node
// CSS compatibility check against the oldest Android WebView the app supports.
//
// Phones update their WebView, emulators and older devices often do not: a
// feature the WebView does not know makes it drop the whole declaration (the
// turn glow vanished on the MuMu emulator because of color-mix()). Tests run
// in a current Chromium and cannot see this, so this script checks the
// stylesheets instead:
//
//   - a declaration using a feature newer than MIN_WEBVIEW must follow a
//     declaration of the same property without it (the fallback);
//   - selectors and at-rules newer than MIN_WEBVIEW are not allowed at all.
//
// It also keeps the stacking order in one place: every z-index must come from
// the --z-* scale in src/styles/tokens.css.
//
// Usage: node scripts/check-css-compat.mjs [dir ...]   (default: src)
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

/** Oldest supported Android System WebView (Chromium) major version. */
export const MIN_WEBVIEW = 105;

// Value features: [name, first Chromium version, pattern].
const VALUE_FEATURES = [
  ["color-mix()", 111, /\bcolor-mix\(/],
  ["light-dark()", 123, /\blight-dark\(/],
  ["relative colour (from)", 119, /\b(?:rgb|hsl|oklch|oklab|lab|lch|hwb)\(\s*from\b/],
  ["linear() easing", 113, /\blinear\(/],
  ["round() / mod() / rem()", 125, /\b(?:round|mod|rem)\(/],
  ["dynamic viewport units (dvh, svh, lvh, ...)", 108, /\d(?:dvh|svh|lvh|dvw|svw|lvw|dvi|dvb)\b/],
  ["lh / rlh units", 109, /\d(?:r?lh)\b/],
  ["text-wrap", 114, /^\s*text-wrap\s*:/],
  ["field-sizing", 123, /^\s*field-sizing\s*:/],
  ["anchor positioning", 125, /\banchor\(|^\s*anchor-name\s*:|^\s*position-anchor\s*:/],
];

// Rule-level features: no fallback possible.
const RULE_FEATURES = [
  ["CSS nesting (&)", 112, /&/],
  ["@scope", 118, /@scope\b/],
  ["@starting-style", 117, /@starting-style\b/],
  ["@property", 85, /@property\b/],
];

function cssFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return name === "node_modules" ? [] : cssFiles(p);
    return p.endsWith(".css") ? [p] : [];
  });
}

/** Comments out, line numbers kept. */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
}

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

/**
 * Innermost blocks: { selector/at-rule prelude, body, offset of the body }.
 * Good enough for our stylesheets (no braces inside strings).
 */
function blocks(text) {
  const out = [];
  const stack = [];
  let preludeStart = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "{") {
      stack.push({ open: i, prelude: text.slice(preludeStart, i).trim(), hasChild: false });
      if (stack.length > 1) stack[stack.length - 2].hasChild = true;
      preludeStart = i + 1;
    } else if (ch === "}") {
      const b = stack.pop();
      if (b && !b.hasChild) out.push({ prelude: b.prelude, body: text.slice(b.open + 1, i), offset: b.open + 1 });
      preludeStart = i + 1;
    } else if (ch === ";" && stack.length === 0) {
      preludeStart = i + 1;
    }
  }
  return out;
}

/** Declarations of a block body: { prop, value, offset }. */
function declarations(body) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if ((ch === ";" && depth === 0) || i === body.length) {
      const decl = body.slice(start, i);
      const colon = decl.indexOf(":");
      if (colon > 0 && decl.trim()) {
        out.push({ prop: decl.slice(0, colon).trim().toLowerCase(), value: decl.slice(colon + 1), raw: decl, offset: start });
      }
      start = i + 1;
    }
  }
  return out;
}

const newer = (list) => list.filter(([, since]) => since > MIN_WEBVIEW);

export function check(dirs) {
  const problems = [];
  const valueFeatures = newer(VALUE_FEATURES);
  const ruleFeatures = newer(RULE_FEATURES);
  for (const dir of dirs) {
    for (const file of cssFiles(dir)) {
      const text = stripComments(readFileSync(file, "utf8"));
      const where = (index) => `${relative(process.cwd(), file)}:${lineOf(text, index)}`;
      // Selectors and at-rules.
      for (const [name, since, re] of ruleFeatures) {
        const m = re.exec(text.replace(/"[^"]*"|'[^']*'/g, (s) => " ".repeat(s.length)));
        if (m) problems.push(`${where(m.index)}: ${name} needs WebView ${since}+, the minimum is ${MIN_WEBVIEW}`);
      }
      // Declarations: a newer feature needs an earlier fallback of the same property.
      for (const block of blocks(text)) {
        const decls = declarations(block.body);
        decls.forEach((d, k) => {
          if (d.prop === "z-index" && !/var\(--z-/.test(d.value)) {
            problems.push(`${where(block.offset + d.offset)}: z-index must use the --z-* scale (tokens.css), not "${d.value.trim()}"`);
          }
          const used = valueFeatures.filter(([, , re]) => re.test(d.raw));
          if (!used.length) return;
          const hasFallback = decls
            .slice(0, k)
            .some((e) => e.prop === d.prop && !valueFeatures.some(([, , re]) => re.test(e.raw)));
          if (!hasFallback) {
            const [name, since] = used[0];
            problems.push(
              `${where(block.offset + d.offset)}: "${d.prop}" uses ${name} (WebView ${since}+) with no fallback ` +
                `declaration before it; the minimum is WebView ${MIN_WEBVIEW}`,
            );
          }
        });
      }
    }
  }
  return problems;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const dirs = process.argv.slice(2);
  const problems = check(dirs.length ? dirs : ["src"]);
  if (problems.length) {
    console.error(`CSS compatibility (Android WebView ${MIN_WEBVIEW}+): ${problems.length} problem(s)`);
    for (const p of problems) console.error("  " + p);
    process.exit(1);
  }
  console.log(`CSS compatibility (Android WebView ${MIN_WEBVIEW}+): ok`);
}
