// Bot configuration constants
const BOT_CONFIG = {
  NAME: 'FurnitureOrderAI',
  VERSION: '1.0.0',
  DESCRIPTION: 'Умный бот для заказов мебели с AI',

  // Message limits
  MAX_MESSAGE_LENGTH: 4096,
  MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB

  // Rate limiting
  RATE_LIMIT_REQUESTS: 10,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute

  // Session states
  SESSION_STATES: {
    INITIAL: 'initial',
    POINT_SELECTED: 'point_selected',
    AWAITING_CONFIRMATION: 'awaiting_confirmation',
    EDITING: 'editing'
  },

  // Order processing
  ORDER_UPDATE_INTERVAL: 30 * 1000, // 30 seconds
  MAX_QUANTITY: 10000,

  // File paths
  DATA_DIR: './data',
  ORDERS_DIR: './orders',
  LOGS_DIR: './logs',
  TEMP_DIR: './temp',

  // Excel files
  PARTNERS_FILE: 'КонтрагентыБотБот.xlsx',
  NOMENCLATURE_FILE: 'НоменклатураБот.xlsx',
  ORDERS_FILE: 'orders.xlsx',

  // API timeouts
  API_TIMEOUT: 30000, // 30 seconds

  // Logging levels
  LOG_LEVELS: {
    ERROR: 'error',
    WARN: 'warn',
    INFO: 'info',
    DEBUG: 'debug'
  }
};

// Default data
const DEFAULT_DATA = {
  PARTNER_POINTS: [
    { id: '1', name: 'Магазин "Мебель Сити"', address: 'ул. Центральная, д. 1', pin: '1234' },
    { id: '2', name: 'ТЦ "Домовой"', address: 'пр. Победы, д. 45', pin: '5678' },
    { id: '3', name: 'Салон "Интерьер Люкс"', address: 'ул. Ленина, д. 89', pin: '9012' }
  ],

  NOMENCLATURE: {
    product_1: {
      name: 'Диван угловой "Милан"',
      unit: 'шт',
      variable: 'divan_uglovoj_milan'
    },
    product_2: {
      name: 'Кресло офисное "Эрго"',
      unit: 'шт',
      variable: 'kreslo_ofisnoe_ergo'
    },
    product_3: {
      name: 'Стол обеденный "Олимп"',
      unit: 'шт',
      variable: 'stol_obedennyj_olimp'
    },
    product_4: {
      name: 'Шкаф купе 3-створчатый',
      unit: 'шт',
      variable: 'shkaf_kupe_3_stvorchatyj'
    },
    product_5: {
      name: 'Кровать двуспальная "Атланта"',
      unit: 'шт',
      variable: 'krovat_dvuspalnaya_atlanta'
    }
  }
};

// Error messages
const ERROR_MESSAGES = {
  INVALID_PIN: '❌ Неверный PIN-код. Попробуйте снова.',
  NO_AUTH: '⚠️ Пожалуйста, сначала авторизуйтесь, введя PIN-код.',
  INVALID_STATE: '⚠️ Завершите предыдущий заказ перед отправкой нового.',
  PROCESSING_ERROR: '❌ Ошибка обработки. Попробуйте снова.',
  SAVE_ERROR: '❌ Ошибка сохранения заказа.',
  NETWORK_ERROR: '❌ Ошибка сети. Проверьте подключение.',
  FILE_TOO_LARGE: '❌ Файл слишком большой.',
  INVALID_FORMAT: '❌ Неверный формат файла.',
  RATE_LIMIT: '⚠️ Слишком много запросов. Подождите немного.',
  GENERIC_ERROR: '❌ Произошла ошибка. Попробуйте снова или обратитесь в поддержку.'
};

// Success messages
const SUCCESS_MESSAGES = {
  AUTH_SUCCESS: '🔓 Авторизация успешна!',
  ORDER_SAVED: '🎉 Заказ успешно сохранен!',
  ORDER_CANCELLED: '❌ Заказ отменен.',
  DATA_UPDATED: '✅ Данные обновлены.',
  FILE_UPLOADED: '✅ Файл загружен.',
  SETTINGS_SAVED: '✅ Настройки сохранены.'
};

// Keyboard texts
const KEYBOARD_TEXTS = {
  TEXT_ORDER: '📝 Текстовый заказ',
  VOICE_ORDER: '🎤 Голосовой заказ',
  STATISTICS: '📊 Статистика',
  CHANGE_POINT: '🔄 Сменить точку',
  HELP: '📋 Помощь',
  ABOUT: 'ℹ️ О боте',
  CONFIRM: '✅ Подтвердить',
  EDIT: '✏️ Изменить',
  CANCEL: '❌ Отменить'
};

// Regex patterns
const PATTERNS = {
  PIN_CODE: /^\d{4}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^\+?[\d\s\-\(\)]{10,}$/,
  ORDER_TEXT: /(.+)/,
  QUANTITY: /^\d+$/
};

module.exports = {
  BOT_CONFIG,
  DEFAULT_DATA,
  ERROR_MESSAGES,
  SUCCESS_MESSAGES,
  KEYBOARD_TEXTS,
  PATTERNS
};
