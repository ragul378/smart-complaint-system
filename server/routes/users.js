const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// List Users / Staff with filters (Admin only)
router.get('/', authenticateToken, requireRole(['ADMIN', 'STAFF']), (req, res) => {
  const { role, department_id, status, search } = req.query;

  let query = `
    SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.status, u.created_at,
           d.name as department_name,
           (SELECT COUNT(*) FROM complaints WHERE user_id = u.id) as user_complaints_count,
           (SELECT COUNT(*) FROM complaints WHERE assigned_staff_id = u.id) as assigned_complaints_count,
           (SELECT COUNT(*) FROM complaints WHERE assigned_staff_id = u.id AND status IN ('RESOLVED', 'CLOSED')) as resolved_complaints_count,
           (SELECT AVG(f.rating) FROM feedback f JOIN complaints c ON c.id = f.complaint_id WHERE c.assigned_staff_id = u.id) as avg_rating
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE 1=1
  `;
  const params = [];

  if (role) {
    query += ` AND u.role = ?`;
    params.push(role);
  }

  if (department_id) {
    query += ` AND u.department_id = ?`;
    params.push(department_id);
  }

  if (status) {
    query += ` AND u.status = ?`;
    params.push(status);
  }

  if (search) {
    query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term);
  }

  query += ` ORDER BY u.created_at DESC`;

  const users = db.all(query, params);
  res.json({ users });
});

// Get User details by ID
router.get('/:id', authenticateToken, requireRole(['ADMIN', 'STAFF']), (req, res) => {
  const userId = req.params.id;
  const user = db.get(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.department_id, u.status, u.created_at,
           d.name as department_name
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    WHERE u.id = ?
  `, [userId]);

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Get staff workload metrics if role is STAFF
  let performance = null;
  if (user.role === 'STAFF') {
    const totalAssigned = db.get('SELECT COUNT(*) as c FROM complaints WHERE assigned_staff_id = ?', [userId]).c;
    const resolvedCount = db.get("SELECT COUNT(*) as c FROM complaints WHERE assigned_staff_id = ? AND status IN ('RESOLVED', 'CLOSED')", [userId]).c;
    const overdueCount = db.get("SELECT COUNT(*) as c FROM complaints WHERE assigned_staff_id = ? AND status NOT IN ('RESOLVED', 'CLOSED') AND sla_deadline < DATETIME('now')", [userId]).c;
    const avgRatingRow = db.get("SELECT AVG(rating) as r FROM feedback f JOIN complaints c ON c.id = f.complaint_id WHERE c.assigned_staff_id = ?", [userId]);

    performance = {
      totalAssigned,
      resolvedCount,
      overdueCount,
      slaCompliance: totalAssigned > 0 ? Math.round(((totalAssigned - overdueCount) / totalAssigned) * 100) : 100,
      avgRating: avgRatingRow && avgRatingRow.r ? Number(avgRatingRow.r).toFixed(1) : '5.0'
    };
  }

  res.json({ user, performance });
});

// Create User / Staff (Admin only)
router.post('/', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { name, email, phone, password, role = 'USER', department_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existing = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existing) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = db.run(`
      INSERT INTO users (name, email, phone, password_hash, role, department_id, status)
      VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')
    `, [name, email.toLowerCase().trim(), phone || null, passwordHash, role, department_id || null]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'CREATE_USER', ?, ?)`,
      [req.user.id, `User '${name}' (${email})`, `Created ${role} account`]
    );

    const newUser = db.get('SELECT id, name, email, phone, role, department_id, status, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ user: newUser });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update User (Admin only)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { name, email, phone, role, department_id, status } = req.body;
    const userId = req.params.id;

    db.run(`
      UPDATE users
      SET name = ?, email = ?, phone = ?, role = ?, department_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, email.toLowerCase().trim(), phone || null, role, department_id || null, status || 'ACTIVE', userId]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'UPDATE_USER', ?, ?)`,
      [req.user.id, `User #${userId}`, `Updated profile: role=${role}, status=${status}`]
    );

    const updated = db.get('SELECT id, name, email, phone, role, department_id, status FROM users WHERE id = ?', [userId]);
    res.json({ user: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Reset User Password (Admin only)
router.post('/:id/reset-password', authenticateToken, requireRole(['ADMIN']), async (req, res) => {
  try {
    const { newPassword } = req.body;
    const userId = req.params.id;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [passwordHash, userId]);

    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'RESET_PASSWORD', ?, ?)`,
      [req.user.id, `User #${userId}`, `Password was reset by administrator`]
    );

    res.json({ message: 'User password reset successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
