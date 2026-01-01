const { Telegraf } = require('telegraf');
const { setupHandlers } = require('../app/bot/handlers');
const { setupMiddlewares } = require('../app/bot/middlewares');

// Mock winston logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
};

describe('Bot Handlers', () => {
  let bot;
  let mockCtx;

  beforeEach(() => {
    bot = new Telegraf('test-token');
    mockCtx = {
      from: { id: 123456 },
      message: { text: 'test' },
      session: {},
      reply: jest.fn(),
      replyWithMarkdown: jest.fn(),
      deleteMessage: jest.fn()
    };

    // Setup middlewares and handlers
    setupMiddlewares(bot, mockLogger);
    setupHandlers(bot, mockLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Start Command', () => {
    test('should send welcome message for new user', async () => {
      mockCtx.message.text = '/start';

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Добро пожаловать в FurnitureOrderAI')
      );
    });

    test('should send return message for authorized user', async () => {
      mockCtx.message.text = '/start';
      mockCtx.session = {
        selectedPoint: { name: 'Test Point' },
        state: 'point_selected'
      };

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('С возвращением')
      );
    });
  });

  describe('Help Command', () => {
    test('should send help message', async () => {
      mockCtx.message.text = '/help';

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Помощь по боту')
      );
    });
  });

  describe('PIN Authorization', () => {
    test('should authorize valid PIN', async () => {
      mockCtx.message.text = '1234';

      // Mock getPartnerPoints to return test data
      const originalGetPartnerPoints = require('../app/services/data-loader').getPartnerPoints;
      require('../app/services/data-loader').getPartnerPoints = jest.fn(() => [
        { id: '1', name: 'Test Point', address: 'Test Address', pin: '1234' }
      ]);

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Авторизация успешна')
      );

      // Restore original function
      require('../app/services/data-loader').getPartnerPoints = originalGetPartnerPoints;
    });

    test('should reject invalid PIN', async () => {
      mockCtx.message.text = '9999';

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith('❌ Неверный PIN-код. Попробуйте снова.');
    });
  });

  describe('Menu Commands', () => {
    beforeEach(() => {
      mockCtx.session = {
        selectedPoint: { name: 'Test Point', address: 'Test Address' },
        state: 'point_selected'
      };
    });

    test('should handle help button', async () => {
      mockCtx.message.text = '📋 Помощь';

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Помощь по боту')
      );
    });

    test('should handle about button', async () => {
      mockCtx.message.text = 'ℹ️ О боте';

      await bot.handleUpdate({
        update_id: 1,
        message: mockCtx.message
      });

      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('FurnitureOrderAI')
      );
    });
  });
});

describe('Bot Middlewares', () => {
  let bot;
  let mockCtx;

  beforeEach(() => {
    bot = new Telegraf('test-token');
    mockCtx = {
      from: { id: 123456 },
      message: { text: 'test' },
      session: {},
      reply: jest.fn(),
      replyWithMarkdown: jest.fn()
    };
  });

  describe('Logging Middleware', () => {
    test('should log messages', async () => {
      const loggingMiddleware = require('../app/bot/middlewares').loggingMiddleware(mockLogger);
      const next = jest.fn();

      await loggingMiddleware(mockCtx, next);

      expect(mockLogger.info).toHaveBeenCalledWith(
        expect.stringContaining('[123456]')
      );
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Session Validation Middleware', () => {
    test('should validate session structure', async () => {
      const sessionValidationMiddleware = require('../app/bot/middlewares').sessionValidationMiddleware(mockLogger);
      const next = jest.fn();

      mockCtx.session = 'invalid session';

      await sessionValidationMiddleware(mockCtx, next);

      expect(mockCtx.session).toEqual({
        state: 'initial',
        selectedPoint: null,
        orderData: null
      });
      expect(next).toHaveBeenCalled();
    });
  });

  describe('Rate Limiting Middleware', () => {
    test('should allow requests within limit', async () => {
      const rateLimitMiddleware = require('../app/bot/middlewares').rateLimitMiddleware(mockLogger, 2);
      const next = jest.fn();

      // First request
      await rateLimitMiddleware(mockCtx, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request
      await rateLimitMiddleware(mockCtx, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    test('should block requests over limit', async () => {
      const rateLimitMiddleware = require('../app/bot/middlewares').rateLimitMiddleware(mockLogger, 1);
      const next = jest.fn();

      // First request - allowed
      await rateLimitMiddleware(mockCtx, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Second request - blocked
      await rateLimitMiddleware(mockCtx, next);
      expect(mockCtx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Слишком много запросов')
      );
      expect(next).toHaveBeenCalledTimes(1);
    });
  });
});
