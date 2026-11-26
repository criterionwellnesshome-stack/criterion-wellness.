import sanitizeHtml from 'sanitize-html';

export function sanitizeArticleHtml(dirtyHtml) {
  if (!dirtyHtml) return '';

  return sanitizeHtml(dirtyHtml, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'b', 'i', 'strong', 'em', 'u', 'strike',
      'blockquote', 'ul', 'ol', 'li',
      'a', 'img', 'figure', 'figcaption',
      'br', 'hr', 'span', 'div'
    ],
    allowedAttributes: {
      'a': ['href', 'target', 'rel', 'title'],
      'img': ['src', 'alt', 'title', 'width', 'height', 'class', 'style', 'loading'],
      'span': ['class', 'style'],
      'p': ['class', 'style'],
      'h1': ['class', 'style'],
      'h2': ['class', 'style'],
      'h3': ['class', 'style'],
      'h4': ['class', 'style'],
      'blockquote': ['class', 'style'],
      'div': ['class', 'style'],
      'figure': ['class', 'style'],
      'figcaption': ['class', 'style']
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      img: ['http', 'https', 'data']
    },
    transformTags: {
      'a': (tagName, attribs) => {
        if (attribs.target === '_blank') {
          attribs.rel = 'noopener noreferrer';
        }
        return { tagName, attribs };
      },
      'img': (tagName, attribs) => {
        attribs.loading = 'lazy';
        return { tagName, attribs };
      }
    }
  });
}

export function calculateReadingTime(html) {
  if (!html) return 1;
  // Strip HTML tags to count words
  const text = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  const wordCount = text ? text.split(/\s+/).length : 0;
  // Standard reading speed: 200 words per minute
  return Math.max(1, Math.ceil(wordCount / 200));
}

export function generateSlug(title) {
  if (!title) return '';
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // remove non-alphanumeric except space and hyphen
    .replace(/[\s_-]+/g, '-')  // replace spaces and underscores with single hyphen
    .replace(/^-+|-+$/g, '');  // trim leading and trailing hyphens
}
