const { getClient } = require('./openai');
const { getRedisClient } = require('../config/redis');

const EMBED_MODEL = 'text-embedding-3-small';
const CACHE_TTL = 86400; // 24h

const cosineSimilarity = (a, b) => {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const getEmbedding = async (text) => {
  const redis = getRedisClient();
  const cacheKey = `embed:${Buffer.from(text.slice(0, 200)).toString('base64')}`;

  if (redis) {
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
  }

  const client = getClient();
  const res = await client.embeddings.create({ model: EMBED_MODEL, input: text.slice(0, 8000) });
  const embedding = res.data[0].embedding;

  if (redis) await redis.setEx(cacheKey, CACHE_TTL, JSON.stringify(embedding));
  return embedding;
};

/**
 * Semantic search over meeting documents.
 * @param {string} query
 * @param {Array<{id, title, content}>} documents
 * @param {number} topK
 */
exports.semanticSearch = async (query, documents, topK = 5) => {
  if (!documents.length) return [];

  const queryEmbed = await getEmbedding(query);
  const scored = await Promise.all(
    documents.map(async (doc) => {
      const docEmbed = await getEmbedding(`${doc.title} ${doc.content}`);
      return { ...doc, score: cosineSimilarity(queryEmbed, docEmbed) };
    })
  );

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .filter(d => d.score > 0.3);
};
