function validateOrderData(orderData) {
  const errors = [];

  if (!orderData || typeof orderData !== 'object') {
    errors.push('Order data must be an object');
    return errors;
  }

  // Validate address
  if (!orderData.address || typeof orderData.address !== 'string' || orderData.address.trim().length === 0) {
    errors.push('Address is required');
  }

  // Validate products
  let hasProducts = false;
  for (const [key, value] of Object.entries(orderData)) {
    if (key === 'address' || key === 'date') continue;

    if (typeof value === 'number') {
      if (value < 0) {
        errors.push(`Quantity for ${key} cannot be negative`);
      } else if (value > 0) {
        hasProducts = true;
      }
    } else if (typeof value === 'string') {
      const numValue = parseInt(value);
      if (isNaN(numValue)) {
        errors.push(`Invalid quantity for ${key}: must be a number`);
      } else if (numValue < 0) {
        errors.push(`Quantity for ${key} cannot be negative`);
      } else if (numValue > 0) {
        hasProducts = true;
      }
    } else {
      errors.push(`Invalid quantity type for ${key}: must be number or string`);
    }
  }

  if (!hasProducts) {
    errors.push('Order must contain at least one product with quantity > 0');
  }

  return errors;
}

function validatePinCode(pin) {
  if (!pin || typeof pin !== 'string') {
    return 'PIN code is required';
  }

  if (pin.length !== 4) {
    return 'PIN code must be exactly 4 digits';
  }

  if (!/^\d{4}$/.test(pin)) {
    return 'PIN code must contain only digits';
  }

  return null; // Valid
}

function validateTextMessage(text) {
  if (!text || typeof text !== 'string') {
    return 'Message text is required';
  }

  const trimmed = text.trim();
  if (trimmed.length === 0) {
    return 'Message cannot be empty';
  }

  if (trimmed.length > 4096) {
    return 'Message is too long (max 4096 characters)';
  }

  return null; // Valid
}

function validateFileSize(size, maxSize = 50 * 1024 * 1024) { // 50MB default
  if (typeof size !== 'number' || size < 0) {
    return 'Invalid file size';
  }

  if (size > maxSize) {
    const maxSizeMB = Math.round(maxSize / (1024 * 1024));
    return `File is too large (max ${maxSizeMB}MB)`;
  }

  return null; // Valid
}

function validateProductName(name) {
  if (!name || typeof name !== 'string') {
    return 'Product name is required';
  }

  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return 'Product name cannot be empty';
  }

  if (trimmed.length > 100) {
    return 'Product name is too long (max 100 characters)';
  }

  // Check for invalid characters
  if (/[<>\"'&]/.test(trimmed)) {
    return 'Product name contains invalid characters';
  }

  return null; // Valid
}

function validateQuantity(quantity, maxQuantity = 10000) {
  if (quantity === null || quantity === undefined) {
    return 'Quantity is required';
  }

  const num = typeof quantity === 'string' ? parseInt(quantity) : quantity;

  if (isNaN(num)) {
    return 'Quantity must be a valid number';
  }

  if (!Number.isInteger(num)) {
    return 'Quantity must be a whole number';
  }

  if (num < 0) {
    return 'Quantity cannot be negative';
  }

  if (num === 0) {
    return 'Quantity cannot be zero';
  }

  if (num > maxQuantity) {
    return `Quantity cannot exceed ${maxQuantity}`;
  }

  return null; // Valid
}

function validatePartnerPoint(point) {
  const errors = [];

  if (!point || typeof point !== 'object') {
    errors.push('Partner point data is required');
    return errors;
  }

  if (!point.id || typeof point.id !== 'string') {
    errors.push('Partner point ID is required');
  }

  if (!point.name || typeof point.name !== 'string' || point.name.trim().length === 0) {
    errors.push('Partner point name is required');
  }

  if (!point.address || typeof point.address !== 'string' || point.address.trim().length === 0) {
    errors.push('Partner point address is required');
  }

  const pinError = validatePinCode(point.pin);
  if (pinError) {
    errors.push(`PIN validation error: ${pinError}`);
  }

  return errors;
}

module.exports = {
  validateOrderData,
  validatePinCode,
  validateTextMessage,
  validateFileSize,
  validateProductName,
  validateQuantity,
  validatePartnerPoint
};
