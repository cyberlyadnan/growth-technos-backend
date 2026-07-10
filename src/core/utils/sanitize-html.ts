import sanitizeHtml from 'sanitize-html';

const allowedTags = [
  ...sanitizeHtml.defaults.allowedTags,
  'img',
  'iframe',
  'div',
  'span',
  'mark',
  'h1',
  'h2',
  'h3',
  'h4',
  'table',
  'thead',
  'tbody',
  'tr',
  'th',
  'td',
  'hr',
  'pre',
  'code',
];

export function sanitizeBlogHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags,
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel', 'class', 'data-type'],
      img: ['src', 'alt', 'title', 'width', 'height', 'class', 'loading', 'style'],
      iframe: ['src', 'width', 'height', 'allow', 'allowfullscreen', 'frameborder', 'class'],
      div: ['class', 'data-type', 'style'],
      span: ['class', 'style'],
      p: ['class', 'style'],
      h1: ['id', 'class', 'style'],
      h2: ['id', 'class', 'style'],
      h3: ['id', 'class', 'style'],
      h4: ['id', 'class', 'style'],
      table: ['class', 'style'],
      th: ['class', 'style', 'colspan', 'rowspan'],
      td: ['class', 'style', 'colspan', 'rowspan'],
      code: ['class'],
      pre: ['class'],
      '*': ['class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      iframe: ['http', 'https'],
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }),
    },
  });
}
