// @ts-nocheck
const { getClient } = require('./openai');
const { AI_MODEL } = require('../constants');

const SYSTEM_PROMPT = `You are IntellMeet AI Assistant, an intelligent meeting co-pilot. You can:
- Summarize meetings or specific sections
- Extract and generate action items / tasks
- Answer questions about meeting content
- Search across meeting history when context is provided
- Provide insights and recommendations

Be concise, structured, and helpful. Use bullet points and markdown when appropriate.`;

/**
 * @param {string} userMessage
 * @param {object} context
 * @param {string}  context.transcript     - current meeting transcript
 * @param {string}  context.summary        - existing summary
 * @param {object[]} context.history       - [{role, content}] previous turns
 * @param {string[]} context.meetingTitles - for search context
 */
exports.chat = async (userMessage, context = {}) => {
  const client = getClient();

  const contextBlock = [
    context.transcript ? `CURRENT TRANSCRIPT:\n${context.transcript.slice(0, 6000)}` : '',
    context.summary    ? `CURRENT SUMMARY:\n${context.summary}` : '',
    context.meetingTitles?.length
      ? `AVAILABLE MEETINGS:\n${context.meetingTitles.join('\n')}`
      : '',
  ].filter(Boolean).join('\n\n');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + (contextBlock ? `\n\nCONTEXT:\n${contextBlock}` : '') },
    ...(context.history || []).slice(-8), // keep last 8 turns
    { role: 'user', content: userMessage },
  ];

  const res = await client.chat.completions.create({
    model: AI_MODEL.GPT4O,
    messages,
    max_tokens: 700,
    temperature: 0.4,
  });

  return res.choices[0].message.content.trim();
};

/**
 * Generate tasks from a plain-text request or transcript.
 */
exports.generateTasks = async (prompt, transcript = '') => {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: AI_MODEL.GPT4O,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: 'Generate project tasks from the given input. Return JSON: { "tasks": [{ "title": string, "description": string, "priority": "high"|"medium"|"low", "estimatedHours": number|null }] }',
      },
      { role: 'user', content: `Request: ${prompt}\n${transcript ? `\nTranscript context:\n${transcript.slice(0, 3000)}` : ''}` },
    ],
    max_tokens: 500,
    temperature: 0.3,
  });
  const parsed = JSON.parse(res.choices[0].message.content);
  return parsed.tasks || [];
};

export {};
