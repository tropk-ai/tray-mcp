// HTML sanitizer used by the SEO accordion tool.
//
// We deliberately constrain the allowed tag/attribute surface to the markup
// required by the Tray storefront FAQ accordion pattern. Anything outside the
// whitelist is dropped to keep merchant-generated HTML safe to embed inside
// `Category.description`.

import sanitizeHtml from "sanitize-html";

const ALLOWED_TAGS = [
  "h2",
  "h3",
  "h4",
  "p",
  "strong",
  "em",
  "ul",
  "ol",
  "li",
  "a",
  "img",
  "details",
  "summary",
  "blockquote",
  "br",
];

const ALLOWED_ATTRIBUTES: sanitizeHtml.IOptions["allowedAttributes"] = {
  a: ["href", "title", "rel", "target"],
  img: ["src", "alt", "width", "height"],
  details: ["name", "open"],
  "*": ["style"],
};

const ALLOWED_SCHEMES = ["http", "https", "mailto"];

const DISALLOWED_TAGS_MODE: sanitizeHtml.IOptions["disallowedTagsMode"] =
  "discard";

/**
 * Sanitize merchant-authored HTML for inclusion in a Tray category description.
 *
 * - Removes `<script>`, `<style>`, `<iframe>` and any tag not in the whitelist.
 * - Restricts attributes to safe subsets per-tag.
 * - Restricts URL schemes to http/https/mailto.
 */
export function sanitize(html: string): string {
  if (!html) return "";
  return sanitizeHtml(html, {
    allowedTags: ALLOWED_TAGS,
    allowedAttributes: ALLOWED_ATTRIBUTES,
    allowedSchemes: ALLOWED_SCHEMES,
    allowedSchemesByTag: {
      a: ALLOWED_SCHEMES,
      img: ["http", "https", "data"],
    },
    disallowedTagsMode: DISALLOWED_TAGS_MODE,
    // Anything not in `allowedTags` is removed entirely (including children of
    // `<script>`, `<style>`, `<iframe>`).
    exclusiveFilter: (frame) => {
      const blocked = new Set(["script", "style", "iframe"]);
      return blocked.has(frame.tag);
    },
  });
}

/**
 * Escape plain text for safe inclusion as HTML text (used inside `<summary>`).
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
