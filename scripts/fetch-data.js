#!/usr/bin/env node
/**
 * fetch-data.js — тянет данные из World Bank API и сохраняет в data/stats.json
 * Запуск: node scripts/fetch-data.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const COUNTRIES = ['BY', 'PL', 'LT', 'LV', 'UA', 'RU'];
const YEAR_FROM = 2005;

// World Bank indicator codes
const INDICATORS = {
  gdp_per_capita: 'NY.GDP.PCAP.CD',   // ВВП на душу, USD текущие
  inflation:      'FP.CPI.TOTL.ZG',   // Инфляция ИПЦ, %
  wages:          'NY.GNS.ICTR.ZS',   // Валовые сбережения % ВВП (proxy; см. примечание)
  gdp_total:      'NY.GDP.MKTP.CD',   // ВВП всего, для расчёта зарплат
  labor_share:    'SL.EMP.TOTL.SP.ZS',// Занятость % нас-я
};

// Для зарплат используем: компенсация работникам (% ВВП) × ВВП / занятое население / 12
// Это приблизительный показатель, реальные данные нацстатистик точнее
const WAGE_INDICATOR = 'SL.TLF.TOTL.IN'; // Рабочая сила (чел.)
const COMP_INDICATOR  = 'SL.EMP.TOTL.SP.ZS';

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('JSON parse error: ' + e.message)); }
      });
    }).on('error', reject);
  });
}

async function fetchIndicator(indicator, countries) {
  const codes = countries.join(';');
  const url = `https://api.worldbank.org/v2/country/${codes}/indicator/${indicator}`
    + `?format=json&per_page=1000&date=${YEAR_FROM}:${new Date().getFullYear()}`;

  console.log(`  Fetching ${indicator}…`);
  const json = await fetchJSON(url);

  if (!Array.isArray(json) || json.length < 2) {
    console.warn(`  Warning: unexpected response for ${indicator}`);
    return {};
  }

  const rows = json[1] || [];
  const result = {};

  rows.forEach(row => {
    const code = row.countryiso3code
      ? iso3to2(row.countryiso3code)
      : (row.country?.id || '');
    if (!countries.includes(code)) return;
    if (!result[code]) result[code] = [];
    result[code].push({
      year:  parseInt(row.date),
      value: row.value != null ? Math.round(row.value * 10) / 10 : null,
    });
  });

  // Sort ascending
  Object.keys(result).forEach(k => result[k].sort((a, b) => a.year - b.year));
  return result;
}

// Simple ISO 3166-1 alpha-3 → alpha-2 map (only countries we need)
const ISO3_MAP = {
  BLR: 'BY', POL: 'PL', LTU: 'LT', LVA: 'LV', UKR: 'UA', RUS: 'RU',
};
function iso3to2(c3) { return ISO3_MAP[c3] || c3; }

async function fetchWages(countries) {
  // Labour compensation as share of GDP × GDP / labour force / 12
  // Indicator: NV.AGR.TOTL.ZS doesn't work well; use a simpler proxy:
  // Average wage ≈ GDP per capita * 0.55 (rough labour share) / 12
  // Better: fetch compensation of employees (% GDP) * GDP / employed / 12

  // We fetch: GDP per capita (already have), and use labour share ~55%
  // For a real version, Rosstat/Belstat numbers override this

  const gdp    = await fetchIndicator('NY.GDP.PCAP.CD', countries);
  const result = {};

  countries.forEach(code => {
    const series = gdp[code] || [];
    result[code] = series.map(pt => ({
      year:  pt.year,
      // approximate: GDP per capita * labour share (0.55) / 12 months
      value: pt.value != null ? Math.round(pt.value * 0.55 / 12) : null,
    }));
  });
  return result;
}

async function main() {
  console.log('🔄 Fetching data from World Bank API…');

  const [gdp, inflation] = await Promise.all([
    fetchIndicator('NY.GDP.PCAP.CD', COUNTRIES),
    fetchIndicator('FP.CPI.TOTL.ZG', COUNTRIES),
  ]);

  console.log('  Computing wage proxy…');
  const wages = await fetchWages(COUNTRIES);

  console.log('  Fetching unemployment and debt...');
  const [population, gini] = await Promise.all([
    fetchIndicator('SP.POP.TOTL', COUNTRIES),
    fetchIndicator('SI.POV.GINI', COUNTRIES),
  ]);

  const output = {
    updated: new Date().toISOString().slice(0, 10),
    gdp_per_capita: gdp,
    inflation,
    wages,
    population,
    gini,
  };

  const outDir  = path.join(__dirname, '..', 'data');
  const outFile = path.join(outDir, 'stats.json');

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(output, null, 2), 'utf8');

  console.log(`✅ Saved to data/stats.json (${Object.keys(gdp).length} countries)`);
}

main().catch(e => { console.error('❌ Error:', e.message); process.exit(1); });
