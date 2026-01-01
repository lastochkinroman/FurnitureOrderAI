require('dotenv').config();
const { Telegraf, session } = require('telegraf');
const { Redis } = require('@telegraf/session/redis');
const winston = require('winston');
const cron = require('node-cron');

// Инициализация логгера
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
    new winston.transports.Console({
      format: winston.format.simple()
    })
  ]
});

// Проверка обязательных переменных окружения
const requiredEnvVars = ['TELEGRAM_BOT_TOKEN', 'GIGACHAT_TOKEN'];
requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    logger.error(`Missing required environment variable: ${varName}`);
    process.exit(1);
  }
});

// Инициализация GigaChat
const { initializeGigaChat } = require('./services/gigachat-client');
initializeGigaChat(process.env.GIGACHAT_TOKEN);

// Инициализация распознавания речи (опционально)
const { initializeSpeechRecognition } = require('./services/speech-recognition');
if (process.env.SBER_AUTH_KEY && process.env.SALUTE_SPEECH_TOKEN) {
  initializeSpeechRecognition(process.env.SBER_AUTH_KEY, process.env.SALUTE_SPEECH_TOKEN);
}

async function main() {
  try {
    logger.info('🚀 Starting FurnitureOrderAI bot...');
    
    // Инициализация Redis для сессий
    const redisStore = Redis({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    // Создание экземпляра бота
    const bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN);
    
    // Настройка сессий
    bot.use(session({
      store: redisStore,
      defaultSession: () => ({
        state: 'initial',
        selectedPoint: null,
        orderData: null
      })
    }));

    // Импорт модулей
    const { initializeData } = require('./services/data-loader');
    const { setupHandlers } = require('./bot/handlers');
    const { setupMiddlewares } = require('./bot/middlewares');

    // Инициализация данных
    logger.info('🔄 Initializing data from Excel files...');
    await initializeData();
    logger.info('✅ Data initialization complete');

    // Настройка middleware
    setupMiddlewares(bot, logger);

    // Настройка обработчиков
    setupHandlers(bot, logger);

    // Настройка автоматического обновления данных
    cron.schedule('*/30 * * * * *', async () => {
      logger.info('🔄 Auto-updating data from Excel...');
      try {
        await initializeData();
        logger.info('✅ Data auto-update complete');
      } catch (error) {
        logger.error('❌ Data auto-update failed:', error);
      }
    });

    // Запуск бота
    await bot.launch();
    logger.info('✅ Bot is running and ready!');

    // Обработка graceful shutdown
    process.once('SIGINT', () => {
      logger.info('🛑 SIGINT received, stopping bot...');
      bot.stop('SIGINT');
      process.exit(0);
    });

    process.once('SIGTERM', () => {
      logger.info('🛑 SIGTERM received, stopping bot...');
      bot.stop('SIGTERM');
      process.exit(0);
    });

  } catch (error) {
    logger.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

// Запуск приложения
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main };
