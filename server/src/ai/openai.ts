// @ts-nocheck
const { openai: { apiKey } } = require('../config/env');

let _client = null;

const getClient = () => {
  if (!apiKey) throw new Error('OPENAI_API_KEY not configured');
  if (!_client) {
    const { OpenAI } = require('openai');
    _client = new OpenAI({ apiKey });
  }
  return _client;
};

module.exports = { getClient };

export {};
