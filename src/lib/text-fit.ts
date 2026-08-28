// Shrink-to-fit text sizing, reimplemented from bwproxy's fitOneLine/fitMultiLine
// (drawUtil.py) using measurement-driven sizing instead of ported thresholds, per
// design.md: bwproxy's thresholds were tuned for its specific bundled fonts.

export type MeasureWidth = (text: string, fontSize: number) => number;

const MIN_FONT_SIZE = 4;

/** Shrinks fontSize by 1 until `text` fits within maxWidth, or MIN_FONT_SIZE is hit. */
export function fitOneLine(
  measureWidth: MeasureWidth,
  text: string,
  maxWidth: number,
  startFontSize: number,
): number {
  let fontSize = startFontSize;
  while (fontSize > MIN_FONT_SIZE && measureWidth(text, fontSize) > maxWidth) {
    fontSize -= 1;
  }
  return fontSize;
}

export interface MultiLineFit {
  fontSize: number;
  /** One paragraph (bwproxy "rule") per outer array entry, already word-wrapped into lines. */
  paragraphs: string[][];
}

/**
 * Word-wraps each `\n`-separated paragraph to maxWidth at decreasing font sizes until the
 * total wrapped block fits maxHeight (approximated as fontSize * lineHeightFactor per line,
 * across all lines including one blank line of spacing between paragraphs, matching
 * bwproxy's "\n\n".join(rules) behavior).
 */
export function fitMultiLine(
  measureWidth: MeasureWidth,
  text: string,
  maxWidth: number,
  maxHeight: number,
  startFontSize: number,
  lineHeightFactor = 1.2,
): MultiLineFit {
  let fontSize = startFontSize;

  while (fontSize > MIN_FONT_SIZE) {
    const paragraphs = text.split('\n').map((rule) => wrapWords(measureWidth, rule, maxWidth, fontSize));
    const totalLines =
      paragraphs.reduce((sum, lines) => sum + lines.length, 0) + Math.max(0, paragraphs.length - 1);
    const totalHeight = totalLines * fontSize * lineHeightFactor;

    if (totalHeight <= maxHeight || fontSize <= MIN_FONT_SIZE + 1) {
      return { fontSize, paragraphs };
    }
    fontSize -= 1;
  }

  return { fontSize, paragraphs: text.split('\n').map((rule) => [rule]) };
}

function wrapWords(measureWidth: MeasureWidth, rule: string, maxWidth: number, fontSize: number): string[] {
  const words = rule.split(' ');
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (current && measureWidth(candidate, fontSize) > maxWidth) {
      lines.push(current);
      current = word;
    } else {
      current = candidate;
    }
  }
  lines.push(current);
  return lines;
}
