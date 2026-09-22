const bcrypt = require('bcryptjs');
const db = require('./db');

async function seed() {
  console.log('Seeding demo database...');
  await db.initDb();

  // Clear existing records
  db.run('DELETE FROM feedback');
  db.run('DELETE FROM complaint_comments');
  db.run('DELETE FROM complaint_attachments');
  db.run('DELETE FROM complaint_status_history');
  db.run('DELETE FROM notifications');
  db.run('DELETE FROM audit_logs');
  db.run('DELETE FROM complaints');
  db.run('DELETE FROM users');
  db.run('DELETE FROM categories');
  db.run('DELETE FROM departments');

  // Reset sqlite autoincrements
  db.run("DELETE FROM sqlite_sequence WHERE name IN ('users', 'departments', 'categories', 'complaints', 'complaint_status_history', 'complaint_comments', 'complaint_attachments', 'notifications', 'feedback', 'audit_logs')");

  // 1. Insert Departments
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

  const deptMap = {};
  departmentsData.forEach(d => {
    const res = db.run('INSERT INTO departments (name, description, status) VALUES (?, ?, "ACTIVE")', [d.name, d.description]);
    deptMap[d.name] = res.lastInsertRowid;
  });

  // 2. Insert Categories
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

  const catMap = {};
  categoriesData.forEach(c => {
    const res = db.run('INSERT INTO categories (name, description, default_sla, status) VALUES (?, ?, ?, "ACTIVE")', [c.name, c.description, c.default_sla]);
    catMap[c.name] = res.lastInsertRowid;
  });

  // Passwords
  const adminPassHash = await bcrypt.hash('admin123', 10);
  const staffPassHash = await bcrypt.hash('staff123', 10);
  const userPassHash = await bcrypt.hash('user123', 10);

  // 3. Insert Users
  // Admin
  const adminRes = db.run(
    'INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, ?, "ACTIVE")',
    ['System Administrator', 'admin@example.com', '+1-555-0100', adminPassHash, 'ADMIN']
  );
  const adminId = adminRes.lastInsertRowid;

  // Staff members
  const staffMembers = [
    { name: 'Demo Staff (IT)', email: 'staff@example.com', phone: '+1-555-0101', dept: 'IT Support' },
    { name: 'Robert Vance (Elec)', email: 'staff.elec@example.com', phone: '+1-555-0102', dept: 'Electrical' },
    { name: 'Carlos Mendez (Maint)', email: 'staff.maint@example.com', phone: '+1-555-0103', dept: 'Maintenance' },
    { name: 'Officer Frank (Sec)', email: 'staff.sec@example.com', phone: '+1-555-0104', dept: 'Security' },
    { name: 'Elena Rostova (Housekeeping)', email: 'staff.house@example.com', phone: '+1-555-0105', dept: 'Housekeeping' },
  ];

  const staffMap = {};
  staffMembers.forEach(s => {
    const res = db.run(
      'INSERT INTO users (name, email, phone, password_hash, role, department_id, status) VALUES (?, ?, ?, ?, "STAFF", ?, "ACTIVE")',
      [s.name, s.email, s.phone, staffPassHash, deptMap[s.dept]]
    );
    staffMap[s.email] = res.lastInsertRowid;
  });

  // Regular Users
  const regularUsers = [
    { name: 'Demo User', email: 'user@example.com', phone: '+1-555-0200' },
    { name: 'John Doe', email: 'john.doe@example.com', phone: '+1-555-0201' },
    { name: 'Sarah Smith', email: 'sarah.smith@example.com', phone: '+1-555-0202' },
    { name: 'Alex Jones', email: 'alex.jones@example.com', phone: '+1-555-0203' },
    { name: 'Priya Sharma', email: 'priya.sharma@example.com', phone: '+1-555-0204' },
    { name: 'Michael Brown', email: 'michael.brown@example.com', phone: '+1-555-0205' },
    { name: 'Emily Davis', email: 'emily.davis@example.com', phone: '+1-555-0206' },
    { name: 'David Wilson', email: 'david.wilson@example.com', phone: '+1-555-0207' },
    { name: 'Lisa Taylor', email: 'lisa.taylor@example.com', phone: '+1-555-0208' },
    { name: 'Robert Miller', email: 'robert.miller@example.com', phone: '+1-555-0209' },
  ];

  const userMap = {};
  regularUsers.forEach(u => {
    const res = db.run(
      'INSERT INTO users (name, email, phone, password_hash, role, status) VALUES (?, ?, ?, ?, "USER", "ACTIVE")',
      [u.name, u.email, u.phone, userPassHash]
    );
    userMap[u.email] = res.lastInsertRowid;
  });

  // 4. Insert Complaints (30+ Realistic Records)

  // SAMPLE COMPLAINT CMP-2026-000001
  const cmp1Res = db.run(`
    INSERT INTO complaints (
      complaint_number, user_id, title, description, category_id, priority, status, location, department_id, assigned_staff_id, sla_deadline, contact_method, created_at, updated_at
    ) VALUES (
      'CMP-2026-000001', ?, 'Internet connection unavailable',
      'Internet connectivity is unavailable in the second-floor computer lab. Students are unable to complete their lab evaluations.',
      ?, 'HIGH', 'IN_PROGRESS', 'Second-Floor Computer Lab (Room 204)', ?, ?,
      DATETIME('now', '+12 hours'), 'IN_APP', DATETIME('now', '-2 hours'), DATETIME('now', '-1 hour')
    )
  `, [userMap['user@example.com'], catMap['Internet / Network'], deptMap['IT Support'], staffMap['staff@example.com']]);

  const cmp1Id = cmp1Res.lastInsertRowid;

  // Add timeline for CMP-2026-000001
  db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, NULL, 'NEW', ?, 'Complaint registered by Demo User', DATETIME('now', '-2 hours'))`, [cmp1Id, userMap['user@example.com']]);
  db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, 'NEW', 'ACKNOWLEDGED', ?, 'Acknowledged by Helpdesk', DATETIME('now', '-105 minutes'))`, [cmp1Id, adminId]);
  db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, 'ACKNOWLEDGED', 'ASSIGNED', ?, 'Assigned to IT Support team', DATETIME('now', '-90 minutes'))`, [cmp1Id, adminId]);
  db.run(`INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at) VALUES (?, 'ASSIGNED', 'IN_PROGRESS', ?, 'Replacing core network switch in Rack B', DATETIME('now', '-60 minutes'))`, [cmp1Id, staffMap['staff@example.com']]);

  // Add comments for CMP-2026-000001
  db.run(`INSERT INTO complaint_comments (complaint_id, user_id, message, created_at) VALUES (?, ?, 'The whole batch of 40 PCs lost connection at 10:00 AM.', DATETIME('now', '-100 minutes'))`, [cmp1Id, userMap['user@example.com']]);
  db.run(`INSERT INTO complaint_comments (complaint_id, user_id, message, created_at) VALUES (?, ?, 'We have identified a failed network switch port. Technicians are installing a replacement gigabit switch.', DATETIME('now', '-50 minutes'))`, [cmp1Id, staffMap['staff@example.com']]);

  // Generate 29 more complaints
  const mockComplaints = [
    {
      title: 'Water leakage in 3rd floor washroom',
      desc: 'Major tap leakage flooding the corridor outside Room 302.',
      cat: 'Plumbing', prio: 'CRITICAL', status: 'ESCALATED', loc: 'Block B, 3rd Floor Washroom',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'john.doe@example.com',
      slaHours: -5 // Overdue!
    },
    {
      title: 'Electrical spark in main junction box',
      desc: 'Observed sparks and burning smell near hostel power distribution panel.',
      cat: 'Electrical', prio: 'CRITICAL', status: 'IN_PROGRESS', loc: 'Boys Hostel 1 Basement',
      dept: 'Electrical', staff: 'staff.elec@example.com', user: 'alex.jones@example.com',
      slaHours: 3
    },
    {
      title: 'Broken chair and desk in Lecture Hall 101',
      desc: 'Three student desks have loose legs and sharp metal edges causing safety risk.',
      cat: 'Infrastructure', prio: 'LOW', status: 'RESOLVED', loc: 'Lecture Hall 101',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'sarah.smith@example.com',
      slaHours: 40
    },
    {
      title: 'CCTV camera offline near North Gate',
      desc: 'Camera #14 feed is blacked out on the security monitoring dashboard.',
      cat: 'Security & Safety', prio: 'HIGH', status: 'ASSIGNED', loc: 'Campus North Entrance',
      dept: 'Security', staff: 'staff.sec@example.com', user: 'priya.sharma@example.com',
      slaHours: 8
    },
    {
      title: 'Garbage bins overflowing near Canteen area',
      desc: 'Food waste is piling up and causing unhygienic odor near the main dining hall.',
      cat: 'Cleaning & Sanitation', prio: 'MEDIUM', status: 'CLOSED', loc: 'Central Canteen Patio',
      dept: 'Housekeeping', staff: 'staff.house@example.com', user: 'michael.brown@example.com',
      slaHours: 18
    },
    {
      title: 'Projector HDMI port damaged',
      desc: 'Audio-visual projector in Auditorium B has a broken connector pin.',
      cat: 'Academic & Administration', prio: 'MEDIUM', status: 'NEW', loc: 'Auditorium B',
      dept: 'IT Support', staff: null, user: 'emily.davis@example.com',
      slaHours: 20
    },
    {
      title: 'Air conditioning not cooling in Server Room',
      desc: 'Temperature in main data rack room reached 32°C. Urgent cooling needed.',
      cat: 'Electrical', prio: 'CRITICAL', status: 'IN_PROGRESS', loc: 'Main Admin Building Room 108',
      dept: 'Electrical', staff: 'staff.elec@example.com', user: 'david.wilson@example.com',
      slaHours: 2
    },
    {
      title: 'Hostel hot water geyser trip',
      desc: 'Geyser on 2nd floor east wing trips the breaker every morning.',
      cat: 'Hostel / Accommodation', prio: 'HIGH', status: 'REOPENED', loc: 'Girls Hostel Wing A',
      dept: 'Electrical', staff: 'staff.elec@example.com', user: 'lisa.taylor@example.com',
      slaHours: 6
    },
    {
      title: 'Campus shuttle bus schedule delay',
      desc: 'Morning 8:15 AM bus route consistently arrives 30 minutes late.',
      cat: 'Transportation', prio: 'LOW', status: 'ACKNOWLEDGED', loc: 'Bus Stop #3',
      dept: 'Transport', staff: null, user: 'robert.miller@example.com',
      slaHours: 35
    },
    {
      title: 'Wi-Fi access point down in Library Quiet Zone',
      desc: 'SSID Campus_Fast not broadcasting in 3rd floor reading hall.',
      cat: 'Internet / Network', prio: 'MEDIUM', status: 'RESOLVED', loc: 'Central Library 3rd Floor',
      dept: 'IT Support', staff: 'staff@example.com', user: 'user@example.com',
      slaHours: 10
    },
    {
      title: 'Broken window pane after windstorm',
      desc: 'Glass shattered on classroom window 205 creating dangerous shards.',
      cat: 'Infrastructure', prio: 'HIGH', status: 'CLOSED', loc: 'Academic Block C Room 205',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'john.doe@example.com',
      slaHours: 24
    },
    {
      title: 'Stray dog spotted inside library ground floor',
      desc: 'Security requested to safely remove stray dog from entrance lounge.',
      cat: 'Security & Safety', prio: 'MEDIUM', status: 'RESOLVED', loc: 'Library Lounge',
      dept: 'Security', staff: 'staff.sec@example.com', user: 'sarah.smith@example.com',
      slaHours: 5
    },
    {
      title: 'Restroom door latch broken',
      desc: 'Lock mechanism on cubicle #2 is jammed.',
      cat: 'Plumbing', prio: 'LOW', status: 'NEW', loc: 'Staff Building 1st Floor',
      dept: 'Maintenance', staff: null, user: 'alex.jones@example.com',
      slaHours: 44
    },
    {
      title: 'Slow internet during peak evening hours',
      desc: 'Bandwidth drops below 1 Mbps between 7 PM and 10 PM in dorms.',
      cat: 'Internet / Network', prio: 'LOW', status: 'ON_HOLD', loc: 'Student Residences',
      dept: 'IT Support', staff: 'staff@example.com', user: 'priya.sharma@example.com',
      slaHours: 50
    },
    {
      title: 'Insect infestation in canteen kitchen pantry',
      desc: 'Spotted roaches near dry storage area. Requires immediate pest control.',
      cat: 'Canteen / Food', prio: 'HIGH', status: 'ESCALATED', loc: 'Main Mess Kitchen',
      dept: 'Housekeeping', staff: 'staff.house@example.com', user: 'michael.brown@example.com',
      slaHours: -2 // Overdue!
    },
    {
      title: 'Laboratory chemical sink clogged',
      desc: 'Acid-resistant drain sink in Chemistry Lab 3 is completely backed up.',
      cat: 'Plumbing', prio: 'HIGH', status: 'IN_PROGRESS', loc: 'Science Block Room 301',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'emily.davis@example.com',
      slaHours: 8
    },
    {
      title: 'Elevator #2 doors sticking halfway',
      desc: 'Elevator in Admin building makes scraping sound and hesitates when closing.',
      cat: 'Infrastructure', prio: 'CRITICAL', status: 'IN_PROGRESS', loc: 'Main Administration Building',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'david.wilson@example.com',
      slaHours: 1
    },
    {
      title: 'Unclaimed bicycle blocking fire exit staircase',
      desc: 'Bicycle locked to fire exit railing on 2nd floor stairway.',
      cat: 'Security & Safety', prio: 'MEDIUM', status: 'CLOSED', loc: 'Hostel 2 Fire Exit B',
      dept: 'Security', staff: 'staff.sec@example.com', user: 'lisa.taylor@example.com',
      slaHours: 14
    },
    {
      title: 'Student ID card reader error at Library Turnstile',
      desc: 'RFID scanner fails to recognize valid student credentials at gate 2.',
      cat: 'Academic & Administration', prio: 'LOW', status: 'RESOLVED', loc: 'Library Main Entry',
      dept: 'IT Support', staff: 'staff@example.com', user: 'robert.miller@example.com',
      slaHours: 30
    },
    {
      title: 'Leaking ceiling tile after heavy rain',
      desc: 'Water dripping onto hallway carpet near Faculty Office 12.',
      cat: 'Infrastructure', prio: 'MEDIUM', status: 'ACKNOWLEDGED', loc: 'Faculty Corridor Block A',
      dept: 'Maintenance', staff: null, user: 'user@example.com',
      slaHours: 18
    },
    {
      title: 'Emergency exit lights unlit',
      desc: 'Emergency exit signs on 4th floor west wing have burnt out bulbs.',
      cat: 'Electrical', prio: 'HIGH', status: 'ASSIGNED', loc: 'Block C 4th Floor Corridor',
      dept: 'Electrical', staff: 'staff.elec@example.com', user: 'john.doe@example.com',
      slaHours: 10
    },
    {
      title: 'No water supply in Hostel Block 4',
      desc: 'Overhead tank valve appears shut off. Entire building without running water.',
      cat: 'Plumbing', prio: 'CRITICAL', status: 'IN_PROGRESS', loc: 'Hostel Block 4 All Floors',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'sarah.smith@example.com',
      slaHours: 2
    },
    {
      title: 'Loud noise from HVAC compressor unit',
      desc: 'Rattling metal vibration noise coming from roof HVAC unit above Room 402.',
      cat: 'Infrastructure', prio: 'LOW', status: 'NEW', loc: 'Roof Top Block A',
      dept: 'Maintenance', staff: null, user: 'alex.jones@example.com',
      slaHours: 60
    },
    {
      title: 'Printer paper jam and toner smudge in Copy Center',
      desc: 'Self-service laser printer #3 leaves dark streaks across all printed pages.',
      cat: 'Academic & Administration', prio: 'LOW', status: 'RESOLVED', loc: 'Student Activity Center',
      dept: 'IT Support', staff: 'staff@example.com', user: 'priya.sharma@example.com',
      slaHours: 22
    },
    {
      title: 'Expired fire extinguisher in Chem Storage',
      desc: 'Inspection tag on CO2 extinguisher shows expiration date from 6 months ago.',
      cat: 'Security & Safety', prio: 'HIGH', status: 'RESOLVED', loc: 'Chem Storage Room 102',
      dept: 'Security', staff: 'staff.sec@example.com', user: 'michael.brown@example.com',
      slaHours: 6
    },
    {
      title: 'Spilled liquid in East Elevator lobby',
      desc: 'Sticky drink spill needs mop cleaning before slip hazard occurs.',
      cat: 'Cleaning & Sanitation', prio: 'LOW', status: 'CLOSED', loc: 'East Tower Lobby',
      dept: 'Housekeeping', staff: 'staff.house@example.com', user: 'emily.davis@example.com',
      slaHours: 12
    },
    {
      title: 'Broken key switch on digital podium',
      desc: 'Teacher cannot power on the Smart Board in Seminar Room 3.',
      cat: 'Academic & Administration', prio: 'MEDIUM', status: 'IN_PROGRESS', loc: 'Seminar Room 3',
      dept: 'IT Support', staff: 'staff@example.com', user: 'david.wilson@example.com',
      slaHours: 15
    },
    {
      title: 'Faulty street lamp near parking lot path',
      desc: 'Dark pathway between Car Park B and main gate raises safety concern at night.',
      cat: 'Electrical', prio: 'MEDIUM', status: 'RESOLVED', loc: 'Pathway Park B',
      dept: 'Electrical', staff: 'staff.elec@example.com', user: 'lisa.taylor@example.com',
      slaHours: 16
    },
    {
      title: 'Broken bathroom mirror frame',
      desc: 'Glass mirror frame detached from wall, hanging precariously.',
      cat: 'Infrastructure', prio: 'MEDIUM', status: 'CLOSED', loc: 'Ground Floor Restroom',
      dept: 'Maintenance', staff: 'staff.maint@example.com', user: 'robert.miller@example.com',
      slaHours: 20
    }
  ];

  let counter = 2;
  mockComplaints.forEach(mc => {
    const year = new Date().getFullYear();
    const complaint_number = `CMP-${year}-${String(counter).padStart(6, '0')}`;
    counter++;

    const categoryId = catMap[mc.cat] || catMap['Infrastructure'];
    const deptId = deptMap[mc.dept] || deptMap['Maintenance'];
    const staffId = mc.staff ? staffMap[mc.staff] : null;
    const userId = userMap[mc.user] || userMap['user@example.com'];

    const deadline = new Date(Date.now() + mc.slaHours * 3600 * 1000).toISOString();

    const res = db.run(`
      INSERT INTO complaints (
        complaint_number, user_id, title, description, category_id, priority, status, location, department_id, assigned_staff_id, sla_deadline, contact_method, created_at, updated_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'IN_APP', DATETIME('now', '-3 days'), DATETIME('now', '-1 day')
      )
    `, [complaint_number, userId, mc.title, mc.desc, categoryId, mc.prio, mc.status, mc.loc, deptId, staffId, deadline]);

    const cId = res.lastInsertRowid;

    // Timeline history entry
    db.run(`
      INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at)
      VALUES (?, NULL, 'NEW', ?, 'Complaint created', DATETIME('now', '-3 days'))
    `, [cId, userId]);

    if (mc.status !== 'NEW') {
      db.run(`
        INSERT INTO complaint_status_history (complaint_id, old_status, new_status, changed_by, remarks, created_at)
        VALUES (?, 'NEW', ?, ?, ?, DATETIME('now', '-1 day'))
      `, [cId, mc.status, staffId || adminId, `Status updated to ${mc.status}`]);
    }

    // Add feedback if closed or resolved
    if (['CLOSED', 'RESOLVED'].includes(mc.status)) {
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
      db.run(`
        INSERT OR REPLACE INTO feedback (complaint_id, user_id, rating, comment)
        VALUES (?, ?, ?, 'Prompt service, issue resolved properly!')
      `, [cId, userId, rating]);
    }
  });

  // 5. Seed Audit Logs
  db.run(`INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'SYSTEM_INIT', 'System', 'Database initialized and seeded with demo data')`, [adminId]);
  db.run(`INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, 'USER_LOGIN', 'Admin Portal', 'Administrator logged into system')`, [adminId]);

  // 6. Seed Notifications for Demo Accounts
  db.run(`INSERT INTO notifications (user_id, complaint_id, title, message) VALUES (?, 1, 'Welcome to Smart Complaint System', 'You can track and manage all your institutional complaints in real time.')`, [userMap['user@example.com']]);
  db.run(`INSERT INTO notifications (user_id, complaint_id, title, message) VALUES (?, 1, 'Assigned Complaint #CMP-2026-000001', 'You have been assigned to inspect Internet Connection Unavailable in Computer Lab.')`, [staffMap['staff@example.com']]);

  console.log('Seeding completed successfully!');
}

seed().catch(err => console.error('Seed error:', err));
