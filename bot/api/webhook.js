// ============================================================================
// bot/api/webhook.js — LaliClinicBot v2.0
// Официальный бот клиники LALI: приём заявок, админ-панель Сергея, баннер.
// Архитектура: stateless serverless (Vercel). Память диалогов — метки #p<id>.
// Секреты (токен) — ТОЛЬКО в переменных окружения Vercel.
// ============================================================================

// ---------- ИНФРАСТРУКТУРА ----------
const API = async (token, method, body) => {
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.ok) {
      console.error(`[TG] ${method} failed:`, json.description || res.status);
    }
    return json;
  } catch (e) {
    console.error(`[TG] ${method} exception:`, e.message);
    return { ok: false };
  }
};

// ---------- КОНФИГУРАЦИЯ ----------
const ADMIN = String(process.env.ADMIN_CHAT_ID || '7166765616');
const SITE = 'https://moksha86.github.io/lali-site/';
const PDF_URL =
  process.env.PDF_URL || SITE + 'assets/docs/lali-brochure.pdf';
const BANNER_URL =
  process.env.BANNER_URL || SITE + 'assets/img/bot-welcome-banner.jpg';
const PHONE = '+7 (900) 353-53-53';
const SIGN = '\n\n— Помощник Сергей, клиника LALI';

// ---------- ТЕКСТЫ ----------
const WELCOME_CAPTION =
  'Добро пожаловать в клинику LALI!\n\n' +
  'Я — Сергей, помощник врача. Здесь вы можете быстро получить информацию, ' +
  'записаться на приём и задать любые вопросы о лечении и реабилитации.\n\n' +
  'LALI — дипломированный специалист, врач остеопат-онколог, 4 поколение.\n' +
  '• >20 лет практики, >3000 пациентов\n' +
  '• Лицензия DOH-MD-2020-847392 (Департамент здравоохранения Абу-Даби)\n\n' +
  'Выберите действие в меню ниже 👇';

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

const QUESTION_PROMPT =
  '💬 Опишите ваш вопрос одним сообщением — помощник Сергей ответит лично. ' +
  'Можно приложить фото документов или анализов.';

const ADMIN_HELP =
  '🛠 АДМИН-ПАНЕЛЬ LALI активна.\n\n' +
  'КАК ОТВЕЧАТЬ ПАЦИЕНТАМ:\n' +
  '1) Вам приходит карточка пациента (🆕) с меткой #p<id> и кнопками.\n' +
  '2) Цитируйте карточку (свайп влево / «Ответить») и напишите сообщение — ' +
  'бот доставит его пациенту с вашей подписью.\n' +
  '3) Фото или документ в ответ на карточку тоже доставляются пациенту.\n' +
  '4) Кнопки под карточкой: 📄 Буклет / 📅 Форма записи / ℹ️ Справка — ' +
  'уходят пациенту одним нажатием.\n\n' +
  'Команды: /start — эта справка, /menu — меню пациента для проверки.';

// ---------- КЛАВИАТУРЫ ----------
const MENU = {
  inline_keyboard: [
    [{ text: '📅 Записаться на приём', callback_data: 'book' }],
    [{ text: '📄 Скачать буклет (PDF)', callback_data: 'pdf' }],
    [
      { text: '💬 Задать вопрос', callback_data: 'question' },
      { text: 'ℹ️ О враче', callback_data: 'about' },
    ],
    [{ text: '🌐 Официальный сайт', url: SITE }],
  ],
};

const adminButtons = (pid) => ({
  inline_keyboard: [
    [
      { text: '📄 Буклет', callback_data: 'pdf2:' + pid },
      { text: '📅 Форма записи', callback_data: 'book2:' + pid },
    ],
    [{ text: 'ℹ️ Справка о клинике', callback_data: 'about2:' + pid }],
  ],
});

// ---------- УТИЛИТЫ ----------
const nowMs = () =>
  new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    dateStyle: 'short',
    timeStyle: 'short',
  });

const patientCard = (u, msg) =>
  '🆕 ПАЦИЕНТ\n' +
  '👤 ' + (u.first_name || '') + ' ' + (u.last_name || '') + '\n' +
  '🪪 #p' + u.id + '\n' +
  '@' + (u.username || 'без username') + '\n' +
  (msg.text ? '💬 ' + msg.text : '📎 Вложение — следующим сообщением') + '\n' +
  '🕒 ' + nowMs() + '\n\n' +
  '↩️ Ответить: цитируйте эту карточку и напишите сообщение.';

// ---------- ХЭНДЛЕР ----------
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'LaliClinicBot webhook alive v2.0' });
  }
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!TOKEN) return res.status(500).json({ ok: false, error: 'TELEGRAM_BOT_TOKEN not set' });

  const update = req.body || {};
  const cb = update.callback_query;
  const msg = update.message;

  // ================= КНОПКИ =================
  if (cb) {
    const chat = cb.message.chat.id;
    const data = cb.data || '';
    await API(TOKEN, 'answerCallbackQuery', { callback_query_id: cb.id });

    // --- пациент ---
    if (data === 'book') await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT });
    if (data === 'question') await API(TOKEN, 'sendMessage', { chat_id: chat, text: QUESTION_PROMPT });
    if (data === 'about') await API(TOKEN, 'sendMessage', { chat_id: chat, text: ABOUT });
    if (data === 'pdf')
      await API(TOKEN, 'sendDocument', {
        chat_id: chat,
        document: PDF_URL,
        caption: 'Официальный буклет LALI — врач остеопат-онколог, 4 поколение',
      });
    if (data === 'menu')
      await API(TOKEN, 'sendPhoto', {
        chat_id: chat,
        photo: BANNER_URL,
        caption: WELCOME_CAPTION,
        reply_markup: MENU,
      });

    // --- админ: быстрые отправки пациенту ---
    let m;
    if ((m = data.match(/^pdf2:(\d+)$/))) {
      await API(TOKEN, 'sendDocument', { chat_id: m[1], document: PDF_URL, caption: 'Официальный буклет LALI — врач остеопат-онколог, 4 поколение' });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Буклет отправлен пациенту #p' + m[1] });
    }
    if ((m = data.match(/^book2:(\d+)$/))) {
      await API(TOKEN, 'sendMessage', { chat_id: m[1], text: BOOK_PROMPT });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Форма записи отправлена пациенту #p' + m[1] });
    }
    if ((m = data.match(/^about2:(\d+)$/))) {
      await API(TOKEN, 'sendMessage', { chat_id: m[1], text: ABOUT });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Справка отправлена пациенту #p' + m[1] });
    }
    return res.status(200).json({ ok: true });
  }

  // ================= СООБЩЕНИЯ =================
  if (msg) {
    const chat = msg.chat.id;
    const from = String(msg.from ? msg.from.id : '');

    // ---------- АДМИН (Сергей) ----------
    if (from === ADMIN) {
      if (msg.text && (msg.text.startsWith('/start') || msg.text.startsWith('/help'))) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: ADMIN_HELP });
        return res.status(200).json({ ok: true });
      }
      if (msg.text && msg.text.startsWith('/menu')) {
        await API(TOKEN, 'sendPhoto', { chat_id: chat, photo: BANNER_URL, caption: WELCOME_CAPTION, reply_markup: MENU });
        return res.status(200).json({ ok: true });
      }

      // ответ цитированием карточки пациента
      const replied = msg.reply_to_message;
      if (replied) {
        const src = replied.text || replied.caption || '';
        const m = src.match(/#p(\d+)/);
        if (m) {
          const pid = m[1];
          await API(TOKEN, 'sendChatAction', { chat_id: pid, action: 'typing' });
          if (msg.text) {
            await API(TOKEN, 'sendMessage', { chat_id: pid, text: msg.text + SIGN });
          } else {
            await API(TOKEN, 'copyMessage', {
              chat_id: pid,
              from_chat_id: chat,
              message_id: msg.message_id,
              caption: (msg.caption || '') + SIGN,
            });
          }
          await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Отправлено пациенту #p' + pid });
          return res.status(200).json({ ok: true });
        }
      }

      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '🛠 Чтобы ответить пациенту — цитируйте его карточку и напишите сообщение. Либо нажмите кнопку под карточкой. Справка: /help' });
      return res.status(200).json({ ok: true });
    }

    // ---------- ПАЦИЕНТЫ ----------
    if (msg.text && msg.text.startsWith('/start')) {
      // приветствие с баннером + меню
      await API(TOKEN, 'sendPhoto', {
        chat_id: chat,
        photo: BANNER_URL,
        caption: WELCOME_CAPTION,
        reply_markup: MENU,
      });
      if (msg.text.includes('booking')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT });
      }
      return res.status(200).json({ ok: true });
    }

    // заявка / сообщение / медиа от пациента → карточка Сергею
    const u = msg.from || {};
    await API(TOKEN, 'sendMessage', {
      chat_id: ADMIN,
      text: patientCard(u, msg),
      reply_markup: adminButtons(u.id),
    });
    if (!msg.text) {
      await API(TOKEN, 'forwardMessage', { chat_id: ADMIN, from_chat_id: chat, message_id: msg.message_id });
    }
    await API(TOKEN, 'sendMessage', {
      chat_id: chat,
      text: '✅ Принято. Помощник Сергей ответит вам лично в ближайшее время. Если срочно — звоните: ' + PHONE + '.',
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}