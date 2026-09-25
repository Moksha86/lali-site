// ============================================================================
// bot/api/webhook.js — LaliClinicBot v3.0
// Официальный бот клиники LALI: приём заявок, админ-панель, баннер, FAQ.
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
const PDF_URL = process.env.PDF_URL || SITE + 'assets/docs/lali-brochure.pdf';
const BANNER_URL = process.env.BANNER_URL || SITE + 'assets/img/bot-welcome-banner.jpg?v=2';
const QR_URL = SITE + 'assets/img/qr-telegram-sergey.png';
const PHONE = '+7 (900) 353-53-53';
const SIGN = '\n\n━━━━━━━━━━━━━━━━━━━━\n💼 Помощник Сергей\n🏥 Клиника LALI';

// ---------- ТЕКСТЫ ----------
const WELCOME_CAPTION = `✨ *Добро пожаловать в клинику LALI!*

Я — Сергей, помощник врача. Здесь вы можете:
  ✅ Быстро получить информацию
  ✅ Записаться на приём
  ✅ Задать вопросы о лечении
  ✅ Скачать буклет клиники

━━━━━━━━━━━━━━━━━━━━
👨‍⚕️ *LALI* — дипломированный специалист
    Врач остеопат-онколог, 4 поколение

📊 *Опыт:*
  • >20 лет медицинской практики
  • >3000 пациентов
  • Лицензия DOH-MD-2020-847392
    (Департамент здравоохранения Абу-Даби)

🎓 *Образование:*
  • Университет Мохаммеда бин Заида (ОАЭ)
  • Фундаментальное академическое образование

Выберите действие в меню ниже 👇`;

const ABOUT = `👨‍⚕️ *О ВРАЧЕ LALI*

*LALI* — дипломированный специалист, врач остеопат-онколог, 4 поколение.

━━━━━━━━━━━━━━━━━━━━
📊 *ОПЫТ И КВАЛИФИКАЦИЯ*
  • >20 лет практики
  • >3000 пациентов
  • Университет Мохаммеда бин Заида (ОАЭ)
  • Лицензия DOH-MD-2020-847392
    (Департамент здравоохранения Абу-Даби)

━━━━━━━━━━━━━━━━━━━━
🎯 *СПЕЦИАЛИЗАЦИЯ*
*Взрослые:*
  • Онкология всех форм и стадий (включая IV)
  • Саркомы и меланомы
  • Неврологические нарушения
  • Тяжёлые состояния

*Дети:*
  • Детская онкология
  • ЗПР · РАС · ДЦП · СДВГ
  • Осанка и сколиоз
  • Сон и нервная система

━━━━━━━━━━━━━━━━━━━━
⚕️ *ПОДХОД*
Работа ведётся совместно с лечащим врачом
и НЕ заменяет назначенную терапию.

📍 *Приём и оценка:*
г. Краснодар, КП «Золотой город»
📞 ${PHONE}`;

const BOOK_PROMPT = `📅 *ЗАПИСЬ НА ПРИЁМ*

Пришлите *ОДНИМ сообщением:*

1️⃣ Имя
2️⃣ Контакт (телефон или @telegram)
3️⃣ Коротко ситуацию и что беспокоит
4️⃣ Удобное время для первого контакта

━━━━━━━━━━━━━━━━━━━━
💼 Помощник Сергей свяжется с вами
и подберёт удобное время.

⚠️ Имеются противопоказания,
необходима консультация специалиста.`;

const QUESTION_PROMPT = `💬 *ЗАДАЙТЕ ВОПРОС*

Опишите ваш вопрос одним сообщением —
помощник Сергей ответит лично.

📎 Можно приложить:
  • Фото документов
  • Фото анализов
  • Голосовое сообщение

⏰ Ответ в течение 2-4 часов
(в рабочее время 09:00-20:00)`;

const FAQ = `❓ *ЧАСТЫЕ ВОПРОСЫ*

*1. Это заменяет основное лечение?*
Нет. Работа ведётся совместно с вашим
лечащим врачом как дополнительная поддержка.

*2. Работаете с IV стадией?*
Да. Поддержка качества жизни, восстановление
и переносимость терапии возможны на всех стадиях.

*3. Можно удалённо?*
Да. Первый этап — анализ медицинских данных
и анализов до очной встречи.

*4. Работаете с детьми?*
Да. Детская онкология, ЗПР, РАС, ДЦП, СДВГ,
осанка, сколиоз, сон — все направления.

*5. Сколько стоит консультация?*
Стоимость обсуждается индивидуально после
первичного анализа ситуации.

━━━━━━━━━━━━━━━━━━━━
Остались вопросы? Напишите нам 👇`;

const REVIEWS = `⭐ *ОТЗЫВЫ ПАЦИЕНТОВ*

💬 *Елена П.:*
«Благодарю за внимательное отношение
и профессиональный подход.»

💬 *Игорь К.:*
«Очень ценно, что учитывается весь
медицинский путь и анализы. Спасибо!»

💬 *Анна С.:*
«Чувствуется опыт и забота.
Большое спасибо за поддержку.»

━━━━━━━━━━━━━━━━━━━━
Выбирая LALI, вы выбираете
целую систему профессионального опыта,
знаний и заботы о каждом пациенте.`;

const CONTACTS = `📞 *КОНТАКТЫ*

📱 *Телефон:* ${PHONE}
💬 *WhatsApp · Telegram*

📍 *Адрес приёма:*
г. Краснодар, КП «Золотой город»

🕐 *Режим работы:*
Пн-Пт: 09:00 - 20:00
Сб: 10:00 - 18:00
Вс: по предварительной записи

━━━━━━━━━━━━━━━━━━━━
💼 *Помощник Сергей*
Ответит на вопросы, подскажет с чего начать
и подберёт удобное время приёма.

👇 Нажмите кнопку ниже для QR-кода`;

const ADMIN_HELP = `🛠 *АДМИН-ПАНЕЛЬ LALI v3.0*

━━━━━━━━━━━━━━━━━━━━
📋 *КАК ОТВЕЧАТЬ ПАЦИЕНТАМ:*

1️⃣ Вам приходит карточка пациента (🆕)
    с меткой #p<id> и кнопками

2️⃣ Цитируйте карточку (свайп влево / «Ответить»)
    и напишите сообщение

3️⃣ Бот доставит его пациенту с вашей подписью

4️⃣ Фото или документ в ответ на карточку
    тоже доставляются пациенту

━━━━━━━━━━━━━━━━━━━━
⚡ *БЫСТРЫЕ КНОПКИ ПОД КАРТОЧКОЙ:*

📄 *Буклет* — отправить PDF пациенту
📅 *Форма записи* — отправить инструкцию
ℹ️ *Справка* — отправить информацию о клинике
📱 *QR Сергея* — отправить QR-код для связи

━━━━━━━━━━━━━━━━━━━━
⌨️ *КОМАНДЫ:*

/start — эта справка
/menu — меню пациента для проверки
/stats — статистика за сегодня

━━━━━━━━━━━━━━━━━━━━
💡 *СОВЕТ:* Отвечайте быстро —
пациенты ценят оперативность!`;

const STATS_TEMPLATE = `📊 *СТАТИСТИКА СЕГОДНЯ*

📅 Дата: {date}
👥 Новых пациентов: {count}
⏰ Последняя заявка: {last}

━━━━━━━━━━━━━━━━━━━━
💡 Используйте /menu для проверки
работы бота от лица пациента.`;

// ---------- КЛАВИАТУРЫ ----------
const MENU = {
  inline_keyboard: [
    [
      { text: '📅 Записаться', callback_data: 'book' },
      { text: '📄 Буклет', callback_data: 'pdf' },
    ],
    [
      { text: '💬 Вопрос', callback_data: 'question' },
      { text: 'ℹ️ О враче', callback_data: 'about' },
    ],
    [
      { text: '❓ FAQ', callback_data: 'faq' },
      { text: '⭐ Отзывы', callback_data: 'reviews' },
    ],
    [
      { text: '📞 Контакты', callback_data: 'contacts' },
      { text: '📱 QR Сергея', callback_data: 'qr' },
    ],
    [{ text: '🌐 Официальный сайт', url: SITE }],
  ],
};

const adminButtons = (pid) => ({
  inline_keyboard: [
    [
      { text: '📄 Буклет', callback_data: 'pdf2:' + pid },
      { text: '📅 Запись', callback_data: 'book2:' + pid },
    ],
    [
      { text: 'ℹ️ Справка', callback_data: 'about2:' + pid },
      { text: '📱 QR', callback_data: 'qr2:' + pid },
    ],
  ],
});

// ---------- УТИЛИТЫ ----------
const nowMs = () =>
  new Date().toLocaleString('ru-RU', {
    timeZone: 'Europe/Moscow',
    dateStyle: 'short',
    timeStyle: 'short',
  });

const todayDate = () =>
  new Date().toLocaleDateString('ru-RU', {
    timeZone: 'Europe/Moscow',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const patientCard = (u, msg) => {
  const type = msg.text ? '💬 Текст' : msg.photo ? '📷 Фото' : msg.document ? '📎 Документ' : msg.voice ? '🎤 Голосовое' : '📨 Сообщение';
  return `🆕 *НОВАЯ ЗАЯВКА*

━━━━━━━━━━━━━━━━━━━━
👤 *Пациент:* ${u.first_name || ''} ${u.last_name || ''}
🪪 *ID:* #p${u.id}
📱 *Username:* @${u.username || 'нет'}

━━━━━━━━━━━━━━━━━━━━
${type}:
${msg.text ? msg.text : '_вложение ниже_'}

🕒 *Время:* ${nowMs()}

━━━━━━━━━━━━━━━━━━━━
↩️ *Ответить:* цитируйте эту карточку
и напишите сообщение.`;
};

// Простое хранилище заявок в памяти (сбрасывается при рестарте)
const dailyStats = { date: todayDate(), count: 0, lastTime: '' };

// ---------- ХЭНДЛЕР ----------
export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.status(200).json({ ok: true, service: 'LaliClinicBot webhook alive v3.0' });
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
    if (data === 'book') await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT, parse_mode: 'Markdown' });
    if (data === 'question') await API(TOKEN, 'sendMessage', { chat_id: chat, text: QUESTION_PROMPT, parse_mode: 'Markdown' });
    if (data === 'about') await API(TOKEN, 'sendMessage', { chat_id: chat, text: ABOUT, parse_mode: 'Markdown' });
    if (data === 'faq') await API(TOKEN, 'sendMessage', { chat_id: chat, text: FAQ, parse_mode: 'Markdown' });
    if (data === 'reviews') await API(TOKEN, 'sendMessage', { chat_id: chat, text: REVIEWS, parse_mode: 'Markdown' });
    if (data === 'contacts') await API(TOKEN, 'sendMessage', { chat_id: chat, text: CONTACTS, parse_mode: 'Markdown' });
    if (data === 'qr') await API(TOKEN, 'sendPhoto', { chat_id: chat, photo: QR_URL, caption: '📱 *Личный Telegram помощника Сергея*\n\nНаведите камеру для быстрой связи', parse_mode: 'Markdown' });
    if (data === 'pdf')
      await API(TOKEN, 'sendDocument', {
        chat_id: chat,
        document: PDF_URL,
        caption: '📄 *Официальный буклет LALI*\n\nВрач остеопат-онколог, 4 поколение',
        parse_mode: 'Markdown',
      });
    if (data === 'menu')
      await API(TOKEN, 'sendPhoto', {
        chat_id: chat,
        photo: BANNER_URL,
        caption: WELCOME_CAPTION,
        reply_markup: MENU,
        parse_mode: 'Markdown',
      });

    // --- админ: быстрые отправки пациенту ---
    let m;
    if ((m = data.match(/^pdf2:(\d+)$/))) {
      await API(TOKEN, 'sendDocument', { chat_id: m[1], document: PDF_URL, caption: '📄 *Официальный буклет LALI*', parse_mode: 'Markdown' });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Буклет отправлен пациенту #p' + m[1] });
    }
    if ((m = data.match(/^book2:(\d+)$/))) {
      await API(TOKEN, 'sendMessage', { chat_id: m[1], text: BOOK_PROMPT, parse_mode: 'Markdown' });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Форма записи отправлена пациенту #p' + m[1] });
    }
    if ((m = data.match(/^about2:(\d+)$/))) {
      await API(TOKEN, 'sendMessage', { chat_id: m[1], text: ABOUT, parse_mode: 'Markdown' });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Справка отправлена пациенту #p' + m[1] });
    }
    if ((m = data.match(/^qr2:(\d+)$/))) {
      await API(TOKEN, 'sendPhoto', { chat_id: m[1], photo: QR_URL, caption: '📱 *Личный Telegram помощника Сергея*', parse_mode: 'Markdown' });
      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ QR-код отправлен пациенту #p' + m[1] });
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
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: ADMIN_HELP, parse_mode: 'Markdown' });
        return res.status(200).json({ ok: true });
      }
      if (msg.text && msg.text.startsWith('/menu')) {
        await API(TOKEN, 'sendPhoto', { chat_id: chat, photo: BANNER_URL, caption: WELCOME_CAPTION, reply_markup: MENU, parse_mode: 'Markdown' });
        return res.status(200).json({ ok: true });
      }
      if (msg.text && msg.text.startsWith('/stats')) {
        const stats = STATS_TEMPLATE
          .replace('{date}', dailyStats.date)
          .replace('{count}', dailyStats.count.toString())
          .replace('{last}', dailyStats.lastTime || 'нет заявок');
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: stats, parse_mode: 'Markdown' });
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
            await API(TOKEN, 'sendMessage', { chat_id: pid, text: msg.text + SIGN, parse_mode: 'Markdown' });
          } else {
            await API(TOKEN, 'copyMessage', {
              chat_id: pid,
              from_chat_id: chat,
              message_id: msg.message_id,
              caption: (msg.caption || '') + SIGN,
              parse_mode: 'Markdown',
            });
          }
          await API(TOKEN, 'sendMessage', { chat_id: chat, text: '✅ Отправлено пациенту #p' + pid });
          return res.status(200).json({ ok: true });
        }
      }

      await API(TOKEN, 'sendMessage', { chat_id: chat, text: '🛠 Чтобы ответить пациенту — цитируйте его карточку и напишите сообщение.\n\nКоманды: /help /menu /stats', parse_mode: 'Markdown' });
      return res.status(200).json({ ok: true });
    }

    // ---------- ПАЦИЕНТЫ ----------
    if (msg.text && msg.text.startsWith('/start')) {
      await API(TOKEN, 'sendPhoto', {
        chat_id: chat,
        photo: BANNER_URL,
        caption: WELCOME_CAPTION,
        reply_markup: MENU,
        parse_mode: 'Markdown',
      });
      if (msg.text.includes('booking')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: BOOK_PROMPT, parse_mode: 'Markdown' });
      }
      return res.status(200).json({ ok: true });
    }

    // Автоответы на ключевые слова
    if (msg.text) {
      const text = msg.text.toLowerCase();
      if (text.includes('цена') || text.includes('стоимость') || text.includes('сколько стоит')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: '💰 Стоимость консультации обсуждается индивидуально после первичного анализа ситуации.\n\nНапишите помощнику Сергею для уточнения деталей.', parse_mode: 'Markdown' });
        return res.status(200).json({ ok: true });
      }
      if (text.includes('адрес') || text.includes('где') || text.includes('краснодар')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: CONTACTS, parse_mode: 'Markdown' });
        return res.status(200).json({ ok: true });
      }
      if (text.includes('лицензия') || text.includes('документы')) {
        await API(TOKEN, 'sendMessage', { chat_id: chat, text: '📄 Лицензия № DOH-MD-2020-847392\nДепартамент здравоохранения Абу-Даби\n\nОфициальное право на осуществление медицинской деятельности в ОАЭ.', parse_mode: 'Markdown' });
        return res.status(200).json({ ok: true });
      }
    }

    // заявка / сообщение / медиа от пациента → карточка Сергею
    const u = msg.from || {};
    
    // Обновляем статистику
    if (dailyStats.date !== todayDate()) {
      dailyStats.date = todayDate();
      dailyStats.count = 0;
    }
    dailyStats.count++;
    dailyStats.lastTime = nowMs();

    await API(TOKEN, 'sendMessage', {
      chat_id: ADMIN,
      text: patientCard(u, msg),
      reply_markup: adminButtons(u.id),
      parse_mode: 'Markdown',
    });
    if (!msg.text) {
      await API(TOKEN, 'forwardMessage', { chat_id: ADMIN, from_chat_id: chat, message_id: msg.message_id });
    }
    await API(TOKEN, 'sendMessage', {
      chat_id: chat,
      text: '✅ *Принято!*\n\nПомощник Сергей ответит вам лично в ближайшее время.\n\n⏰ Среднее время ответа: 2-4 часа\n\nЕсли срочно — звоните:\n📞 ' + PHONE,
      parse_mode: 'Markdown',
    });
    return res.status(200).json({ ok: true });
  }

  return res.status(200).json({ ok: true });
}
