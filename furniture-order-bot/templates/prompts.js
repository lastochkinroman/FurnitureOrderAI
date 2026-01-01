// AI prompts templates for the bot

const PROMPTS = {
  // GigaChat prompt for order parsing
  GIGACHAT_ORDER_PARSER: (products) => {
    const productList = products.map(p => `   - ${p.name} → ${p.variable}`).join('\n');

    return `Ты помощник оператора по оформлению заказов на мебель. Твоя задача – анализировать входящие сообщения от заказчиков и сохранять информацию в переменные.

ИНСТРУКЦИЯ:
1. Найди и сохрани уникальный номер или адрес торговой точки в переменную "address"
2. Найди товары и сохрани количества. Используй только целые числа.
3. Сопоставь товары со следующими переменными:
${productList}

ФОРМАТ ОТВЕТА - строго JSON:
{
    "address": "текст",
${products.map(p => `    "${p.variable}": число`).join(',\n')}
}

Начинай ответ со слова FINAL.
Текст заказа:`;
  },

  // Default prompt when no products are loaded
  GIGACHAT_DEFAULT: `Ты помощник оператора по оформлению заказов на мебель. Твоя задача – анализировать входящие сообщения от заказчиков и сохранять информацию в переменные.

ИНСТРУКЦИЯ:
1. Найди и сохрани уникальный номер или адрес торговой точки в переменную address
2. Найди товары и сохрани количества. Обрабатывай только целые числа.

ФОРМАТ ОТВЕТА - строго JSON:
{"address": "текст"}

Текст заказа:`,

  // Welcome message template
  WELCOME_MESSAGE: (botName, version) => `👋 Добро пожаловать в ${botName}!

🤖 Умный бот для заказов мебели с искусственным интеллектом

Версия: ${version}

Пожалуйста, введите ваш PIN-код, чтобы начать.`,

  // Authorization success template
  AUTH_SUCCESS: (point) => `🔓 *Авторизация успешна!*

Вы выбрали точку: *${point.name}*
📍 Адрес: ${point.address}

Теперь можете отправлять заказ текстом или голосовым сообщением.`,

  // Order summary template
  ORDER_SUMMARY: (orderData, pointName) => {
    let summary = `📍 *Точка*: ${pointName}\n`;

    if (orderData.address) {
      summary += `🏢 *Адрес*: ${orderData.address}\n`;
    }

    summary += '\n📦 *Состав заказа*:\n';

    let hasProducts = false;
    Object.keys(orderData).forEach(key => {
      if (key !== 'address' && key !== 'date' && orderData[key] > 0) {
        // This would need product name lookup
        summary += `  • ${key}: ${orderData[key]} шт.\n`;
        hasProducts = true;
      }
    });

    if (!hasProducts) {
      summary += '  (нет товаров)\n';
    }

    const totalItems = Object.values(orderData)
      .filter((val, key) => key !== 'address' && key !== 'date')
      .reduce((sum, val) => sum + (parseInt(val) || 0), 0);

    summary += `\n📊 *Итого*: ${totalItems} единиц товара\n`;

    return summary;
  },

  // Statistics template
  STATISTICS_MESSAGE: (stats) => {
    let message = '📊 *Статистика заказов*\n\n';
    message += `Всего заказов: ${stats.totalOrders}\n`;

    if (stats.lastOrder) {
      message += `Последний заказ: ${stats.lastOrder}\n`;
    }

    if (stats.monthlyStats && Object.keys(stats.monthlyStats).length > 0) {
      message += '\n*По месяцам*:\n';
      Object.entries(stats.monthlyStats).forEach(([month, data]) => {
        message += `${month}: ${data.orders} зак. (${data.items} шт.)\n`;
      });
    }

    return message;
  },

  // Help message template
  HELP_MESSAGE: `📋 *Помощь по боту*

1. *Авторизация* - Введите PIN-код вашей точки
2. *Создание заказа*:
   • Напишите текст с товарами и количествами
   • Или отправьте голосовое сообщение
3. *Подтверждение* - Проверьте заказ и подтвердите
4. *История* - Все заказы сохраняются в Excel

📞 *Поддержка*: contact@furnitureorderai.com`,

  // About message template
  ABOUT_MESSAGE: (botName, version) => `🤖 *${botName}*

Умный бот для автоматизации заказов мебели.

Возможности:
• 📝 Текстовые заказы с AI-парсингом
• 🎤 Голосовые заказы
• 📊 Автосохранение в Excel
• 🔐 Безопасная авторизация

Версия: ${version}`,

  // Error message templates
  ERROR_MESSAGES: {
    INVALID_PIN: '❌ Неверный PIN-код. Попробуйте снова.',
    NO_AUTH: '⚠️ Пожалуйста, сначала авторизуйтесь, введя PIN-код.',
    PROCESSING_ERROR: '❌ Ошибка обработки заказа.',
    SAVE_ERROR: '❌ Ошибка сохранения заказа.',
    NETWORK_ERROR: '❌ Ошибка сети. Проверьте подключение.',
    GENERIC_ERROR: '❌ Произошла ошибка. Попробуйте снова или обратитесь в поддержку.'
  },

  // Success message templates
  SUCCESS_MESSAGES: {
    ORDER_SAVED: (orderNumber, pointName) => `🎉 *Заказ успешно сохранен!*

Номер заказа: #${orderNumber}
Точка: ${pointName}

✅ Все данные записаны в Excel файл.`,
    ORDER_CANCELLED: '❌ Заказ отменен. Можете отправить новый заказ.',
    DATA_UPDATED: '✅ Данные обновлены.'
  }
};

function getGigaChatPrompt(products) {
  if (!products || products.length === 0) {
    return PROMPTS.GIGACHAT_DEFAULT;
  }

  return PROMPTS.GIGACHAT_ORDER_PARSER(products);
}

function getWelcomeMessage(botName = 'FurnitureOrderAI', version = '1.0.0') {
  return PROMPTS.WELCOME_MESSAGE(botName, version);
}

function getAuthSuccessMessage(point) {
  return PROMPTS.AUTH_SUCCESS(point);
}

function getOrderSummaryMessage(orderData, pointName) {
  return PROMPTS.ORDER_SUMMARY(orderData, pointName);
}

function getStatisticsMessage(stats) {
  return PROMPTS.STATISTICS_MESSAGE(stats);
}

function getHelpMessage() {
  return PROMPTS.HELP_MESSAGE;
}

function getAboutMessage(botName = 'FurnitureOrderAI', version = '1.0.0') {
  return PROMPTS.ABOUT_MESSAGE(botName, version);
}

function getErrorMessage(type) {
  return PROMPTS.ERROR_MESSAGES[type] || PROMPTS.ERROR_MESSAGES.GENERIC_ERROR;
}

function getSuccessMessage(type, ...args) {
  const messageFunc = PROMPTS.SUCCESS_MESSAGES[type];
  return typeof messageFunc === 'function' ? messageFunc(...args) : messageFunc;
}

module.exports = {
  PROMPTS,
  getGigaChatPrompt,
  getWelcomeMessage,
  getAuthSuccessMessage,
  getOrderSummaryMessage,
  getStatisticsMessage,
  getHelpMessage,
  getAboutMessage,
  getErrorMessage,
  getSuccessMessage
};
