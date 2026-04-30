const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

// Get all tasks
router.get('/', auth, async (req, res) => {
  try {
    let tasks;
    if (req.user.role === 'admin') {
      tasks = await db.query(`
        SELECT tasks.*, users.name as assigned_name, projects.name as project_name
        FROM tasks
        LEFT JOIN users ON tasks.assigned_to = users.id
        LEFT JOIN projects ON tasks.project_id = projects.id
      `);
    } else {
      tasks = await db.query(`
        SELECT tasks.*, users.name as assigned_name, projects.name as project_name
        FROM tasks
        LEFT JOIN users ON tasks.assigned_to = users.id
        LEFT JOIN projects ON tasks.project_id = projects.id
        WHERE tasks.assigned_to = ${req.user.id}
      `);
    }
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Create task (admin only)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create tasks' });
  }

  const { title, description, priority, due_date, project_id, assigned_to } = req.body;

  if (!title || !project_id) {
    return res.status(400).json({ message: 'Title and project are required' });
  }

  try {
    await db.query(`
      INSERT INTO tasks (title, description, priority, due_date, project_id, assigned_to, created_by)
      VALUES (${title}, ${description}, ${priority}, ${due_date}, ${project_id}, ${assigned_to}, ${req.user.id})
    `);
    res.json({ message: 'Task created' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update task status
router.put('/:id/status', auth, async (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in-progress', 'done'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    const tasks = await db.query(`SELECT * FROM tasks WHERE id = ${req.params.id}`);
    const task = tasks[0];

    if (!task) return res.status(404).json({ message: 'Task not found' });

    if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    await db.query(`UPDATE tasks SET status = ${status} WHERE id = ${req.params.id}`);
    res.json({ message: 'Status updated' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete task (admin only)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' });
  }

  try {
    await db.query(`DELETE FROM tasks WHERE id = ${req.params.id}`);
    res.json({ message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get dashboard stats
router.get('/stats', auth, async (req, res) => {
  try {
    let rows;
    if (req.user.role === 'admin') {
      rows = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
        FROM tasks
      `);
    } else {
      rows = await db.query(`
        SELECT
          COUNT(*) as total,
          SUM(CASE WHEN status = 'todo' THEN 1 ELSE 0 END) as todo,
          SUM(CASE WHEN status = 'in-progress' THEN 1 ELSE 0 END) as inProgress,
          SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
          SUM(CASE WHEN due_date < date('now') AND status != 'done' THEN 1 ELSE 0 END) as overdue
        FROM tasks WHERE assigned_to = ${req.user.id}
      `);
    }
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;