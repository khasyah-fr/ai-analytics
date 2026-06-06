import { Request, Response, NextFunction } from 'express';
import { API_AUTH_TOKEN } from '../config/index.ts';

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ status: 'error', message: 'Missing or malformed Authorization header.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  if (token !== API_AUTH_TOKEN) {
    res.status(403).json({ status: 'error', message: 'Invalid API token.' });
    return;
  }

  next();
}