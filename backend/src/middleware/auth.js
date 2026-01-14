const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const secretsManager = require('../config/secrets');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'Token not provided' });
  }

  const [, token] = authHeader.split(' ');

  try {
    const jwtSecret = secretsManager.getJwtSecret();
    const decoded = jwt.verify(token, jwtSecret);
    req.userId = decoded.id;
    return next();
  } catch (error) {
    logger.error('Token verification failed', error);
    return res.status(401).json({ error: 'Token invalid' });
  }
};

module.exports = authMiddleware;
