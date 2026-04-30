const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all projects
router.get('/', auth, async (req, res) => {
  try {
    let projects;
    if (req.user.role === 'admin') {
      projects = await db.query(`SELECT * FROM projects`);
    } else {
      projects = await db.query(`
        SELECT projects.* FROM projects
        JOIN project_members ON projects.id = project_members.project_id
        WHERE project_members.user_id = ${req.user.id}
      `);
    }
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create project (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create projects' });
  }

  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }

  try {
    await db.query(`
      INSERT INTO projects (name, description, created_by) 
      VALUES (${name}, ${description}, ${req.user.id})
    `);
    res.json({ message: 'Project created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to project (admin only)
router.post('/:id/members', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add members' });
  }

  const { user_id } = req.body;
  try {
    await db.query(`
      INSERT INTO project_members (project_id, user_id) 
      VALUES (${req.params.id}, ${user_id})
    `);
    res.json({ message: 'Member added' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all users (admin only)
router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  try {
    const users = await db.query(`SELECT id, name, email, role FROM users`);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;