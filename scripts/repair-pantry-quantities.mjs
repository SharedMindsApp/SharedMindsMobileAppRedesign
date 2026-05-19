import { createClient } from '@supabase/supabase-js';
import fs from 'node:fs';
import path from 'node:path';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WRITE_MODE = process.argv.includes('--write');
const APPLY_FROM_INDEX = process.argv.indexOf('--apply-from');
const APPLY_FROM_PATH = APPLY_FROM_INDEX >= 0 ? process.argv[APPLY_FROM_INDEX + 1] : null;
const OUT_INDEX = process.argv.indexOf('--out');
const REVIEW_OUTPUT_PATH = OUT_INDEX >= 0
  ? process.argv[OUT_INDEX + 1]
  : path.resolve(process.cwd(), 'pantry-quantity-repair-review.csv');

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE_URL/VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const MEASUREMENT_UNITS = new Set(['g', 'gram', 'grams', 'ml', 'millilitre', 'millilitres', 'milliliter', 'milliliters']);
const LARGE_MEASUREMENT_UNITS = new Set(['kg', 'kilogram', 'kilograms', 'l', 'litre', 'litres', 'liter', 'liters']);

function normalize(value) {
  return (value || '').toLowerCase().trim();
}

function formatQuantityValue(value) {
  if (!Number.isFinite(value)) return '1';
  return Number.isInteger(value) ? String(Math.round(value)) : String(Math.round(value * 100) / 100);
}

function getRepairDefaults(name, category) {
  const normalizedName = normalize(name);
  const normalizedCategory = normalize(category);

  const isCannedCategory =
    normalizedCategory.includes('canned') ||
    normalizedCategory.includes('pantry') ||
    normalizedCategory.includes('tin') ||
    normalizedCategory.includes('tinned');

  const cannedStaples = [
    'tomato',
    'chickpea',
    'chicken soup',
    'soup',
    'bean',
    'coconut milk',
    'evaporated milk',
    'mandarin',
    'mixed vegetables',
    'beef stew',
    'curry',
    'ravioli',
    'meatball',
  ];

  if (
    isCannedCategory ||
    normalizedName.includes('can') ||
    normalizedName.includes('tin') ||
    cannedStaples.some((keyword) => normalizedName.includes(keyword))
  ) {
    return {
      quantityUnit: 'can',
      defaultQuantityValue: '1',
      estimatedWeightGrams: cannedStaples.some((keyword) => normalizedName.includes(keyword)) ? 400 : null,
      reason: 'packaged canned item',
    };
  }

  if (
    normalizedName.includes('rice') ||
    normalizedName.includes('oats') ||
    normalizedName.includes('flour') ||
    normalizedName.includes('sugar')
  ) {
    return {
      quantityUnit: 'bag',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'dry staple usually tracked by bag',
    };
  }

  if (
    normalizedName.includes('pasta') ||
    normalizedName.includes('penne') ||
    normalizedName.includes('spaghetti') ||
    normalizedName.includes('noodle')
  ) {
    return {
      quantityUnit: 'pack',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'dry pasta/noodle usually tracked by pack',
    };
  }

  if (normalizedName.includes('bag')) {
    return {
      quantityUnit: 'bag',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'name suggests bag',
    };
  }

  if (normalizedName.includes('box')) {
    return {
      quantityUnit: 'box',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'name suggests box',
    };
  }

  if (
    normalizedName.includes('sauce') ||
    normalizedName.includes('puree') ||
    normalizedName.includes('granule')
  ) {
    return {
      quantityUnit: 'jar',
      defaultQuantityValue: '1',
      estimatedWeightGrams: null,
      reason: 'sauce/jar style pantry item',
    };
  }

  return {
    quantityUnit: 'item',
    defaultQuantityValue: '1',
    estimatedWeightGrams: null,
    reason: 'fallback item count',
  };
}

function isBrokenQuantity(item) {
  const quantityValueRaw = (item.quantity_value ?? item.quantity ?? '').toString().trim();
  const unit = normalize(item.quantity_unit ?? item.unit);
  const quantityValue = Number.parseFloat(quantityValueRaw);

  if (!quantityValueRaw) return false;
  if (!Number.isFinite(quantityValue)) return false;

  if (quantityValue <= 0) return true;

  if (MEASUREMENT_UNITS.has(unit) && quantityValue <= 5) {
    return true;
  }

  if (LARGE_MEASUREMENT_UNITS.has(unit) && quantityValue <= 0) {
    return true;
  }

  return false;
}

function buildRepair(item) {
  const currentValueRaw = (item.quantity_value ?? item.quantity ?? '').toString().trim();
  const currentUnitRaw = (item.quantity_unit ?? item.unit ?? '').toString().trim();
  const currentValue = Number.parseFloat(currentValueRaw);
  const defaults = getRepairDefaults(item.food_item?.name || item.item_name || '', item.category || item.food_item?.category || '');

  const nextQuantityValue =
    Number.isFinite(currentValue) && currentValue > 0 && currentValue <= 5
      ? formatQuantityValue(currentValue)
      : defaults.defaultQuantityValue;

  return {
    id: item.id,
    name: item.food_item?.name || item.item_name || 'Unknown item',
    from: `${currentValueRaw}${currentUnitRaw ? ` ${currentUnitRaw}` : ''}`.trim() || 'blank',
    to: `${nextQuantityValue} ${defaults.quantityUnit}`.trim(),
    update: {
      quantity_value: nextQuantityValue,
      quantity_unit: defaults.quantityUnit,
      ...(item.estimated_weight_grams == null && defaults.estimatedWeightGrams
        ? { estimated_weight_grams: defaults.estimatedWeightGrams }
        : {}),
    },
    reason: defaults.reason,
  };
}

function csvEscape(value) {
  const stringValue = value == null ? '' : String(value);
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }
  return stringValue;
}

function writeReviewCsv(filePath, repairs) {
  const headers = [
    'approve',
    'id',
    'item',
    'current_quantity',
    'proposed_quantity',
    'proposed_weight_grams',
    'reason',
  ];

  const lines = [
    headers.join(','),
    ...repairs.map((repair) =>
      [
        '',
        repair.id,
        repair.name,
        repair.from,
        repair.to,
        repair.update.estimated_weight_grams ?? '',
        repair.reason,
      ]
        .map(csvEscape)
        .join(',')
    ),
  ];

  fs.writeFileSync(filePath, `${lines.join('\n')}\n`, 'utf8');
}

function parseCsvLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    const next = line[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      current += '"';
      index += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  values.push(current);
  return values;
}

function readApprovedRepairs(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();
  if (!raw) return [];

  const lines = raw.split('\n').filter(Boolean);
  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    return Object.fromEntries(headers.map((header, index) => [header, values[index] ?? '']));
  });

  return rows.filter((row) => /^(y|yes|true|1)$/i.test((row.approve || '').trim()));
}

async function applyReviewedRepairs(filePath) {
  const approvedRows = readApprovedRepairs(filePath);
  if (approvedRows.length === 0) {
    console.log('No approved rows found in review CSV.');
    return;
  }

  for (const row of approvedRows) {
    const proposedQuantity = (row.proposed_quantity || '').trim();
    const match = proposedQuantity.match(/^(.+?)\s+([A-Za-z]+)$/);
    const quantityValue = match ? match[1].trim() : proposedQuantity;
    const quantityUnit = match ? match[2].trim() : '';
    const estimatedWeight = row.proposed_weight_grams ? Number.parseInt(row.proposed_weight_grams, 10) : null;

    const { error } = await supabase
      .from('household_pantry_items')
      .update({
        quantity_value: quantityValue || null,
        quantity_unit: quantityUnit || null,
        ...(Number.isFinite(estimatedWeight) && estimatedWeight > 0
          ? { estimated_weight_grams: estimatedWeight }
          : {}),
      })
      .eq('id', row.id);

    if (error) throw error;
  }

  console.log(`Applied ${approvedRows.length} approved pantry quantity repairs from ${filePath}.`);
}

async function main() {
  if (APPLY_FROM_PATH) {
    await applyReviewedRepairs(APPLY_FROM_PATH);
    return;
  }

  const { data, error } = await supabase
    .from('household_pantry_items')
    .select(`
      id,
      item_name,
      quantity,
      unit,
      quantity_value,
      quantity_unit,
      estimated_weight_grams,
      category,
      food_item:food_items(name, category)
    `)
    .order('created_at', { ascending: true });

  if (error) {
    throw error;
  }

  const brokenItems = (data || []).filter(isBrokenQuantity).map(buildRepair);

  console.log(`Found ${brokenItems.length} pantry rows with obviously broken quantity/unit data.`);
  if (brokenItems.length === 0) return;

  writeReviewCsv(REVIEW_OUTPUT_PATH, brokenItems);
  console.log(`Review CSV written to ${REVIEW_OUTPUT_PATH}`);

  for (const item of brokenItems.slice(0, 50)) {
    console.log(`- ${item.name}: ${item.from} -> ${item.to} (${item.reason})`);
  }

  if (!WRITE_MODE) {
    console.log('\nDry run only. Review the CSV, mark rows with approve=yes, then run with --apply-from <csv>.');
    return;
  }

  for (const item of brokenItems) {
    const { error: updateError } = await supabase
      .from('household_pantry_items')
      .update(item.update)
      .eq('id', item.id);

    if (updateError) {
      throw updateError;
    }
  }

  console.log(`Applied repairs to ${brokenItems.length} pantry rows.`);
}

main().catch((error) => {
  console.error('Failed to repair pantry quantities:', error);
  process.exit(1);
});
