import type { DecklistParseResult } from './decklist';
import type { ResolveResult, ResolvedEntry } from './scryfall';

export interface PipelineErrorSummary {
  /** Line numbers that failed to parse or resolve, for highlighting. */
  badLines: Set<number>;
  /** Line number -> specific failure reason, for hover tooltips. */
  reasons: Map<number, string>;
  /** Total number of entries that could not be included. */
  count: number;
}

/**
 * Summarizes every parsing/lookup failure from a full parse+resolve pass into the data
 * App.vue needs to highlight bad lines and show a count, without dropping or blocking the
 * entries that succeeded — see decklist-parsing and card-data-lookup specs' "does not
 * abort/block the rest" requirements.
 */
export function summarizePipelineErrors(
  parse: DecklistParseResult,
  resolve: ResolveResult,
): PipelineErrorSummary {
  const badLines = new Set<number>();
  const reasons = new Map<number, string>();

  for (const { line, text } of parse.unparseableLines) {
    badLines.add(line);
    reasons.set(line, `Could not parse line: "${text}"`);
  }
  for (const { entry, reason } of resolve.unresolved) {
    badLines.add(entry.line);
    reasons.set(entry.line, reason);
  }

  return { badLines, reasons, count: parse.unparseableLines.length + resolve.unresolved.length };
}

/** Repeats each resolved entry `entry.quantity` times, preserving order, for per-copy rendering. */
export function expandByQuantity(resolved: ResolvedEntry[]): ResolvedEntry[] {
  const expanded: ResolvedEntry[] = [];
  for (const item of resolved) {
    for (let i = 0; i < item.entry.quantity; i++) expanded.push(item);
  }
  return expanded;
}
