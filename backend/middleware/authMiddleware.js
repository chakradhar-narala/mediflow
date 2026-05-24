const jwt = require("jsonwebtoken");

exports.verifyToken = (req, res, next) => {
  let token = req.headers.authorization;

  if (!token) {
    return res.status(401).json({
      message: "No token provided"
    });
  }

  // Handle "Bearer <token>" format
  if (token.startsWith("Bearer ")) {
    token = token.slice(7, token.length).trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({
      message: "Invalid token"
    });
  }
};

exports.verifyRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied: insufficient permissions"
      });
    }
    next();
  };
};