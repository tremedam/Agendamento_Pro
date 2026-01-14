const { validationResult } = require('express-validator');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const msg = errors
      .array()
      .map(e => e.msg)
      .join('; ');
    return res
      .status(400)
      .json({ success: false, error: msg, details: errors.array() });
  }
  next();
}

module.exports = validateRequest;
