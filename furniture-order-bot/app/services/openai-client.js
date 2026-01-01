const axios = require('axios');

class OpenAIClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseURL = 'https://api.openai.com/v1';
  }

  async sendMessage(message, model = 'gpt-3.5-turbo') {
    try {
      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: model,
        messages: [
          {
            role: 'user',
            content: message
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        return response.data.choices[0].message.content;
      }

      throw new Error('Invalid response from OpenAI');
    } catch (error) {
      console.error('OpenAI request error:', error.message);
      throw new Error('Failed to process message with OpenAI');
    }
  }

  parseOrderResponse(response) {
    try {
      // Find JSON in response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const jsonStr = jsonMatch[0];
      const orderData = JSON.parse(jsonStr);

      // Validate structure
      if (typeof orderData !== 'object') {
        throw new Error('Invalid order data structure');
      }

      return orderData;
    } catch (error) {
      console.error('Order parsing error:', error);
      throw new Error('Failed to parse order data');
    }
  }
}

// Global instance
let openAIClient = null;

function initializeOpenAI(apiKey) {
  openAIClient = new OpenAIClient(apiKey);
}

async function getOrderDataFromText(text) {
  if (!openAIClient) {
    throw new Error('OpenAI client not initialized');
  }

  try {
    const prompt = `Ты помощник оператора по оформлению заказов на мебель. Твоя задача – анализировать входящие сообщения от заказчиков и сохранять информацию в переменные.

ИНСТРУКЦИЯ:
1. Найди и сохрани уникальный номер или адрес торговой точки в переменную "address"
2. Найди товары и сохрани количества. Используй только целые числа.
3. Сопоставь товары со следующими переменными:
   - Диван угловой "Милан" → divan_uglovoj_milan
   - Кресло офисное "Эрго" → kreslo_ofisnoe_ergo
   - Стол обеденный "Олимп" → stol_obedennyj_olimp
   - Шкаф купе 3-створчатый → shkaf_kupe_3_stvorchatyj
   - Кровать двуспальная "Атланта" → krovat_dvuspalnaya_atlanta

ФОРМАТ ОТВЕТА - строго JSON:
{
    "address": "текст",
    "divan_uglovoj_milan": число,
    "kreslo_ofisnoe_ergo": число,
    "stol_obedennyj_olimp": число,
    "shkaf_kupe_3_stvorchatyj": число,
    "krovat_dvuspalnaya_atlanta": число
}

Текст заказа: ${text}`;

    const rawResponse = await openAIClient.sendMessage(prompt);

    console.log('OpenAI raw response:', rawResponse);

    const orderData = openAIClient.parseOrderResponse(rawResponse);

    return {
      orderData,
      rawResponse
    };
  } catch (error) {
    console.error('Order processing error:', error);
    throw error;
  }
}

module.exports = {
  initializeOpenAI,
  getOrderDataFromText,
  OpenAIClient
};
