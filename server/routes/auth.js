const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, phone, password, role = 'USER', department_id } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    const existingUser = db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (existingUser) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const result = db.run(
      `INSERT INTO users (name, email, phone, password_hash, role, department_id, status)
       VALUES (?, ?, ?, ?, ?, ?, 'ACTIVE')`,
      [name, email.toLowerCase().trim(), phone || null, passwordHash, role, department_id || null]
    );

    const user = db.get('SELECT id, name, email, phone, role, department_id, status, created_at FROM users WHERE id = ?', [result.lastInsertRowid]);

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, ?, ?, ?)`,
      [user.id, 'USER_REGISTER', `User #${user.id}`, `User ${user.email} registered as ${user.role}`]
    );

    res.status(201).json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.get('SELECT * FROM users WHERE email = ?', [email.toLowerCase().trim()]);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: 'Your account has been deactivated. Please contact administrator.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

    delete user.password_hash;

    // Get department info if assigned
    if (user.department_id) {
      const dept = db.get('SELECT name FROM departments WHERE id = ?', [user.department_id]);
      user.department_name = dept ? dept.name : null;
    }

    res.json({ user, token });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, (req, res) => {
  const user = db.get('SELECT id, name, email, phone, role, department_id, status, created_at FROM users WHERE id = ?', [req.user.id]);
  if (!user) {
    return res.status(444).json({ error: 'User not found' });
  }

  if (user.department_id) {
    const dept = db.get('SELECT name FROM departments WHERE id = ?', [user.department_id]);
    user.department_name = dept ? dept.name : null;
  }

  res.json({ user });
});

// Update Profile
router.put('/profile', authenticateToken, (req, res) => {
  try {
    const { name, phone } = req.body;
    db.run(
      `UPDATE users SET name = ?, phone = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [name, phone, req.user.id]
    );

    const user = db.get('SELECT id, name, email, phone, role, department_id, status FROM users WHERE id = ?', [req.user.id]);
    res.json({ message: 'Profile updated successfully', user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Change Password
router.post('/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id]);

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect current password' });
    }

    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(newPassword, salt);

    db.run('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [newHash, req.user.id]);

    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Forgot Password (Simulated)
router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  const user = db.get('SELECT id FROM users WHERE email = ?', [email]);
  if (!user) {
    // Return generic message for security
    return res.json({ message: 'If an account with that email exists, password reset instructions have been sent.' });
  }
  res.json({ message: 'Password reset link sent to your registered email address.' });
});

module.exports = router;
