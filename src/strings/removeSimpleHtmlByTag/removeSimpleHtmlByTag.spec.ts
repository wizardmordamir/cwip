import { removeSimpleHtmlByTag } from '.';

describe('removeSimpleHtmlByTag', () => {
  it('should remove HTML tags from a string', () => {
    const input = '<div>Hello</div> World';
    const result = removeSimpleHtmlByTag(input, 'div');
    expect(result).toEqual('World');
  });

  it('should handle self-closing tags', () => {
    const input = 'Hello <br /> World';
    const result = removeSimpleHtmlByTag(input, 'br');
    expect(result).toEqual('Hello  World');
  });

  it('should handle multiple occurrences of the same tag', () => {
    const input = '<p>Para1</p><p>Para2</p>';
    const result = removeSimpleHtmlByTag(input, 'p');
    expect(result).toEqual('');
  });

  it('should return the original string if the tag is not found', () => {
    const input = '<div>Hello</div> World';
    const result = removeSimpleHtmlByTag(input, 'span');
    expect(result).toEqual(input);
  });

  it('should return non-string inputs unchanged', () => {
    expect(removeSimpleHtmlByTag(42 as any, 'div')).toEqual(42);
    expect(removeSimpleHtmlByTag(true as any, 'div')).toEqual(true);
    expect(removeSimpleHtmlByTag(null as any, 'div')).toEqual(null);
    expect(removeSimpleHtmlByTag(undefined as any, 'div')).toEqual(undefined);
    expect(removeSimpleHtmlByTag({} as any, 'div')).toEqual({});
  });

  it('should handle html with many tags and duplicates', () => {
    const input = `
      <div>
        <p>Hello <span>World</span></p>
        <p>This is a <a href="#">link</a></p>
        <br />
        <img src="image.jpg" />
      </div>
    `;
    let result = removeSimpleHtmlByTag(input, 'p');
    expect(result).toEqual(
      `
<div>
<br />
<img src="image.jpg" />
</div>
`.trim(),
    );

    result = removeSimpleHtmlByTag(result, 'span');
    expect(result).toEqual(
      `
<div>
<br />
<img src="image.jpg" />
</div>
`.trim(),
    );

    result = removeSimpleHtmlByTag(result, 'a');
    expect(result).toEqual(
      `
<div>
<br />
<img src="image.jpg" />
</div>
`.trim(),
    );

    result = removeSimpleHtmlByTag(result, 'br');
    expect(result).toEqual(
      `
<div>

<img src="image.jpg" />
</div>
`.trim(),
    );

    result = removeSimpleHtmlByTag(result, 'img');
    expect(result).toEqual(
      `
<div>


</div>
`.trim(),
    );

    result = removeSimpleHtmlByTag(result, 'div');
    expect(result).toEqual('');
  });
});
