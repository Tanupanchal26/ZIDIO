// @ts-nocheck
const { getClient } = require('./openai');
const { AI_MODEL } = require('../constants');

exports.extractActionItems = async (transcript) => {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: AI_MODEL.GPT4O,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `Extract action items from meeting transcripts. Return JSON: { "actionItems": [ { "text": string, "assignee": string|null, "dueDate": string|null, "priority": "high"|"medium"|"low" } ] }`,
      },
      { role: 'user', content: `Transcript:\n\n${transcript}` },
    ],
    max_tokens: 600,
    temperature: 0.2,
  });
  const raw = res.choices[0].message.content;
  try {
    const parsed = JSON.parse(raw);
    return parsed.actionItems || [];
  } catch {
    throw new Error(`AI returned invalid JSON for action items: ${raw?.slice(0, 100)}`);
  }
};

export {};
