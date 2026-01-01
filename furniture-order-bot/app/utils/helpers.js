function formatDate(date) {
  return new Intl.DateTimeFormat('ru-RU', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
}

function generateOrderNumber() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>\"'&]/g, '');
}

function truncateText(text, maxLength = 100) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidPhone(phone) {
  const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
  return phoneRegex.test(phone);
}

function calculateTotal(items) {
  return Object.values(items).reduce((sum, quantity) => {
    return sum + (parseInt(quantity) || 0);
  }, 0);
}

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));

  const cloned = {};
  Object.keys(obj).forEach(key => {
    cloned[key] = deepClone(obj[key]);
  });
  return cloned;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateRandomId(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

module.exports = {
  formatDate,
  generateOrderNumber,
  sanitizeString,
  truncateText,
  isValidEmail,
  isValidPhone,
  calculateTotal,
  deepClone,
  sleep,
  generateRandomId
};
