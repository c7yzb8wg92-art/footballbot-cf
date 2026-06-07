// FootballWorlds Telegram Bot on Cloudflare Workers
// Receives Telegram updates via webhook, calls Gemini AI with Google Search.

import { COUNTRIES, TOURNAMENTS, findCountry, findLeague, findTournament } from './leagues.js';

const TG_API = (token) => `https://api.telegram.org/bot${token}`;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// ================== ENTRYPOINT ==================
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check
    if (request.method === 'GET' && url.pathname === '/') {
      return new Response('⚽ FootballWorlds bot is alive! Webhook endpoint: /webhook', { status: 200 });
    }

    // One-time setup endpoint: /setup?secret=YOUR_BOT_TOKEN
    if (url.pathname === '/setup') {
      const secret = url.searchParams.get('secret');
      if (secret !== env.BOT_TOKEN) return new Response('Forbidden', { status: 403 });
      const webhookUrl = `${url.origin}/webhook`;
      const r = await fetch(`${TG_API(env.BOT_TOKEN)}/setWebhook?url=${encodeURIComponent(webhookUrl)}&drop_pending_updates=true`);
      const data = await r.json();
      // Also set commands
      await fetch(`${TG_API(env.BOT_TOKEN)}/setMyCommands`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commands: [
            { command: 'start', description: '🏠 Main menu' },
            { command: 'top', description: '🔥 Top football news' },
            { command: 'transfers', description: '💸 Transfer market' },
            { command: 'tournaments', description: '🏆 Cups & international' },
            { command: 'players', description: '⭐ Player news' },
            { command: 'leagues', description: '🌍 Browse by country' },
            { command: 'ask', description: '🤖 Ask AI a question' },
            { command: 'help', description: '📖 Help' },
          ],
        }),
      });
      return new Response(JSON.stringify({ webhook: webhookUrl, telegram: data }, null, 2), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Webhook from Telegram
    if (request.method === 'POST' && url.pathname === '/webhook') {
      try {
        const update = await request.json();
        ctx.waitUntil(handleUpdate(update, env));
      } catch (e) {
        console.error('Webhook parse error', e);
      }
      return new Response('ok', { status: 200 });
    }

    return new Response('Not found', { status: 404 });
  },
};

// ================== HANDLERS ==================
async function handleUpdate(update, env) {
  try {
    if (update.message) return handleMessage(update.message, env);
    if (update.callback_query) return handleCallback(update.callback_query, env);
  } catch (err) {
    console.error('handleUpdate error:', err);
  }
}

async function handleMessage(msg, env) {
  const chatId = msg.chat.id;
  const text = (msg.text || '').trim();
  if (!text) return;

  if (text.startsWith('/start')) return sendMainMenu(env, chatId, msg.from?.first_name);
  if (text.startsWith('/help')) return sendHelp(env, chatId);
  if (text.startsWith('/top') || text.startsWith('/news')) return sendCategory(env, chatId, 'top');
  if (text.startsWith('/transfers')) return sendCategory(env, chatId, 'transfers');
  if (text.startsWith('/players')) return sendCategory(env, chatId, 'players');
  if (text.startsWith('/tournaments')) {
    return tg(env, 'sendMessage', { chat_id: chatId, text: '🏆 <b>Pick a tournament:</b>', parse_mode: 'HTML', reply_markup: tournamentsKeyboard() });
  }
  if (text.startsWith('/leagues')) {
    return tg(env, 'sendMessage', { chat_id: chatId, text: '🌍 <b>Pick a country:</b>', parse_mode: 'HTML', reply_markup: countriesKeyboard(0) });
  }
  if (text.startsWith('/ask')) {
    const q = text.replace(/^\/ask(@\w+)?\s*/, '').trim();
    if (!q) return tg(env, 'sendMessage', { chat_id: chatId, text: 'ℹ️ Usage: <code>/ask your question</code>\n\nExample:\n<code>/ask who scored in El Clasico?</code>', parse_mode: 'HTML' });
    return askAi(env, chatId, q);
  }
  if (text.startsWith('/')) return; // unknown command

  // Free-text → AI question
  return askAi(env, chatId, text);
}

async function handleCallback(cq, env) {
  const data = cq.data || '';
  const chatId = cq.message.chat.id;
  const messageId = cq.message.message_id;
  // ack quickly
  await tg(env, 'answerCallbackQuery', { callback_query_id: cq.id });

  if (data === 'noop') return;

  if (data.startsWith('menu:')) {
    const which = data.slice(5);
    if (which === 'main') return editMenu(env, chatId, messageId, '🏠 <b>Main Menu</b>\nWhat would you like to see?', mainMenuKeyboard(env));
    if (which === 'countries') return editMenu(env, chatId, messageId, '🌍 <b>Pick a country:</b>', countriesKeyboard(0));
    if (which === 'tournaments') return editMenu(env, chatId, messageId, '🏆 <b>Pick a tournament:</b>', tournamentsKeyboard());
    return;
  }
  if (data.startsWith('countries:')) {
    const page = Number(data.slice(10)) || 0;
    return editMenu(env, chatId, messageId, '🌍 <b>Pick a country:</b>', countriesKeyboard(page));
  }
  if (data.startsWith('country:')) {
    const c = findCountry(data.slice(8));
    if (!c) return;
    return editMenu(env, chatId, messageId, `${c.flag} <b>${esc(c.name)}</b>\nPick a league or get country-wide news:`, countryLeaguesKeyboard(c.id));
  }
  if (data.startsWith('country-news:')) {
    const c = findCountry(data.slice(13));
    if (!c) return;
    return fetchAndShow(env, chatId, messageId, {
      topic: `latest football news from ${c.name}: all leagues, national team, clubs and transfers`,
      title: `${c.flag} ${c.name} — Latest News`,
      back: `country:${c.id}`,
      refresh: `country-news:${c.id}`,
    });
  }
  if (data.startsWith('lg:')) {
    const info = findLeague(data.slice(3));
    if (!info) return;
    return fetchAndShow(env, chatId, messageId, {
      topic: `latest news, matches, transfers and standings from the ${info.league.name} (${info.country.name} football)`,
      title: `${info.country.flag} ${info.league.name}`,
      back: `country:${info.country.id}`,
      refresh: `lg:${info.league.id}`,
    });
  }
  if (data.startsWith('tour:')) {
    const t = findTournament(data.slice(5));
    if (!t) return;
    return fetchAndShow(env, chatId, messageId, {
      topic: `latest news and results from the ${t.name}`,
      title: `${t.emoji} ${t.name}`,
      back: 'menu:tournaments',
      refresh: `tour:${t.id}`,
    });
  }
  if (data.startsWith('cat:')) {
    return sendCategory(env, chatId, data.slice(4), messageId);
  }
  if (data.startsWith('refresh:')) {
    const key = data.slice(8);
    if (key.startsWith('cat:')) return sendCategory(env, chatId, key.slice(4), messageId);
    if (key.startsWith('lg:')) {
      const info = findLeague(key.slice(3));
      if (!info) return;
      return fetchAndShow(env, chatId, messageId, {
        topic: `latest news, matches, transfers and standings from the ${info.league.name} (${info.country.name} football)`,
        title: `${info.country.flag} ${info.league.name}`,
        back: `country:${info.country.id}`,
        refresh: `lg:${info.league.id}`,
      });
    }
    if (key.startsWith('tour:')) {
      const t = findTournament(key.slice(5));
      if (!t) return;
      return fetchAndShow(env, chatId, messageId, {
        topic: `latest news and results from the ${t.name}`,
        title: `${t.emoji} ${t.name}`,
        back: 'menu:tournaments',
        refresh: `tour:${t.id}`,
      });
    }
    if (key.startsWith('country-news:')) {
      const c = findCountry(key.slice(13));
      if (!c) return;
      return fetchAndShow(env, chatId, messageId, {
        topic: `latest football news from ${c.name}: all leagues, national team, clubs and transfers`,
        title: `${c.flag} ${c.name} — Latest News`,
        back: `country:${c.id}`,
        refresh: `country-news:${c.id}`,
      });
    }
  }
  if (data === 'help:ask') {
    return tg(env, 'sendMessage', {
      chat_id: chatId,
      text: '🤖 <b>Ask me anything!</b>\n\nJust type your question and I\'ll search the web for you.\n\nExamples:\n• <code>Who won El Clasico?</code>\n• <code>Top scorers in Bundesliga</code>\n• <code>Mbappé latest news</code>',
      parse_mode: 'HTML',
    });
  }
}

// ================== HIGH LEVEL ==================
async function sendMainMenu(env, chatId, name) {
  const safe = esc(name || 'mate');
  await tg(env, 'sendMessage', {
    chat_id: chatId,
    text: `⚽ <b>Welcome to FootballWorlds, ${safe}!</b>\n\nYour AI-powered football companion. I bring you <b>live news</b> from every major league and tournament — refreshed in real time.\n\n<b>What I can do:</b>\n🔥 /top — biggest stories right now\n💸 /transfers — latest transfer moves\n🏆 /tournaments — UCL, World Cup & more\n⭐ /players — player news & records\n🌍 /leagues — pick a country and league\n🤖 /ask <i>your question</i> — ask the AI anything\n❓ /help — full command list\n\nPick something from the menu below 👇`,
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(env),
    link_preview_options: { is_disabled: true },
  });
}

async function sendHelp(env, chatId) {
  await tg(env, 'sendMessage', {
    chat_id: chatId,
    text: `<b>📖 FootballWorlds Bot — Commands</b>\n\n/start — main menu\n/top — top football news\n/transfers — transfer market\n/tournaments — international cups\n/players — player news\n/leagues — browse by country\n/ask &lt;question&gt; — ask the AI\n\n<i>All news is fetched live via Gemini AI + Google Search.</i>`,
    parse_mode: 'HTML',
    reply_markup: mainMenuKeyboard(env),
  });
}

async function sendCategory(env, chatId, cat, messageId = null) {
  const title = cat === 'top' ? '🔥 Top Football Stories'
    : cat === 'transfers' ? '💸 Transfer Market'
    : cat === 'tournaments' ? '🏆 Tournament News'
    : cat === 'players' ? '⭐ Player News'
    : '📰 Football News';
  const topic = cat === 'top' ? 'biggest worldwide football headlines today'
    : cat === 'transfers' ? 'latest football transfer news, rumors, confirmed signings and contract extensions across all top leagues'
    : cat === 'tournaments' ? 'latest news about major football tournaments: Champions League, Europa League, World Cup, Euro, Copa America, AFCON, Asian Cup, Libertadores, Club World Cup'
    : cat === 'players' ? 'latest news about top football players: awards, records, injuries, contract news'
    : 'football news';

  await fetchAndShow(env, chatId, messageId, { topic, title, back: 'menu:main', refresh: `cat:${cat}` });
}

async function fetchAndShow(env, chatId, messageId, { topic, title, back, refresh }) {
  const loading = '⏳ <i>Fetching the latest news… this takes a few seconds.</i>';
  let editMsgId = messageId;
  if (editMsgId) {
    await tg(env, 'editMessageText', { chat_id: chatId, message_id: editMsgId, text: loading, parse_mode: 'HTML' });
  } else {
    const sent = await tg(env, 'sendMessage', { chat_id: chatId, text: loading, parse_mode: 'HTML' });
    editMsgId = sent?.result?.message_id;
  }

  try {
    const items = await aiFetchNews(env, topic, 6);
    const text = renderNews(title, items);
    await tg(env, 'editMessageText', {
      chat_id: chatId,
      message_id: editMsgId,
      text,
      parse_mode: 'HTML',
      reply_markup: refreshKeyboard(refresh, back),
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('fetchAndShow error', err);
    await tg(env, 'editMessageText', {
      chat_id: chatId,
      message_id: editMsgId,
      text: `⚠️ Couldn't fetch news right now.\n\n<code>${esc((err && err.message) || 'Unknown error')}</code>`,
      parse_mode: 'HTML',
      reply_markup: refreshKeyboard(refresh, back),
    });
  }
}

async function askAi(env, chatId, question) {
  const sent = await tg(env, 'sendMessage', { chat_id: chatId, text: '🤖 <i>Thinking & searching the web…</i>', parse_mode: 'HTML' });
  const msgId = sent?.result?.message_id;
  try {
    const answer = await aiAnswerQuestion(env, question);
    await tg(env, 'editMessageText', {
      chat_id: chatId,
      message_id: msgId,
      text: `🤖 <b>AI Answer</b>\n\n${esc(answer)}\n\n<i>Powered by Gemini + Google Search</i>`,
      parse_mode: 'HTML',
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    console.error('askAi error', err);
    await tg(env, 'editMessageText', {
      chat_id: chatId,
      message_id: msgId,
      text: `⚠️ AI error: <code>${esc((err && err.message) || 'unknown')}</code>`,
      parse_mode: 'HTML',
    });
  }
}

// ================== KEYBOARDS ==================
function mainMenuKeyboard(env) {
  const kb = {
    inline_keyboard: [
      [{ text: '🔥 Top News', callback_data: 'cat:top' }, { text: '💸 Transfers', callback_data: 'cat:transfers' }],
      [{ text: '🏆 Tournaments', callback_data: 'menu:tournaments' }, { text: '⭐ Players', callback_data: 'cat:players' }],
      [{ text: '🌍 Leagues by Country', callback_data: 'menu:countries' }],
      [{ text: '🤖 Ask AI', callback_data: 'help:ask' }, { text: '🔄 Refresh', callback_data: 'refresh:cat:top' }],
    ],
  };
  if (env.WEBAPP_URL) {
    kb.inline_keyboard.push([{ text: '📱 Open Mini App', web_app: { url: env.WEBAPP_URL } }]);
  }
  return kb;
}

function countriesKeyboard(page = 0) {
  const PER = 12;
  const slice = COUNTRIES.slice(page * PER, page * PER + PER);
  const rows = [];
  for (let i = 0; i < slice.length; i += 2) {
    const r = [{ text: `${slice[i].flag} ${slice[i].name}`, callback_data: `country:${slice[i].id}` }];
    if (slice[i + 1]) r.push({ text: `${slice[i + 1].flag} ${slice[i + 1].name}`, callback_data: `country:${slice[i + 1].id}` });
    rows.push(r);
  }
  const total = Math.ceil(COUNTRIES.length / PER);
  if (total > 1) {
    const nav = [];
    if (page > 0) nav.push({ text: '⬅️ Prev', callback_data: `countries:${page - 1}` });
    nav.push({ text: `${page + 1}/${total}`, callback_data: 'noop' });
    if (page < total - 1) nav.push({ text: 'Next ➡️', callback_data: `countries:${page + 1}` });
    rows.push(nav);
  }
  rows.push([{ text: '🏠 Main Menu', callback_data: 'menu:main' }]);
  return { inline_keyboard: rows };
}

function countryLeaguesKeyboard(countryId) {
  const c = findCountry(countryId);
  if (!c) return { inline_keyboard: [[{ text: '🏠 Main Menu', callback_data: 'menu:main' }]] };
  const rows = c.leagues.map(l => [{ text: `🏟 ${l.name}`, callback_data: `lg:${l.id}` }]);
  rows.push([{ text: `📰 All ${c.name} News`, callback_data: `country-news:${c.id}` }]);
  rows.push([{ text: '⬅️ Countries', callback_data: 'menu:countries' }, { text: '🏠 Main', callback_data: 'menu:main' }]);
  return { inline_keyboard: rows };
}

function tournamentsKeyboard() {
  const rows = [];
  for (let i = 0; i < TOURNAMENTS.length; i += 2) {
    const r = [{ text: `${TOURNAMENTS[i].emoji} ${TOURNAMENTS[i].name}`, callback_data: `tour:${TOURNAMENTS[i].id}` }];
    if (TOURNAMENTS[i + 1]) r.push({ text: `${TOURNAMENTS[i + 1].emoji} ${TOURNAMENTS[i + 1].name}`, callback_data: `tour:${TOURNAMENTS[i + 1].id}` });
    rows.push(r);
  }
  rows.push([{ text: '🏠 Main Menu', callback_data: 'menu:main' }]);
  return { inline_keyboard: rows };
}

function refreshKeyboard(refreshKey, back) {
  return { inline_keyboard: [[{ text: '🔄 Refresh', callback_data: `refresh:${refreshKey}` }, { text: '⬅️ Back', callback_data: back }]] };
}

async function editMenu(env, chatId, messageId, text, replyMarkup) {
  await tg(env, 'editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', reply_markup: replyMarkup });
}

// ================== AI ==================
async function aiFetchNews(env, topic, count = 6) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are an elite football news aggregator. Today is ${today}.\n\nUse Google Search to find the LATEST REAL news about: ${topic}.\nONLY include news from the last 48 hours. Prioritize breaking, confirmed, and most impactful stories.\n\nReturn ONLY a valid raw JSON array (no markdown, no commentary) of EXACTLY ${count} items. Each item:\n{ "title": string (max 110 chars), "body": string (1-2 sentences), "tag": one of "Breaking" "Confirmed" "Rumor" "Official" "Record" "Award" "Matchday" "Champion" "Injury" "Result" "Transfer" "Draw", "source": real source name, "emoji": single emoji, "hoursAgo": 0-48, "url": full article URL if available else "" }`;

  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.4, maxOutputTokens: 2048 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n') || '';
  const raw = extractJson(text);
  return raw.slice(0, count).map((r, i) => ({
    title: String(r.title || 'Untitled').slice(0, 160),
    body: String(r.body || '').slice(0, 400),
    tag: r.tag || 'Update',
    source: r.source || 'AI Wire',
    emoji: r.emoji || '⚽',
    hoursAgo: Math.max(0, Math.min(48, Number(r.hoursAgo) || i + 1)),
    url: r.url || '',
  }));
}

async function aiAnswerQuestion(env, question) {
  const today = new Date().toISOString().slice(0, 10);
  const prompt = `You are a football expert. Today is ${today}. Use Google Search to find current, accurate information. Answer this football question concisely (max 4 short paragraphs, use emojis, never invent facts):\n\n${question}`;
  const res = await fetch(`${GEMINI_URL}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('\n').trim()) || "Sorry, I couldn't find an answer.";
}

function extractJson(text) {
  const clean = text.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    const p = JSON.parse(clean);
    if (Array.isArray(p)) return p;
  } catch {}
  const m = text.match(/\[[\s\S]*\]/);
  if (m) { try { return JSON.parse(m[0]); } catch {} }
  return [];
}

// ================== RENDER ==================
function renderNews(title, items) {
  if (!items.length) return `<b>${esc(title)}</b>\n\n📭 No fresh news right now. Try again in a few minutes.`;
  const lines = [`<b>${esc(title)}</b>\n`];
  items.forEach((n, i) => {
    const head = n.url ? `<a href="${esc(n.url)}">${esc(n.title)}</a>` : `<b>${esc(n.title)}</b>`;
    lines.push(`${n.emoji || '⚽'} <b>${i + 1}.</b> ${head}\n${esc(n.body)}\n<i>🏷 ${esc(n.tag)} · 📡 ${esc(n.source)} · 🕒 ${timeAgo(n.hoursAgo)}</i>\n`);
  });
  lines.push(`\n<i>🤖 Powered by Gemini AI + Google Search</i>`);
  return lines.join('\n');
}

function timeAgo(h) {
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ================== TELEGRAM API ==================
async function tg(env, method, payload) {
  const res = await fetch(`${TG_API(env.BOT_TOKEN)}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!data.ok) console.error(`tg ${method} failed:`, data);
  return data;
}
