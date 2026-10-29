const jwt = require("jsonwebtoken");

/** Attach req.user when a valid Bearer token is present; never block the request. */
function optionalAuthMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return next();

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      role: decoded.role,
    };
  } catch {
    // ignore invalid/expired tokens for optional auth
  }
  return next();
}

module.exports = optionalAuthMiddleware;
