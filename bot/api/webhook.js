// bot/api/webhook.js — Vercel serverless function для @LaliClinicBot
// Токен берётся ТОЛЬКО из переменной окружения Vercel (репозиторий публичный).
// ADMIN_CHAT_ID и PDF_URL вшиты как запасные значения.

const API = (token, method, body) =>
  fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const MENU = {
  inline_keyboard: [
    [{ text: '📅 Записаться на приём', callback_data: 'book' }],
    [{ text: '📄 Скачать буклет (PDF)', callback_data: 'pdf' }],
    [{ text: '💬 Задать вопрос', callback_data: 'question' }],
    [{ text: 'ℹ️ О враче', callback_data: 'about' }],
  ],
};

const ABOUT =
  'LALI — дипломированный специалист, врач остеопат-онколог, 4 поколение.\n' +
  '• >20 лет практики, >3000 пациентов\n' +
  '• Университет Мохаммеда бин Заида (ОАЭ)\n' +
  '• Лицензия DOH-MD-2020-847392 (Департамент здравоохранения Абу-Даби)\n' +
  '• Взрослые и дети: онкология всех форм и стадий (включая IV), саркомы, меланомы, детская онкология, ЗПР·РАС·ДЦП·СДВГ, осанка и сколиоз, сон и нервная система.\n' +
  'Работа ведётся совместно с лечащим врачом и не заменяет назначенную терапию.\n' +
  'Приём и оценка: г. Краснодар, КП «Золотой город».';

const BOOK_PROMPT =
  '📅 Запись на приём\n\nПришлите ОДНИМ сообщением:\n' +
  '1) Имя\n2) Контакт (телефон или @telegram)\n' +
  '3) Коротко ситуацию и что беспокоит\n4) Удобное время для первого контакта\n\n' +
  'Помощник Сергей свяжется с вами и подберёт время. ' +
  'Имеются противопоказания, необходима консультация специалиста.';

export default async function handler(req, res) {
  // GET-запрос = проверка живости вебхука
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'LaliClinicBot webhook alive' });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  const ADMIN = process.env.ADMIN_CHAT_ID || '7166765616';
  const PDF_URL =
    process.env.PDF_URL ||
    'https://moksha86.github.io/lali-site/assets/docs/lali-brochure.pdf';

  if (!TOKEN) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });

  const update = req.body || {};
  const cb = update.callback_query;
  const msg = update.message;

  // Нажатия кнопок меню
  if (cb) {
    const chat = cb.message.chat.id;
    await API(TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id });

    if (cb.data === 'book') {
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT });
    }
    if (cb.data === 'question') {
      await API(TOKEN, 'sendMessage', {
        chat_id: chat,
        text: '💬 Опишите вопрос одним сообщением — помощник Сергей ответит лично.',
      });
    }
    if (cb.data === 'about') {
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: ABOUT });
    }
    if (cb.data === 'pdf') {
      await API(TOKEN, 'sendDocument', {
        chat_id: chat,
        document: PDF_URL,
        caption: 'Официальный буклет LALI — врач остеопат-онколог, 4 поколение',
      });
    }
    return res.status(200).json({ ok: true });
  }

  // Сообщения пациента
  if (msg) {
    const chat = msg.chat.id;

    if (msg.text && msg.text.startsWith('/start')) {
      await API(TOKEN, 'sendMessage', {
        chat_id: chat,
        reply_markup: MENU,
        text:
          'Здравствуйте! Это официальный бот LALI.\n' +
          'LALI — дипломированный специалист, врач остеопат-онколог, 4 поколение.\n' +
          'Выберите действие:',
      });
      if (msg.text.includes('booking')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT });
      }
      return res.status(200).json({ ok: true });
    }

    // Любое сообщение (текст, фото, документ) → пересылка Сергею + подтверждение пациенту
    const u = msg.from || {};
    await API(TOKEN, 'sendMessage', {
      chat_id: ADMIN,
      text:
        `🆕 Сообщение пациента\n` +
        `👤 ${u.first_name || ''} ${u.last_name || ''}\n` +
        `🪪 id:${u.id}\n` +
        `@${u.username || 'без username'}`,
    });
    await API(TOKEN, 'forwardMessage', {
      chat_id: ADMIN,
      from_chat_id: chat,
      message_id: msg.message_id,
    });
    await API(TOKEN, 'sendMessage', {
      chat_id: chat,
      text:
        '✅ Принято. Помощник Сергей ответит вам лично в ближайшее время. ' +
        'Если срочно — звоните: +7 (900) 353-53-53.',
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}