"use strict";
// Utility function to remove specific HTML tags from a string.
// Does not handle nested tags or complex HTML structures.
// Does not maintain formatting or whitespace outside of removed tags.
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeSimpleHtmlByTag = void 0;
// Removes a specific HTML tag and its content from a string, or just the tag if it's self-closing.
// Example: removeSimpleHtmlByTag("<div>Hello</div> World", "div") -> "World"
// Example: removeSimpleHtmlByTag("Hello <br /> World", "br") -> "Hello  World"
// Example with multiples of same tag: removeSimpleHtmlByTag("<p>Para1</p><p>Para2</p>", "p") -> ""
const removeSimpleHtmlByTag = (value, tag) => {
    if (typeof value !== 'string')
        return value;
    const selfClosingTags = ['br', 'img', 'hr', 'input', 'meta', 'link'];
    if (selfClosingTags.includes(tag.toLowerCase())) {
        const selfClosingTagRegex = new RegExp(`<${tag}[^>]*\\/?>`, 'gi');
        return value.replace(selfClosingTagRegex, '').trim();
    }
    // Remove opening/closing tags and all content (including whitespace/newlines) between them
    const regex = new RegExp(`<${tag}[^>]*>[\\s\\S]*?<\\/${tag}>`, 'gi');
    let result = value.replace(regex, '');
    // Remove lines that are now empty or only whitespace
    result = result
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join('\n');
    return result.trim();
};
exports.removeSimpleHtmlByTag = removeSimpleHtmlByTag;
