import sanitizeHtml from "sanitize-html";

/**
 * Sanitize admin-authored rich text (TipTap HTML) before rendering it via
 * `dangerouslySetInnerHTML`. Authorship is admin-only today, so this is
 * defense-in-depth — it strips `<script>`, event handlers, and `javascript:`
 * URLs while preserving the formatting TipTap actually emits.
 */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "br", "hr", "blockquote", "pre", "code", "span", "div",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "ul", "ol", "li",
    "strong", "b", "em", "i", "u", "s", "strike", "sub", "sup", "mark",
    "a", "img",
    "table", "thead", "tbody", "tr", "th", "td",
    "figure", "figcaption",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel", "title"],
    img: ["src", "alt", "title", "width", "height"],
    span: ["style"],
    p: ["style"],
    "*": ["class"],
  },
  // Block javascript:/data: URLs; allow images from https + data URIs only.
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowProtocolRelative: false,
  // Force safe rel on links that open a new tab.
  transformTags: {
    a: (tagName, attribs) => {
      if (attribs.target === "_blank") {
        attribs.rel = "noopener noreferrer nofollow";
      }
      return { tagName, attribs };
    },
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
