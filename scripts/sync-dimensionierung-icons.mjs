import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const sourcePath =
  process.env.HERO_RECHNER_PREVIEW ||
  '/Users/benjaminbendler/Library/CloudStorage/GoogleDrive-b.bendler@herowerk.de/Meine Ablage/HeroPlan/11_Produkt/Vorschau_Rechner-Fragestrecke_HERO.html';
const targetPath = process.env.HERO_RECHNER_HTML || path.resolve('dimensionierung.html');
const checkOnly = process.argv.includes('--check');

function startsOf(html, marker) {
  const starts = [];
  let offset = 0;
  while ((offset = html.indexOf(marker, offset)) !== -1) {
    starts.push(offset);
    offset += marker.length;
  }
  return starts;
}

function titleFrom(segment) {
  const match = segment.match(/<(?:span|div) class="opt-title"[^>]*>([\s\S]*?)<\/(?:span|div)>/);
  return match?.[1].replace(/<[^>]+>/g, '').trim() || '';
}

function iconFrom(segment, className) {
  const pattern = new RegExp(`<(span|div) class="${className}">([\\s\\S]*?)<\\/\\1>`);
  const match = segment.match(pattern);
  return match
    ? {
        start: match.index,
        end: match.index + match[0].length,
        content: match[2],
      }
    : null;
}

function cardsFrom(html) {
  const starts = [...html.matchAll(/<div class="wizard-option(?: selected)?"/g)].map(
    (match) => match.index
  );
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? html.length;
    const segment = html.slice(start, end);
    return { start, end, segment, title: titleFrom(segment), icon: iconFrom(segment, 'opt-icon') };
  });
}

function countersFromSource(html) {
  const starts = startsOf(html, '<div class="vs-cnt">');
  return starts.map((start, index) => {
    const end = starts[index + 1] ?? html.length;
    const segment = html.slice(start, end);
    return { title: titleFrom(segment), icon: iconFrom(segment, 'vs-zsym') };
  });
}

function targetCounter(html, title) {
  const labelMarker = `<span>${title}</span>`;
  const labelIndex = html.indexOf(labelMarker);
  if (labelIndex === -1) throw new Error(`Zähler fehlt in der Umsetzung: ${title}`);
  const cardStart = html.lastIndexOf('<div class="wz-counter-card', labelIndex);
  const cardEnd = html.indexOf('</div>', labelIndex);
  const segment = html.slice(cardStart, cardEnd);
  const icon = iconFrom(segment, 'wz-counter-icon');
  return {
    start: cardStart,
    icon: icon
      ? { start: cardStart + icon.start, end: cardStart + icon.end, content: icon.content }
      : null,
  };
}

function occurrenceKeys(items) {
  const counts = new Map();
  return items.map((item) => {
    const occurrence = (counts.get(item.title) || 0) + 1;
    counts.set(item.title, occurrence);
    return { ...item, key: `${item.title}#${occurrence}` };
  });
}

function applyEdits(html, edits) {
  return edits
    .sort((a, b) => b.start - a.start)
    .reduce(
      (result, edit) => result.slice(0, edit.start) + edit.text + result.slice(edit.end),
      html
    );
}

function synchronizedHtml(source, targetHtml) {
  const sourceCards = occurrenceKeys(cardsFrom(source));
  const targetCards = occurrenceKeys(cardsFrom(targetHtml));

  const sourceByKey = new Map(sourceCards.map((card) => [card.key, card]));
  const titleAliases = new Map([['Heizkörper und Fußbodenheizung#1', 'Beides gemischt#1']]);
  const edits = [];
  for (const targetCard of targetCards) {
    const sourceCard = sourceByKey.get(titleAliases.get(targetCard.key) || targetCard.key);
    if (!sourceCard) {
      if (targetCard.icon) {
        edits.push({
          start: targetCard.start + targetCard.icon.start,
          end: targetCard.start + targetCard.icon.end,
          text: '',
        });
      }
      continue;
    }
    if (sourceCard.icon) {
      const replacement = `<span class="opt-icon">${sourceCard.icon.content}</span>`;
      if (targetCard.icon) {
        edits.push({
          start: targetCard.start + targetCard.icon.start,
          end: targetCard.start + targetCard.icon.end,
          text: replacement,
        });
      } else {
        const openingEnd = targetCard.segment.indexOf('>') + 1;
        edits.push({
          start: targetCard.start + openingEnd,
          end: targetCard.start + openingEnd,
          text: replacement,
        });
      }
    } else if (targetCard.icon) {
      edits.push({
        start: targetCard.start + targetCard.icon.start,
        end: targetCard.start + targetCard.icon.end,
        text: '',
      });
    }
  }

  const sourceCounters = countersFromSource(source);
  for (const sourceCounter of sourceCounters) {
    const targetMatch = targetCounter(targetHtml, sourceCounter.title);
    if (sourceCounter.icon) {
      const replacement = `<span class="wz-counter-icon">${sourceCounter.icon.content}</span>`;
      if (!targetMatch.icon) throw new Error(`Symbolplatz fehlt am Zähler: ${sourceCounter.title}`);
      edits.push({ start: targetMatch.icon.start, end: targetMatch.icon.end, text: replacement });
    } else if (targetMatch.icon) {
      edits.push({ start: targetMatch.icon.start, end: targetMatch.icon.end, text: '' });
    }
  }

  return {
    html: applyEdits(targetHtml, edits).replace(/[ \t]+$/gm, ''),
    cardCount: sourceCards.length,
    cardIconCount: sourceCards.filter((card) => card.icon).length,
    counterIconCount: sourceCounters.filter((counter) => counter.icon).length,
  };
}

const source = fs.readFileSync(sourcePath, 'utf8');
const target = fs.readFileSync(targetPath, 'utf8');
const result = synchronizedHtml(source, target);

if (checkOnly) {
  if (result.html !== target) {
    console.error('FAIL Symbole der Dimensionierung weichen von Fassung 7 ab.');
    process.exit(1);
  }
} else {
  fs.writeFileSync(targetPath, result.html);
}

console.log(
  `PASS Fassung 7: ${result.cardIconCount} von ${result.cardCount} Kartensymbolen und ${result.counterIconCount} Zählersymbole zeichengleich.`
);
