const express = require('express');
const path = require('path');
const { searchCompanies, enrichCompany } = require('./scraper');
const { generateMessage, TEMPLATES } = require('./generator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// In-memory history (SQLite/Supabase later)
const history = [];

// --- API ---

// Get available templates
app.get('/api/templates', (req, res) => {
  const templates = Object.entries(TEMPLATES).map(([key, t]) => ({
    key,
    name: t.name,
  }));
  res.json(templates);
});

// Get history
app.get('/api/history', (req, res) => {
  res.json(history.slice().reverse());
});

// Run pipeline
app.post('/api/run', async (req, res) => {
  const { query, num = 5, template = 'telegram', offer } = req.body;

  if (!query) return res.status(400).json({ error: 'query required' });

  const runId = Date.now().toString(36);
  const run = {
    id: runId,
    query,
    template,
    num,
    status: 'running',
    startedAt: new Date().toISOString(),
    results: [],
  };
  history.push(run);

  // Send run ID immediately
  res.json({ id: runId, status: 'running' });

  // Process in background
  try {
    // Step 1: Search
    const companies = await searchCompanies(query, num);
    run.companiesFound = companies.length;

    // Step 2: Enrich
    const enriched = [];
    for (const c of companies) {
      const e = await enrichCompany(c);
      enriched.push(e);
    }

    // Step 3: Generate messages
    const defaultOffer = 'AI-бот для бизнеса: отвечает на вопросы клиентов 24/7, снимает 70% нагрузки с менеджеров. Уже есть рабочий демо. Окупается за первую неделю.';

    for (const company of enriched) {
      try {
        const message = await generateMessage(company, offer || defaultOffer, template);
        run.results.push({
          company: company.name,
          url: company.url || '',
          emails: company.emails || [],
          phone: company.phone || '',
          description: company.description || company.metaDescription || '',
          message,
          status: 'ok',
        });
      } catch (err) {
        run.results.push({
          company: company.name,
          url: company.url || '',
          emails: company.emails || [],
          phone: company.phone || '',
          description: company.description || '',
          message: '',
          status: 'error',
          error: err.message,
        });
      }
    }

    run.status = 'done';
    run.finishedAt = new Date().toISOString();
  } catch (err) {
    run.status = 'error';
    run.error = err.message;
    run.finishedAt = new Date().toISOString();
  }
});

// Get run status/results
app.get('/api/run/:id', (req, res) => {
  const run = history.find(r => r.id === req.params.id);
  if (!run) return res.status(404).json({ error: 'not found' });
  res.json(run);
});

app.listen(PORT, () => {
  console.log(`🚀 Outreach Dashboard: http://localhost:${PORT}`);
});
