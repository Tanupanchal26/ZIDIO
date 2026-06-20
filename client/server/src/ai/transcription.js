const { getClient } = require('./openai');
const { Readable } = require('stream');

exports.transcribe = async (audioBuffer, filename = 'audio.webm') => {
  const client = getClient();

  const stream = Readable.from(audioBuffer);
  stream.path = filename; // Whisper needs a filename hint for format detection

  const res = await client.audio.transcriptions.create({
    model: 'whisper-1',
    file: stream,
    response_format: 'text',
  });
  return res;
};
