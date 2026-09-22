const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all departments
router.get('/', (req, res) => {
  const departments = db.all(`
    SELECT d.*, COUNT(u.id) as staff_count
    FROM departments d
    LEFT JOIN users u ON u.department_id = d.id AND u.role = 'STAFF'
    GROUP BY d.id
    ORDER BY d.name ASC
  `);
  res.json({ departments });
});

// Create department (Admin)
router.post('/', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Department name is required' });
    }

    const existing = db.get('SELECT id FROM departments WHERE name = ?', [name.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Department with this name already exists' });
    }

    const result = db.run(`
      INSERT INTO departments (name, description, status)
      VALUES (?, ?, 'ACTIVE')
    `, [name.trim(), description || null]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'CREATE_DEPARTMENT', ?, ?)`,
      [req.user.id, `Department '${name.trim()}'`, `Created new department`]
    );

    const dept = db.get('SELECT * FROM departments WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ department: dept });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create department' });
  }
});

// Update department (Admin)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { name, description, status } = req.body;
    const deptId = req.params.id;

    db.run(`
      UPDATE departments
      SET name = ?, description = ?, status = ?
      WHERE id = ?
    `, [name, description, status || 'ACTIVE', deptId]);

    const updated = db.get('SELECT * FROM departments WHERE id = ?', [deptId]);
    res.json({ department: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update department' });
  }
});

// Delete department (Admin)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const deptId = req.params.id;
    const count = db.get('SELECT COUNT(*) as c FROM complaints WHERE department_id = ?', [deptId]);
    if (count && count.c > 0) {
      db.run("UPDATE departments SET status = 'INACTIVE' WHERE id = ?", [deptId]);
      return res.json({ message: 'Department has complaints. Set status to INACTIVE.' });
    }

    db.run('DELETE FROM departments WHERE id = ?', [deptId]);
    res.json({ message: 'Department deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete department' });
  }
});

module.exports = router;
