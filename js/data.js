/* ========== Phase 1: Card data loaded from Supabase (not embedded) ========== */
/* Stable card key format: SETCODE-NUM e.g. "BS-004" */

let SETS = [];                    // [{code, name, card_count, cover_art, sort_order}, ...]
let CARDS = [];                   // all loaded cards (compat array)
let CARDS_BY_SET = {};            // { 'BS': [card, ...], ... }
let CARD_BY_KEY = {};             // { 'BS-004': card, ... }
let CARD_BY_ID = {};              // legacy numeric id → card (migration)
let cardsLoadPromise = null;
let cardsLoaded = false;

function makeCardKey(setCode, num) {
  return String(setCode) + '-' + String(num);
}

function normalizeCardRow(row) {
  // Map DB row → app card shape (keep old field names the UI expects)
  const key = row.key || makeCardKey(row.set_code, row.num);
  return {
    id: row.id,                          // keep numeric id for now
    key: key,                            // NEW primary logical id
    num: row.num,
    cardNumber: row.card_number,
    name: row.name,
    type1: row.type1,
    type2: row.type2,
    hp: row.hp || 0,
    rarity: row.rarity,
    rarityLabel: row.rarity_label,
    emoji: row.emoji || '',
    attack: row.attack || '—',
    damage: row.damage || 0,
    attacks: Array.isArray(row.attacks) ? row.attacks : [],
    battleEligible: row.battle_eligible !== false,
    set: null,                           // filled from SETS
    setCode: row.set_code,
    art: row.art_path,
    price: Number(row.price) || 0
  };
}

function indexCards(cardList) {
  CARDS = cardList.slice();
  CARDS_BY_SET = {};
  CARD_BY_KEY = {};
  CARD_BY_ID = {};
  const setNameByCode = {};
  SETS.forEach(s => { setNameByCode[s.code] = s.name; });
  cardList.forEach(c => {
    if (!c.set) c.set = setNameByCode[c.setCode] || c.setCode;
    if (!c.key) c.key = makeCardKey(c.setCode, c.num);
    CARDS_BY_SET[c.setCode] = CARDS_BY_SET[c.setCode] || [];
    CARDS_BY_SET[c.setCode].push(c);
    CARD_BY_KEY[c.key] = c;
    CARD_BY_ID[c.id] = c;
    CARD_BY_ID[String(c.id)] = c;
  });
  cardsLoaded = true;
}

async function loadSetsAndCards() {
  if (cardsLoadPromise) return cardsLoadPromise;
  cardsLoadPromise = (async () => {
    if (!sb) throw new Error('Supabase not initialized');
    const { data: sets, error: sErr } = await sb
      .from('sets')
      .select('code,name,release_date,card_count,cover_art,sort_order,event_exclusive')
      .eq('hidden', false)
      .order('sort_order', { ascending: true });
    if (sErr) throw sErr;
    SETS = sets || [];

    // Supabase caps a single request at 1000 rows, so page through the full catalog.
    const rows = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: page, error: cErr } = await sb
        .from('cards')
        .select('id,key,set_code,num,card_number,name,rarity,rarity_label,type1,type2,hp,art_path,price,emoji,attack,damage,attacks,battle_eligible')
        .order('id', { ascending: true })
        .range(from, from + PAGE - 1);
      if (cErr) throw cErr;
      if (!page || !page.length) break;
      rows.push(...page);
      if (page.length < PAGE) break;
    }
    const normalized = rows.map(normalizeCardRow);
    indexCards(normalized);
    console.log('[cards] loaded', CARDS.length, 'cards across', SETS.length, 'sets');
    return { sets: SETS, cards: CARDS };
  })();
  return cardsLoadPromise;
}

/** Ensure cards for a set are available. Currently all are loaded; future-proof hook. */
async function ensureCardsForSet(setCode) {
  if (!cardsLoaded) await loadSetsAndCards();
  return CARDS_BY_SET[setCode] || [];
}

/** Cards belonging to a currently-visible (non-hidden) set — excludes staged/unreleased sets. */
function releasedCards() {
  if (!SETS || !SETS.length) return CARDS;
  const codes = new Set(SETS.map(s => s.code));
  return CARDS.filter(c => codes.has(c.setCode));
}

/** Released cards that can actually be acquired through packs/trade-up/wheel/market —
 *  excludes event-exclusive sets (e.g. Team Rocket), which are visible once owned but
 *  only obtainable through their specific event. */
function obtainableCards() {
  if (!SETS || !SETS.length) return CARDS;
  const codes = new Set(SETS.filter(s => !s.event_exclusive).map(s => s.code));
  return CARDS.filter(c => codes.has(c.setCode));
}

function cardsInSet(setCodeOrName) {
  if (!setCodeOrName) return CARDS.slice();
  // accept code or full name
  if (CARDS_BY_SET[setCodeOrName]) return CARDS_BY_SET[setCodeOrName];
  const set = SETS.find(s => s.name === setCodeOrName || s.code === setCodeOrName);
  if (set) return CARDS_BY_SET[set.code] || [];
  return CARDS.filter(c => c.set === setCodeOrName || c.setCode === setCodeOrName);
}

/** Resolve a card by new key ("BS-004") or legacy numeric id */
function resolveCard(idOrKey) {
  if (idOrKey == null || idOrKey === '') return null;
  const s = String(idOrKey);
  return CARD_BY_KEY[s] || CARD_BY_ID[s] || CARD_BY_ID[Number(s)] || null;
}

function cardById(id) {
  return resolveCard(id);
}

function cardByKey(key) {
  return CARD_BY_KEY[String(key)] || null;
}

/** Preferred stable key for a card (or id/key input) */
function toCardKey(cardOrId) {
  if (cardOrId == null) return null;
  if (typeof cardOrId === 'object') {
    return cardOrId.key || makeCardKey(cardOrId.setCode, cardOrId.num);
  }
  const c = resolveCard(cardOrId);
  return c ? c.key : String(cardOrId);
}

/**
 * Migrate collection + grades from old numeric ids → new string keys ("BS-004").
 * Safe to run multiple times. Returns true if anything changed.
 */
function migrateCollectionKeys() {
  let changed = false;
  if (!state.collection || typeof state.collection !== 'object') state.collection = {};
  ensureGradesState();

  const newCol = {};
  for (const [k, v] of Object.entries(state.collection)) {
    const qty = Number(v) || 0;
    if (qty <= 0) continue;
    // already a key?
    if (CARD_BY_KEY[k]) {
      newCol[k] = (newCol[k] || 0) + qty;
      continue;
    }
    // legacy numeric
    const card = CARD_BY_ID[k] || CARD_BY_ID[Number(k)];
    if (card) {
      newCol[card.key] = (newCol[card.key] || 0) + qty;
      changed = true;
    } else {
      // unknown — keep as-is so we don't lose data
      newCol[k] = (newCol[k] || 0) + qty;
    }
  }
  if (changed || Object.keys(newCol).length !== Object.keys(state.collection).length) {
    state.collection = newCol;
    changed = true;
  }

  // grades
  const newGrades = {};
  for (const [k, arr] of Object.entries(state.grades || {})) {
    if (!Array.isArray(arr) || !arr.length) continue;
    if (CARD_BY_KEY[k]) {
      newGrades[k] = (newGrades[k] || []).concat(arr.map(Number));
      continue;
    }
    const card = CARD_BY_ID[k] || CARD_BY_ID[Number(k)];
    if (card) {
      newGrades[card.key] = (newGrades[card.key] || []).concat(arr.map(Number));
      changed = true;
    } else {
      newGrades[k] = (newGrades[k] || []).concat(arr.map(Number));
    }
  }
  state.grades = newGrades;
  return changed;
}

/* ========== end Phase 1 data layer ========== */

const TYPE_COLORS = {
  Normal:'#A8A878', Fire:'#F08030', Water:'#6890F0', Grass:'#78C850',
  Electric:'#F8D030', Psychic:'#F85888', Fighting:'#C03028',
  Trainer:'#888888', Energy:'#B8B8D0'
};
const RARITY_WEIGHTS = {common:50, uncommon:30, epic:12, legendary:8};
const BOX_PACKS = 36;
// Mutable shop prices (loaded from shop_settings / defaults). Box default is under 12×bundle so it is real best value.
let SHOP = {
  pack_single: 4.00,
  pack_bundle: 10.00,
  pack_box: 99.00,
  sale_percent: 0,
  sale_ends_at: null,
  cosmetic_sale_percent: 0,
  cosmetic_sale_ends_at: null,
  mystery_box_price: 25.00,
  mystery_box_force: false // admin: true = available every day (for testing)
};
const MYSTERY_BOX_SET = 'Mystery Box';
// back-compat aliases used elsewhere
let PACK_PRICE = SHOP.pack_single;
let BUNDLE_PRICE = SHOP.pack_bundle;
let BOX_PRICE = SHOP.pack_box;

function shopSaleActive(kind){
  // kind: 'pack' | 'cosmetic'
  const pct = kind === 'cosmetic' ? Number(SHOP.cosmetic_sale_percent)||0 : Number(SHOP.sale_percent)||0;
  if(pct <= 0) return 0;
  const ends = kind === 'cosmetic' ? SHOP.cosmetic_sale_ends_at : SHOP.sale_ends_at;
  if(ends){
    const t = new Date(ends).getTime();
    if(isFinite(t) && Date.now() > t) return 0;
  }
  return Math.min(90, Math.max(0, pct));
}
function shopApplySale(price, kind){
  const pct = shopSaleActive(kind);
  if(pct <= 0) return Math.round(price * 100) / 100;
  return Math.round(price * (1 - pct/100) * 100) / 100;
}
function shopPackCost(qty){
  let base = 0;
  if(qty === 1) base = Number(SHOP.pack_single)||4;
  else if(qty === 3) base = Number(SHOP.pack_bundle)||10;
  else if(qty === 36 || qty === BOX_PACKS) base = Number(SHOP.pack_box)||99;
  else base = (Number(SHOP.pack_single)||4) * qty;
  return shopApplySale(base, 'pack');
}
function shopSyncAliases(){
  PACK_PRICE = Number(SHOP.pack_single)||4;
  BUNDLE_PRICE = Number(SHOP.pack_bundle)||10;
  BOX_PRICE = Number(SHOP.pack_box)||99;
}

const MARKET_SLOTS = 8;

