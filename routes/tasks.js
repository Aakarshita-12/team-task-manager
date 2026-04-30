const express = require('express');
const router = express.Router();
const db = require('../database');
const auth = require('../middleware/auth');

router.get('/stats', auth, (req, res) => {
  let tasks;
  if (req.user.role === 'admin') {
    tasks = db.get('tasks').value();
  } else {
    tasks = db.get('tasks').filter({ assigned_to: req.user.id }).value();
  }
  const stats = {
    total: tasks.length,
    todo: tasks.filter(t => t.status === 'todo').length,
    inProgress: tasks.filter(t => t.status === 'in-progress').length,
    done: tasks.filter(t => t.status === 'done').length,
    overdue: tasks.filter(t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done').length
  };
  res.json(stats);
});

router.get('/', auth, (req, res) => {
  let tasks;
  if (req.user.role === 'admin') {
    tasks = db.get('tasks').value();
  } else {
    tasks = db.get('tasks').filter({ assigned_to: req.user.id }).value();
  }
  const projects = db.get('projects').value();
  const users = db.get('users').value();
  tasks = tasks.map(t => ({
    ...t,
    project_name: (projects.find(p => p.id === t.project_id) || {}).name || '-',
    assigned_name: (users.find(u => u.id === t.assigned_to) || {}).name || '-'
  }));
  res.json(tasks);
});

router.post('/', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can create tasks' });
  }
  const { title, description, priority, due_date, project_id, assigned_to } = req.body;
  if (!title || !project_id) {
    return res.status(400).json({ message: 'Title and project are required' });
  }
  const task = {
    id: Date.now(),
    title,
    description,
    priority,
    due_date,
    project_id,
    assigned_to,
    created_by: req.user.id,
    status: 'todo',
    created_at: new Date().toISOString()
  };
  db.get('tasks').push(task).write();
  res.json({ message: 'Task created', id: task.id });
});

router.put('/:id/status', auth, (req, res) => {
  const { status } = req.body;
  const validStatuses = ['todo', 'in-progress', 'done'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }
  const task = db.get('tasks').find({ id: parseInt(req.params.id) }).value();
  if (!task) return res.status(404).json({ message: 'Task not found' });
  if (req.user.role !== 'admin' && task.assigned_to !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized' });
  }
  db.get('tasks').find({ id: parseInt(req.params.id) }).assign({ status }).write();
  res.json({ message: 'Status updated' });
});

router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Only admins can delete tasks' });
  }
  db.get('tasks').remove({ id: parseInt(req.params.id) }).write();
  res.json({ message: 'Task deleted' });
});

module.exports = router;