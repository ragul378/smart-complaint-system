const express = require('express');
const router = express.Router();
const db = require('../db');
const { authenticateToken, requireRole } = require('../middleware/auth');
const upload = require('../middleware/upload');
const gemini = require('../services/gemini');

// Helper to check and update overdue SLA complaints automatically
function updateSlaEscalations() {
  const activeComplaints = db.all(`
    SELECT c.id, c.complaint_number, c.title, c.status, c.sla_deadline, c.assigned_staff_id, c.department_id, c.user_id
    FROM complaints c
    WHERE c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED', 'ESCALATED')
      AND c.sla_deadline IS NOT NULL
      AND DATETIME(c.sla_deadline) < DATETIME('now')
  `);

  activeComplaints.forEach(cmp => {
    // Update status to ESCALATED
    db.run(
      `UPDATE complaints SET status = 'ESCALATED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      [cmp.id]
    );

    // Add status timeline entry
    db.run(
      `INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
       VALUES (?, ?, 'ESCALATED', 1, 'Automatic SLA Breach Escalation System')`,
      [cmp.id, cmp.status]
    );

    // Notify assigned staff if any
    if (cmp.assigned_staff_id) {
      db.run(
        `INSERT INTO notifications (user_id, complaint_id, title, message)
         VALUES (?, ?, 'SLA Escalation Warning', ?)`,
        [cmp.assigned_staff_id, cmp.id, `Complaint #${cmp.complaint_number} has breached its SLA deadline and is now ESCALATED.`]
      );
    }

    // Notify user
    db.run(
      `INSERT INTO notifications (user_id, complaint_id, title, message)
       VALUES (?, ?, 'Complaint Escalated', ?)`,
      [cmp.user_id, cmp.id, `Your complaint #${cmp.complaint_number} has been escalated due to SLA priority attention.`]
    );

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (1, 'AUTO_ESCALATE', ?, ?)`,
      [`Complaint #${cmp.complaint_number}`, `Overdue SLA breach automatically set status to ESCALATED`]
    );
  });
}

// Check duplicates logic
router.post('/check-duplicates', authenticateToken, (req, res) => {
  const { category_id, title = '', location = '' } = req.body;
  if (!title && !category_id) {
    return res.json({ duplicates: [] });
  }

  const keywords = title.toLowerCase().split(/\s+/).filter(w => w.length > 3);
  let query = `
    SELECT c.id, c.complaint_number, c.title, c.category_id, cat.name as category_name, c.status, c.created_at, c.location
    FROM complaints c
    JOIN categories cat ON cat.id = c.category_id
    WHERE c.status NOT IN ('CLOSED', 'RESOLVED', 'REJECTED')
  `;
  const params = [];

  if (category_id) {
    query += ` AND c.category_id = ?`;
    params.push(category_id);
  }

  const activeComplaints = db.all(query, params);
  
  const matches = activeComplaints.filter(cmp => {
    const cmpTitle = cmp.title.toLowerCase();
    const cmpLoc = (cmp.location || '').toLowerCase();
    
    const titleMatch = keywords.some(kw => cmpTitle.includes(kw));
    const locationMatch = location && cmpLoc && cmpLoc.includes(location.toLowerCase());

    return titleMatch || locationMatch;
  });

  res.json({ duplicates: matches.slice(0, 5) });
});

// Smart Priority suggestion logic (Gemini AI with heuristic fallback)
router.post('/suggest-priority', authenticateToken, async (req, res) => {
  const { title = '', description = '', category_id } = req.body;

  let categoryName = '';
  let allCategories = [];
  try {
    allCategories = db.all('SELECT id, name FROM categories WHERE status = "ACTIVE"');
    if (category_id) {
      const currentCat = allCategories.find(c => c.id === Number(category_id));
      if (currentCat) categoryName = currentCat.name;
    }
  } catch (e) {
    // ignore
  }

  // 1. Try Gemini AI Priority & Severity Classification
  if (title.length > 5 || description.length > 10) {
    try {
      const aiResult = await gemini.classifyComplaintPriority({
        title,
        description,
        categoryName,
        categories: allCategories,
      });

      if (aiResult && aiResult.suggestedPriority) {
        // Map suggestedCategoryName to category_id if provided
        let suggestedCategoryId = null;
        if (aiResult.suggestedCategoryName) {
          const matched = allCategories.find(c =>
            c.name.toLowerCase() === aiResult.suggestedCategoryName.toLowerCase()
          );
          if (matched) suggestedCategoryId = matched.id;
        }

        return res.json({
          suggestedPriority: aiResult.suggestedPriority,
          reason: aiResult.reason,
          urgencyScore: aiResult.urgencyScore,
          matchedKeywords: aiResult.matchedKeywords || [],
          suggestedCategoryId,
          aiPowered: true,
        });
      }
    } catch (err) {
      console.warn('Gemini priority classification fallback:', err.message);
    }
  }

  // 2. Heuristic fallback logic
  const combinedText = `${title} ${description}`.toLowerCase();
  const criticalKeywords = ['fire', 'explosion', 'electric shock', 'hazard', 'gas leak', 'medical', 'assault', 'security threat', 'emergency', 'collapse'];
  const highKeywords = ['water leakage', 'power outage', 'network down', 'server crash', 'canteen poison', 'broken door', 'pipe burst', 'no water', 'overflow', 'short circuit'];
  const mediumKeywords = ['slow internet', 'fan noise', 'ac cooling', 'dirty room', 'light flicker', 'projector', 'garbage'];

  let matchedKeywords = [];
  let suggestedPriority = 'LOW';
  let reason = 'Standard complaint priority.';

  for (const kw of criticalKeywords) {
    if (combinedText.includes(kw)) {
      matchedKeywords.push(kw);
      suggestedPriority = 'CRITICAL';
      reason = `Contains urgent safety/emergency keyword: "${kw}"`;
      break;
    }
  }

  if (suggestedPriority === 'LOW') {
    for (const kw of highKeywords) {
      if (combinedText.includes(kw)) {
        matchedKeywords.push(kw);
        suggestedPriority = 'HIGH';
        reason = `Contains high-impact infrastructure/service issue keyword: "${kw}"`;
        break;
      }
    }
  }

  if (suggestedPriority === 'LOW') {
    for (const kw of mediumKeywords) {
      if (combinedText.includes(kw)) {
        matchedKeywords.push(kw);
        suggestedPriority = 'MEDIUM';
        reason = `Contains standard maintenance keyword: "${kw}"`;
        break;
      }
    }
  }

  // Category based boost (Security / Electrical -> High/Critical)
  if (category_id) {
    const cat = db.get('SELECT name FROM categories WHERE id = ?', [category_id]);
    if (cat) {
      if (cat.name.toLowerCase().includes('security') || cat.name.toLowerCase().includes('electrical')) {
        if (suggestedPriority === 'LOW') {
          suggestedPriority = 'MEDIUM';
          reason = `Category '${cat.name}' defaults to at least Medium priority.`;
        }
      }
    }
  }

  res.json({ suggestedPriority, reason, matchedKeywords, aiPowered: false });
});

// AI Complaint Description Enhancer endpoint
router.post('/ai-enhance', authenticateToken, async (req, res) => {
  try {
    const { title = '', description = '', category_id } = req.body;
    let categoryName = '';
    if (category_id) {
      const cat = db.get('SELECT name FROM categories WHERE id = ?', [category_id]);
      if (cat) categoryName = cat.name;
    }

    const enhanced = await gemini.enhanceComplaintText({
      title,
      description,
      categoryName,
    });

    res.json(enhanced);
  } catch (err) {
    console.error('AI enhance error:', err);
    res.status(500).json({ error: err.message || 'Failed to enhance complaint text with AI' });
  }
});

// AI Resolution Advisor for Staff and Admins
router.post('/:id/ai-resolution-advice', authenticateToken, requireRole('STAFF', 'ADMIN'), async (req, res) => {
  try {
    const complaint = db.get(`
      SELECT c.*, cat.name as category_name
      FROM complaints c
      LEFT JOIN categories cat ON cat.id = c.category_id
      WHERE c.id = ?
    `, [req.params.id]);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const advice = await gemini.getResolutionAdvice({
      complaintNumber: complaint.complaint_number,
      title: complaint.title,
      description: complaint.description,
      category: complaint.category_name || 'General',
      priority: complaint.priority,
      location: complaint.location,
    });

    res.json({ advice });
  } catch (err) {
    console.error('AI resolution advice error:', err);
    res.status(500).json({ error: err.message || 'Failed to generate AI resolution advice' });
  }
});

// AI Q&A Assistant endpoint
router.post('/ai-assistant', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question is required' });
    }
    const result = await gemini.askComplaintAssistant(question);
    res.json(result);
  } catch (err) {
    console.error('AI assistant error:', err);
    res.status(500).json({ error: err.message || 'Failed to process AI assistant question' });
  }
});

// Public Track Complaint endpoint
router.get('/track/:complaint_number', (req, res) => {
  updateSlaEscalations();

  const complaint = db.get(`
    SELECT c.id, c.complaint_number, c.title, c.description, c.priority, c.status, c.location,
           c.created_at, c.updated_at, c.sla_deadline, c.resolved_at,
           cat.name as category_name, d.name as department_name
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN departments d ON d.id = c.department_id
    WHERE c.complaint_number = ? OR c.id = ?
  `, [req.params.complaint_number.toUpperCase(), req.params.complaint_number]);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found with this Complaint ID' });
  }

  // Get timeline history
  const history = db.all(`
    SELECT h.old_status, h.new_status, h.remarks, h.created_at, u.name as changed_by_name, u.role as changed_by_role
    FROM complaint_status_history h
    JOIN users u ON u.id = h.changed_by
    WHERE h.complaint_id = ?
    ORDER BY h.created_at ASC
  `, [complaint.id]);

  res.json({ complaint, history });
});

// List Complaints (Role-based)
router.get('/', authenticateToken, (req, res) => {
  updateSlaEscalations();

  const { search, status, priority, category_id, department_id, assigned_staff_id, sla_status } = req.query;

  let query = `
    SELECT c.*, cat.name as category_name, d.name as department_name,
           u.name as user_name, u.email as user_email,
           staff.name as assigned_staff_name
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users staff ON staff.id = c.assigned_staff_id
    WHERE 1=1
  `;
  const params = [];

  // Role Filtering
  if (req.user.role === 'USER') {
    query += ` AND c.user_id = ?`;
    params.push(req.user.id);
  } else if (req.user.role === 'STAFF') {
    // Staff sees complaints assigned to them OR assigned to their department
    if (req.user.department_id) {
      query += ` AND (c.assigned_staff_id = ? OR c.department_id = ?)`;
      params.push(req.user.id, req.user.department_id);
    } else {
      query += ` AND c.assigned_staff_id = ?`;
      params.push(req.user.id);
    }
  }

  // Filters
  if (search) {
    query += ` AND (c.complaint_number LIKE ? OR c.title LIKE ? OR c.description LIKE ? OR c.location LIKE ?)`;
    const term = `%${search}%`;
    params.push(term, term, term, term);
  }

  if (status) {
    query += ` AND c.status = ?`;
    params.push(status);
  }

  if (priority) {
    query += ` AND c.priority = ?`;
    params.push(priority);
  }

  if (category_id) {
    query += ` AND c.category_id = ?`;
    params.push(category_id);
  }

  if (department_id) {
    query += ` AND c.department_id = ?`;
    params.push(department_id);
  }

  if (assigned_staff_id) {
    query += ` AND c.assigned_staff_id = ?`;
    params.push(assigned_staff_id);
  }

  if (sla_status === 'OVERDUE') {
    query += ` AND c.status NOT IN ('RESOLVED', 'CLOSED', 'REJECTED') AND c.sla_deadline IS NOT NULL AND DATETIME(c.sla_deadline) < DATETIME('now')`;
  } else if (sla_status === 'ON_TRACK') {
    query += ` AND (c.status IN ('RESOLVED', 'CLOSED') OR c.sla_deadline IS NULL OR DATETIME(c.sla_deadline) >= DATETIME('now'))`;
  }

  query += ` ORDER BY c.created_at DESC`;

  const complaints = db.all(query, params);
  res.json({ complaints });
});

// Create Complaint
router.post('/', authenticateToken, upload.array('attachments', 5), (req, res) => {
  try {
    const { title, description, category_id, priority = 'LOW', location, contact_method = 'IN_APP', department_id } = req.body;

    if (!title || !description || !category_id) {
      return res.status(400).json({ error: 'Title, description, and category are required' });
    }

    // Generate Unique Complaint ID
    const countRow = db.get('SELECT COUNT(*) as count FROM complaints');
    const nextNum = (countRow ? countRow.count : 0) + 1;
    const year = new Date().getFullYear();
    const complaint_number = `CMP-${year}-${String(nextNum).padStart(6, '0')}`;

    // Get Category Default SLA (hours)
    const category = db.get('SELECT default_sla FROM categories WHERE id = ?', [category_id]);
    const slaHours = category ? category.default_sla : (priority === 'CRITICAL' ? 4 : priority === 'HIGH' ? 12 : priority === 'MEDIUM' ? 24 : 72);

    const deadline = new Date(Date.now() + slaHours * 3600 * 1000).toISOString();

    const result = db.run(`
      INSERT INTO complaints (
        complaint_number, user_id, title, description, category_id, priority, status, location, department_id, sla_deadline, contact_method
      ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', ?, ?, ?, ?)
    `, [complaint_number, req.user.id, title, description, category_id, priority, location || null, department_id || null, deadline, contact_method]);

    const complaintId = result.lastInsertRowid;

    // Save attachments if any
    if (req.files && req.files.length > 0) {
      req.files.forEach(file => {
        db.run(`
          INSERT INTO complaint_attachments (complaint_id, uploaded_by, file_name, file_path, file_type, file_size)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [complaintId, req.user.id, file.originalname, `/uploads/${file.filename}`, file.mimetype, file.size]);
      });
    }

    // Timeline Record
    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
      VALUES (?, NULL, 'NEW', ?, 'Complaint submitted by user')
    `, [complaintId, req.user.id]);

    // Create User Notification
    db.run(`
      INSERT INTO notifications (user_id, complaint_id, title, message)
      VALUES (?, ?, 'Complaint Registered', ?)
    `, [req.user.id, complaintId, `Your complaint #${complaint_number} has been registered successfully.`]);

    // Notify Admins
    const admins = db.all(`SELECT id FROM users WHERE role = 'ADMIN'`);
    admins.forEach(admin => {
      db.run(`
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, 'New Complaint Submitted', ?)
      `, [admin.id, complaintId, `New complaint #${complaint_number} (${priority} priority) submitted by ${req.user.name}.`]);
    });

    // Audit Log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'CREATE_COMPLAINT', ?, ?)`,
      [req.user.id, `Complaint #${complaint_number}`, `Created complaint '${title}' with priority ${priority}`]
    );

    const newComplaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);

    res.status(201).json({ message: 'Complaint created successfully', complaint: newComplaint });
  } catch (err) {
    console.error('Error creating complaint:', err);
    res.status(500).json({ error: 'Failed to create complaint' });
  }
});

// Get Complaint Details (with comments, history, attachments, feedback)
router.get('/:id', authenticateToken, (req, res) => {
  updateSlaEscalations();

  const complaint = db.get(`
    SELECT c.*, cat.name as category_name, d.name as department_name,
           u.name as user_name, u.email as user_email, u.phone as user_phone,
           staff.name as assigned_staff_name, staff.email as assigned_staff_email
    FROM complaints c
    LEFT JOIN categories cat ON cat.id = c.category_id
    LEFT JOIN departments d ON d.id = c.department_id
    LEFT JOIN users u ON u.id = c.user_id
    LEFT JOIN users staff ON staff.id = c.assigned_staff_id
    WHERE c.id = ? OR c.complaint_number = ?
  `, [req.params.id, req.params.id]);

  if (!complaint) {
    return res.status(404).json({ error: 'Complaint not found' });
  }

  // Access control check
  if (req.user.role === 'USER' && complaint.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Unauthorized to view this complaint' });
  }

  // Attachments
  const attachments = db.all(`
    SELECT a.*, u.name as uploader_name, u.role as uploader_role
    FROM complaint_attachments a
    JOIN users u ON u.id = a.uploaded_by
    WHERE a.complaint_id = ?
    ORDER BY a.created_at ASC
  `, [complaint.id]);

  // History Timeline
  const history = db.all(`
    SELECT h.*, u.name as changed_by_name, u.role as changed_by_role
    FROM complaint_status_history h
    JOIN users u ON u.id = h.changed_by
    WHERE h.complaint_id = ?
    ORDER BY h.created_at ASC
  `, [complaint.id]);

  // Comments
  const comments = db.all(`
    SELECT c.*, u.name as user_name, u.role as user_role
    FROM complaint_comments c
    JOIN users u ON u.id = c.user_id
    WHERE c.complaint_id = ?
    ORDER BY c.created_at ASC
  `, [complaint.id]);

  // Feedback
  const feedback = db.get(`
    SELECT f.*, u.name as user_name
    FROM feedback f
    JOIN users u ON u.id = f.user_id
    WHERE f.complaint_id = ?
  `, [complaint.id]);

  res.json({
    complaint,
    attachments,
    history,
    comments,
    feedback
  });
});

// Update Status (Staff & Admin)
router.patch('/:id/status', authenticateToken, (req, res) => {
  try {
    const { status, remarks } = req.body;
    const complaintId = req.params.id;

    const validStatuses = ['NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED', 'ESCALATED', 'REJECTED'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    // RBAC Permissions check
    if (req.user.role === 'USER') {
      return res.status(403).json({ error: 'Users cannot directly update complaint status' });
    }

    if (req.user.role === 'STAFF' && complaint.assigned_staff_id !== req.user.id && complaint.department_id !== req.user.department_id) {
      return res.status(403).json({ error: 'Staff can only update status for assigned complaints' });
    }

    const oldStatus = complaint.status;

    let updateSql = `UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP`;
    const params = [status];

    if (status === 'RESOLVED') {
      updateSql += `, resolved_at = CURRENT_TIMESTAMP`;
    } else if (status === 'CLOSED') {
      updateSql += `, closed_at = CURRENT_TIMESTAMP`;
    }

    updateSql += ` WHERE id = ?`;
    params.push(complaintId);

    db.run(updateSql, params);

    // Record Timeline
    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [complaintId, oldStatus, status, req.user.id, remarks || `Status updated to ${status}`]);

    // Notify User
    db.run(`
      INSERT INTO notifications (user_id, complaint_id, title, message)
      VALUES (?, ?, 'Complaint Status Updated', ?)
    `, [complaint.user_id, complaintId, `Status of #${complaint.complaint_number} changed to ${status}.`]);

    // Audit Log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'UPDATE_STATUS', ?, ?)`,
      [req.user.id, `Complaint #${complaint.complaint_number}`, `Status changed from ${oldStatus} to ${status}`]
    );

    res.json({ message: 'Status updated successfully', status });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

// Assign Department & Staff (Admin & Staff Department leads)
router.patch('/:id/assign', authenticateToken, requireRole(['ADMIN', 'STAFF']), (req, res) => {
  try {
    const { department_id, assigned_staff_id, remarks } = req.body;
    const complaintId = req.params.id;

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    const newStatus = complaint.status === 'NEW' || complaint.status === 'ACKNOWLEDGED' ? 'ASSIGNED' : complaint.status;

    db.run(`
      UPDATE complaints
      SET department_id = ?, assigned_staff_id = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [department_id || complaint.department_id, assigned_staff_id || null, newStatus, complaintId]);

    // Timeline record
    const staffUser = assigned_staff_id ? db.get('SELECT name FROM users WHERE id = ?', [assigned_staff_id]) : null;
    const deptObj = department_id ? db.get('SELECT name FROM departments WHERE id = ?', [department_id]) : null;

    const assignRemark = remarks || `Assigned to ${deptObj ? deptObj.name : 'Department'} ${staffUser ? '-> ' + staffUser.name : ''}`;

    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [complaintId, complaint.status, newStatus, req.user.id, assignRemark]);

    // Notify assigned staff
    if (assigned_staff_id) {
      db.run(`
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, 'New Complaint Assigned', ?)
      `, [assigned_staff_id, complaintId, `You have been assigned complaint #${complaint.complaint_number}.`]);
    }

    // Notify user
    db.run(`
      INSERT INTO notifications (user_id, complaint_id, title, message)
      VALUES (?, ?, 'Complaint Assigned', ?)
    `, [complaint.user_id, complaintId, `Your complaint #${complaint.complaint_number} has been assigned to staff.`]);

    // Audit Log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'ASSIGN_COMPLAINT', ?, ?)`,
      [req.user.id, `Complaint #${complaint.complaint_number}`, assignRemark]
    );

    res.json({ message: 'Complaint assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign complaint' });
  }
});

// Update Priority (Admin only)
router.patch('/:id/priority', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const { priority } = req.body;
    const complaintId = req.params.id;

    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(priority)) {
      return res.status(400).json({ error: 'Invalid priority level' });
    }

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    db.run(`UPDATE complaints SET priority = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [priority, complaintId]);

    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
      VALUES (?, ?, ?, ?, ?)
    `, [complaintId, complaint.status, complaint.status, req.user.id, `Priority changed to ${priority}`]);

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'CHANGE_PRIORITY', ?, ?)`,
      [req.user.id, `Complaint #${complaint.complaint_number}`, `Priority updated from ${complaint.priority} to ${priority}`]
    );

    res.json({ message: 'Priority updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update priority' });
  }
});

// Reopen Complaint (User or Admin)
router.post('/:id/reopen', authenticateToken, (req, res) => {
  try {
    const { remarks } = req.body;
    const complaintId = req.params.id;

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    if (req.user.role === 'USER' && complaint.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    if (!['RESOLVED', 'CLOSED'].includes(complaint.status)) {
      return res.status(400).json({ error: 'Only resolved or closed complaints can be reopened' });
    }

    db.run(`
      UPDATE complaints SET status = 'REOPENED', updated_at = CURRENT_TIMESTAMP WHERE id = ?
    `, [complaintId]);

    // Timeline record
    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
      VALUES (?, ?, 'REOPENED', ?, ?)
    `, [complaintId, complaint.status, req.user.id, remarks || 'User reopened complaint due to incomplete resolution']);

    // Notify assigned staff & admin
    if (complaint.assigned_staff_id) {
      db.run(`
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, 'Complaint Reopened', ?)
      `, [complaint.assigned_staff_id, complaintId, `User reopened complaint #${complaint.complaint_number}.`]);
    }

    const admins = db.all(`SELECT id FROM users WHERE role = 'ADMIN'`);
    admins.forEach(admin => {
      db.run(`
        INSERT INTO notifications (user_id, complaint_id, title, message)
        VALUES (?, ?, 'Complaint Reopened Alert', ?)
      `, [admin.id, complaintId, `Complaint #${complaint.complaint_number} was reopened by ${req.user.name}.`]);
    });

    // Audit log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'REOPEN_COMPLAINT', ?, ?)`,
      [req.user.id, `Complaint #${complaint.complaint_number}`, `Reopened: ${remarks || 'Issue unresolved'}`]
    );

    res.json({ message: 'Complaint reopened successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reopen complaint' });
  }
});

// Submit Feedback (User)
router.post('/:id/feedback', authenticateToken, (req, res) => {
  try {
    const { rating, comment, is_resolved } = req.body;
    const complaintId = req.params.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Rating must be between 1 and 5' });
    }

    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    if (complaint.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Only the complaint owner can provide feedback' });
    }

    // Insert or replace feedback
    db.run(`
      INSERT OR REPLACE INTO feedback (complaint_id, user_id, rating, comment)
      VALUES (?, ?, ?, ?)
    `, [complaintId, req.user.id, rating, comment || null]);

    // If user confirmed resolution -> set status to CLOSED
    if (is_resolved === true || is_resolved === 'true') {
      db.run(`UPDATE complaints SET status = 'CLOSED', closed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, [complaintId]);

      db.run(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks)
        VALUES (?, ?, 'CLOSED', ?, ?)
      `, [complaintId, complaint.status, req.user.id, 'User verified resolution and closed complaint.']);
    }

    res.json({ message: 'Feedback submitted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Upload Attachment for Complaint
router.post('/:id/attachments', authenticateToken, upload.array('attachments', 5), (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = db.get('SELECT * FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const fileRecords = [];
    req.files.forEach(file => {
      const filePath = `/uploads/${file.filename}`;
      const result = db.run(`
        INSERT INTO complaint_attachments (complaint_id, uploaded_by, file_name, file_path, file_type, file_size)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [complaintId, req.user.id, file.originalname, filePath, file.mimetype, file.size]);

      fileRecords.push({
        id: result.lastInsertRowid,
        file_name: file.originalname,
        file_path: filePath,
        file_type: file.mimetype,
        file_size: file.size
      });
    });

    res.json({ message: 'Attachments uploaded successfully', attachments: fileRecords });
  } catch (err) {
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

// Delete Complaint (Admin only)
router.delete('/:id', authenticateToken, requireRole(['ADMIN']), (req, res) => {
  try {
    const complaintId = req.params.id;
    const complaint = db.get('SELECT complaint_number FROM complaints WHERE id = ?', [complaintId]);
    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    db.run('DELETE FROM complaints WHERE id = ?', [complaintId]);

    // Audit Log
    db.run(
      `INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'DELETE_COMPLAINT', ?, ?)`,
      [req.user.id, `Complaint #${complaint.complaint_number}`, `Deleted complaint record`]
    );

    res.json({ message: 'Complaint deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete complaint' });
  }
});

module.exports = router;
