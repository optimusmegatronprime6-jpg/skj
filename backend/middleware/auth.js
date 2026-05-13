/**
 * JWT Authentication Middleware for Shree Kamakshi Jewellers
 */

const jwt = require('jsonwebtoken');

/**
 * Middleware that verifies the JWT token from the Authorization header.
 * If valid, attaches the decoded user info to req.user.
 * If missing/invalid, responds with 401.
 */
function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Authentication required. Please login.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Session expired. Please login again.' });
        }
        return res.status(401).json({ error: 'Invalid authentication token.' });
    }
}

module.exports = authMiddleware;
