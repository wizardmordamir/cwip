import { describe, expect, it } from 'bun:test';
import { getHtmlBody } from './getHtmlBody';

const exampleLongHtml = `
<head>
<meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
<title>Error 500 Request failed.</title>
</head>
<body><h2>HTTP ERROR 500</h2>
<p>Problem accessing /api/some/path. Reason:
<pre>    Request failed.</pre></p>
</body>
</html>
, stack:
<meta http-equiv="Content-Type" content="text/html;charset=utf-8"/>
<title>Error 500 Request failed.</title>
</head>
<body><h2>HTTP ERROR 500</h2>
<p>Problem accessing /api/some/path. Reason:
<pre>    Request failed.</pre></p>
</body>
</html>`;

describe('getHtmlBody', () => {
  it('should extract content between <body> tags and remove extra whitespace', () => {
    const html = '<html><body>  <p>  Hello World  </p> </body></html>';
    const result = getHtmlBody(html);
    expect(result).toBe('<p> Hello World </p>');
  });

  it('should return original string if <body> tags not found', () => {
    const html = 'Hello World';
    const result = getHtmlBody(html);
    expect(result).toBe(html);
  });

  it('should parse body only html', () => {
    const html = '<body>  <p>  Hello World  </p> </body>';
    const result = getHtmlBody(html);
    expect(result).toBe('<p> Hello World </p>');
  });

  it('should parse body with start tag not immediately closed', () => {
    const html = '<body some="value">  <p>  Hello World  </p> </body>';
    const result = getHtmlBody(html);
    expect(result).toBe('<p> Hello World </p>');
  });

  it('should find body in long html', () => {
    const result = getHtmlBody(exampleLongHtml);
    const expected =
      '<h2>HTTP ERROR 500</h2> <p>Problem accessing /api/some/path. Reason: <pre> Request failed.</pre></p>';
    expect(result).toBe(expected);
  });
});
