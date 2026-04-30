const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all projects
router.get('/', auth, (req, res) => {
  let projects;
  if (req.user.role === 'admin') {
    projects = db.get('projects').value();
  } else {
    const memberOf = db.get('project_members')
      .filter({ user_id: req.user.id })
      .map('project_id')
      .value();
    projects = db.get('projects')
      .filter(p => memberOf.includes(p.id))
      .value();
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

  const project = {
    id: Date.now(),
    name,
    description,
    created_by: req.user.id,
    created_at: new Date().toISOString()
  };

  db.get('projects').push(project).write();
  res.json({ message: 'Project created', id: project.id });
});

// Add member to project (admin only)
router.post('/:id/members', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add members' });
  }

  const { user_id } = req.body;
  db.get('project_members').push({
    id: Date.now(),
    project_id: parseInt(req.params.id),
    user_id
  }).write();

  res.json({ message: 'Member added' });
});

// Get all users (admin only)
router.get('/users', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  const users = db.get('users').map(u => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role
  })).value();
  res.json(users);
});

module.exports = router;