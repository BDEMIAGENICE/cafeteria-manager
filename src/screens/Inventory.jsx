import { useState } from 'react';
import Dialog from '../Dialog.jsx';
import { useT } from '../i18n.jsx';
import { planImport } from '../importStock.js';
import { planExport } from '../exportStock.js';
import { buildShoppingList, shoppingListText } from '../shoppingList.js';
import { DRIVE_SITES } from '../driveSites.js';
import { todayKey } from '../dates.js';
import Michel from '../Michel.jsx';
import CountUp from '../CountUp.jsx';
import Menu from '../Menu.jsx';

// Empty field = no target.
const readTarget = (value) => (value === '' || value == null ? null : Math.max(0, Number(value)));

// 0 means no price set, the same rule as the public stock page.
const formatPrice = (price) => (price > 0 ? `€${Number(price).toFixed(2)}` : '—');

// Empty field = no price, stored as 0.
const readPrice = (value) => (value === '' || value == null ? 0 : Math.max(0, Number(value)));

const downloadFile = (filename, content, mime) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  // Revoking right after click() can cancel the download in some browsers.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Inventory({ inventory, adjustStock, importProducts, setTargets, setStocks, setPrices, canEdit }) {
  const { t, lang } = useT();
  const [adjusting, setAdjusting] = useState(null);
  const [editingTargets, setEditingTargets] = useState(false);
  const [editingStocks, setEditingStocks] = useState(false);
  const [editingPrices, setEditingPrices] = useState(false);
  const [shopping, setShopping] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(null);
  const [importing, setImporting] = useState(false);
  const [plan, setPlan] = useState(null);
  const [importError, setImportError] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [exportPlan, setExportPlan] = useState(null);
  const [exportError, setExportError] = useState(null);

  const closeExport = () => {
    setExporting(false);
    setExportPlan(null);
    setExportError(null);
  };
  const readExportFile = async (file) => {
    setExportPlan(null);
    setExportError(null);
    if (!file) return;
    try {
      setExportPlan(planExport(await file.text(), inventory));
    } catch (e) {
      setExportError(e.message);
    }
  };
  const downloadExport = () => {
    downloadFile(`sumup-items-${todayKey()}.csv`, exportPlan.text, 'text/csv;charset=utf-8');
    closeExport();
  };

  const closeImport = () => {
    setImporting(false);
    setPlan(null);
    setImportError(null);
  };
  const readFile = async (file) => {
    setPlan(null);
    setImportError(null);
    if (!file) return;
    try {
      setPlan(planImport(await file.text(), inventory));
    } catch (e) {
      setImportError(e.message);
    }
  };

  const shoppingList = buildShoppingList(inventory);
  const hasTargets = inventory.some((i) => i.targetLevel != null);
  const closeShopping = () => {
    setShopping(false);
    setCopied(false);
    setCopyError(null);
  };
  const copyShoppingList = async () => {
    const date = new Date().toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { dateStyle: 'long' });
    try {
      await navigator.clipboard.writeText(shoppingListText(shoppingList, t, date));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopyError(t('Copy failed. Select the list and copy it by hand.'));
    }
  };

  const totalItems = inventory.reduce((s, i) => s + i.current, 0);
  const lowStockCount = inventory.filter((i) => i.current <= i.minLevel).length;
  const weeklyUsage = inventory.reduce((s, i) => s + i.weeklyUsage, 0);

  return (
    <div className="screen-inner">
      <div className="page-head">
        <div className="page-intro">
          <Michel pose="chef" className="michel-head michel-wide" />
          <div className="eyebrow">{t('Stock room')}</div>
          <h1 className="page-title">{t("What's on the shelf")}</h1>
          <p className="page-lede">{t('Levels against the minimum, and what each item used this week.')}</p>
        </div>
        <div className="shift-actions">
          {canEdit && (
            <Menu
              label={t('Batch update')}
              items={[
                { label: t('Import stock'), onSelect: () => setImporting(true) },
                { label: t('Set stock'), onSelect: () => setEditingStocks(true), disabled: inventory.length === 0 },
                { label: t('Set targets'), onSelect: () => setEditingTargets(true), disabled: inventory.length === 0 },
                { label: t('Set prices'), onSelect: () => setEditingPrices(true), disabled: inventory.length === 0 },
              ]}
            />
          )}
          <button className="btn btn-secondary" onClick={() => setExporting(true)} disabled={inventory.length === 0}>
            {t('Export stock')}
          </button>
          <button className="btn btn-primary" onClick={() => setShopping(true)} disabled={inventory.length === 0}>
            {t('Shopping list')}
          </button>
        </div>
      </div>

      <div className="stat-grid">
        <div className="card elev-sm stat">
          <div className="label-caps">{t('Units in stock')}</div>
          <div className="stat-value" style={{ color: 'var(--color-accent-2-700)' }}><CountUp value={totalItems} delay={250} /></div>
        </div>
        <div className="card elev-sm stat">
          <div className="label-caps">{t('Running low')}</div>
          <div className="stat-value" style={{ color: 'var(--color-warn-800)' }}><CountUp value={lowStockCount} delay={310} /></div>
        </div>
        <div className="card elev-sm stat">
          <div className="label-caps">{t('Used this week')}</div>
          <div className="stat-value"><CountUp value={weeklyUsage} delay={370} /></div>
        </div>
      </div>

      <div className="card elev-sm table-card">
        {inventory.length === 0 ? (
          <p className="text-muted" style={{ margin: 0 }}>
            {canEdit ? t('No products yet. Add some under Admin → Products.') : t('No products yet.')}
          </p>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t('Item')}</th>
                <th>{t('Level')}</th>
                <th>{t('In stock')}</th>
                <th>{t('Minimum')}</th>
                <th>{t('Target')}</th>
                <th>{t('This week')}</th>
                <th>{t('Price')}</th>
                <th>{t('Status')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {inventory.map((item) => {
                const low = item.current <= item.minLevel;
                const pct = Math.max(4, Math.min(100, Math.round((item.current / (item.minLevel * 3)) * 100)));
                return (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>{item.name}</td>
                    <td>
                      <div className="meter" role="img" aria-label={`${pct}%`}>
                        <span
                          style={{
                            width: `${pct}%`,
                            background: low ? 'var(--color-warn)' : 'var(--color-accent-2)',
                          }}
                        />
                      </div>
                    </td>
                    <td data-label={t('In stock')}>{item.current}</td>
                    <td data-label={t('Minimum')}>{item.minLevel}</td>
                    <td data-label={t('Target')}>{item.targetLevel ?? '—'}</td>
                    <td data-label={t('This week')}>{item.weeklyUsage}</td>
                    <td data-label={t('Price')}>{formatPrice(item.price)}</td>
                    <td>
                      <span className={low ? 'tag tag-warn' : 'tag tag-accent-2'}>{low ? t('Low') : t('OK')}</span>
                    </td>
                    <td className="t-right">
                      {canEdit && (
                        <button className="btn btn-ghost" onClick={() => setAdjusting(item)}>{t('Adjust')}</button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {adjusting && (
        <Dialog
          title={t('Adjust {name}', { name: adjusting.name })}
          onClose={() => setAdjusting(null)}
          onSubmit={(data) => {
            adjustStock(
              adjusting.id,
              Math.max(0, Number(data.get('current'))),
              readTarget(data.get('target')),
              Math.max(0, Number(data.get('price'))),
            );
            setAdjusting(null);
          }}
        >
          <div className="field">
            <label htmlFor="current">{t('Units in stock')}</label>
            <input
              id="current"
              name="current"
              className="input"
              type="number"
              min="0"
              step="any"
              defaultValue={adjusting.current}
              autoFocus
              required
            />
          </div>
          <div className="field">
            <label htmlFor="target">{t('Target stock')}</label>
            <input
              id="target"
              name="target"
              className="input"
              type="number"
              min="0"
              step="any"
              defaultValue={adjusting.targetLevel ?? ''}
            />
            <span className="hint">{t('Leave empty to keep this item off the shopping list.')}</span>
          </div>
          <div className="field">
            <label htmlFor="price">{t('Selling price (€)')}</label>
            <input
              id="price"
              name="price"
              className="input"
              type="number"
              min="0"
              step="0.01"
              defaultValue={adjusting.price}
              required
            />
          </div>
        </Dialog>
      )}

      {editingTargets && (
        <Dialog
          title={t('Target stock')}
          wide
          onClose={() => setEditingTargets(false)}
          onSubmit={async (data) => {
            const changed = inventory
              .map((i) => ({ id: i.id, targetLevel: readTarget(data.get(`target-${i.id}`)), before: i.targetLevel ?? null }))
              .filter((c) => c.targetLevel !== c.before);
            if (changed.length) await setTargets(changed.map(({ id, targetLevel }) => ({ id, targetLevel })));
            setEditingTargets(false);
          }}
        >
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            {t('The level each item should be brought back to when restocking. Leave empty for items you don’t restock.')}
          </p>
          <div className="target-list">
            {inventory.map((item) => (
              <div key={item.id} className="target-row">
                <label htmlFor={`target-${item.id}`}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span className="hint">{t('{n} in stock', { n: item.current })}</span>
                </label>
                <input
                  id={`target-${item.id}`}
                  name={`target-${item.id}`}
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={item.targetLevel ?? ''}
                />
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {editingStocks && (
        <Dialog
          title={t('Current stock')}
          wide
          onClose={() => setEditingStocks(false)}
          onSubmit={async (data) => {
            const changed = inventory
              .map((i) => ({ id: i.id, current: Math.max(0, Number(data.get(`stock-${i.id}`))), before: i.current }))
              .filter((c) => c.current !== c.before);
            if (changed.length) await setStocks(changed.map(({ id, current }) => ({ id, current })));
            setEditingStocks(false);
          }}
        >
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            {t('Set every item’s stock by hand, for a quick full recount.')}
          </p>
          <div className="target-list">
            {inventory.map((item) => (
              <div key={item.id} className="target-row">
                <label htmlFor={`stock-${item.id}`}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  <span className="hint">{t('Min. {n}', { n: item.minLevel })}</span>
                </label>
                <input
                  id={`stock-${item.id}`}
                  name={`stock-${item.id}`}
                  className="input"
                  type="number"
                  min="0"
                  step="any"
                  defaultValue={item.current}
                  required
                />
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {editingPrices && (
        <Dialog
          title={t('Selling prices')}
          wide
          onClose={() => setEditingPrices(false)}
          onSubmit={async (data) => {
            const changed = inventory
              .map((i) => ({ id: i.id, price: readPrice(data.get(`price-${i.id}`)), before: Number(i.price) || 0 }))
              .filter((c) => c.price !== c.before);
            if (changed.length) await setPrices(changed.map(({ id, price }) => ({ id, price })));
            setEditingPrices(false);
          }}
        >
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            {t('Change as many prices as you need, then save once. Leave empty for items with no price.')}
          </p>
          <div className="target-list">
            {inventory.map((item) => (
              <div key={item.id} className="target-row">
                <label htmlFor={`price-${item.id}`}>
                  <span style={{ fontWeight: 600 }}>{item.name}</span>
                  {item.category && <span className="hint">{item.category}</span>}
                </label>
                <input
                  id={`price-${item.id}`}
                  name={`price-${item.id}`}
                  className="input"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={item.price > 0 ? item.price : ''}
                />
              </div>
            ))}
          </div>
        </Dialog>
      )}

      {shopping && (
        <Dialog title={t('Shopping list')} wide onClose={closeShopping}>
          {shoppingList.items.length === 0 ? (
            <>
            {hasTargets && <Michel pose="chill" className="michel-state" />}
            <p className="text-muted" style={{ margin: 0 }}>
              {hasTargets
                ? t('Nothing to buy: every item is at or above its target.')
                : canEdit
                  ? t('No targets yet. Use “Set targets” to choose how much of each item to keep.')
                  : t('No targets yet. Ask an admin to set them.')}
            </p>
            </>
          ) : (
            <>
              <ul className="shopping-list">
                {shoppingList.items.map((i) => (
                  <li key={i.id}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{i.name}</div>
                      <div className="hint">{t('{current} in stock, target {target}', { current: i.current, target: i.target })}</div>
                    </div>
                    <div className="shopping-qty">
                      <span className="shopping-qty-value">{i.quantity}</span>
                      {i.cost > 0 && <span className="hint">≈ €{i.cost.toFixed(2)}</span>}
                    </div>
                  </li>
                ))}
              </ul>
              {shoppingList.total > 0 && (
                <p style={{ margin: 0, fontWeight: 600, textAlign: 'right' }}>
                  {t('Estimated cost: €{total}', { total: shoppingList.total.toFixed(2) })}
                </p>
              )}
              <p className="hint" style={{ margin: 0 }}>{t('Order online for home delivery:')}</p>
              <div className="shift-actions">
                {DRIVE_SITES.map((site) => (
                  <a key={site.name} className="btn btn-secondary drive-link" href={site.url} target="_blank" rel="noopener noreferrer" aria-label={site.name} title={site.name}>
                    {site.logo?.src ? (
                      <img src={site.logo.src} width="24" height="24" alt="" />
                    ) : site.logo ? (
                      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
                        <path d={site.logo.path} fill={site.logo.color} />
                      </svg>
                    ) : (
                      site.name
                    )}
                  </a>
                ))}
              </div>
              <div className="shift-actions">
                <button type="button" className="btn btn-secondary" onClick={copyShoppingList}>
                  {copied ? t('Copied') : t('Copy list')}
                </button>
              </div>
              {copyError && <p style={{ margin: 0, color: 'var(--color-danger)' }}>{copyError}</p>}
            </>
          )}
        </Dialog>
      )}

      {exporting && (
        <Dialog
          title={t('Export stock')}
          submitLabel="Download"
          onClose={closeExport}
          onSubmit={() => exportPlan && downloadExport()}
        >
          <p className="text-muted" style={{ margin: 0, fontSize: 14 }}>
            {t('Export your items from SumUp first, then choose that file. The app writes its stock and prices into it, and you import the new file back into SumUp.')}
          </p>
          <div className="field">
            <label htmlFor="export-file">{t('SumUp items export (.csv)')}</label>
            <input
              id="export-file"
              type="file"
              accept=".csv,text/csv"
              className="input"
              onChange={(e) => readExportFile(e.target.files[0])}
              required
            />
          </div>
          {exportError && <p style={{ margin: 0, color: 'var(--color-danger)' }}>{t(exportError)}</p>}
          {exportPlan && (
            <div className="import-summary">
              <div className="import-stats">
                <div className="import-stat">
                  <div className="import-stat-value" style={{ color: 'var(--color-accent-2-700)' }}>{exportPlan.updated}</div>
                  <div className="label-caps">{t('Updated')}</div>
                </div>
                <div className="import-stat">
                  <div className="import-stat-value" style={{ color: 'var(--color-warn-800)' }}>{exportPlan.missing.length}</div>
                  <div className="label-caps">{t('Not in SumUp')}</div>
                </div>
                <div className="import-stat">
                  <div className="import-stat-value">{exportPlan.skipped.length}</div>
                  <div className="label-caps">{t('Ignored')}</div>
                </div>
              </div>
              {exportPlan.missing.length > 0 && (
                <details className="import-details">
                  <summary>{t('Not in the SumUp file: add them in SumUp first')}</summary>
                  <div className="import-tags">
                    {exportPlan.missing.map((n) => <span key={n} className="tag tag-warn">{n}</span>)}
                  </div>
                </details>
              )}
              {exportPlan.skipped.length > 0 && (
                <details className="import-details">
                  <summary>{t('Ignored: stock not tracked')}</summary>
                  <div className="import-tags">
                    {exportPlan.skipped.map((n) => <span key={n} className="tag tag-neutral">{n}</span>)}
                  </div>
                </details>
              )}
            </div>
          )}
        </Dialog>
      )}

      {importing && (
        <Dialog
          title={t('Import stock')}
          submitLabel="Import"
          onClose={closeImport}
          onSubmit={async () => {
            if (!plan) return;
            await importProducts(plan);
            closeImport();
          }}
        >
          <div className="field">
            <label htmlFor="import-file">{t('SumUp items export (.csv)')}</label>
            <input
              id="import-file"
              type="file"
              accept=".csv,text/csv"
              className="input"
              onChange={(e) => readFile(e.target.files[0])}
              required
            />
          </div>
          {importError && <p style={{ margin: 0, color: 'var(--color-danger)' }}>{t(importError)}</p>}
          {plan && (
            <div className="import-summary">
              <div className="import-stats">
                <div className="import-stat">
                  <div className="import-stat-value" style={{ color: 'var(--color-accent-2-700)' }}><CountUp value={plan.updates.length} delay={100} /></div>
                  <div className="label-caps">{t('Updated')}</div>
                </div>
                <div className="import-stat">
                  <div className="import-stat-value" style={{ color: 'var(--color-accent-700)' }}><CountUp value={plan.creates.length} delay={160} /></div>
                  <div className="label-caps">{t('New')}</div>
                </div>
                <div className="import-stat">
                  <div className="import-stat-value"><CountUp value={plan.skipped.length} delay={220} /></div>
                  <div className="label-caps">{t('Ignored')}</div>
                </div>
              </div>
              {plan.creates.length > 0 && (
                <details className="import-details">
                  <summary>{t('New products')}</summary>
                  <div className="import-tags">
                    {plan.creates.map((c) => <span key={c.name} className="tag tag-accent">{c.name}</span>)}
                  </div>
                </details>
              )}
              {plan.skipped.length > 0 && (
                <details className="import-details">
                  <summary>{t('Ignored: stock not tracked')}</summary>
                  <div className="import-tags">
                    {plan.skipped.map((n) => <span key={n} className="tag tag-neutral">{n}</span>)}
                  </div>
                </details>
              )}
              {plan.negatives > 0 && (
                <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>
                  {t('{n} negative quantities will be set to 0.', { n: plan.negatives })}
                </p>
              )}
            </div>
          )}
        </Dialog>
      )}
    </div>
  );
}
