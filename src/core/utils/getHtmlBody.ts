export const getHtmlBody = (html: string): string => {
  const loweredHtml = html.toLowerCase();

  const bodyStartTag = '<body>';
  const bodyOpenStartTag = '<body'; // body can be <body ...>
  const bodyEndTag = '</body>';

  let bodyStartIndex: number = loweredHtml.indexOf(bodyStartTag);

  if (bodyStartIndex === -1) {
    bodyStartIndex = loweredHtml.indexOf(bodyOpenStartTag);
    if (bodyStartIndex === -1) {
      return html;
    }
    const bodyStartTagCloseIndex = loweredHtml.indexOf('>', bodyStartIndex);
    if (bodyStartTagCloseIndex !== -1) {
      bodyStartIndex = bodyStartTagCloseIndex + 1;
    }
  } else {
    bodyStartIndex += bodyStartTag.length;
  }
  const bodyEndIndex: number = loweredHtml.indexOf(bodyEndTag, bodyStartIndex);

  if (bodyStartIndex === -1 || bodyEndIndex === -1) {
    return html; // Return original if body tags not found
  }

  // Extract content between body tags, remove the tags, and collapse all whitespace
  return html
    .slice(bodyStartIndex, bodyEndIndex)
    .replace(/\s+/g, ' ') // Replace all whitespace sequences with a single space
    .trim();
};
