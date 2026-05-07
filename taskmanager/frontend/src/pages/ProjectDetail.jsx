import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { format, isPast } from 'date-fns';

const STATUSES = ['todo', 'in_progress', 'review', 'done'];
const STATUS_LABELS = { todo: 'TODO', in_progress: 'IN PROGRESS', review: 'REVIEW', done: 'DONE' };
const STATUS_COLORS = { todo: 'var(--todo)', in_progress: 'var(--blue)', review: 'var(--orange)', done: 'var(--accent2)' };
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function TaskModal({ task, project, onClose, onSave, onDelete }) {
  const { user } = useAuth();
  const isAdmin = project.owner?._id === user._id || project.members?.find(m => m.user?._id === user._id)?.role === 'admin';
  const [form, setForm] = useState(task ? {
    title: task.title, description: task.description || '',
    status: task.status, priority: task.priority,
    assignedTo: task.assignedTo?._id || '',
    dueDate: task.dueDate ? format(new Date(task.dueDate), 'yyyy-MM-dd') : '',
    tags: task.tags?.join(', ') || ''
  } : { title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '', dueDate: '', tags: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(task?.comments || []);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const payload = { ...form, tags: form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : [] };
      if (!payload.assignedTo) delete payload.assignedTo;
      if (!payload.dueDate) delete payload.dueDate;
      if (task) {
        const res = await API.put(`/tasks/${task._id}`, payload);
        onSave(res.data.task);
      } else {
        const res = await API.post('/tasks', { ...payload, project: project._id });
        onSave(res.data.task);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving task');
    } finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this task?')) return;
    await API.delete(`/tasks/${task._id}`);
    onDelete(task._id);
    onClose();
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    const res = await API.post(`/tasks/${task._id}/comments`, { text: comment });
    setComments(res.data.comments);
    setComment('');
  };

  const members = project.members || [];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 600 }}>
        <div className="modal-header">
          <div className="modal-title">{task ? 'Edit Task' : 'New Task'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Title *</label>
            <input className="form-input" value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))} required placeholder="Task title" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Details..." />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                {PRIORITIES.map(p => <option key={p} value={p}>{p.toUpperCase()}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Assign To</label>
              <select className="form-select" value={form.assignedTo} onChange={e=>setForm(f=>({...f,assignedTo:e.target.value}))}>
                <option value="">Unassigned</option>
                {members.map(m => m.user && <option key={m.user._id} value={m.user._id}>{m.user.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Due Date</label>
              <input className="form-input" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Tags (comma separated)</label>
            <input className="form-input" value={form.tags} onChange={e=>setForm(f=>({...f,tags:e.target.value}))} placeholder="frontend, bug, urgent" />
          </div>
          <div className="modal-actions">
            {task && <button type="button" className="btn btn-danger btn-sm" onClick={handleDelete}>Delete</button>}
            <div style={{ flex: 1 }} />
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : 'Save Task'}</button>
          </div>
        </form>

        {task && (
          <>
            <hr className="divider" />
            <div className="section-title" style={{ marginBottom: 12 }}>Comments ({comments.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12, maxHeight: 200, overflowY: 'auto' }}>
              {comments.map((c, i) => (
                <div key={i} style={{ background: 'var(--bg3)', border: '1px solid var(--border)', padding: '8px 12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)' }}>{c.user?.name || 'Unknown'}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)' }}>{format(new Date(c.createdAt), 'MMM d, HH:mm')}</span>
                  </div>
                  <div style={{ fontSize: 13 }}>{c.text}</div>
                </div>
              ))}
              {comments.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)' }}>No comments yet</div>}
            </div>
            <form onSubmit={handleComment} style={{ display: 'flex', gap: 8 }}>
              <input className="form-input" value={comment} onChange={e=>setComment(e.target.value)} placeholder="Add a comment..." style={{ flex: 1 }} />
              <button type="submit" className="btn btn-primary btn-sm">Post</button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function AddMemberModal({ project, onClose, onAdd }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await API.post(`/projects/${project._id}/members`, { email, role });
      onAdd(res.data.project);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error adding member');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <div className="modal-title">Add Member</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={email} onChange={e=>setEmail(e.target.value)} required placeholder="team@example.com" />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select className="form-select" value={role} onChange={e=>setRole(e.target.value)}>
              <option value="member">Member</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding...' : 'Add Member'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('board');
  const [taskModal, setTaskModal] = useState(null); // null | 'new' | task
  const [memberModal, setMemberModal] = useState(false);

  useEffect(() => {
    Promise.all([
      API.get(`/projects/${id}`),
      API.get(`/tasks?project=${id}&limit=200`),
      API.get(`/projects/${id}/stats`)
    ]).then(([pRes, tRes, sRes]) => {
      setProject(pRes.data.project);
      setTasks(tRes.data.tasks);
      setStats(sRes.data.stats);
    }).catch(() => navigate('/projects'))
      .finally(() => setLoading(false));
  }, [id]);

  const isAdmin = project && (
    project.owner?._id === user._id ||
    project.members?.find(m => m.user?._id === user._id)?.role === 'admin'
  );

  const handleTaskSave = (saved) => {
    setTasks(prev => {
      const exists = prev.find(t => t._id === saved._id);
      return exists ? prev.map(t => t._id === saved._id ? saved : t) : [saved, ...prev];
    });
  };

  const handleTaskDelete = (taskId) => {
    setTasks(prev => prev.filter(t => t._id !== taskId));
  };

  const removeMember = async (userId) => {
    if (!window.confirm('Remove this member?')) return;
    const res = await API.delete(`/projects/${id}/members/${userId}`);
    setProject(res.data.project || { ...project, members: project.members.filter(m => m.user?._id !== userId) });
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;
  if (!project) return null;

  const tasksByStatus = STATUSES.reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s);
    return acc;
  }, {});

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
          <div style={{ width: 12, height: 12, background: project.color, borderRadius: 2 }} />
          <div className="page-title" style={{ marginBottom: 0 }}>{project.name}</div>
          <span className={`project-status-badge ${project.status}`}>{project.status}</span>
        </div>
        <div className="page-subtitle">{project.description || '// no description'}</div>
        <div className="page-header-actions">
          {isAdmin && <button className="btn btn-secondary btn-sm" onClick={() => setMemberModal(true)}>+ Member</button>}
          <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>+ Task</button>
        </div>
      </div>

      <div className="page-content">
        {stats && (
          <div className="stats-grid" style={{ marginBottom: 24 }}>
            <div className="stat-card"><div className="stat-label">Total</div><div className="stat-value">{stats.total || 0}</div></div>
            <div className="stat-card blue"><div className="stat-label">In Progress</div><div className="stat-value">{stats.in_progress || 0}</div></div>
            <div className="stat-card green"><div className="stat-label">Done</div><div className="stat-value">{stats.done || 0}</div></div>
            <div className="stat-card red"><div className="stat-label">Overdue</div><div className="stat-value">{stats.overdue || 0}</div></div>
          </div>
        )}

        <div className="tabs">
          <button className={`tab${tab==='board'?' active':''}`} onClick={()=>setTab('board')}>Board</button>
          <button className={`tab${tab==='list'?' active':''}`} onClick={()=>setTab('list')}>List</button>
          <button className={`tab${tab==='members'?' active':''}`} onClick={()=>setTab('members')}>Members ({project.members?.length || 0})</button>
        </div>

        {tab === 'board' && (
          <div className="kanban-board">
            {STATUSES.map(status => (
              <div key={status} className="kanban-col">
                <div className="kanban-col-header" style={{ borderTop: `3px solid ${STATUS_COLORS[status]}` }}>
                  <span>{STATUS_LABELS[status]}</span>
                  <span className="kanban-count">{tasksByStatus[status].length}</span>
                </div>
                <div className="kanban-col-body">
                  {tasksByStatus[status].map(task => (
                    <div key={task._id} className="kanban-task" onClick={() => setTaskModal(task)}>
                      <div className="kanban-task-title">{task.title}</div>
                      {task.description && <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{task.description}</div>}
                      <div className="kanban-task-meta">
                        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          {task.dueDate && (
                            <span className={`due-date${isPast(new Date(task.dueDate)) && task.status !== 'done' ? ' overdue' : ''}`}>
                              {format(new Date(task.dueDate), 'MMM d')}
                            </span>
                          )}
                          {task.assignedTo && (
                            <div style={{ width: 20, height: 20, background: 'var(--accent-dim)', border: '1px solid var(--accent)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)' }}>
                              {task.assignedTo.name[0].toUpperCase()}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  <button className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 4, justifyContent: 'flex-start', color: 'var(--text3)' }}
                    onClick={() => setTaskModal('new')}>+ Add task</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === 'list' && (
          <div>
            {tasks.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">≡</div>
                <div className="empty-state-title">No tasks</div>
                <button className="btn btn-primary btn-sm" onClick={() => setTaskModal('new')}>+ Create Task</button>
              </div>
            ) : (
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Assigned</th>
                    <th>Due Date</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map(task => (
                    <tr key={task._id} style={{ cursor: 'pointer' }} onClick={() => setTaskModal(task)}>
                      <td className="task-title-cell"><span className="task-title-text">{task.title}</span></td>
                      <td><span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span></td>
                      <td><span className={`badge badge-${task.priority}`}>{task.priority}</span></td>
                      <td style={{ fontSize: 12 }}>{task.assignedTo?.name || <span style={{ color: 'var(--text3)' }}>—</span>}</td>
                      <td>
                        {task.dueDate ? (
                          <span className={`due-date${isPast(new Date(task.dueDate)) && task.status !== 'done' ? ' overdue' : ''}`}>
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'members' && (
          <div style={{ maxWidth: 600 }}>
            {isAdmin && (
              <div style={{ marginBottom: 16 }}>
                <button className="btn btn-primary btn-sm" onClick={() => setMemberModal(true)}>+ Add Member</button>
              </div>
            )}
            {project.members?.map((m) => m.user && (
              <div key={m.user._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'var(--bg2)', border: '1px solid var(--border)',
                padding: '12px 16px', marginBottom: 8
              }}>
                <div className="user-avatar">{m.user.name[0].toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 13 }}>{m.user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text3)' }}>{m.user.email}</div>
                </div>
                <span className={`badge badge-${m.role === 'admin' ? 'high' : 'medium'}`}>{m.role}</span>
                {isAdmin && m.user._id !== project.owner?._id && m.user._id !== user._id && (
                  <button className="btn btn-danger btn-sm" onClick={() => removeMember(m.user._id)}>Remove</button>
                )}
                {m.user._id === project.owner?._id && <span style={{ fontSize: 10, color: 'var(--accent)' }}>OWNER</span>}
              </div>
            ))}
          </div>
        )}
      </div>

      {taskModal && (
        <TaskModal
          task={taskModal === 'new' ? null : taskModal}
          project={project}
          onClose={() => setTaskModal(null)}
          onSave={handleTaskSave}
          onDelete={handleTaskDelete}
        />
      )}

      {memberModal && (
        <AddMemberModal
          project={project}
          onClose={() => setMemberModal(false)}
          onAdd={(updated) => setProject(updated)}
        />
      )}
    </div>
  );
}
