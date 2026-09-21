import assert from "node:assert/strict";
import { test } from "node:test";
import katex from "katex";
import { completeStreamingMath, normalizeMathDelimiters } from "../components/repeat/math-markdown";

test("normalizes display and inline delimiters without changing programming examples", () => {
  assert.equal(normalizeMathDelimiters(String.raw`Find \(x^2\). \[\frac{1}{2}\]`), "Find $x^2$. \n$$\n\\frac{1}{2}\n$$\n");
  const code = "```python\n" + String.raw`value = "\(x\)"` + "\n```";
  assert.equal(normalizeMathDelimiters(code), code);
});

test("streaming matrices stay hidden until their closing math delimiter arrives", () => {
  const partial = String.raw`Apply elimination. \[\begin{bmatrix}1 & 2\\`;
  assert.deepEqual(completeStreamingMath(partial), { text: "Apply elimination. ", pending: true });
  const completed = partial + String.raw`3 & 4\end{bmatrix}\]`;
  assert.deepEqual(completeStreamingMath(completed), { text: completed, pending: false });
});

test("streaming keeps completed equations while waiting for the next one", () => {
  const source = "First $$x=2$$. Then $$y=";
  assert.deepEqual(completeStreamingMath(source), { text: "First $$x=2$$. Then ", pending: true });
});

test("streaming inline math and escaped currency are distinguished", () => {
  assert.deepEqual(completeStreamingMath("Cost \\$5 and $x="), { text: "Cost \\$5 and ", pending: true });
  assert.equal(completeStreamingMath(String.raw`Use \(x=2\).`).pending, false);
});

test("dollar characters in fenced code do not hide a programming answer", () => {
  const source = "```sh\necho $VALUE\n```\nDone.";
  assert.deepEqual(completeStreamingMath(source), { text: source, pending: false });
  const inline = "Use `echo $VALUE` to read it.";
  assert.deepEqual(completeStreamingMath(inline), { text: inline, pending: false });
});

test("chemical equations render with the bundled mhchem extension", () => {
  assert.match(katex.renderToString(String.raw`\ce{2H2 + O2 -> 2H2O}`, { throwOnError: true }), /katex/);
});
