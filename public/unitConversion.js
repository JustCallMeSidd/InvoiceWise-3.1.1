// ─── InvoiceWise Unit Conversion & Bottle Production Engine ───────────────────
// Supports unit conversions across standard dimensions:
//   Volume : mL, ml, cl, dl, L, l, kL, kl
//   Weight : mg, g, kg, T, tonne, ton
//   Length : mm, cm, dm, m, meter, km, inch, in, feet, ft
//   Count  : pcs, nos, ea, box, packet, bottle, bottles, roll, doz, gross, cap, caps, unit, units, pouch, pouches, can, cans, jar, jars, bag, bags, sachet, sachets
//   Area   : mm2, cm2, m2
//
'use strict';

const DIMENSIONS = {
  volume: {
    base: 'mL',
    units: {
      ml: 1, mL: 1,
      cl: 10,
      dl: 100,
      l: 1000, L: 1000,
      kl: 1000000, kL: 1000000
    }
  },
  weight: {
    base: 'g',
    units: {
      mg: 0.001,
      g: 1,
      kg: 1000,
      t: 1000000,
      T: 1000000,
      tonne: 1000000,
      ton: 1000000
    }
  },
  length: {
    base: 'm',
    units: {
      mm: 0.001,
      cm: 0.01,
      dm: 0.1,
      m: 1, meter: 1,
      km: 1000,
      inch: 0.0254, in: 0.0254,
      feet: 0.3048, ft: 0.3048
    }
  },
  count: {
    base: 'pcs',
    units: {
      pcs: 1, nos: 1, ea: 1, unit: 1, units: 1,
      box: 1, boxes: 1, carton: 1, cartons: 1,
      packet: 1, packets: 1, bottle: 1, bottles: 1, roll: 1, rolls: 1,
      container: 1, containers: 1, vial: 1, vials: 1, drum: 1, drums: 1,
      cap: 1, caps: 1, pouch: 1, pouches: 1,
      can: 1, cans: 1, jar: 1, jars: 1,
      strip: 1, strips: 1, tube: 1, tubes: 1,
      bag: 1, bags: 1, sachet: 1, sachets: 1,
      doz: 12, gross: 144
    }
  },
  area: {
    base: 'm2',
    units: {
      mm2: 0.000001,
      cm2: 0.0001,
      m2: 1
    }
  }
};

/**
 * Returns dimension name or 'custom' if unknown
 */
function getDimension(unit) {
  const u = String(unit || '').trim();
  for (const [dim, spec] of Object.entries(DIMENSIONS)) {
    if (u in spec.units || u.toLowerCase() in spec.units) return dim;
  }
  // Check if it's a discrete count/packaging container unit (e.g. 'bottle 500 ml', 'vial 10ml', 'jar 100g', etc.)
  if (/\b(bottle|bottles|cap|caps|jar|jars|can|cans|pouch|pouches|bag|bags|box|boxes|packet|packets|sachet|sachets|vial|vials|container|containers|drum|drums|barrel|barrels|strip|strips|tube|tubes)\b/i.test(u)) {
    return 'count';
  }
  return 'custom';
}

/**
 * Returns the base unit for a given unit's dimension.
 * e.g. getBaseUnit('kg') -> 'g', getBaseUnit('L') -> 'mL', getBaseUnit('pcs') -> 'pcs'
 */
function getBaseUnit(unit) {
  const u = String(unit || '').trim();
  for (const [, spec] of Object.entries(DIMENSIONS)) {
    if (u in spec.units || u.toLowerCase() in spec.units) return spec.base;
  }
  if (getDimension(u) === 'count') return 'pcs';
  return u; // custom dimension — return as-is
}

/**
 * Converts a value to its dimension's base unit.
 * e.g. convertToBase(5, 'kg') -> 5000 (grams)
 * e.g. convertToBase(2, 'L')  -> 2000 (mL)
 * e.g. convertToBase(3, 'pcs') -> 3 (pcs)
 */
function convertToBase(value, unit) {
  const num = parseFloat(value) || 0;
  const base = getBaseUnit(unit);
  if (base === unit) return num; // already base or custom
  try {
    return convert(num, unit, base);
  } catch (e) {
    return num;
  }
}

function normalizeUnit(unit) {
  const u = String(unit || '').trim();
  for (const spec of Object.values(DIMENSIONS)) {
    for (const key of Object.keys(spec.units)) {
      if (key.toLowerCase() === u.toLowerCase()) return key;
    }
  }
  return u;
}

function areCompatible(unitA, unitB) {
  const uA = normalizeUnit(unitA);
  const uB = normalizeUnit(unitB);
  if (uA.toLowerCase() === uB.toLowerCase()) return true;
  const dA = getDimension(uA);
  const dB = getDimension(uB);
  return dA !== 'custom' && dA === dB;
}

function convert(value, fromUnit, toUnit) {
  const num = parseFloat(value);
  if (isNaN(num)) return 0;

  const from = normalizeUnit(fromUnit);
  const to   = normalizeUnit(toUnit);

  if (from.toLowerCase() === to.toLowerCase()) return num;

  const dimFrom = getDimension(from);
  const dimTo   = getDimension(to);

  if (dimFrom === 'custom' || dimTo === 'custom' || dimFrom !== dimTo) {
    if (from.toLowerCase() === to.toLowerCase()) return num;
    throw new Error(`Incompatible or custom units: "${fromUnit}" cannot be converted to "${toUnit}".`);
  }

  const spec = DIMENSIONS[dimFrom].units;
  const fromMult = spec[from] || spec[from.toLowerCase()] || 1;
  const toMult   = spec[to]   || spec[to.toLowerCase()]   || 1;

  const inBase = num * fromMult;
  return inBase / toMult;
}

/**
 * Parses strings like "200 mL", "500g", "1 L" into { val, unit }
 */
function parseUnitQuantity(str, defaultUnit = 'mL') {
  if (typeof str === 'number') return { val: str, unit: defaultUnit };
  const s = String(str || '').trim();
  const match = s.match(/^([\d.]+)\s*([a-zA-Z]+)?$/);
  if (match) {
    return {
      val: parseFloat(match[1]) || 0,
      unit: match[2] ? normalizeUnit(match[2]) : defaultUnit
    };
  }
  return { val: parseFloat(s) || 0, unit: defaultUnit };
}

/**
 * Calculates how many finished units (bottles/packs/containers) are produced from a given
 * production quantity, fully supporting weight (kg/g/mg), volume (L/mL), and count (pcs/bottles).
 *
 * Examples:
 *   calculateProductionBottles(5, 'kg', 1, 'kg')   -> { bottles: 5,  totalBaseQty: 5000, baseUnit: 'g', dimension: 'weight' }
 *   calculateProductionBottles(5, 'kg', 500, 'g')  -> { bottles: 10, totalBaseQty: 5000, baseUnit: 'g', dimension: 'weight' }
 *   calculateProductionBottles(100, 'L', 200, 'mL') -> { bottles: 500, totalBaseQty: 100000, baseUnit: 'mL', dimension: 'volume' }
 *   calculateProductionBottles(50, 'pcs', 1, 'pcs') -> { bottles: 50,  totalBaseQty: 50,  baseUnit: 'pcs', dimension: 'count' }
 */
function calculateProductionBottles(desiredVal, desiredUnit, bottleSizeVal, bottleSizeUnit) {
  const dVal = parseFloat(desiredVal) || 0;
  const bVal = parseFloat(bottleSizeVal) || 1;

  if (dVal <= 0) return { bottles: 0, totalVolumeInML: 0, totalBaseQty: 0, baseUnit: 'pcs', dimension: 'count' };

  const dUnit = normalizeUnit(desiredUnit || 'pcs');
  const bUnit = normalizeUnit(bottleSizeUnit || 'mL');

  const dDim = getDimension(dUnit);
  const bDim = getDimension(bUnit);

  // If desired unit is count-based (pcs, bottles, box, caps, etc.)
  if (dDim === 'count') {
    const bottles = Math.floor(dVal);
    const baseUnit = getBaseUnit(bUnit);
    const bValInBase = convertToBase(bVal, bUnit);
    let totalVolumeInML = 0;
    try {
      if (bDim === 'volume') totalVolumeInML = bottles * convertToBase(bVal, bUnit);
    } catch (_) {}
    return {
      bottles,
      totalVolumeInML,
      totalBaseQty: bottles * bValInBase,
      baseUnit,
      dimension: bDim !== 'custom' ? bDim : 'count'
    };
  }

  // If desired unit and bottle size unit are in the same dimension (both weight, both volume)
  if (areCompatible(dUnit, bUnit)) {
    const baseUnit = getBaseUnit(dUnit);
    const totalBaseQty = convertToBase(dVal, dUnit);
    const bValInBase  = convertToBase(bVal, bUnit);
    const bottles = bValInBase > 0 ? Math.floor(totalBaseQty / bValInBase) : 0;
    let totalVolumeInML = 0;
    if (dDim === 'volume') totalVolumeInML = totalBaseQty; // base is mL
    else if (dDim === 'weight') {
      // no mL conversion for weight — leave 0
    }
    return { bottles, totalVolumeInML, totalBaseQty, baseUnit, dimension: dDim };
  }

  // Fallback: treat desired quantity as count
  return {
    bottles: Math.floor(dVal),
    totalVolumeInML: 0,
    totalBaseQty: dVal,
    baseUnit: 'pcs',
    dimension: 'count'
  };
}

/**
 * Computes max feasible bottle count from available bulk stock.
 * Handles weight, volume, and count dimensions.
 * @param {number} bulkQty - quantity of bulk (e.g. 5)
 * @param {string} bulkUnit - unit of bulk (e.g. 'kg')
 * @param {number} containerSize - size of each container (e.g. 500)
 * @param {string} containerUnit - unit of container (e.g. 'g')
 * @returns {number} max fillable count
 */
function maxFeasibleBottles(bulkQty, bulkUnit, containerSize, containerUnit) {
  if (!bulkQty || bulkQty <= 0 || !containerSize || containerSize <= 0) return 0;

  const bNorm = normalizeUnit(bulkUnit);
  const cNorm = normalizeUnit(containerUnit);

  if (!areCompatible(bNorm, cNorm)) return 0;

  try {
    const totalInBase = convertToBase(bulkQty, bNorm);
    const containerInBase = convertToBase(containerSize, cNorm);
    return containerInBase > 0 ? Math.floor(totalInBase / containerInBase) : 0;
  } catch (e) {
    return 0;
  }
}

const unitConv = {
  convert,
  areCompatible,
  getDimension,
  getBaseUnit,
  convertToBase,
  normalizeUnit,
  parseUnitQuantity,
  calculateProductionBottles,
  maxFeasibleBottles,
  DIMENSIONS
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = unitConv;
}
if (typeof window !== 'undefined') {
  window.unitConv = unitConv;
}
