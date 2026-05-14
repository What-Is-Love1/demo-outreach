// Generator: AI-powered personalized outreach messages
// Usage: node src/generator.js [companies.json] [template]

const fs = require('fs');
const path = require('path');

const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
if (!OPENROUTER_KEY) throw new Error('OPENROUTER_API_KEY not set');

const MODEL = 'anthropic/claude-haiku-4.5';

const TEMPLATES = {
  telegram: {
    name: 'Telegram DM',
    system: `Ты — копирайтер, специализирующийся на B2B cold outreach. 
Пишешь короткие персонализированные сообщения для Telegram.

ПРАВИЛА:
1. Максимум 300 символов
2. Без приветствия "Здравствуйте" — сразу к делу
3. Упомяни что-то конкретное о компании (показывает что ты изучил)
4. Предложи конкретную выгоду (не "давайте созвонимся")
5. Один простой call-to-action
6. Тон: деловой, но не формальный. Как коллега, не как продавец
7. НЕ используй: "уникальное предложение", "только для вас", "скидка"
8. Язык: русский`,
    user: (company, offer) => `Компания: ${company.name}
Сайт: ${company.url || 'нет'}
Описание: ${company.description || company.metaDescription || 'нет'}
Рейтинг: ${company.rating || 'нет'} (${company.reviews || 0} отзывов)

Наше предложение: ${offer}

Напиши одно персонализированное сообщение для Telegram.`,
  },

  email: {
    name: 'Email',
    system: `Ты — копирайтер для B2B email outreach.
Пишешь короткие холодные письма.

ПРАВИЛА:
1. Subject line (до 50 символов) + тело (до 500 символов)
2. Персонализация: упомяни конкретный факт о компании
3. Одна конкретная выгода с цифрой
4. Один call-to-action (вопрос или предложение)
5. Подпись: имя + должность
6. Тон: профессиональный, конкретный
7. НЕ используй шаблонные фразы
8. Язык: русский

Формат ответа:
Subject: ...
---
Тело письма`,
    user: (company, offer) => `Компания: ${company.name}
Сайт: ${company.url || 'нет'}
Описание: ${company.description || company.metaDescription || 'нет'}

Наше предложение: ${offer}
Отправитель: Влад, AI Automation Engineer

Напиши одно холодное письмо.`,
  },

  upwork: {
    name: 'Upwork Proposal',
    system: `Ты — фрилансер, пишущий proposals на Upwork.

ПРАВИЛА:
1. До 600 символов
2. Начни с понимания проблемы клиента (покажи что прочитал описание)
3. Коротко опиши релевантный опыт (1-2 предложения)
4. Предложи конкретный первый шаг
5. Без лести и общих фраз
6. Тон: уверенный профессионал
7. Язык: английский`,
    user: (company, offer) => `Job posting: ${company.description}
Client: ${company.name}

My background: ${offer}

Write a concise Upwork proposal.`,
  },
};

async function generateMessage(company, offer, templateKey = 'telegram') {
  const template = TEMPLATES[templateKey];
  if (!template) throw new Error(`Unknown template: ${templateKey}`);

  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: template.system },
        { role: 'user', content: template.user(company, offer) },
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${await res.text()}`);
  const data = await res.json();
  return data.choices[0].message.content;
}

const DEFAULT_OFFER = `AI-бот для вашего бизнеса: отвечает на вопросы клиентов 24/7, снимает 70% нагрузки с менеджеров. Стоимость ~$200/мес. Окупается за первую неделю. Уже есть рабочий демо для строительных компаний.`;

async function main() {
  const dataPath = process.argv[2] || path.join(__dirname, '../data/companies.json');
  const templateKey = process.argv[3] || 'telegram';
  const offer = process.argv[4] || DEFAULT_OFFER;

  if (!fs.existsSync(dataPath)) {
    console.error(`❌ Файл не найден: ${dataPath}\nСначала запусти: npm run scrape`);
    process.exit(1);
  }

  const companies = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  const template = TEMPLATES[templateKey];
  console.log(`📨 Генерация: ${template.name} для ${companies.length} компаний\n`);

  const results = [];

  for (const company of companies) {
    console.log(`--- ${company.name} ---`);
    try {
      const message = await generateMessage(company, offer, templateKey);
      console.log(message);
      console.log();
      results.push({ company: company.name, url: company.url, message });
    } catch (err) {
      console.error(`❌ Ошибка: ${err.message}\n`);
      results.push({ company: company.name, error: err.message });
    }
  }

  // Save results
  const outPath = path.join(__dirname, `../data/messages-${templateKey}.json`);
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(`\n💾 Сохранено: ${outPath}`);
}

module.exports = { generateMessage, TEMPLATES };

if (require.main === module) {
  main().catch(console.error);
}
