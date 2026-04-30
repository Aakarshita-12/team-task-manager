const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all projects
router.get('/', auth, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.prepare('SELECT * FROM projects').all();
  } else {
    projects = db.prepare(`
      SELECT projects.* FROM projects
      JOIN project_members ON projects.id = project_members.project_id
      WHERE project_members.user_id = ?
    `).all(req.user.id);
  }
  res.json(projects);
});

// Create project (admin only)
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create projects' });
  }

  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  const stmt = db.prepare(
    'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)'
  );
  const result = stmt.run(name, description, req.user.id);
  res.json({ message: 'Project created', id: result.lastInsertRowid });
});

// Add member to project (admin only)
router.post('/:id/members', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add members' });
  }

  const { user_id } = req.body;
  const stmt = db.prepare(
    'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)'
  );
  stmt.run(req.params.id, user_id);
  res.json({ message: 'Member added' });
});

// Get all users (admin only)
router.get('/users', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  const users = db.prepare('SELECT id, name, email, role FROM users').all();
  res.json(users);
});

module.exports = router;