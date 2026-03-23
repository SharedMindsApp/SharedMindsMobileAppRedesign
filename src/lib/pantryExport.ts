import type { PantryItem, PantryItemType } from './intelligentGrocery';
import type { PantryLocation } from './pantryLocations';

type PantryExportRow = {
  id: string;
  name: string;
  category: string;
  pantryType: PantryItemType | null;
  pantryTypeLabel: string;
  quantity: string;
  expiry: string;
  location: string;
  notes: string;
  estimatedCost: number | null;
};

type PantryLocationGroup = {
  location: string;
  rows: PantryExportRow[];
  totalEstimatedCost: number;
};

const PANTRY_TYPE_LABELS: Record<PantryItemType, string> = {
  perishable: 'Perishable',
  long_life: 'Long Life',
  non_food: 'Non-Food',
};

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'No date';

  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'Not set';

  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 2,
  }).format(value);
}

function buildQuantityLabel(item: PantryItem): string {
  const value = item.quantity_value || item.quantity || '';
  const unit = item.quantity_unit || item.unit || '';

  if (!value && !unit) return 'Not logged';
  return `${value}${value && unit ? ' ' : ''}${unit}`.trim();
}

function buildRows(items: PantryItem[], locations: PantryLocation[]): PantryExportRow[] {
  const locationMap = new Map(locations.map((location) => [location.id, location]));

  return items.map((item) => {
    const pantryType = item.item_type || null;
    const location = item.location_id
      ? locationMap.get(item.location_id)?.name || 'Unknown location'
      : 'Unassigned';

    return {
      id: item.id,
      name: item.food_item?.name || item.item_name || 'Unknown item',
      category: item.category || item.food_item?.category || 'Uncategorised',
      pantryType,
      pantryTypeLabel: pantryType ? PANTRY_TYPE_LABELS[pantryType] : 'Uncategorised',
      quantity: buildQuantityLabel(item),
      expiry: formatDate(item.expires_on || item.expiration_date),
      location,
      notes: item.notes || '',
      estimatedCost: item.estimated_cost ?? null,
    };
  }).sort((a, b) => a.location.localeCompare(b.location) || a.name.localeCompare(b.name));
}

function buildLocationGroups(rows: PantryExportRow[]): PantryLocationGroup[] {
  const groups = new Map<string, PantryLocationGroup>();

  for (const row of rows) {
    const existing = groups.get(row.location) || {
      location: row.location,
      rows: [],
      totalEstimatedCost: 0,
    };

    existing.rows.push(row);
    existing.totalEstimatedCost += row.estimatedCost || 0;
    groups.set(row.location, existing);
  }

  return Array.from(groups.values()).sort((a, b) => a.location.localeCompare(b.location));
}

function openPrintWindow(title: string, html: string) {
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';

  const cleanup = () => {
    setTimeout(() => {
      iframe.remove();
    }, 500);
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    if (!frameWindow) {
      cleanup();
      throw new Error('Unable to open print preview');
    }

    const finish = () => {
      frameWindow.removeEventListener('afterprint', finish);
      cleanup();
    };

    frameWindow.addEventListener('afterprint', finish);
    frameWindow.focus();
    setTimeout(() => {
      frameWindow.print();
    }, 150);
  };

  document.body.appendChild(iframe);
  const frameDocument = iframe.contentDocument;
  if (!frameDocument) {
    cleanup();
    throw new Error('Unable to build printable report');
  }

  frameDocument.open();
  frameDocument.write(html);
  frameDocument.close();
}

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function buildChecklistHtml(spaceName: string, rows: PantryExportRow[]) {
  const groups = buildLocationGroups(rows);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const sections = groups.map((group) => `
    <section class="section">
      <div class="section-head">
        <div>
          <h2>${escapeHtml(group.location)}</h2>
          <p>${group.rows.length} line${group.rows.length === 1 ? '' : 's'}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th class="check">Check</th>
            <th>Item</th>
            <th>Type</th>
            <th>Quantity</th>
            <th>Best before</th>
            <th>Notes</th>
          </tr>
        </thead>
        <tbody>
          ${group.rows.map((row) => `
            <tr>
              <td class="check"><span class="box"></span></td>
              <td>
                <strong>${escapeHtml(row.name)}</strong>
                <div class="muted">${escapeHtml(row.category)}</div>
              </td>
              <td>${escapeHtml(row.pantryTypeLabel)}</td>
              <td>${escapeHtml(row.quantity)}</td>
              <td>${escapeHtml(row.expiry)}</td>
              <td>${escapeHtml(row.notes || ' ')}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </section>
  `).join('');

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(spaceName)} Pantry Audit Checklist</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #1c1917; margin: 32px; }
        h1,h2,h3,p { margin: 0; }
        .header { display:flex; justify-content:space-between; gap:24px; margin-bottom:24px; align-items:flex-end; }
        .header h1 { font-size: 28px; margin-bottom: 8px; }
        .meta { color:#57534e; font-size:14px; }
        .summary { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin-bottom:24px; }
        .card { border:1px solid #d6d3d1; border-radius:16px; padding:16px; }
        .card .label { color:#78716c; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:6px; }
        .card .value { font-size:24px; font-weight:700; }
        .section { margin-bottom:28px; break-inside: avoid; }
        .section-head { display:flex; justify-content:space-between; margin-bottom:12px; align-items:flex-end; }
        .section-head h2 { font-size:18px; }
        .section-head p { color:#78716c; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; }
        table { width:100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border:1px solid #e7e5e4; padding:10px; text-align:left; vertical-align:top; font-size:13px; }
        th { background:#f5f5f4; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#57534e; }
        .check { width:56px; text-align:center; }
        .box { display:inline-block; width:20px; height:20px; border:2px solid #57534e; border-radius:6px; }
        .muted { color:#78716c; font-size:11px; margin-top:4px; }
        @media print { body { margin: 18px; } .section { page-break-inside: avoid; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${escapeHtml(spaceName)} Pantry Audit Checklist</h1>
          <p class="meta">Prepared ${escapeHtml(today)}. Use this sheet to walk the space and tick off what is physically present.</p>
        </div>
        <div class="meta">Manual audit / print checklist</div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Inventory lines</div><div class="value">${rows.length}</div></div>
        <div class="card"><div class="label">Locations</div><div class="value">${groups.length}</div></div>
        <div class="card"><div class="label">Dated items</div><div class="value">${rows.filter((row) => row.expiry !== 'No date').length}</div></div>
      </div>
      ${sections}
    </body>
  </html>`;
}

function buildBudgetHtml(spaceName: string, rows: PantryExportRow[]) {
  const valued = rows.filter((row) => row.estimatedCost !== null);
  const missingValueCount = rows.length - valued.length;
  const totalValue = valued.reduce((sum, row) => sum + (row.estimatedCost || 0), 0);

  const byType = new Map<string, number>();
  const byLocation = new Map<string, number>();
  for (const row of valued) {
    byType.set(row.pantryTypeLabel, (byType.get(row.pantryTypeLabel) || 0) + (row.estimatedCost || 0));
    byLocation.set(row.location, (byLocation.get(row.location) || 0) + (row.estimatedCost || 0));
  }

  const typeRows = Array.from(byType.entries()).sort((a, b) => b[1] - a[1]);
  const locationRows = Array.from(byLocation.entries()).sort((a, b) => b[1] - a[1]);
  const detailedRows = valued.sort((a, b) => (b.estimatedCost || 0) - (a.estimatedCost || 0));
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!doctype html>
  <html lang="en">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(spaceName)} Pantry Budget Report</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#0f172a; margin:32px; }
        h1,h2,h3,p { margin:0; }
        .header { display:flex; justify-content:space-between; gap:24px; margin-bottom:24px; align-items:flex-end; }
        .header h1 { font-size:28px; margin-bottom:8px; }
        .meta { color:#475569; font-size:14px; }
        .summary { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:12px; margin-bottom:24px; }
        .card { border:1px solid #cbd5e1; border-radius:16px; padding:16px; background:#f8fafc; }
        .label { color:#64748b; font-size:12px; text-transform:uppercase; letter-spacing:0.08em; margin-bottom:8px; }
        .value { font-size:24px; font-weight:800; }
        .grid { display:grid; grid-template-columns: 1fr 1fr; gap:16px; margin-bottom:24px; }
        .panel { border:1px solid #e2e8f0; border-radius:18px; padding:16px; break-inside:avoid; }
        .panel h2 { font-size:18px; margin-bottom:12px; }
        .list { display:grid; gap:10px; }
        .row { display:flex; justify-content:space-between; gap:16px; padding-bottom:10px; border-bottom:1px solid #f1f5f9; font-size:14px; }
        table { width:100%; border-collapse: collapse; table-layout: fixed; }
        th, td { border:1px solid #e2e8f0; padding:10px; text-align:left; vertical-align:top; font-size:13px; }
        th { background:#f8fafc; font-size:11px; text-transform:uppercase; letter-spacing:0.08em; color:#475569; }
        .muted { color:#64748b; font-size:11px; margin-top:4px; }
        @media print { body { margin: 18px; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <h1>${escapeHtml(spaceName)} Pantry Budget Report</h1>
          <p class="meta">Prepared ${escapeHtml(today)}. Based on estimated item values saved in Pantry.</p>
        </div>
        <div class="meta">Printable budget summary</div>
      </div>
      <div class="summary">
        <div class="card"><div class="label">Estimated stock value</div><div class="value">${formatCurrency(totalValue)}</div></div>
        <div class="card"><div class="label">Valued lines</div><div class="value">${valued.length}</div></div>
        <div class="card"><div class="label">Missing values</div><div class="value">${missingValueCount}</div></div>
      </div>
      <div class="grid">
        <section class="panel">
          <h2>Value by type</h2>
          <div class="list">
            ${typeRows.length > 0 ? typeRows.map(([label, value]) => `
              <div class="row"><span>${escapeHtml(label)}</span><strong>${formatCurrency(value)}</strong></div>
            `).join('') : '<p class="meta">No valued items yet.</p>'}
          </div>
        </section>
        <section class="panel">
          <h2>Value by location</h2>
          <div class="list">
            ${locationRows.length > 0 ? locationRows.map(([label, value]) => `
              <div class="row"><span>${escapeHtml(label)}</span><strong>${formatCurrency(value)}</strong></div>
            `).join('') : '<p class="meta">No valued items yet.</p>'}
          </div>
        </section>
      </div>
      <section class="panel">
        <h2>Detailed valued inventory</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Type</th>
              <th>Location</th>
              <th>Quantity</th>
              <th>Estimated value</th>
            </tr>
          </thead>
          <tbody>
            ${detailedRows.length > 0 ? detailedRows.map((row) => `
              <tr>
                <td><strong>${escapeHtml(row.name)}</strong><div class="muted">${escapeHtml(row.category)}</div></td>
                <td>${escapeHtml(row.pantryTypeLabel)}</td>
                <td>${escapeHtml(row.location)}</td>
                <td>${escapeHtml(row.quantity)}</td>
                <td><strong>${formatCurrency(row.estimatedCost)}</strong></td>
              </tr>
            `).join('') : '<tr><td colspan="5">No valued items yet.</td></tr>'}
          </tbody>
        </table>
      </section>
    </body>
  </html>`;
}

export function exportPantryCsv(spaceName: string, items: PantryItem[], locations: PantryLocation[]) {
  const rows = buildRows(items, locations);
  const header = [
    'Item',
    'Category',
    'Pantry Type',
    'Quantity',
    'Best Before',
    'Location',
    'Estimated Cost',
    'Notes',
  ];

  const csv = [
    header.join(','),
    ...rows.map((row) =>
      [
        row.name,
        row.category,
        row.pantryTypeLabel,
        row.quantity,
        row.expiry,
        row.location,
        row.estimatedCost ?? '',
        row.notes,
      ]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(',')
    ),
  ].join('\n');

  downloadBlob(`${spaceName.toLowerCase().replace(/\s+/g, '-')}-pantry-export.csv`, csv, 'text/csv;charset=utf-8');
}

export function printPantryAuditChecklist(spaceName: string, items: PantryItem[], locations: PantryLocation[]) {
  const rows = buildRows(items, locations);
  const html = buildChecklistHtml(spaceName, rows);
  openPrintWindow(`${spaceName} Pantry Audit Checklist`, html);
}

export function printPantryBudgetReport(spaceName: string, items: PantryItem[], locations: PantryLocation[]) {
  const rows = buildRows(items, locations);
  const html = buildBudgetHtml(spaceName, rows);
  openPrintWindow(`${spaceName} Pantry Budget Report`, html);
}
