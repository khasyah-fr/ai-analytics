import { Router } from 'express';
import { askQuestion } from '../usecase/llm.js';

const router = Router();

router.post('/api/ask', async (req, res) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ status: 'error', message: 'question is required' });
      return;
    }

    const payload = await askQuestion(question);
    res.json(payload);
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export default router;