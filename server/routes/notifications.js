const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get notifications for logged in user
router.get('/', authenticateToken, (req, res) => {
  const notifications = db.all(`
    SELECT * FROM notifications
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `, [req.user.id]);

  const unreadCountRow = db.get(`
    SELECT COUNT(*) as count FROM notifications
    WHERE user_id = ? AND is_read = 0
  `, [req.user.id]);

  res.json({
    notifications,
    unreadCount: unreadCountRow ? unreadCountRow.count : 0
  });
});

// Mark single notification read
router.patch('/:id/read', authenticateToken, (req, res) => {
  db.run(`
    UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?
  `, [req.params.id, req.user.id]);
  res.json({ message: 'Notification marked as read' });
});

// Mark all read
router.patch('/mark-all-read', authenticateToken, (req, res) => {
  db.run(`
    UPDATE notifications SET is_read = 1 WHERE user_id = ?
  `, [req.user.id]);
  res.json({ message: 'All notifications marked as read' });
});

module.exports = router;
