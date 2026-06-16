// Utility function to remove specific HTML tags from a string.
// Does not handle nested tags or complex HTML structures.
// Does not maintain formatting or whitespace outside of removed tags.

// Removes a specific HTML tag and its content from a string, or just the tag if it's self-closing.
// Example: removeSimpleHtmlByTag("<div>Hello</div> World", "div") -> "World"
// Example: removeSimpleHtmlByTag("Hello <br /> World", "br") -> "Hello  World"
// Example with multiples of same tag: removeSimpleHtmlByTag("<p>Para1</p><p>Para2</p>", "p") -> ""
export const removeSimpleHtmlByTag = <T>(value: T, tag: string): T extends string ? string : T => {
  // We have to cast to 'any' inside the function because the logic is string-specific
  if (typeof value !== 'string') return value as any;

  const selfClosingTags = ['br', 'img', 'hr', 'input', 'meta', 'link'];

  let result: string;
  if (selfClosingTags.includes(tag.toLowerCase())) {
    const selfClosingTagRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
    result = value.replace(selfClosingTagRegex, '').trim();
  } else {
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    result = value
      .replace(regex, '')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  return result.trim() as any;
};
