const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.sqlite');

let dbInstance = null;

function saveDb() {
  if (!dbInstance) return;
  const data = dbInstance.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

async function getDb() {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  
  if (fs.existsSync(DB_FILE)) {
    const filebuffer = fs.readFileSync(DB_FILE);
    dbInstance = new SQL.Database(filebuffer);
  } else {
    dbInstance = new SQL.Database();
    saveDb();
  }

  // Enable foreign keys
  dbInstance.run("PRAGMA foreign_keys = ON;");
  
  return dbInstance;
}

function run(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized yet");
  const stmt = dbInstance.prepare(sql);
  stmt.run(params);
  stmt.free();
  
  // Get last inserted ID
  const res = dbInstance.exec("SELECT last_insert_rowid() as id;");
  const lastInsertRowid = res[0] && res[0].values[0] ? res[0].values[0][0] : null;
  const changes = dbInstance.getRowsModified();
  
  saveDb();
  return { lastInsertRowid, changes };
}

function get(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized yet");
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}

function all(sql, params = []) {
  if (!dbInstance) throw new Error("Database not initialized yet");
  const stmt = dbInstance.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

async function initDb() {
  await getDb();

  // Create Users Table
  run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('USER', 'STAFF', 'ADMIN')),
      department_id INTEGER,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Departments Table
  run(`
    CREATE TABLE IF NOT EXISTS departments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Categories Table
  run(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      default_sla INTEGER NOT NULL DEFAULT 24, -- SLA in hours
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE')),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Create Complaints Table
  run(`
    CREATE TABLE IF NOT EXISTS complaints (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_number TEXT UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      priority TEXT NOT NULL CHECK(priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
      status TEXT NOT NULL DEFAULT 'NEW' CHECK(status IN ('NEW', 'ACKNOWLEDGED', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'RESOLVED', 'CLOSED', 'REOPENED', 'ESCALATED', 'REJECTED')),
      location TEXT,
      department_id INTEGER,
      assigned_staff_id INTEGER,
      sla_deadline DATETIME,
      contact_method TEXT DEFAULT 'IN_APP',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME,
      closed_at DATETIME,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (department_id) REFERENCES departments(id),
      FOREIGN KEY (assigned_staff_id) REFERENCES users(id)
    );
  `);

  // Create Complaint Status History Table (Timeline)
  run(`
    CREATE TABLE IF NOT EXISTS complaint_status_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      old_status TEXT,
      new_status TEXT NOT NULL,
      changed_by INTEGER NOT NULL,
      remarks TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (changed_by) REFERENCES users(id)
    );
  `);

  // Create Comments Table
  run(`
    CREATE TABLE IF NOT EXISTS complaint_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create Attachments Table
  run(`
    CREATE TABLE IF NOT EXISTS complaint_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER NOT NULL,
      uploaded_by INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );
  `);

  // Create Notifications Table
  run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      complaint_id INTEGER,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      is_read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE
    );
  `);

  // Create Feedback Table
  run(`
    CREATE TABLE IF NOT EXISTS feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      complaint_id INTEGER UNIQUE NOT NULL,
      user_id INTEGER NOT NULL,
      rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (complaint_id) REFERENCES complaints(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Create Audit Logs Table
  run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      target TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Auto-populate default categories and departments if empty
  try {
    const deptCount = get('SELECT COUNT(*) as cnt FROM departments');
    if (!deptCount || deptCount.cnt === 0) {
      console.log('Auto-populating default departments...');
      const departmentsData = [
        { name: 'IT Support', description: 'Computers, Wi-Fi, networks, software, and laboratory systems' },
        { name: 'Electrical', description: 'Power lines, generators, lights, switches, and wiring' },
        { name: 'Maintenance', description: 'Plumbing, carpentry, masonry, painting, and structural repairs' },
        { name: 'Security', description: 'Campus guards, gate management, CCTV, and safety hazards' },
        { name: 'Housekeeping', description: 'Cleaning, sanitation, waste disposal, and hygiene' },
        { name: 'Transport', description: 'Buses, parking, vehicles, and shuttle services' },
        { name: 'Hostel', description: 'Dormitory amenities, room furniture, and hostel facilities' },
        { name: 'Administration', description: 'Academic records, billing, documentation, and office services' },
      ];
      departmentsData.forEach(d => {
        run('INSERT INTO departments (name, description, status) VALUES (?, ?, "ACTIVE")', [d.name, d.description]);
      });
    }

    const catCount = get('SELECT COUNT(*) as cnt FROM categories');
    if (!catCount || catCount.cnt === 0) {
      console.log('Auto-populating default categories...');
      const categoriesData = [
        { name: 'Internet / Network', description: 'Wi-Fi connectivity, LAN ports, and router outages', default_sla: 12 },
        { name: 'Electrical', description: 'Short circuits, power trips, broken lights, and socket issues', default_sla: 12 },
        { name: 'Plumbing', description: 'Water leaks, clogged drains, tap repairs, and tank overflow', default_sla: 24 },
        { name: 'Infrastructure', description: 'Cracked walls, broken furniture, doors, windows, and ceiling', default_sla: 48 },
        { name: 'Cleaning & Sanitation', description: 'Unclean washrooms, garbage accumulation, and pest control', default_sla: 24 },
        { name: 'Security & Safety', description: 'Unauthorized entry, missing equipment, broken gates, hazards', default_sla: 4 },
        { name: 'Canteen / Food', description: 'Food quality, hygiene in mess, drinking water dispensers', default_sla: 12 },
        { name: 'Transportation', description: 'Bus delays, parking space blockage, shuttle service issues', default_sla: 24 },
        { name: 'Hostel / Accommodation', description: 'Bed allotment, hot water availability, quiet hours compliance', default_sla: 24 },
        { name: 'Academic & Administration', description: 'Classroom projectors, fee receipts, certificate issuance', default_sla: 48 },
      ];
      categoriesData.forEach(c => {
        run('INSERT INTO categories (name, description, default_sla, status) VALUES (?, ?, ?, "ACTIVE")', [c.name, c.description, c.default_sla]);
      });
    }

    const userCount = get('SELECT COUNT(*) as cnt FROM users');
    if (!userCount || userCount.cnt === 0) {
      console.log('Auto-populating default demo users...');
      const bcrypt = require('bcryptjs');
      const adminPassHash = bcrypt.hashSync('admin123', 10);
      const staffPassHash = bcrypt.hashSync('staff123', 10);
      const userPassHash = bcrypt.hashSync('user123', 10);

      run(
        'INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, "ACTIVE")',
        ['System Administrator', 'admin@example.com', '+1-555-0100', adminPassHash, 'ADMIN']
      );
      run(
        'INSERT INTO users (name, email, phone, password_hash, role, department_id, status) VALUES (?, ?, ?, ?, "STAFF", 1, "ACTIVE")',
        ['IT Support Staff', 'staff@example.com', '+1-555-0101', staffPassHash]
      );
      run(
        'INSERT INTO users (name, email, phone, password_hash, role, department_id, status) VALUES (?, ?, ?, ?, "STAFF", 2, "ACTIVE")',
        ['Electrical Staff', 'staff.elec@example.com', '+1-555-0102', staffPassHash]
      );
      run(
        'INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, "USER", "ACTIVE")',
        ['Demo User', 'user@example.com', '+1-555-0200', userPassHash]
      );
    }
  } catch (seedErr) {
    console.warn('Auto-seed warning:', seedErr.message);
  }

  saveDb();
  console.log('Database initialized successfully.');
}

module.exports = {
  getDb,
  run,
  get,
  all,
  initDb,
  saveDb
};
