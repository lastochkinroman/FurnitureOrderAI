function loggingMiddleware(logger) {
  return async (ctx, next) => {
    const start = Date.now();
    const userId = ctx.from?.id || 'unknown';
    const messageType = ctx.updateType;

    logger.info(`[${userId}] ${messageType} - ${ctx.message?.text?.substring(0, 50) || 'no text'}...`);

    try {
      await next();
    } catch (error) {
      logger.error(`[${userId}] Error in ${messageType}:`, error);
      throw error;
    }

    const duration = Date.now() - start;
    logger.info(`[${userId}] ${messageType} completed in ${duration}ms`);
  };
}

function errorHandlerMiddleware(logger) {
  return async (ctx, next) => {
    try {
      await next();
    } catch (error) {
      logger.error('Unhandled error:', error);

      // Send user-friendly error message
      try {
        await ctx.reply('❌ Произошла ошибка. Попробуйте снова или обратитесь в поддержку.');
      } catch (replyError) {
        logger.error('Failed to send error message:', replyError);
      }

      // Don't rethrow to prevent bot crash
    }
  };
}

function rateLimitMiddleware(logger, maxRequests = 10, windowMs = 60000) {
  const requests = new Map();

  return async (ctx, next) => {
    const userId = ctx.from?.id;
    if (!userId) return next();

    const now = Date.now();
    const userRequests = requests.get(userId) || [];

    // Remove old requests outside the window
    const validRequests = userRequests.filter(time => now - time < windowMs);
    validRequests.push(now);

    requests.set(userId, validRequests);

    if (validRequests.length > maxRequests) {
      logger.warn(`Rate limit exceeded for user ${userId}`);
      await ctx.reply('⚠️ Слишком много запросов. Пожалуйста, подождите немного.');
      return;
    }

    await next();
  };
}

function sessionValidationMiddleware(logger) {
  return async (ctx, next) => {
    const session = ctx.session;

    if (!session) {
      logger.warn('No session found');
      return next();
    }

    // Validate session structure
    if (typeof session !== 'object') {
      logger.warn('Invalid session type, resetting');
      ctx.session = {
        state: 'initial',
        selectedPoint: null,
        orderData: null
      };
    }

    // Validate state
    const validStates = ['initial', 'point_selected', 'awaiting_confirmation', 'editing'];
    if (!validStates.includes(session.state)) {
      logger.warn(`Invalid session state: ${session.state}, resetting to initial`);
      ctx.session.state = 'initial';
      ctx.session.selectedPoint = null;
      ctx.session.orderData = null;
    }

    await next();
  };
}

function fileSizeLimitMiddleware(logger, maxSize = 50 * 1024 * 1024) { // 50MB
  return async (ctx, next) => {
    const message = ctx.message;

    if (message?.voice || message?.audio) {
      const file = message.voice || message.audio;
      if (file.file_size && file.file_size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        await ctx.reply(`❌ Файл слишком большой. Максимальный размер: ${maxSizeMB}MB`);
        return;
      }
    }

    await next();
  };
}

function setupMiddlewares(bot, logger) {
  // Order matters: logging first, then validation, then rate limiting, then error handling last

  bot.use(loggingMiddleware(logger));
  bot.use(sessionValidationMiddleware(logger));
  bot.use(rateLimitMiddleware(logger));
  bot.use(fileSizeLimitMiddleware(logger));
  bot.use(errorHandlerMiddleware(logger));
}

module.exports = {
  setupMiddlewares,
  loggingMiddleware,
  errorHandlerMiddleware,
  rateLimitMiddleware,
  sessionValidationMiddleware,
  fileSizeLimitMiddleware
};
