// Renders the stock list for download, as JSON or CSV.

export function stockJson(inventory) {
  return JSON.stringify(
    inventory.map((i) => ({
      id: i.id,
      name: i.name,
      current: i.current,
      minLevel: i.minLevel,
      targetLevel: i.targetLevel,
      weeklyUsage: i.weeklyUsage,
      cost: i.cost,
      price: i.price,
      category: i.category,
    })),
    null,
    2,
  );
}

const csvCell = (v) => {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function stockCsv(inventory, t) {
  const header = [t('Item'), t('In stock'), t('Minimum'), t('Target'), t('This week'), t('Cost'), t('Price')];
  const rows = inventory.map((i) => [i.name, i.current, i.minLevel, i.targetLevel ?? '', i.weeklyUsage, i.cost, i.price]);
  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
}
