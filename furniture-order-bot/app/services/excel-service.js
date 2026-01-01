const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const { getNomenclature } = require('./data-loader');

const ORDERS_DIR = path.join(__dirname, '../../orders');
const EXCEL_FILE_NAME = 'orders.xlsx';
const EXCEL_PATH = path.join(ORDERS_DIR, EXCEL_FILE_NAME);

// Ensure orders directory exists
if (!fs.existsSync(ORDERS_DIR)) {
  fs.mkdirSync(ORDERS_DIR, { recursive: true });
}

function createDynamicHeaders(nomenclature) {
  const headers = ['Дата и время', 'Адрес', 'Точка продаж', 'Статус'];
  
  Object.values(nomenclature).forEach(product => {
    headers.push(`${product.name} (${product.unit})`);
  });
  
  headers.push('Сумма', 'Комментарий');
  return headers;
}

function createOrderRow(orderData, pointName, headers, productMap) {
  const row = new Array(headers.length).fill(0);
  const now = new Date();
  
  // Basic information
  row[0] = now.toLocaleString('ru-RU');
  row[1] = orderData.address || '';
  row[2] = pointName || '';
  row[3] = 'Новый';
  
  // Product quantities
  for (const [variable, value] of Object.entries(orderData)) {
    if (variable === 'address' || variable === 'date') continue;
    
    const columnIndex = productMap[variable];
    if (columnIndex !== undefined && columnIndex < row.length) {
      row[columnIndex] = parseInt(value) || 0;
    }
  }
  
  // Calculate total items
  const totalItems = Object.values(orderData)
    .filter((val, key) => key !== 'address' && key !== 'date')
    .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  
  row[row.length - 2] = totalItems; // Sum
  row[row.length - 1] = ''; // Comment
  
  return row;
}

async function saveOrderToExcel(orderData, pointName, rawResponse = '') {
  try {
    console.log('💾 Saving order to Excel...');
    
    const nomenclature = getNomenclature();
    const headers = createDynamicHeaders(nomenclature);
    
    // Create product map
    const productMap = {};
    Object.values(nomenclature).forEach((product, index) => {
      productMap[product.variable] = index + 4; // +4 for first 4 columns
    });
    
    let workbook;
    let worksheet;
    let data = [];
    
    // Check if file exists
    if (fs.existsSync(EXCEL_PATH)) {
      console.log('📖 Reading existing file...');
      try {
        workbook = XLSX.readFile(EXCEL_PATH);
        
        if (workbook.SheetNames && workbook.SheetNames.includes('Заказы')) {
          worksheet = workbook.Sheets['Заказы'];
          data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
          
          if (data.length > 0) {
            // Update headers if needed
            const existingHeaders = data[0] || [];
            headers.forEach(header => {
              if (!existingHeaders.includes(header)) {
                existingHeaders.push(header);
              }
            });
            data[0] = existingHeaders;
          } else {
            data = [headers];
          }
        } else {
          data = [headers];
          worksheet = XLSX.utils.aoa_to_sheet(data);
          workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы');
        }
      } catch (fileError) {
        console.error('File read error:', fileError.message);
        workbook = XLSX.utils.book_new();
        data = [headers];
        worksheet = XLSX.utils.aoa_to_sheet(data);
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы');
      }
    } else {
      console.log('🆕 Creating new file...');
      workbook = XLSX.utils.book_new();
      data = [headers];
      worksheet = XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Заказы');
    }
    
    // Add new order row
    const newRow = createOrderRow(orderData, pointName, data[0], productMap);
    data.push(newRow);
    
    // Update worksheet
    worksheet = XLSX.utils.aoa_to_sheet(data);
    workbook.Sheets['Заказы'] = worksheet;
    
    // Save file
    XLSX.writeFile(workbook, EXCEL_PATH, { bookType: 'xlsx', type: 'file' });
    
    // Also save backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(ORDERS_DIR, `orders_backup_${timestamp}.xlsx`);
    XLSX.writeFile(workbook, backupPath);
    
    console.log(`✅ Order saved! Total orders: ${data.length - 1}`);
    
    return {
      success: true,
      totalOrders: data.length - 1,
      filePath: EXCEL_PATH,
      backupPath: backupPath
    };
    
  } catch (error) {
    console.error('❌ Error saving order:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function formatOrderSummary(orderData, pointName) {
  const nomenclature = getNomenclature();
  let summary = `📍 *Точка*: ${pointName}\n`;
  
  if (orderData.address) {
    summary += `🏢 *Адрес*: ${orderData.address}\n`;
  }
  
  summary += '\n📦 *Состав заказа*:\n';
  
  let hasProducts = false;
  Object.values(nomenclature).forEach(product => {
    const value = orderData[product.variable] || 0;
    if (value > 0) {
      summary += `  • ${product.name}: ${value} ${product.unit}\n`;
      hasProducts = true;
    }
  });
  
  if (!hasProducts) {
    summary += '  (нет товаров)\n';
  }
  
  const totalItems = Object.values(orderData)
    .filter((val, key) => key !== 'address' && key !== 'date')
    .reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  
  summary += `\n📊 *Итого*: ${totalItems} единиц товара\n`;
  
  return summary;
}

async function getOrderStatistics() {
  try {
    if (!fs.existsSync(EXCEL_PATH)) {
      return { totalOrders: 0, lastOrder: null, monthlyStats: {} };
    }
    
    const workbook = XLSX.readFile(EXCEL_PATH);
    if (!workbook.SheetNames.includes('Заказы')) {
      return { totalOrders: 0, lastOrder: null, monthlyStats: {} };
    }
    
    const worksheet = workbook.Sheets['Заказы'];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    
    if (data.length <= 1) {
      return { totalOrders: 0, lastOrder: null, monthlyStats: {} };
    }
    
    const totalOrders = data.length - 1;
    const lastOrder = data[data.length - 1];
    
    // Calculate monthly statistics
    const monthlyStats = {};
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      if (row.length > 0) {
        const dateStr = row[0];
        if (dateStr) {
          const date = new Date(dateStr);
          const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
          
          if (!monthlyStats[monthKey]) {
            monthlyStats[monthKey] = { orders: 0, items: 0 };
          }
          
          monthlyStats[monthKey].orders++;
          
          // Sum items (assuming items are in column before last two)
          if (row.length > 2) {
            const items = parseInt(row[row.length - 2]) || 0;
            monthlyStats[monthKey].items += items;
          }
        }
      }
    }
    
    return {
      totalOrders,
      lastOrder: lastOrder[0] || null,
      monthlyStats
    };
    
  } catch (error) {
    console.error('Error getting statistics:', error);
    return { totalOrders: 0, lastOrder: null, monthlyStats: {}, error: error.message };
  }
}

module.exports = {
  saveOrderToExcel,
  formatOrderSummary,
  getOrderStatistics,
  EXCEL_PATH,
  ORDERS_DIR
};
