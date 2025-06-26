import jwt from "jsonwebtoken";

/**
 * Express middleware to authenticate requests using JWT.
 * Looks for token in Authorization header (Bearer) or auth_token cookie.
 * Attaches decoded user to req.user if valid.
 */
const auth = (req, res, next) => {
  let token = null;

  // Check Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    token = authHeader.split(" ")[1];
  }

  // Fallback: Check auth_token cookie
  if (!token && req.cookies && req.cookies.auth_token) {
    token = req.cookies.auth_token;
  }

  if (!token) {
    return res.status(401).json({ message: "No token, authorization denied." });
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error("JWT verification failed:", err.message);
    return res.status(401).json({ message: "Token is not valid." });
  }
};

export default auth;
