import { Router } from 'express';
import { asyncHandler, sendSuccess, sendError } from '../../shared/utils/response';
import { generateSummary } from '../../shared/ai/aiService';

const router = Router();

/**
 * POST /api/ai/summary
 * Body: { prompt: string }
 * Returns generated summary from OpenAI.
 */
router.post(
  '/summary',
  asyncHandler(async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return sendError(res, 'Prompt is required', 400);
    }
    try {
      const summary = await generateSummary(prompt);
      return sendSuccess(res, { summary });
    } catch (err) {
      return sendError(res, err, 500, 'Failed to generate summary');
    }
  })
);

export default router;
