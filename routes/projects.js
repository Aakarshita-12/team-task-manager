const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middleware/auth');

router.get('/', auth, async (req, res) => {
  try {
    let result;
    if (req.user.role === 'admin') {
      result = await pool.query('SELECT * FROM projects');
    } else {
      result = await pool.query(
        `SELECT p.* FROM projects p
         JOIN project_members pm ON pm.project_id = p.id
         WHERE pm.user_id = $1`,
        [req.user.id]
      );
    }
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create projects' });
  }
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ message: 'Project name is required' });
  }
  try {
    const result = await pool.query(
      'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING id',
      [name, description, req.user.id]
    );
    res.json({ message: 'Project created', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/:id/members', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can add members' });
  }
  const { user_id } = req.body;
  try {
    await pool.query(
      'INSERT INTO project_members (project_id, user_id) VALUES ($1, $2)',
      [req.params.id, user_id]
    );
    res.json({ message: 'Member added' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/users', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can view users' });
  }
  try {
    const result = await pool.query('SELECT id, name, email, role FROM users');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
