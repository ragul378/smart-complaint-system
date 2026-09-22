const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get Overview Analytics KPIs
router.get('/dashboard', authenticateToken, (req, res) => {
  const { startDate, endDate, department_id } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (department_id) {
    whereClause += ' AND c.department_id = ?';
    params.push(department_id);
  }

  if (startDate) {
    whereClause += ' AND DATE(c.created_at) >= DATE(?)';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND DATE(c.created_at) <= DATE(?)';
    params.push(endDate);
  }

  // Aggregate Counts
  const total = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause}`, params).val;
  const newCount = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'NEW'`, params).val;
  const acknowledgedCount = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'ACKNOWLEDGED'`, params).val;
  const assignedCount = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'ASSIGNED'`, params).val;
  const inProgress = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'IN_PROGRESS'`, params).val;
  const onHold = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'ON_HOLD'`, params).val;
  const resolved = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'RESOLVED'`, params).val;
  const closed = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'CLOSED'`, params).val;
  const reopened = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'REOPENED'`, params).val;
  const escalated = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'ESCALATED'`, params).val;
  const rejected = db.get(`SELECT COUNT(*) as val FROM complaints c ${whereClause} AND c.status = 'REJECTED'`, params).val;

  // Overdue count
  const overdue = db.get(`
    SELECT COUNT(*) as val FROM complaints c
    ${whereClause} AND c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED')
    AND c.sla_deadline IS NOT NULL AND DATETIME(c.sla_deadline) < DATETIME('now')
  `, params).val;

  // SLA Compliance %
  const slaCompliance = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

  // Average Resolution Time (in hours)
  const resolvedComplaints = db.all(`
    SELECT created_at, resolved_at FROM complaints c
    ${whereClause} AND resolved_at IS NOT NULL
  `, params);

  let avgResolutionHours = 0;
  if (resolvedComplaints.length > 0) {
    const totalDiffMs = resolvedComplaints.reduce((acc, curr) => {
      const start = new Date(curr.created_at).getTime();
      const end = new Date(curr.resolved_at).getTime();
      return acc + (end - start);
    }, 0);
    avgResolutionHours = Number((totalDiffMs / (resolvedComplaints.length * 3600 * 1000)).toFixed(1));
  }

  res.json({
    kpis: {
      total,
      newCount,
      acknowledgedCount,
      assignedCount,
      inProgress,
      onHold,
      resolved,
      closed,
      reopened,
      escalated,
      rejected,
      overdue,
      slaCompliance,
      avgResolutionHours
    }
  });
});

// Get Chart Datasets
router.get('/charts', authenticateToken, (req, res) => {
  // 1. By Status
  const statusDist = db.all(`
    SELECT status, COUNT(*) as count
    FROM complaints
    GROUP BY status
  `);

  // 2. By Category
  const categoryDist = db.all(`
    SELECT cat.name as category, COUNT(c.id) as count
    FROM categories cat
    LEFT JOIN complaints c ON c.category_id = cat.id
    GROUP BY cat.id
    ORDER BY count DESC
  `);

  // 3. By Priority
  const priorityDist = db.all(`
    SELECT priority, COUNT(*) as count
    FROM complaints
    GROUP BY priority
  `);

  // 4. Department Workload
  const deptWorkload = db.all(`
    SELECT d.name as department,
           COUNT(c.id) as total,
           SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved,
           SUM(CASE WHEN c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED') THEN 1 ELSE 0 END) as pending
    FROM departments d
    LEFT JOIN complaints c ON c.department_id = d.id
    GROUP BY d.id
  `);

  // 5. Staff Performance
  const staffPerf = db.all(`
    SELECT u.name as staff_name, d.name as department_name,
           COUNT(c.id) as total_assigned,
           SUM(CASE WHEN c.status IN ('RESOLVED', 'CLOSED') THEN 1 ELSE 0 END) as resolved,
           AVG(CASE WHEN f.rating IS NOT NULL THEN f.rating ELSE NULL END) as rating
    FROM users u
    LEFT JOIN departments d ON d.id = u.department_id
    LEFT JOIN complaints c ON c.assigned_staff_id = u.id
    LEFT JOIN feedback f ON f.complaint_id = c.id
    WHERE u.role = 'STAFF'
    GROUP BY u.id
    ORDER BY total_assigned DESC
  `);

  res.json({
    statusDist,
    categoryDist,
    priorityDist,
    deptWorkload,
    staffPerf
  });
});

// Report Generator Endpoint
router.get('/reports', authenticateToken, requireRole(['ADMIN', 'STAFF']), (req, res) => {
  const { startDate, endDate, category_id, department_id, priority, status } = req.query;

  let whereClause = 'WHERE 1=1';
  const params = [];

  if (startDate) {
    whereClause += ' AND DATE(c.created_at) >= DATE(?)';
    params.push(startDate);
  }

  if (endDate) {
    whereClause += ' AND DATE(c.created_at) <= DATE(?)';
    params.push(endDate);
  }

  if (category_id) {
    whereClause += ' AND c.category_id = ?';
    params.push(category_id);
  }

  if (department_id) {
    whereClause += ' AND c.department_id = ?';
    params.push(department_id);
  }

  if (priority) {
    whereClause += ' AND c.priority = ?';
    params.push(priority);
  }

  if (status) {
    whereClause += ' AND c.status = ?';
    params.push(status);
  }

  const complaints = db.all(`
    SELECT c.id, c.complaint_number, c.title, c.priority, c.status, c.created_at, c.resolved_at,
           cat.name as category_name, d.name as department_name,
           u.name as user_name, staff.name as staff_name
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users staff ON staff.id = c.assigned_staff_id
    ${whereClause}
    ORDER BY c.created_at DESC
  `, params);

  const summary = {
    total: complaints.length,
    resolved: complaints.filter(c => ['RESOLVED', 'CLOSED'].includes(c.status)).length,
    pending: complaints.filter(c => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)).length,
    critical: complaints.filter(c => c.priority === 'CRITICAL').length
  };

  res.json({ summary, complaints });
});

module.exports = router;
