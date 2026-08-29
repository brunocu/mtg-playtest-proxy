<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { ensureFontsLoaded, renderCardImages, type RenderOptions } from './lib/render-card';
import { buildPrintPdf, type PageFormat } from './lib/pdf';
import { parseDecklist } from './lib/decklist';
import { ScryfallClient, resolveDecklist } from './lib/scryfall';
import { summarizePipelineErrors, expandByQuantity, type PipelineErrorSummary } from './lib/deck-pipeline';

/** Must match .decklist-input/.decklist-backdrop padding in the <style> block below. */
const TEXTAREA_PADDING_PX = 2;

const decklistText = ref('');
const textareaRef = ref<HTMLTextAreaElement | null>(null);
const lineHeightPx = ref(24);
const scrollTopPx = ref(0);
const hoveredLine = ref<number | null>(null);
const tooltipPos = ref({ x: 0, y: 0 });

const useIconSymbols = ref(true);
const coloredBorders = ref(false);
const small = ref(false);
const fullArtLands = ref(false);
const ignoreLands = ref(false);
const generateTokens = ref(false);
const pageFormat = ref<PageFormat>('letter');
const noCardSpace = ref(true);

const currentRenderOptions = computed<RenderOptions>(() => ({
  useIconSymbols: useIconSymbols.value,
  coloredBorders: coloredBorders.value,
  scale: small.value ? 0.75 : 1,
  fullArtBasicLands: fullArtLands.value,
  ignoreBasicLands: ignoreLands.value,
}));

const currentPrintOptions = computed(() => ({
  pageFormat: pageFormat.value,
  noCardSpace: noCardSpace.value,
}));

const generating = ref(false);
const statusMessage = ref('');
const renderProgress = ref<{ current: number; total: number } | null>(null);
const errorMessage = ref<string | null>(null);
const errorSummary = ref<PipelineErrorSummary>({ badLines: new Set(), reasons: new Map(), count: 0 });

const badLineNumbers = computed(() => [...errorSummary.value.badLines]);

watch(decklistText, () => {
  errorSummary.value = { badLines: new Set(), reasons: new Map(), count: 0 };
  hoveredLine.value = null;
});

const statusText = computed(() => {
  if (renderProgress.value !== null) {
    return `Rendering cards… (${renderProgress.value.current} of ${renderProgress.value.total})`;
  }
  return statusMessage.value;
});

onMounted(() => {
  if (!textareaRef.value) return;
  const lineHeight = parseFloat(getComputedStyle(textareaRef.value).lineHeight);
  if (!Number.isNaN(lineHeight)) lineHeightPx.value = lineHeight;
});

function reasonForLine(line: number): string {
  return errorSummary.value.reasons.get(line) ?? '';
}

function onDecklistScroll(): void {
  if (textareaRef.value) {
    scrollTopPx.value = textareaRef.value.scrollTop;
  }
}

function onDecklistMouseMove(e: MouseEvent): void {
  if (!textareaRef.value) return;
  const rect = textareaRef.value.getBoundingClientRect();
  const y = e.clientY - rect.top - TEXTAREA_PADDING_PX + textareaRef.value.scrollTop;
  const line = Math.floor(y / lineHeightPx.value) + 1;
  if (errorSummary.value.badLines.has(line)) {
    hoveredLine.value = line;
    tooltipPos.value = { x: e.clientX, y: e.clientY };
  } else {
    hoveredLine.value = null;
  }
}

function onDecklistMouseLeave(): void {
  hoveredLine.value = null;
}

async function generateAndDownload(): Promise<void> {
  generating.value = true;
  errorSummary.value = { badLines: new Set(), reasons: new Map(), count: 0 };
  errorMessage.value = null;
  renderProgress.value = null;
  statusMessage.value = 'Parsing decklist…';

  try {
    await ensureFontsLoaded();

    const parseResult = parseDecklist(decklistText.value);
    if (parseResult.entries.length === 0 && parseResult.unparseableLines.length === 0) {
      statusMessage.value = 'Paste a decklist first.';
      return;
    }

    statusMessage.value = 'Looking up card data on Scryfall…';
    const client = new ScryfallClient();
    const resolveResult = await resolveDecklist(parseResult.entries, client, {
      generateTokens: generateTokens.value,
    });

    const summary = summarizePipelineErrors(parseResult, resolveResult);
    errorSummary.value = summary;

    if (summary.count > 0) {
      statusMessage.value = '';
      return;
    }

    statusMessage.value = 'Rendering cards…';
    const renderOptions = currentRenderOptions.value;
    const expanded = expandByQuantity(resolveResult.resolved);
    renderProgress.value = { current: 0, total: expanded.length };
    const canvases: HTMLCanvasElement[] = [];
    for (const { entry, card } of expanded) {
      canvases.push(...renderCardImages(entry, card, renderOptions));
      renderProgress.value = { current: renderProgress.value.current + 1, total: expanded.length };
    }
    renderProgress.value = null;

    if (canvases.length === 0) {
      statusMessage.value = 'Nothing to render (all entries were basic lands).';
      return;
    }

    statusMessage.value = 'Building PDF…';
    const doc = buildPrintPdf(canvases, currentPrintOptions.value);
    doc.save('proxy-cards.pdf');
    statusMessage.value = `Done! ${canvases.length} card${canvases.length === 1 ? '' : 's'} generated.`;
  } catch (err) {
    renderProgress.value = null;
    statusMessage.value = '';
    errorMessage.value = `Error: ${err instanceof Error ? err.message : String(err)}`;
  } finally {
    generating.value = false;
  }
}
</script>

<template>
  <div class="app-header">
    <h1 class="heading">MTG Playtest Proxy</h1>
    <p class="body-text intro-text">
      Generate printable, ink-friendly Magic: The Gathering proxy cards for playtesting.
      <br />
      Paste a decklist below, choose your options, and download a print-ready PDF card sheet.
      <br />
      Print in regular office paper and slide into a regular card sleeve for play! For the same weight and feel as a real card, you can also sleeve your printed proxy with a bulk common behind it.
    </p>
  </div>

  <main class="app-body">
    <div class="decklist-wrap">
      <div class="decklist-backdrop">
        <div class="decklist-backdrop-inner line-font" :style="{ transform: `translateY(${-scrollTopPx}px)` }">
          <div
            v-for="ln in badLineNumbers"
            :key="ln"
            class="decklist-highlight-band"
            :style="{ top: `${lineHeightPx * (ln - 1)}px`, height: `${lineHeightPx}px` }"
          ></div>
        </div>
      </div>
      <textarea
        ref="textareaRef"
        v-model="decklistText"
        class="decklist-input line-font"
        placeholder="4 Lightning Bolt&#10;1 Grizzly Bears [Big Angry Bear]&#10;(token) Soldier&#10;2x (emblem) Elspeth, Sun's Champion"
        @scroll="onDecklistScroll"
        @mousemove="onDecklistMouseMove"
        @mouseleave="onDecklistMouseLeave"
      ></textarea>
      <div
        v-if="hoveredLine !== null"
        class="decklist-tooltip"
        :style="{ left: `${tooltipPos.x + 14}px`, top: `${tooltipPos.y + 19}px` }"
      >
        {{ reasonForLine(hoveredLine) }}
      </div>
    </div>

    <div class="options-column">
      <fieldset class="body-text options-fieldset">
        <legend>Advanced options</legend>
        <label><input v-model="useIconSymbols" type="checkbox" /> Use mana symbols (uncheck for text-only like <code>{W}</code>)</label><br />
        <label><input v-model="coloredBorders" type="checkbox" /> Color borders</label><br />
        <label><input v-model="small" type="checkbox" /> Small card size</label><br />
        <label><input v-model="fullArtLands" type="checkbox" /> Blank basic lands (draw your own!)</label><br />
        <label><input v-model="ignoreLands" type="checkbox" /> Ignore basic lands</label><br />
        <label><input v-model="generateTokens" type="checkbox" /> Generate tokens</label>
      </fieldset>

      <fieldset class="body-text options-fieldset">
        <legend>Print sheet options</legend>
        <label>Page format:
          <select v-model="pageFormat">
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </label><br />
        <label><input v-model="noCardSpace" type="checkbox" /> No space between cards</label>
      </fieldset>

      <p class="body-text print-guidance">
        When printing this PDF, set your print dialog to "Actual size" / "100%" scale (not "Fit to page").
      </p>

      <button class="generate-button" :disabled="generating" @click="generateAndDownload">Generate PDF</button>

      <div class="body-text status-text">{{ statusText }}</div>

      <div v-if="errorMessage" class="body-text error-message">{{ errorMessage }}</div>

      <p v-if="errorSummary.count > 0" class="body-text error-summary">
        Error resolving {{ errorSummary.count }} card{{ errorSummary.count === 1 ? '' : 's'}}.
        Hover over highlighted line(s) for details.
      </p>
    </div>
  </main>

  <footer class="body-text app-footer">
    <p>
      Unofficial Fan Content under the
      <a href="https://company.wizards.com/en/legal/fancontentpolicy" target="_blank" rel="noopener">Wizards of the Coast Fan Content Policy</a>.
      Card data from <a href="https://scryfall.com" target="_blank" rel="noopener">Scryfall</a>.
      Project license: <a href="https://github.com/brunocu/mtg-playtest-proxy/blob/main/LICENSE" target="_blank" rel="noopener">MIT</a>.
      Source: <a href="https://github.com/brunocu/mtg-playtest-proxy" target="_blank" rel="noopener">GitHub</a>.
    </p>
  </footer>
</template>

<style scoped>
.heading {
  font-family: 'Roboto Slab', serif;
  margin: 0 0 5px;
}

.body-text {
  font-family: Lora, serif;
}

.app-header {
  min-width: 0;
}

.intro-text {
  margin: 0;
}

.app-body {
  display: grid;
  grid-template-columns: 1fr 384px;
  gap: 29px;
  min-height: 0;
}

.decklist-wrap {
  position: relative;
  min-height: 0;
  height: 100%;
}

.line-font {
  font: 17px/24px monospace;
  white-space: pre;
}

.decklist-backdrop {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  pointer-events: none;
  border: 1px solid transparent;
  box-sizing: border-box;
  padding: 2px;
}

.decklist-backdrop-inner {
  position: relative;
}

.decklist-highlight-band {
  position: absolute;
  left: 0;
  right: 0;
  background: rgba(170, 0, 0, 0.18);
}

.decklist-input {
  position: relative;
  z-index: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding: 2px;
  background: transparent;
  overflow: auto;
  resize: none;
}

.decklist-tooltip {
  position: fixed;
  z-index: 10;
  width: max-content;
  padding: 5px 10px;
  background: #222;
  color: #fff;
  font-family: Lora, serif;
  font-size: 0.8em;
  white-space: nowrap;
  border-radius: 5px;
  pointer-events: none;
}

.options-column {
  overflow: auto;
  min-height: 0;
}

.options-fieldset {
  margin-top: 0;
  margin-bottom: 14px;
}

.print-guidance {
  font-size: 0.85em;
  color: #555;
}

.generate-button {
  font-size: 1.1em;
  padding: 10px 19px;
}

.status-text {
  margin-top: 10px;
}

.error-message,
.error-summary {
  color: #a00;
  margin-top: 14px;
}

.app-footer {
  font-size: 0.78em;
  color: #666;
  border-top: 1px solid #ccc;
  padding-top: 7px;
}

.app-footer p {
  margin: 0;
}

@media (max-width: 960px) {
  .app-body {
    display: block;
  }

  .decklist-wrap {
    height: 312px;
    margin-bottom: 19px;
  }

  .options-column {
    overflow: visible;
  }
}
</style>
