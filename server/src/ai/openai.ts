// @ts-nocheck
const { openai: { apiKey } } = require('../config/env');

let _client = null;

class MockOpenAI {
  chat = {
    completions: {
      create: async (options) => {
        let content = 'This is a mock AI response generated because the OPENAI_API_KEY is not configured.';
        if (options?.response_format?.type === 'json_object') {
          content = JSON.stringify({
            actionItems: [
              { text: "Configure OPENAI_API_KEY in .env", assignee: "Admin", dueDate: "Tomorrow", priority: "high" }
            ]
          });
        }
        return { choices: [{ message: { content } }] };
      }
    }
  };
}

const getClient = () => {
  if (!apiKey) {
    console.warn('[AI] OPENAI_API_KEY not configured. Using Mock AI Service.');
    return new MockOpenAI();
  }
  if (!_client) {
    const { OpenAI } = require('openai');
    _client = new OpenAI({ apiKey });
  }
  return _client;
};

module.exports = { getClient };

export {};
