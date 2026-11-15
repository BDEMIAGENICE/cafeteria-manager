// Writes the app's stock and prices into a SumUp "items export" CSV, so the file can go
// back into SumUp's item import. Only the Quantity and Price cells of matched rows change;
// every other column, and every row the app doesn't know, stays as SumUp wrote it.
import { COLS, nameKey, num, parseCsv } from './importStock.js';

const quote = (cell) => (/[",\r\n]|^\s|\s$/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell);

// Keeps the decimal separator the file already uses in that cell.
const formatLike = (value, original, decimals) => {
  const text = decimals ? value.toFixed(decimals) : String(value);
  return /^\s*-?\d+,\d/.test(original ?? '') ? text.replace('.', ',') : text;
};

// Returns { text, updated, missing, skipped }: the new file, how many rows changed, the
// products that have no row in the file, and the rows SumUp doesn't track stock for.
export function planExport(text, inventory) {
  const rows = parseCsv(text);
  const [header] = rows;
  const idx = {};
  for (const [k, label] of Object.entries(COLS)) idx[k] = header?.indexOf(label) ?? -1;
  if (idx.name < 0 || idx.quantity < 0) throw new Error('Not a SumUp items export (columns "Item name" and "Quantity" are required).');

  // Same matching as the import: SumUp item id first, then the name.
  const byExternal = new Map(inventory.filter((p) => p.externalId).map((p) => [p.externalId, p]));
  const byName = new Map(inventory.map((p) => [nameKey(p.name), p]));

  const seen = new Set();
  const used = new Set();
  let updated = 0;
  const skipped = [];
  for (const line of rows.slice(1)) {
    const name = (line[idx.name] ?? '').trim().replace(/\s+/g, ' ');
    if (!name) continue;
    if (idx.track >= 0 && /^no$/i.test((line[idx.track] ?? '').trim())) {
      skipped.push(name);
      continue;
    }
    const externalId = idx.id >= 0 ? (line[idx.id] ?? '').trim() || null : null;
    const key = externalId ?? nameKey(name);
    // The import only reads the first row of an item, so only that row is written back.
    if (seen.has(key)) continue;
    seen.add(key);

    const product = (externalId && byExternal.get(externalId)) || byName.get(nameKey(name));
    if (!product) continue;
    used.add(product.id);

    const before = line.slice();
    while (line.length < header.length) line.push('');
    line[idx.quantity] = formatLike(product.current, before[idx.quantity], 0);
    // 0 means no price in the app: leave SumUp's price alone rather than selling for free.
    if (idx.price >= 0 && product.price > 0 && num(line[idx.price]) !== Number(product.price)) {
      line[idx.price] = formatLike(Number(product.price), before[idx.price], 2);
    }
    if (line.some((cell, i) => cell !== (before[i] ?? ''))) updated++;
  }

  const eol = text.includes('\r\n') ? '\r\n' : '\n';
  const bom = text.startsWith('\uFEFF') ? '\uFEFF' : '';
  return {
    text: bom + rows.map((r) => r.map(quote).join(',')).join(eol) + eol,
    updated,
    missing: inventory.filter((p) => !used.has(p.id)).map((p) => p.name),
    skipped,
  };
}
