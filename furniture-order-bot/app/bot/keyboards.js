const { Markup } = require('telegraf');

const mainMenuKeyboard = Markup.keyboard([
  ['📝 Текстовый заказ', '🎤 Голосовой заказ'],
  ['📊 Статистика', '🔄 Сменить точку']
]).resize();

const helpKeyboard = Markup.keyboard([
  ['📋 Помощь', 'ℹ️ О боте']
]).resize();

const orderConfirmationKeyboard = Markup.inlineKeyboard([
  Markup.button.callback('✅ Подтвердить', 'confirm_order'),
  Markup.button.callback('✏️ Изменить', 'edit_order'),
  Markup.button.callback('❌ Отменить', 'cancel_order')
]);

const adminKeyboard = Markup.keyboard([
  ['📊 Статистика', '🔧 Настройки'],
  ['📋 Помощь', '🔄 Сменить точку']
]).resize();

function getMainMenuKeyboard() {
  return mainMenuKeyboard;
}

function getHelpKeyboard() {
  return helpKeyboard;
}

function getOrderConfirmationKeyboard() {
  return orderConfirmationKeyboard;
}

function getAdminKeyboard() {
  return adminKeyboard;
}

function createCustomKeyboard(buttons, options = {}) {
  return Markup.keyboard(buttons, options);
}

function createInlineKeyboard(buttons) {
  return Markup.inlineKeyboard(buttons);
}

function removeKeyboard() {
  return Markup.removeKeyboard();
}

module.exports = {
  getMainMenuKeyboard,
  getHelpKeyboard,
  getOrderConfirmationKeyboard,
  getAdminKeyboard,
  createCustomKeyboard,
  createInlineKeyboard,
  removeKeyboard,
  mainMenuKeyboard,
  helpKeyboard,
  orderConfirmationKeyboard,
  adminKeyboard
};
