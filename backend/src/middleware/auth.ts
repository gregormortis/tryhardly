// Re-export everything from authMiddleware for backward compatibility.
// All auth logic lives in authMiddleware.ts — import from there or here.
export { AuthRequest, authenticate, optionalAuth } from './authMiddleware';
