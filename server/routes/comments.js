const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

// Get comments for a complaint
router.get('/', authenticateToken, (req, res) => {
  const complaintId = req.params.complaintId;
  const comments = db.all(`
    SELECT c.*, u.name as user_name, u.role as user_role
    FROM complaint_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.complaint_id = ?
    ORDER BY c.created_at ASC
  `, [complaintId]);

  res.json({ comments });
});

// Post comment to a complaint
router.post('/', authenticateToken, (req, res) => {
  try {
    const complaintId = req.params.complaintId;
    const { message } = req.body;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: 'Message content cannot be empty' });
    }

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const result = db.run(`
      INSERT INTO complaint_comments (complaint_id, user_id, message)
      VALUES (?, ?, ?)
    `, [complaintId, req.user.id, message.trim()]);

    // Send notifications to other participants
    if (req.user.id === complaint.user_id) {
      // User commented -> notify assigned staff
      if (complaint.assigned_staff_id) {
        db.run(`
          INSERT INTO notifications (user_id, complaint_id, title, message)
          VALUES (?, ?, 'New Message from User', ?)
        `, [complaint.assigned_staff_id, complaintId, `${req.user.name} commented on complaint #${complaint.complaint_number}`]);
      }
    } else {
      // Staff or Admin commented -> notify user
      db.run(`
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, 'New Message on Complaint', ?)
      `, [complaint.user_id, complaintId, `${req.user.name} (${req.user.role}) left a message on #${complaint.complaint_number}`]);
    }

    const newComment = db.get(`
      SELECT c.*, u.name as user_name, u.role as user_role
      FROM complaint_comments c
      JOIN users u ON u.id = c.user_id
      WHERE c.id = ?
    `, [result.lastInsertRowid]);

    res.status(201).json({ comment: newComment });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

module.exports = router;
