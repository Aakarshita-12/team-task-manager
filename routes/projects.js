const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all projects
router.get('/', auth, (req, res) => {
  if (req.user.role === 'admin') {
    db.all('SELECT * FROM projects', [], (err, projects) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(projects);
    });
  } else {
    db.all(`
      SELECT projects.* FROM projects
      JOIN project_members ON projects.id = project_members.project_id
      WHERE project_members.user_id = ?
    `, [req.user.id], (err, projects) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(projects);
    });
  }
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

  db.run(
    'INSERT INTO projects (name, description, created_by) VALUES (?, ?, ?)',
    [name, description, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Project created', id: this.lastID });
    }
  );
});

// Add member to project (admin only)
router.post('/:id/members', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add members' });
  }

  const { user_id } = req.body;
  db.run(
    'INSERT INTO project_members (project_id, user_id) VALUES (?, ?)',
    [req.params.id, user_id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Member added' });
    }
  );
});

// Get all users (admin only)
router.get('/users', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  db.all('SELECT id, name, email, role FROM users', [], (err, users) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json(users);
  });
});

module.exports = router;