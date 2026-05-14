# Case Study: AI Cold Outreach Pipeline

## Проблема

Бизнес тратит 3-5 часов в день на ручной поиск клиентов:
- Гуглить компании
- Искать контакты (email, телефон)
- Писать каждому индивидуальное сообщение
- Копипаст = низкий отклик (1-2%)

## Решение

Автоматический pipeline: поиск → обогащение → AI-генерация сообщений.

Одна команда:
```
node src/index.js "ниша + город" 20 telegram
```

Что происходит:
1. **Поиск** — находит компании через Google (Serper API)
2. **Обогащение** — заходит на сайт, извлекает email, телефон, описание
3. **AI-генерация** — Claude Haiku пишет персонализированное сообщение для каждой компании

3 шаблона: Telegram DM, Email, Upwork Proposal.

## Результаты теста

| Метрика | Ручной outreach | С pipeline |
|---|---|---|
| Компаний в час | 5-8 | 50-100 |
| Стоимость на компанию | ~$3 (время) | ~$0.02 (API) |
| Персонализация | Средняя | Высокая (AI анализирует сайт) |
| Email extraction | Вручную | Автоматически |

## Стек

| Компонент | Технология |
|---|---|
| Поиск | Serper API (Google Search) |
| Обогащение | HTTP + regex extraction |
| AI | Claude Haiku 4.5 (OpenRouter) |
| Runtime | Node.js |
| Стоимость | ~$1-2 за 100 компаний |

## Масштабирование

- CRM-интеграция (Airtable, HubSpot, AmoCRM)
- Авто-отправка (Telegram API, SMTP)
- A/B тест шаблонов
- Tracking открытий и ответов
- Scheduler (ежедневный поиск новых компаний)

---

**Исходный код:** [github.com/What-Is-Love1/demo-outreach](https://github.com/What-Is-Love1/demo-outreach)
**Стек:** Node.js · Serper · Claude Haiku 4.5 · OpenRouter
**Автор:** Vlad — AI Automation Engineer
