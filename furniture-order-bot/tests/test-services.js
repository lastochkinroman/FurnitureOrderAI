const fs = require('fs');
const path = require('path');

// Mock external dependencies
jest.mock('axios');
jest.mock('winston');
jest.mock('xlsx');

const axios = require('axios');
const XLSX = require('xlsx');

describe('Data Loader Service', () => {
  const { initializeData, getPartnerPoints, getNomenclature, generateVariableName } = require('../app/services/data-loader');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateVariableName', () => {
    test('should generate valid variable names', () => {
      expect(generateVariableName('Диван угловой "Милан"')).toBe('divan_uglovoj_milan');
      expect(generateVariableName('Стол обеденный')).toBe('stol_obedennyj');
      expect(generateVariableName('Шкаф-купе 3 створки')).toBe('shkaf_kupe_3_stvorki');
      expect(generateVariableName('')).toBe('unknown_product');
    });

    test('should handle special characters', () => {
      expect(generateVariableName('Товар №1 (50%)')).toBe('tovar_1_50percent');
      expect(generateVariableName('Товар/модель')).toBe('tovar_model');
    });
  });

  describe('initializeData', () => {
    test('should load data successfully', async () => {
      // Mock fs.existsSync and XLSX.readFile
      fs.existsSync = jest.fn(() => true);
      XLSX.readFile = jest.fn(() => ({
        SheetNames: ['Sheet1'],
        Sheets: {
          Sheet1: {
            '!ref': 'A1:B3',
            A1: { v: 'Code', t: 's' },
            A2: { v: '1234', t: 's' },
            B1: { v: 'Name', t: 's' },
            B2: { v: 'Test Point', t: 's' }
          }
        }
      }));
      XLSX.utils.sheet_to_json = jest.fn(() => [
        ['Code', 'Name', 'Address'],
        ['1234', 'Test Point', 'Test Address']
      ]);

      const result = await initializeData();

      expect(result).toHaveProperty('partnerPoints');
      expect(result).toHaveProperty('nomenclature');
      expect(result).toHaveProperty('GIGA_CHAT_PROMPT');
    });

    test('should use defaults when files not found', async () => {
      fs.existsSync = jest.fn(() => false);

      const result = await initializeData();

      expect(result.partnerPoints).toHaveLength(3);
      expect(Object.keys(result.nomenclature)).toHaveLength(5);
    });
  });
});

describe('Excel Service', () => {
  const { saveOrderToExcel, formatOrderSummary, getOrderStatistics } = require('../app/services/excel-service');

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn(() => false);
    fs.mkdirSync = jest.fn();
    XLSX.readFile = jest.fn(() => ({
      SheetNames: ['Заказы'],
      Sheets: {
        'Заказы': {}
      }
    }));
    XLSX.utils.sheet_to_json = jest.fn(() => []);
    XLSX.utils.aoa_to_sheet = jest.fn(() => ({}));
    XLSX.utils.book_new = jest.fn(() => ({}));
    XLSX.utils.book_append_sheet = jest.fn();
    XLSX.writeFile = jest.fn();
  });

  describe('saveOrderToExcel', () => {
    test('should save order successfully', async () => {
      const orderData = {
        address: 'Test Address',
        product1: 2,
        product2: 1
      };
      const pointName = 'Test Point';

      const result = await saveOrderToExcel(orderData, pointName);

      expect(result.success).toBe(true);
      expect(result.totalOrders).toBe(1);
      expect(XLSX.writeFile).toHaveBeenCalled();
    });

    test('should handle save errors', async () => {
      XLSX.writeFile = jest.fn(() => {
        throw new Error('Write error');
      });

      const orderData = { address: 'Test' };
      const result = await saveOrderToExcel(orderData, 'Test Point');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Write error');
    });
  });

  describe('formatOrderSummary', () => {
    test('should format order summary correctly', () => {
      const orderData = {
        address: 'Test Address',
        divan_uglovoj_milan: 2,
        kreslo_ofisnoe_ergo: 1
      };
      const pointName = 'Test Point';

      const summary = formatOrderSummary(orderData, pointName);

      expect(summary).toContain('Test Point');
      expect(summary).toContain('Test Address');
      expect(summary).toContain('Диван угловой');
      expect(summary).toContain('Кресло офисное');
      expect(summary).toContain('3 единиц товара');
    });
  });

  describe('getOrderStatistics', () => {
    test('should return empty stats when no file', async () => {
      fs.existsSync = jest.fn(() => false);

      const stats = await getOrderStatistics();

      expect(stats.totalOrders).toBe(0);
      expect(stats.lastOrder).toBe(null);
    });

    test('should calculate statistics correctly', async () => {
      fs.existsSync = jest.fn(() => true);
      XLSX.utils.sheet_to_json = jest.fn(() => [
        ['Date', 'Address', 'Point', 'Status', 'Product1', 'Product2', 'Sum', 'Comment'],
        ['2024-01-01', 'Addr1', 'Point1', 'New', 2, 1, 3, ''],
        ['2024-01-02', 'Addr2', 'Point2', 'New', 1, 0, 1, '']
      ]);

      const stats = await getOrderStatistics();

      expect(stats.totalOrders).toBe(2);
      expect(stats.lastOrder).toBe('2024-01-02');
    });
  });
});

describe('GigaChat Client', () => {
  const { initializeGigaChat, getOrderDataFromText } = require('../app/services/gigachat-client');

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post = jest.fn();
  });

  describe('initializeGigaChat', () => {
    test('should initialize client', () => {
      initializeGigaChat('test-token');
      // Should not throw
    });
  });

  describe('getOrderDataFromText', () => {
    test('should process order text successfully', async () => {
      initializeGigaChat('test-token');

      // Mock token request
      axios.post
        .mockResolvedValueOnce({
          data: { access_token: 'test-access-token' }
        })
        // Mock chat completion
        .mockResolvedValueOnce({
          data: {
            choices: [{
              message: {
                content: 'FINAL {"address": "Test Address", "divan": 2}'
              }
            }]
          }
        });

      const result = await getOrderDataFromText('Нужно 2 дивана');

      expect(result).toHaveProperty('orderData');
      expect(result).toHaveProperty('rawResponse');
      expect(result.orderData.address).toBe('Test Address');
    });

    test('should handle API errors', async () => {
      initializeGigaChat('test-token');

      axios.post.mockRejectedValue(new Error('API Error'));

      await expect(getOrderDataFromText('test')).rejects.toThrow('Failed to process message with AI');
    });
  });
});

describe('Speech Recognition Service', () => {
  const { initializeSpeechRecognition, processAudioMessage } = require('../app/services/speech-recognition');

  beforeEach(() => {
    jest.clearAllMocks();
    axios.post = jest.fn();
    fs.writeFileSync = jest.fn();
    fs.existsSync = jest.fn(() => true);
  });

  describe('initializeSpeechRecognition', () => {
    test('should initialize service', () => {
      initializeSpeechRecognition('auth-key', 'token');
      // Should not throw
    });
  });

  describe('processAudioMessage', () => {
    test('should process audio message successfully', async () => {
      initializeSpeechRecognition('auth-key', 'token');

      const mockCtx = {
        telegram: {
          getFile: jest.fn(() => ({ file_path: 'voice.ogg' }))
        },
        message: {
          voice: { file_id: 'test-file-id' }
        }
      };

      axios.get = jest.fn(() => Promise.resolve({ data: Buffer.from('audio data') }));
      axios.post = jest.fn(() => Promise.resolve({
        data: { result: 'распознанный текст' }
      }));

      const result = await processAudioMessage(mockCtx);

      expect(result).toHaveProperty('tempFiles');
      expect(result).toHaveProperty('recognizedText');
    });

    test('should handle download errors', async () => {
      const mockCtx = {
        telegram: {
          getFile: jest.fn(() => {
            throw new Error('Download failed');
          })
        },
        message: {
          voice: { file_id: 'test-file-id' }
        }
      };

      await expect(processAudioMessage(mockCtx)).rejects.toThrow('Failed to download audio file');
    });
  });
});

describe('Validators', () => {
  const {
    validateOrderData,
    validatePinCode,
    validateTextMessage,
    validateProductName,
    validateQuantity
  } = require('../app/utils/validators');

  describe('validatePinCode', () => {
    test('should validate correct PIN', () => {
      expect(validatePinCode('1234')).toBe(null);
      expect(validatePinCode('0000')).toBe(null);
    });

    test('should reject invalid PINs', () => {
      expect(validatePinCode('')).toBe('PIN code is required');
      expect(validatePinCode('123')).toBe('PIN code must be exactly 4 digits');
      expect(validatePinCode('abcd')).toBe('PIN code must contain only digits');
      expect(validatePinCode('12345')).toBe('PIN code must be exactly 4 digits');
    });
  });

  describe('validateOrderData', () => {
    test('should validate correct order data', () => {
      const validOrder = {
        address: 'Test Address',
        product1: 2,
        product2: 1
      };

      const errors = validateOrderData(validOrder);
      expect(errors).toHaveLength(0);
    });

    test('should reject invalid order data', () => {
      const invalidOrder = {
        product1: -1,
        product2: 'invalid'
      };

      const errors = validateOrderData(invalidOrder);
      expect(errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateTextMessage', () => {
    test('should validate correct messages', () => {
      expect(validateTextMessage('Hello')).toBe(null);
      expect(validateTextMessage('Test message')).toBe(null);
    });

    test('should reject invalid messages', () => {
      expect(validateTextMessage('')).toBe('Message cannot be empty');
      expect(validateTextMessage('a'.repeat(5000))).toBe('Message is too long (max 4096 characters)');
    });
  });

  describe('validateProductName', () => {
    test('should validate correct names', () => {
      expect(validateProductName('Диван')).toBe(null);
      expect(validateProductName('Стол обеденный')).toBe(null);
    });

    test('should reject invalid names', () => {
      expect(validateProductName('')).toBe('Product name cannot be empty');
      expect(validateProductName('<script>')).toBe('Product name contains invalid characters');
      expect(validateProductName('a'.repeat(200))).toBe('Product name is too long (max 100 characters)');
    });
  });

  describe('validateQuantity', () => {
    test('should validate correct quantities', () => {
      expect(validateQuantity(1)).toBe(null);
      expect(validateQuantity(100)).toBe(null);
      expect(validateQuantity('5')).toBe(null);
    });

    test('should reject invalid quantities', () => {
      expect(validateQuantity(0)).toBe('Quantity cannot be zero');
      expect(validateQuantity(-1)).toBe('Quantity cannot be negative');
      expect(validateQuantity(10001)).toBe('Quantity cannot exceed 10000');
      expect(validateQuantity('abc')).toBe('Quantity must be a valid number');
    });
  });
});

describe('Helpers', () => {
  const {
    formatDate,
    generateOrderNumber,
    sanitizeString,
    truncateText,
    calculateTotal,
    deepClone
  } = require('../app/utils/helpers');

  describe('formatDate', () => {
    test('should format dates correctly', () => {
      const date = new Date('2024-01-01T12:00:00');
      const formatted = formatDate(date);
      expect(formatted).toContain('01.01.2024');
    });
  });

  describe('generateOrderNumber', () => {
    test('should generate unique order numbers', () => {
      const order1 = generateOrderNumber();
      const order2 = generateOrderNumber();

      expect(order1).not.toBe(order2);
      expect(order1).toMatch(/^ORD-\d+-\d{3}$/);
    });
  });

  describe('sanitizeString', () => {
    test('should sanitize strings', () => {
      expect(sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
      expect(sanitizeString('normal text')).toBe('normal text');
    });
  });

  describe('truncateText', () => {
    test('should truncate long text', () => {
      const longText = 'a'.repeat(200);
      const truncated = truncateText(longText, 100);
      expect(truncated).toBe('a'.repeat(97) + '...');
    });

    test('should not truncate short text', () => {
      expect(truncateText('short')).toBe('short');
    });
  });

  describe('calculateTotal', () => {
    test('should calculate totals correctly', () => {
      const items = { item1: 2, item2: 3, item3: 1 };
      expect(calculateTotal(items)).toBe(6);
    });
  });

  describe('deepClone', () => {
    test('should clone objects deeply', () => {
      const original = { a: 1, b: { c: 2 }, d: [1, 2, 3] };
      const cloned = deepClone(original);

      expect(cloned).toEqual(original);
      expect(cloned).not.toBe(original);
      expect(cloned.b).not.toBe(original.b);
    });
  });
});

describe('File Processor', () => {
  const { cleanupFiles, ensureDirectoryExists, getFileSize, isValidFileType } = require('../app/utils/file-processor');

  beforeEach(() => {
    jest.clearAllMocks();
    fs.existsSync = jest.fn(() => true);
    fs.unlinkSync = jest.fn();
  });

  describe('cleanupFiles', () => {
    test('should cleanup single file', () => {
      cleanupFiles('test.txt');
      expect(fs.unlinkSync).toHaveBeenCalledWith('test.txt');
    });

    test('should cleanup multiple files', () => {
      cleanupFiles(['file1.txt', 'file2.txt']);
      expect(fs.unlinkSync).toHaveBeenCalledTimes(2);
    });

    test('should handle non-existent files', () => {
      fs.unlinkSync = jest.fn(() => {
        throw new Error('File not found');
      });

      expect(() => cleanupFiles('nonexistent.txt')).not.toThrow();
    });
  });

  describe('ensureDirectoryExists', () => {
    test('should create directory if not exists', () => {
      fs.existsSync = jest.fn(() => false);
      fs.mkdirSync = jest.fn();

      ensureDirectoryExists('test-dir');

      expect(fs.mkdirSync).toHaveBeenCalledWith('test-dir', { recursive: true });
    });

    test('should not create directory if exists', () => {
      fs.existsSync = jest.fn(() => true);
      fs.mkdirSync = jest.fn();

      ensureDirectoryExists('test-dir');

      expect(fs.mkdirSync).not.toHaveBeenCalled();
    });
  });

  describe('getFileSize', () => {
    test('should return file size', () => {
      fs.statSync = jest.fn(() => ({ size: 1024 }));

      const size = getFileSize('test.txt');
      expect(size).toBe(1024);
    });

    test('should handle errors', () => {
      fs.statSync = jest.fn(() => {
        throw new Error('File not found');
      });

      const size = getFileSize('nonexistent.txt');
      expect(size).toBe(0);
    });
  });

  describe('isValidFileType', () => {
    test('should validate file types', () => {
      expect(isValidFileType('test.xlsx', ['.xlsx', '.xls'])).toBe(true);
      expect(isValidFileType('test.txt', ['.xlsx', '.xls'])).toBe(false);
      expect(isValidFileType('test.XLSX', ['.xlsx', '.xls'])).toBe(true);
    });
  });
});
