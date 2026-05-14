// Cold Outreach Pipeline
// Full cycle: scrape → enrich → generate personalized messages

const { searchCompanies, enrichCompany } = require('./scraper');
const { generateMessage, TEMPLATES } = require('./generator');
const fs = require('fs');
const path = require('path');

async function pipeline(options = {}) {
  const {
    query = 'строительная компания дома Москва',
    num = 5,
    template = 'telegram',
    offer = 'AI-бот для бизнеса: отвечает на вопросы клиентов 24/7, снимает 70% нагрузки с менеджеров. Уже есть рабочий демо. Окупается за первую неделю.',
  } = options;

  console.log('═══════════════════════════════════════');
  console.log('  Cold Outreach Pipeline v1.0');
  console.log('═══════════════════════════════════════\n');

  // Step 1: Scrape
  console.log(`[1/3] 🔍 Поиск: "${query}" (${num} шт.)`);
  const companies = await searchCompanies(query, num);
  console.log(`       Найдено: ${companies.length}\n`);

  // Step 2: Enrich
  console.log(`[2/3] 🔄 Обогащение данных с сайтов...`);
  const enriched = [];
  for (const c of companies) {
    const e = await enrichCompany(c);
    enriched.push(e);
    const info = [e.emails?.[0], e.phone].filter(Boolean).join(' | ');
    console.log(`       ✅ ${e.name}${info ? ' → ' + info : ''}`);
  }
  console.log();

  // Step 3: Generate
  console.log(`[3/3] 📨 Генерация ${TEMPLATES[template].name} сообщений...\n`);
  const results = [];

  for (const company of enriched) {
    console.log(`━━━ ${company.name} ━━━`);
    if (company.emails?.length) console.log(`📧 ${company.emails.join(', ')}`);
    if (company.phone) console.log(`📞 ${company.phone}`);
    console.log();

    try {
      const message = await generateMessage(company, offer, template);
      console.log(message);
      results.push({
        company: company.name,
        url: company.url,
        emails: company.emails || [],
        phone: company.phone || '',
        message,
      });
    } catch (err) {
      console.error(`❌ ${err.message}`);
      results.push({ company: company.name, error: err.message });
    }
    console.log();
  }

  // Save
  const dataDir = path.join(__dirname, '../data');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, 'results.json'),
    JSON.stringify(results, null, 2),
    'utf8'
  );

  console.log('═══════════════════════════════════════');
  console.log(`✅ Готово: ${results.filter(r => !r.error).length}/${enriched.length} сообщений`);
  console.log(`💾 data/results.json`);
  console.log('═══════════════════════════════════════');

  return results;
}

// CLI
const args = process.argv.slice(2);
const query = args[0] || undefined;
const num = parseInt(args[1]) || undefined;
const template = args[2] || undefined;

pipeline({ query, num, template }).catch(console.error);
