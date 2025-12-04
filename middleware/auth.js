// middleware/auth.js
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Token tidak ada' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, role, email, ... }
    next();
  } catch (err) {
    console.error('JWT verify error', err.message);
    return res.status(401).json({ message: 'Token tidak valid' });
  }
}

function requireSelf(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // cek role dulu
    if (role && req.user.role !== role) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    let paramId = req.params.userId || req.params.id;

    if (paramId) {
      paramId = Number(paramId);
    } else {
      paramId = Number(req.user.id);
      req.params.userId = paramId;
    }

    if (!paramId || paramId !== Number(req.user.id)) {
      return res.status(403).json({ message: 'Tidak boleh mengakses data user lain' });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireSelf,
};