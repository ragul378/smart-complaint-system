const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get categories
router.get('/', (req, res) => {
  const categories = db.all('SELECT * FROM categories ORDER BY name ASC');
  res.json({ categories });
});

// Create category (Admin)
router.post('/', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { name, description, default_sla = 24 } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const existing = db.get('SELECT id FROM categories WHERE name = ?', [name.trim()]);
    if (existing) {
      return res.status(400).json({ error: 'Category with this name already exists' });
    }

    const result = db.run(`
      INSERT INTO categories (name, description, default_sla, status)
      VALUES (?, ?, ?, 'ACTIVE')
    `, [name.trim(), description || null, parseInt(default_sla, 10)]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'CREATE_CATEGORY', ?, ?)`,
      [req.user.id, `Category '${name.trim()}'`, `Created category with SLA ${default_sla} hours`]
    );

    const category = db.get('SELECT * FROM categories WHERE id = ?', [result.lastInsertRowid]);
    res.status(201).json({ category });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// Update category (Admin)
router.put('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { name, description, default_sla, status } = req.body;
    const catId = req.params.id;

    db.run(`
      UPDATE categories
      SET name = ?, description = ?, default_sla = ?, status = ?
      WHERE id = ?
    `, [name, description, parseInt(default_sla, 10), status || 'ACTIVE', catId]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'UPDATE_CATEGORY', ?, ?)`,
      [req.user.id, `Category #${catId}`, `Updated details: name=${name}, sla=${default_sla}h, status=${status}`]
    );

    const updated = db.get('SELECT * FROM categories WHERE id = ?', [catId]);
    res.json({ category: updated });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// Delete category (Admin)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const catId = req.params.id;
    
    // Check if complaints reference this category
    const count = db.get('SELECT COUNT(*) as c FROM complaints WHERE category_id = ?', [catId]);
    if (count && count.c > 0) {
      // Soft disable instead of hard delete
      db.run("UPDATE categories SET status = 'INACTIVE' WHERE id = ?", [catId]);
      return res.json({ message: 'Category has associated complaints. Set status to INACTIVE instead.' });
    }

    db.run('DELETE FROM categories WHERE id = ?', [catId]);
    res.json({ message: 'Category deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete category' });
  }
});

module.exports = router;
