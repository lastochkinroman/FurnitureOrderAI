const axios = require('axios');
const { getGigaChatPrompt } = require('./data-loader');

class GigaChatClient {
  constructor(token) {
    this.token = token;
    this.baseURL = 'https://gigachat.devices.sberbank.ru/api/v1';
    this.accessToken = null;
    this.tokenExpiry = null;
  }

  async getAccessToken() {
    try {
      // Check if we have a valid token
      if (this.accessToken && this.tokenExpiry && Date.now() < this.tokenExpiry) {
        return this.accessToken;
      }

      const response = await axios.post(`${this.baseURL}/oauth`, {
        scope: 'GIGACHAT_API_PERS'
      }, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      if (response.data && response.data.access_token) {
        this.accessToken = response.data.access_token;
        // Token expires in 30 minutes (1800 seconds)
        this.tokenExpiry = Date.now() + 1800000;
        return this.accessToken;
      }

      throw new Error('Failed to get access token');
    } catch (error) {
      console.error('GigaChat auth error:', error.message);
      throw new Error('Authentication failed');
    }
  }

  async sendMessage(message) {
    try {
      const accessToken = await this.getAccessToken();

      const response = await axios.post(`${this.baseURL}/chat/completions`, {
        model: 'GigaChat',
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
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000
      });

      if (response.data && response.data.choices && response.data.choices[0]) {
        return response.data.choices[0].message.content;
      }

      throw new Error('Invalid response from GigaChat');
    } catch (error) {
      console.error('GigaChat request error:', error.message);
      throw new Error('Failed to process message with AI');
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
let gigaChatClient = null;

function initializeGigaChat(token) {
  gigaChatClient = new GigaChatClient(token);
}

async function getOrderDataFromText(text) {
  if (!gigaChatClient) {
    throw new Error('GigaChat client not initialized');
  }

  try {
    const prompt = getGigaChatPrompt();
    const fullPrompt = `${prompt}\n\n${text}`;

    const rawResponse = await gigaChatClient.sendMessage(fullPrompt);

    console.log('GigaChat raw response:', rawResponse);

    const orderData = gigaChatClient.parseOrderResponse(rawResponse);

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
  initializeGigaChat,
  getOrderDataFromText,
  GigaChatClient
};
