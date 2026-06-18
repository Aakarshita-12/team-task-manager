const express = require('express');
const router = express.Router();
const pool = require('../database');
const auth = require('../middleware/auth');

router.get('/stats', auth, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'admin') {
      tasks = (await pool.query('SELECT * FROM tasks')).rows;
    } else {
      tasks = (await pool.query('SELECT * FROM tasks WHERE assigned_to = $1', [req.user.id])).rows;
    }
    const stats = {
      total: tasks.length,
      todo: tasks.filter(t => t.status === 'todo').length,
      inProgress: tasks.filter(t => t.status === 'in-progress').length,
      done: tasks.filter(t => t.status === 'done').length,
      overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
    };
    res.json(stats);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', auth, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'admin') {
      tasks = (await pool.query('SELECT * FROM tasks')).rows;
    } else {
      tasks = (await pool.query('SELECT * FROM tasks WHERE assigned_to = $1', [req.user.id])).rows;
    }
    const projects = (await pool.query('SELECT * FROM projects')).rows;
    const users = (await pool.query('SELECT * FROM users')).rows;
    tasks = tasks.map(t => ({
      ...t,
      project_name: (projects.find(p => p.id === t.project_id) || {}).name || '-',
      assigned_name: (users.find(u => u.id === t.assigned_to) || {}).name || '-'
    }));
    res.json(tasks);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create tasks' });
  }
  const { title, description, priority, due_date, project_id, assigned_to } = req.body;
  if (!title || !project_id) {
    return res.status(400).json({ message: 'Title and project are required' });
  }
  try {
    const result = await pool.query(
      `INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'todo') RETURNING id`,
      [title, description, priority, due_date || null, project_id, assigned_to || null, req.user.id]
    );
    res.json({ message: 'Task created', id: result.rows[0].id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in-progress', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  try {
    const result = await pool.query('SELECT * FROM tasks WHERE id = $1', [req.params.id]);
    const task = result.rows[0];
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    await pool.query('UPDATE tasks SET status = $1 WHERE id = $2', [status, req.params.id]);
    res.json({ message: 'Status updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' });
  }
  try {
    await pool.query('DELETE FROM tasks WHERE id = $1', [req.params.id]);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
