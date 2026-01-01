const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// Глобальные переменные (в реальном проекте используйте Redis или БД)
let partnerPoints = [];
let nomenclature = {};
let GIGA_CHAT_PROMPT = '';

function generateVariableName(productName) {
  if (!productName) return 'unknown_product';

  return productName
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, '_')
    .replace(/%/g, 'percent')
    .replace(/\./g, '_')
    .replace(/,/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 50) || 'product_' + Math.random().toString(36).substring(2, 8);
}

function generateGigaChatPrompt(nomenclature) {
  const products = Object.values(nomenclature);

  if (products.length === 0) {
    return getDefaultGigaChatPrompt();
  }

  const jsonFields = products.map(product => {
    return `    "${product.variable}": число`;
  }).join(',\n');

  return `Ты помощник оператора по оформлению заказов на мебель. Твоя задача – анализировать входящие сообщения от заказчиков и сохранять информацию в переменные.

ИНСТРУКЦИЯ:
1. Найди и сохрани уникальный номер или адрес торговой точки в переменную "address"
2. Найди товары и сохрани количества. Используй только целые числа.
3. Сопоставь товары со следующими переменными:
${products.map(p => `   - ${p.name} → ${p.variable}`).join('\n')}

ФОРМАТ ОТВЕТА - строго JSON:
{
    "address": "текст",
${jsonFields}
}

Начинай ответ со слова FINAL.
Текст заказа:`;
}

async function loadPartnerPoints() {
  const filePath = path.join(__dirname, '../../data/КонтрагентыБотБот.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ Partner points file not found, using defaults');
    return getDefaultPartnerPoints();
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const points = [];
    let rowNumber = 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 5) continue;

      try {
        const code = String(row[0] || '').trim();
        const name = String(row[1] || '').trim();
        const address = String(row[4] || '').trim();

        if (!name || name === 'Покупатели' || name === 'Наименование в программе') {
          continue;
        }

        let pin = '0000';
        if (code && code.length >= 4) {
          const digits = code.match(/\d/g);
          if (digits && digits.length >= 4) {
            pin = digits.slice(-4).join('');
          } else {
            pin = code.slice(-4);
          }
        } else {
          pin = Math.floor(1000 + Math.random() * 9000).toString();
        }

        if (name && address) {
          points.push({
            id: rowNumber.toString(),
            name: name,
            address: address,
            pin: pin
          });
          rowNumber++;
        }
      } catch (rowError) {
        console.warn(`Row processing error ${i}:`, rowError.message);
      }
    }

    return points;
  } catch (error) {
    console.error('Error loading partner points:', error.message);
    return getDefaultPartnerPoints();
  }
}

async function loadNomenclature() {
  const filePath = path.join(__dirname, '../../data/НоменклатураБот.xlsx');
  
  if (!fs.existsSync(filePath)) {
    console.warn('⚠️ Nomenclature file not found');
    return getDefaultNomenclature();
  }

  try {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const nomenclature = {};
    let index = 1;

    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (!row || row.length < 1) continue;

      try {
        const productName = String(row[0] || '').trim();
        const unit = String(row[1] || 'шт').trim();

        if (!productName || productName === 'Номенклатура') {
          continue;
        }

        const key = `product_${index}`;
        nomenclature[key] = {
          name: productName,
          unit: unit || 'шт',
          variable: generateVariableName(productName)
        };
        index++;
      } catch (rowError) {
        console.warn(`Row processing error ${i}:`, rowError.message);
      }
    }

    return nomenclature;
  } catch (error) {
    console.error('Error loading nomenclature:', error.message);
    return getDefaultNomenclature();
  }
}

function getDefaultPartnerPoints() {
  return [
    { id: '1', name: 'Магазин "Мебель Сити"', address: 'ул. Центральная, д. 1', pin: '1234' },
    { id: '2', name: 'ТЦ "Домовой"', address: 'пр. Победы, д. 45', pin: '5678' },
    { id: '3', name: 'Салон "Интерьер Люкс"', address: 'ул. Ленина, д. 89', pin: '9012' }
  ];
}

function getDefaultNomenclature() {
  return {
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
  };
}

function getDefaultGigaChatPrompt() {
  return `Ты помощник оператора по оформлению заказов на мебель. Твоя задача – анализировать входящие сообщения от заказчиков и сохранять информацию в переменные.

ИНСТРУКЦИЯ:
1. Найди и сохрани уникальный номер или адрес торговой точки в переменную address
2. Найди товары и сохрани количества. Обрабатывай только целые числа.

ФОРМАТ ОТВЕТА - строго JSON:
{"address": "текст"}

Текст заказа:`;
}

async function initializeData() {
  try {
    partnerPoints = await loadPartnerPoints();
    nomenclature = await loadNomenclature();
    GIGA_CHAT_PROMPT = generateGigaChatPrompt(nomenclature);
    
    console.log(`✅ Data loaded: ${partnerPoints.length} points, ${Object.keys(nomenclature).length} products`);
    return { partnerPoints, nomenclature, GIGA_CHAT_PROMPT };
  } catch (error) {
    console.error('❌ Data initialization error:', error);
    // Use defaults
    partnerPoints = getDefaultPartnerPoints();
    nomenclature = getDefaultNomenclature();
    GIGA_CHAT_PROMPT = getDefaultGigaChatPrompt();
    return { partnerPoints, nomenclature, GIGA_CHAT_PROMPT };
  }
}

function getPartnerPoints() {
  return partnerPoints;
}

function getNomenclature() {
  return nomenclature;
}

function getGigaChatPrompt() {
  return GIGA_CHAT_PROMPT;
}

module.exports = {
  initializeData,
  getPartnerPoints,
  getNomenclature,
  getGigaChatPrompt,
  generateVariableName,
  loadPartnerPoints,
  loadNomenclature
};
