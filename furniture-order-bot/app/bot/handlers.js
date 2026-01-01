const { Markup } = require('telegraf');
const { getPartnerPoints, getNomenclature, getGigaChatPrompt } = require('../services/data-loader');
const { getOrderDataFromText } = require('../services/gigachat-client');
const { processAudioMessage, recognizeAudio } = require('../services/speech-recognition');
const { saveOrderToExcel, formatOrderSummary } = require('../services/excel-service');
const { cleanupFiles } = require('../utils/file-processor');

function setupHandlers(bot, logger) {
  // Start command
  bot.start(async (ctx) => {
    const userId = ctx.from.id;
    const session = ctx.session;
    
    logger.info(`User ${userId} started bot`);
    
    if (session?.selectedPoint && session?.state === 'point_selected') {
      await ctx.reply(
        `🎉 С возвращением! Вы работаете с точкой *${session.selectedPoint.name}*. Можете отправлять заказ.`,
        { parse_mode: 'Markdown' }
      );
    } else {
      await ctx.reply(
        '👋 Добро пожаловать в FurnitureOrderAI!\n\n' +
        '🤖 Умный бот для заказов мебели с искусственным интеллектом\n\n' +
        'Пожалуйста, введите ваш PIN-код, чтобы начать.',
        Markup.keyboard([['📋 Помощь', 'ℹ️ О боте']])
          .resize()
      );
    }
  });

  // Help command
  bot.help(async (ctx) => {
    await ctx.reply(
      '📋 *Помощь по боту*\n\n' +
      '1. *Авторизация* - Введите PIN-код вашей точки\n' +
      '2. *Создание заказа*:\n' +
      '   • Напишите текст с товарами и количествами\n' +
      '   • Или отправьте голосовое сообщение\n' +
      '3. *Подтверждение* - Проверьте заказ и подтвердите\n' +
      '4. *История* - Все заказы сохраняются в Excel\n\n' +
      '📞 *Поддержка*: contact@furnitureorderai.com',
      { parse_mode: 'Markdown' }
    );
  });

  // Text messages
  bot.on('text', async (ctx) => {
    const userId = ctx.from.id;
    const text = ctx.message.text.trim();
    const session = ctx.session;
    
    logger.info(`Text from ${userId}: ${text.substring(0, 100)}...`);
    
    // Handle special commands
    if (text === '📋 Помощь') {
      return bot.help(ctx);
    }
    
    if (text === 'ℹ️ О боте') {
      return ctx.reply(
        '🤖 *FurnitureOrderAI*\n\n' +
        'Умный бот для автоматизации заказов мебели.\n\n' +
        'Возможности:\n' +
        '• 📝 Текстовые заказы с AI-парсингом\n' +
        '• 🎤 Голосовые заказы\n' +
        '• 📊 Автосохранение в Excel\n' +
        '• 🔐 Безопасная авторизация\n\n' +
        'Версия: 1.0.0',
        { parse_mode: 'Markdown' }
      );
    }
    
    // PIN code authorization
    if (!session?.selectedPoint) {
      const foundPoint = getPartnerPoints().find(point => point.pin === text);
      
      if (foundPoint) {
        ctx.session = {
          selectedPoint: foundPoint,
          state: 'point_selected',
          orderData: null
        };
        
        logger.info(`User ${userId} authorized with PIN for ${foundPoint.name}`);
        
        await ctx.reply(
          `🔓 *Авторизация успешна!*\n\n` +
          `Вы выбрали точку: *${foundPoint.name}*\n` +
          `📍 Адрес: ${foundPoint.address}\n\n` +
          `Теперь можете отправлять заказ текстом или голосовым сообщением.`,
          {
            parse_mode: 'Markdown',
            ...Markup.keyboard([
              ['📝 Текстовый заказ', '🎤 Голосовой заказ'],
              ['📊 Статистика', '🔄 Сменить точку']
            ]).resize()
          }
        );
      } else {
        await ctx.reply('❌ Неверный PIN-код. Попробуйте снова.');
      }
      return;
    }
    
    // Handle different states
    if (session.state === 'editing') {
      session.state = 'point_selected';
      return handleOrderText(ctx, text);
    }
    
    if (session.state === 'awaiting_confirmation') {
      await ctx.reply('❌ Пожалуйста, сначала подтвердите или измените предыдущий заказ.');
      return;
    }
    
    // Handle menu buttons
    if (text === '📝 Текстовый заказ') {
      await ctx.reply(
        '📝 *Отправьте текст с заказом*\n\n' +
        'Пример:\n' +
        '«Нужно 2 дивана «Милан», 1 обеденный стол и 3 офисных кресла»',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    if (text === '🎤 Голосовой заказ') {
      await ctx.reply(
        '🎤 *Отправьте голосовое сообщение с заказом*\n\n' +
        'Просто нажмите на микрофон и продиктуйте заказ.',
        { parse_mode: 'Markdown' }
      );
      return;
    }
    
    if (text === '📊 Статистика') {
      const { getOrderStatistics } = require('../services/excel-service');
      const stats = await getOrderStatistics();
      
      let statsMessage = '📊 *Статистика заказов*\n\n';
      statsMessage += `Всего заказов: ${stats.totalOrders}\n`;
      
      if (stats.lastOrder) {
        statsMessage += `Последний заказ: ${stats.lastOrder}\n`;
      }
      
      if (Object.keys(stats.monthlyStats).length > 0) {
        statsMessage += '\n*По месяцам*:\n';
        Object.entries(stats.monthlyStats).forEach(([month, data]) => {
          statsMessage += `${month}: ${data.orders} зак. (${data.items} шт.)\n`;
        });
      }
      
      await ctx.reply(statsMessage, { parse_mode: 'Markdown' });
      return;
    }
    
    if (text === '🔄 Сменить точку') {
      ctx.session = {
        state: 'initial',
        selectedPoint: null,
        orderData: null
      };
      
      await ctx.reply(
        '🔄 *Смена точки*\n\n' +
        'Введите PIN-код новой точки.',
        {
          parse_mode: 'Markdown',
          ...Markup.removeKeyboard()
        }
      );
      return;
    }
    
    // Handle regular order text
    await handleOrderText(ctx, text);
  });

  // Voice and audio messages
  bot.on(['voice', 'audio'], async (ctx) => {
    const userId = ctx.from.id;
    const session = ctx.session;
    
    logger.info(`Audio message from ${userId}`);
    
    if (!session?.selectedPoint) {
      return ctx.reply('⚠️ Пожалуйста, сначала авторизуйтесь, введя PIN-код.');
    }
    
    if (session.state !== 'point_selected') {
      return ctx.reply('⚠️ Завершите предыдущий заказ перед отправкой нового.');
    }
    
    try {
      await ctx.reply('🔍 Обрабатываю аудиосообщение...');
      
      const { tempFiles, recognizedText } = await processAudioMessage(ctx);
      
      logger.info(`Recognized text from ${userId}: ${recognizedText}`);
      
      await ctx.reply(`🎤 *Распознанный текст:*\n\n\`${recognizedText}\``, {
        parse_mode: 'Markdown'
      });
      
      // Clean up temp files
      cleanupFiles(tempFiles);
      
      // Process the order
      await handleOrderText(ctx, recognizedText);
      
    } catch (error) {
      logger.error(`Audio processing error for ${userId}:`, error);
      await ctx.reply(`❌ Ошибка обработки аудио: ${error.message}`);
    }
  });

  // Action handlers for inline buttons
  bot.action('confirm_order', async (ctx) => {
    await ctx.deleteMessage();
    const userId = ctx.from.id;
    const session = ctx.session;
    
    logger.info(`User ${userId} confirmed order`);
    
    if (!session || !session.orderData) {
      return ctx.reply('❌ Ошибка: данные заказа не найдены.');
    }
    
    try {
      const result = await saveOrderToExcel(
        session.orderData,
        session.selectedPoint.name,
        session.rawResponse
      );
      
      if (result.success) {
        await ctx.reply(
          `🎉 *Заказ успешно сохранен!*\n\n` +
          `Номер заказа: #${result.totalOrders}\n` +
          `Точка: ${session.selectedPoint.name}\n\n` +
          `✅ Все данные записаны в Excel файл.`,
          { parse_mode: 'Markdown' }
        );
      } else {
        await ctx.reply(`❌ Ошибка сохранения: ${result.error}`);
      }
      
      // Reset session
      ctx.session = {
        selectedPoint: session.selectedPoint,
        state: 'point_selected',
        orderData: null,
        rawResponse: null
      };
      
    } catch (error) {
      logger.error(`Order saving error for ${userId}:`, error);
      await ctx.reply(`❌ Ошибка сохранения заказа: ${error.message}`);
    }
  });

  bot.action('edit_order', async (ctx) => {
    await ctx.deleteMessage();
    const userId = ctx.from.id;
    const session = ctx.session;
    
    logger.info(`User ${userId} requested order edit`);
    
    if (!session || !session.orderData) {
      return ctx.reply('❌ Ошибка: сессия заказа не найдена. Попробуйте отправить заказ снова.');
    }
    
    ctx.session.state = 'editing';
    await ctx.reply(
      '✍️ *Редактирование заказа*\n\n' +
      'Отправьте новый текст с изменениями.\n\n' +
      'Пример:\n' +
      '«Добавьте еще 2 кресла и уберите диван»',
      { parse_mode: 'Markdown' }
    );
  });
}

async function handleOrderText(ctx, text) {
  const userId = ctx.from.id;
  const session = ctx.session;
  
  try {
    await ctx.reply('📝 Анализирую заказ с помощью AI...');
    
    const { orderData, rawResponse } = await getOrderDataFromText(text);
    
    // Add address from selected point
    orderData.address = session.selectedPoint.address;
    orderData.date = new Date().toISOString();
    
    // Update session
    ctx.session = {
      ...session,
      orderData,
      rawResponse,
      state: 'awaiting_confirmation'
    };
    
    const orderSummary = formatOrderSummary(orderData, session.selectedPoint.name);
    
    await ctx.reply(
      `📄 *Предварительный заказ*\n\n${orderSummary}\n\n` +
      `Все верно? 🧐`,
      {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard([
          Markup.button.callback('✅ Подтвердить', 'confirm_order'),
          Markup.button.callback('✏️ Изменить', 'edit_order'),
          Markup.button.callback('❌ Отменить', 'cancel_order')
        ])
      }
    );
    
  } catch (error) {
    logger.error(`Order processing error for ${userId}:`, error);
    await ctx.reply(`❌ Ошибка обработки заказа: ${error.message}`);
  }
}

// Cancel order action
bot.action('cancel_order', async (ctx) => {
  await ctx.deleteMessage();
  const userId = ctx.from.id;
  const session = ctx.session;
  
  logger.info(`User ${userId} cancelled order`);
  
  if (session) {
    ctx.session = {
      selectedPoint: session.selectedPoint,
      state: 'point_selected',
      orderData: null,
      rawResponse: null
    };
  }
  
  await ctx.reply('❌ Заказ отменен. Можете отправить новый заказ.');
});

module.exports = { setupHandlers };
