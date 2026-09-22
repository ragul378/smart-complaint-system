const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const { initDb } = require('./db');

const authRoutes = require('./routes/auth');
const complaintRoutes = require('./routes/complaints');
const commentRoutes = require('./routes/comments');
const notificationRoutes = require('./routes/notifications');
const categoryRoutes = require('./routes/categories');
const departmentRoutes = require('./routes/departments');
const userRoutes = require('./routes/users');
const analyticsRoutes = require('./routes/analytics');
const auditRoutes = require('./routes/audit');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve Uploaded Files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Mount API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/complaints/:complaintId/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/users', userRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/audit', auditRoutes);

// Serve Static Frontend in Production (if built)
const clientDistPath = path.join(__dirname, '../client/dist');
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Initialize DB and start listening
initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Smart Complaint Management Backend API running on http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
});
