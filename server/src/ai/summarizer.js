const { getClient } = require('./openai');
const { AI_MODEL } = require('../constants');

exports.summarize = async (transcript) => {
  const client = getClient();
  const res = await client.chat.completions.create({
    model: AI_MODEL.GPT4O,
    messages: [
      {
        role: 'system',
        content: 'You are an expert meeting analyst. Produce a concise, structured meeting summary in markdown with sections: ## Overview, ## Key Decisions, ## Discussion Highlights. Be factual and brief.',
      },
      { role: 'user', content: `Meeting transcript:\n\n${transcript}` },
    ],
    max_tokens: 800,
    temperature: 0.3,
  });
  return res.choices[0].message.content.trim();
};
