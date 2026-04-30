const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all tasks
router.get('/', auth, (req, res) => {
  if (req.user.role === 'admin') {
    db.all(`
      SELECT tasks.*, users.name as assigned_name, projects.name as project_name
      FROM tasks
      LEFT JOIN users ON tasks.assigned_to = users.id
      LEFT JOIN projects ON tasks.project_id = projects.id
    `, [], (err, tasks) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(tasks);
    });
  } else {
    db.all(`
      SELECT tasks.*, users.name as assigned_name, projects.name as project_name
      FROM tasks
      LEFT JOIN users ON tasks.assigned_to = users.id
      LEFT JOIN projects ON tasks.project_id = projects.id
      WHERE tasks.assigned_to = ?
    `, [req.user.id], (err, tasks) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(tasks);
    });
  }
});

// Create task (admin only)
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create tasks' });
  }

  const { title, description, priority, due_date, project_id, assigned_to } = req.body;

  if (!title || !project_id) {
    return res.status(400).json({ message: 'Title and project are required' });
  }

  db.run(`
    INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [title, description, priority, due_date, project_id, assigned_to, req.user.id],
    function (err) {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Task created', id: this.lastID });
    }
  );
});

// Update task status
router.put('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in-progress', 'done'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  db.get('SELECT * FROM tasks WHERE id = ?', [req.params.id], (err, task) => {
    if (err || !task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, req.params.id], (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Status updated' });
    });
  });
});

// Delete task (admin only)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' });
  }

  db.run('DELETE FROM tasks WHERE id = ?', [req.params.id], (err) => {
    if (err) return res.status(500).json({ message: 'Server error' });
    res.json({ message: 'Task deleted' });
  });
});

// Get dashboard stats
router.get('/stats', auth, (req, res) => {
  if (req.user.role === 'admin') {
    db.all(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM tasks
    `, [], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows[0]);
    });
  } else {
    db.all(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
        SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
      FROM tasks WHERE assigned_to = ?
    `, [req.user.id], (err, rows) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json(rows[0]);
    });
  }
});

module.exports = router;