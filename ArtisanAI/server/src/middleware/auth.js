import jwt from 'jsonwebtoken';

export function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Authentication required' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    next();
  } catch {
    res.status(401).json({ message: 'Invalid or expired session' });
  }
}

export function optionalAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, process.env.JWT_SECRET || 'dev-secret-change-me');
    } catch (e) {}
  }
  next();
}

export function allow(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Authentication required' });
    return roles.includes(req.user.role) ? next() : res.status(403).json({ message: 'Access denied' });
  };
}
