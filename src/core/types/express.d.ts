declare global {
  namespace Express {
    interface Request {
      user?: import('./auth.types').AuthenticatedUser;
      requestId?: string;
    }
  }
}

export {};
