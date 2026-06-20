const { getClient } = require('./openai');
const { AI_MODEL } = require('../constants');

/**
 * @param {object} opts
 * @param {string} opts.transcript
 * @param {string} opts.title
 * @param {string[]} opts.participants  - names
 * @param {string}  opts.date
 */
exports.generateMinutes = async ({ transcript, title, participants = [], date }) => {
  const client = getClient();
  const context = `Meeting: "${title}"\nDate: ${date}\nParticipants: ${participants.join(', ') || 'Unknown'}`;

  const res = await client.chat.completions.create({
    model: AI_MODEL.GPT4O,
    messages: [
      {
        role: 'system',
        content: `You are a professional meeting secretary. Generate formal meeting minutes in markdown with these sections:
# Meeting Minutes
## Meeting Details
## Attendees
## Agenda Items Discussed
## Key Decisions
## Action Items (table: | Task | Owner | Due Date | Priority |)
## Next Steps
Be concise, professional, and accurate.`,
      },
      { role: 'user', content: `${context}\n\nTranscript:\n${transcript}` },
    ],
    max_tokens: 1200,
    temperature: 0.2,
  });
  return res.choices[0].message.content.trim();
};
