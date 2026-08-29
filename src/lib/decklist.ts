export type EntryKind = 'card' | 'token' | 'emblem';

export interface DecklistEntry {
  kind: EntryKind;
  quantity: number;
  name: string;
  flavorName?: string;
  line: number;
  powerToughness?: { power: string; toughness: string };
  colors?: string[];
  abilityHints?: string[];
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

// Optional 'P/T' then optional color letters, at the start of a token line's name portion.
const TOKEN_HINT_RE = /^(?:(\d+\/\d+)\s+)?(?:([WUBRGC]+)\s+)?(.*)$/i;

// Trailing '<ability, ability>' list on a token line.
const ABILITY_HINT_RE = /\s*<([^<>]+)>\s*$/;

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
    const kind = (kindStr?.toLowerCase() as EntryKind) ?? 'card';
    const entry: DecklistEntry = {
      kind,
      quantity: qtyStr ? parseInt(qtyStr, 10) : 1,
      name,
      line: lineNumber,
    };

    if (kind === 'token') {
      let rest = name;
      const abilityMatch = ABILITY_HINT_RE.exec(rest);
      if (abilityMatch) {
        entry.abilityHints = abilityMatch[1].split(',').map((s) => s.trim()).filter(Boolean);
        rest = rest.slice(0, abilityMatch.index).trim();
      }

      const hintMatch = TOKEN_HINT_RE.exec(rest);
      if (hintMatch) {
        const [, ptStr, colorStr, restName] = hintMatch;
        if (ptStr) {
          const [power, toughness] = ptStr.split('/');
          entry.powerToughness = { power, toughness };
        }
        if (colorStr) {
          entry.colors = colorStr.toUpperCase().split('');
        }
        entry.name = restName.trim();
      }

      if (!entry.name) {
        unparseableLines.push({ line: lineNumber, text: rawLine });
        continue;
      }
    } else {
      const flavorName = flavorStr?.trim();
      if (flavorName) entry.flavorName = flavorName;
    }

    entries.push(entry);
  }

  return { entries, unparseableLines };
}
