const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get Audit Logs (Admin only)
router.get('/', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  const { search, limit = 100 } = req.query;

  let query = `
    SELECT a.*, u.name as user_name, u.role as user_role, u.email as user_email
    FROM audit_logs a
    JOIN users u ON u.id = a.user_id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (a.action LIKE ? OR a.target LIKE ? OR a.details LIKE ? OR u.name LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  query += ` ORDER BY a.created_at DESC LIMIT ?`;
  params.push(parseInt(limit, 10));

  const logs = db.all(query, params);
  res.json({ logs });
});

module.exports = router;
