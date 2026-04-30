const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all tasks
router.get('/', auth, (req, res) => {
  let tasks;
  if (req.user.role === 'admin') {
    tasks = db.prepare(`
      SELECT tasks.*, users.name as assigned_name, projects.name as project_name
      FROM tasks
      LEFT JOIN users ON tasks.assigned_to = users.id
      LEFT JOIN projects ON tasks.project_id = projects.id
    `).all();
  } else {
    tasks = db.prepare(`
      SELECT tasks.*, users.name as assigned_name, projects.name as project_name
      FROM tasks
      LEFT JOIN users ON tasks.assigned_to = users.id
      LEFT JOIN projects ON tasks.project_id = projects.id
      WHERE tasks.assigned_to = ?
    `).all(req.user.id);
  }
  res.json(tasks);
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

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(title, description, priority, due_date, project_id, assigned_to, req.user.id);
  res.json({ message: 'Task created', id: result.lastInsertRowid });
});

// Update task status
router.put('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in-progress', 'done'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }

  db.prepare('UPDATE tasks SET status = ? WHERE id = ?').run(status, req.params.id);
  res.json({ message: 'Status updated' });
});

// Delete task (admin only)
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' });
  }

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
  res.json({ message: 'Task deleted' });
});

// Get dashboard stats
router.get('/stats', auth, (req, res) => {
  let stats;
  if (req.user.role === 'admin') {
    stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM tasks').get().count,
      todo: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo'").get().count,
      inProgress: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in-progress'").get().count,
      done: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'done'").get().count,
      overdue: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE due_date < date('now') AND status != 'done'").get().count,
    };
  } else {
    stats = {
      total: db.prepare('SELECT COUNT(*) as count FROM tasks WHERE assigned_to = ?').get(req.user.id).count,
      todo: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'todo' AND assigned_to = ?").get(req.user.id).count,
      inProgress: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'in-progress' AND assigned_to = ?").get(req.user.id).count,
      done: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'done' AND assigned_to = ?").get(req.user.id).count,
      overdue: db.prepare("SELECT COUNT(*) as count FROM tasks WHERE due_date < date('now') AND status != 'done' AND assigned_to = ?").get(req.user.id).count,
    };
  }
  res.json(stats);
});

module.exports = router;