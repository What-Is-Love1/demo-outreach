// Scraper: find companies via Serper (Google Search API)
// Usage: node src/scraper.js "строительная компания Москва" 20

const SERPER_KEY = process.env.SERPER_API_KEY;
if (!SERPER_KEY) throw new Error('SERPER_API_KEY not set');

async function searchCompanies(query, num = 10) {
  const res = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      q: query,
      gl: 'ru',
      hl: 'ru',
      num,
    }),
  });

  if (!res.ok) throw new Error(`Serper ${res.status}: ${await res.text()}`);
  const data = await res.json();

  const companies = [];

  // Extract from organic results
  for (const r of data.organic || []) {
    companies.push({
      name: r.title?.replace(/ [-–—|].*/g, '').trim(),
      url: r.link,
      description: r.snippet || '',
      source: 'organic',
    });
  }

  // Extract from places (local business results)
  for (const r of data.places || []) {
    companies.push({
      name: r.title,
      url: r.website || r.link || '',
      description: r.address || '',
      rating: r.rating,
      reviews: r.reviewsCount,
      phone: r.phoneNumber || '',
      source: 'places',
    });
  }

  return companies;
}

async function enrichCompany(company) {
  // Try to get more info from the website
  if (!company.url) return company;

  try {
    const res = await fetch(company.url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return company;

    const html = await res.text();

    // Extract emails
    const emails = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    company.emails = [...new Set(emails)].filter(e => !e.includes('.png') && !e.includes('.jpg')).slice(0, 3);

    // Extract phones
    const phones = html.match(/(?:\+7|8)[\s(-]*\d{3}[\s)-]*\d{3}[\s-]*\d{2}[\s-]*\d{2}/g) || [];
    if (phones.length && !company.phone) {
      company.phone = phones[0].replace(/\s+/g, '');
    }

    // Extract meta description
    const metaMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)/i);
    if (metaMatch && metaMatch[1].length > company.description.length) {
      company.metaDescription = metaMatch[1];
    }

    // Extract title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleMatch) {
      company.pageTitle = titleMatch[1].trim();
    }
  } catch {
    // Site unreachable — skip enrichment
  }

  return company;
}

async function main() {
  const query = process.argv[2] || 'строительная компания дома Москва';
  const num = parseInt(process.argv[3]) || 10;

  console.log(`🔍 Ищу: "${query}" (${num} результатов)\n`);

  const companies = await searchCompanies(query, num);
  console.log(`📋 Найдено: ${companies.length} компаний\n`);

  console.log('🔄 Обогащение данных с сайтов...\n');
  const enriched = [];
  for (const c of companies) {
    const e = await enrichCompany(c);
    enriched.push(e);
    const emailStr = e.emails?.length ? ` | 📧 ${e.emails[0]}` : '';
    const phoneStr = e.phone ? ` | 📞 ${e.phone}` : '';
    console.log(`  ✅ ${e.name}${emailStr}${phoneStr}`);
  }

  // Save to JSON
  const fs = require('fs');
  const outPath = `${__dirname}/../data/companies.json`;
  fs.mkdirSync(`${__dirname}/../data`, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(enriched, null, 2), 'utf8');
  console.log(`\n💾 Сохранено: ${outPath} (${enriched.length} компаний)`);
}

module.exports = { searchCompanies, enrichCompany };

if (require.main === module) {
  main().catch(console.error);
}
