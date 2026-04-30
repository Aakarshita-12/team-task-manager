const token = localStorage.getItem('token');
const role = localStorage.getItem('role');
const name = localStorage.getItem('name');

// Redirect to login if not logged in
if (!token) window.location.href = '/';

// Show welcome message
document.getElementById('welcomeText').textContent = `👋 ${name} (${role})`;

// Show admin only elements
if (role === 'admin') {
  document.querySelectorAll('.admin-only').forEach(el => el.classList.remove('hidden'));
  document.getElementById('createTaskForm').classList.remove('hidden');
  document.getElementById('createProjectForm').classList.remove('hidden');
}

// Show/hide tabs
function showTab(tab) {
  document.querySelectorAll('.tab-btn').forEach(t => t.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tasksSection').classList.add('hidden');
  document.getElementById('projectsSection').classList.add('hidden');
  document.getElementById('usersSection').classList.add('hidden');
  document.getElementById(`${tab}Section`).classList.remove('hidden');
}

// Fetch helper
async function apiFetch(url, method = 'GET', body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json', 'authorization': token }
  };
  if (body) options.body = JSON.stringify(body);
  const res = await fetch(url, options);
  return res.json();
}

// Load stats
async function loadStats() {
  const stats = await apiFetch('/api/tasks/stats');
  document.getElementById('statTotal').textContent = stats.total || 0;
  document.getElementById('statTodo').textContent = stats.todo || 0;
  document.getElementById('statProgress').textContent = stats.inProgress || 0;
  document.getElementById('statDone').textContent = stats.done || 0;
  document.getElementById('statOverdue').textContent = stats.overdue || 0;
}

// Load tasks
async function loadTasks() {
  const tasks = await apiFetch('/api/tasks');
  const tbody = document.getElementById('tasksTable');
  if (!tasks.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty">No tasks found</td></tr>';
    return;
  }
  tbody.innerHTML = tasks.map(task => `
    <tr>
      <td>${task.title}</td>
      <td>${task.project_name || '-'}</td>
      <td>${task.assigned_name || '-'}</td>
      <td><span class="badge ${task.priority}">${task.priority}</span></td>
      <td>${task.due_date || '-'}</td>
      <td>
        <select class="status-select" onchange="updateStatus(${task.id}, this.value)">
          <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>To Do</option>
          <option value="in-progress" ${task.status === 'in-progress' ? 'selected' : ''}>In Progress</option>
          <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
        </select>
      </td>
      <td>${role === 'admin' ? `<button class="btn btn-danger" onclick="deleteTask(${task.id})">Delete</button>` : '-'}</td>
    </tr>
  `).join('');
}

// Load projects
async function loadProjects() {
  const projects = await apiFetch('/api/projects');
  const tbody = document.getElementById('projectsTable');
  if (!projects.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No projects found</td></tr>';
    return;
  }
  tbody.innerHTML = projects.map(p => `
    <tr>
      <td>${p.name}</td>
      <td>${p.description || '-'}</td>
      <td>${p.created_at ? p.created_at.split('T')[0] : '-'}</td>
    </tr>
  `).join('');

  // Populate project dropdown in task form
  const select = document.getElementById('taskProject');
  select.innerHTML = '<option value="">Select Project</option>' +
    projects.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}

// Load users (admin only)
async function loadUsers() {
  if (role !== 'admin') return;
  const users = await apiFetch('/api/projects/users');
  const tbody = document.getElementById('usersTable');
  if (!users.length) {
    tbody.innerHTML = '<tr><td colspan="3" class="empty">No users found</td></tr>';
    return;
  }
  tbody.innerHTML = users.map(u => `
    <tr>
      <td>${u.name}</td>
      <td>${u.email}</td>
      <td><span class="badge ${u.role}">${u.role}</span></td>
    </tr>
  `).join('');

  // Populate assignee dropdown
  const select = document.getElementById('taskAssignee');
  select.innerHTML = '<option value="">Assign To</option>' +
    users.map(u => `<option value="${u.id}">${u.name}</option>`).join('');
}

// Create task
async function createTask() {
  const title = document.getElementById('taskTitle').value;
  const description = document.getElementById('taskDesc').value;
  const priority = document.getElementById('taskPriority').value;
  const due_date = document.getElementById('taskDueDate').value;
  const project_id = document.getElementById('taskProject').value;
  const assigned_to = document.getElementById('taskAssignee').value;

  if (!title || !project_id) return alert('Title and project are required!');

  await apiFetch('/api/tasks', 'POST', { title, description, priority, due_date, project_id, assigned_to });
  alert('Task created!');
  document.getElementById('taskTitle').value = '';
  document.getElementById('taskDesc').value = '';
  loadTasks();
  loadStats();
}

// Create project
async function createProject() {
  const name = document.getElementById('projectName').value;
  const description = document.getElementById('projectDesc').value;
  if (!name) return alert('Project name is required!');

  await apiFetch('/api/projects', 'POST', { name, description });
  alert('Project created!');
  document.getElementById('projectName').value = '';
  document.getElementById('projectDesc').value = '';
  loadProjects();
}

// Update task status
async function updateStatus(id, status) {
  await apiFetch(`/api/tasks/${id}/status`, 'PUT', { status });
  loadStats();
}

// Delete task
async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await apiFetch(`/api/tasks/${id}`, 'DELETE');
  loadTasks();
  loadStats();
}

// Logout
function logout() {
  localStorage.clear();
  window.location.href = '/';
}

// Initial load
loadStats();
loadTasks();
loadProjects();
loadUsers();