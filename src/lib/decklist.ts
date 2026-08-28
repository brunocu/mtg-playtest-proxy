export type EntryKind = 'card' | 'token' | 'emblem';

export interface DecklistEntry {
  kind: EntryKind;
  quantity: number;
  name: string;
  flavorName?: string;
  line: number;
}

export interface UnparseableLine {
  line: number;
  text: string;
}

export interface DecklistParseResult {
  entries: DecklistEntry[];
  unparseableLines: UnparseableLine[];
}

// [qty]['x'] ['(token)'|'(emblem)'] Name [ '[' Flavor Name ']' ]
const LINE_RE =
  /^\s*(?:(\d+)\s*x?\s+)?(?:\((token|emblem)\)\s+)?([^[\]]+?)(?:\s*\[([^[\]]+)\])?\s*$/i;

export function parseDecklist(text: string): DecklistParseResult {
  const entries: DecklistEntry[] = [];
  const unparseableLines: UnparseableLine[] = [];

  const rawLines = text.split(/\r?\n/);
  for (let i = 0; i < rawLines.length; i++) {
    const rawLine = rawLines[i];
    const lineNumber = i + 1;
    const line = rawLine.trim();
    if (line.length === 0) continue;

    const match = LINE_RE.exec(line);
    const name = match?.[3]?.trim();
    if (!match || !name) {
      unparseableLines.push({ line: lineNumber, text: rawLine });
      continue;
    }

    const [, qtyStr, kindStr, , flavorStr] = match;
    const entry: DecklistEntry = {
      kind: (kindStr?.toLowerCase() as EntryKind) ?? 'card',
      quantity: qtyStr ? parseInt(qtyStr, 10) : 1,
      name,
      line: lineNumber,
    };
    const flavorName = flavorStr?.trim();
    if (flavorName) entry.flavorName = flavorName;

    entries.push(entry);
  }

  return { entries, unparseableLines };
}
