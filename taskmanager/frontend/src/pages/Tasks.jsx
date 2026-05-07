import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { format, isPast } from 'date-fns';

const STATUS_LABELS = { todo: 'TODO', in_progress: 'IN PROGRESS', review: 'REVIEW', done: 'DONE' };
const PRIORITY_LABELS = { low: 'LOW', medium: 'MED', high: 'HIGH', urgent: 'URGENT' };

export default function Tasks() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', priority: '', assignedTo: '', overdue: '' });

  const fetchTasks = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.status) params.append('status', filters.status);
    if (filters.priority) params.append('priority', filters.priority);
    if (filters.assignedTo) params.append('assignedTo', filters.assignedTo);
    if (filters.overdue) params.append('overdue', 'true');
    setLoading(true);
    API.get(`/tasks?${params.toString()}&limit=100`)
      .then(res => setTasks(res.data.tasks))
      .finally(() => setLoading(false));
  }, [filters]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const setFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await API.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === taskId ? res.data.task : t));
    } catch {}
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-title">All Tasks</div>
        <div className="page-subtitle">// {tasks.length} task{tasks.length !== 1 ? 's' : ''} across all projects</div>
        <div className="page-header-actions">
          <div className="filter-bar">
            <select className="filter-select" value={filters.status} onChange={e => setFilter('status', e.target.value)}>
              <option value="">All Status</option>
              <option value="todo">TODO</option>
              <option value="in_progress">IN PROGRESS</option>
              <option value="review">REVIEW</option>
              <option value="done">DONE</option>
            </select>
            <select className="filter-select" value={filters.priority} onChange={e => setFilter('priority', e.target.value)}>
              <option value="">All Priority</option>
              <option value="low">LOW</option>
              <option value="medium">MEDIUM</option>
              <option value="high">HIGH</option>
              <option value="urgent">URGENT</option>
            </select>
            <select className="filter-select" value={filters.assignedTo} onChange={e => setFilter('assignedTo', e.target.value)}>
              <option value="">All Assigned</option>
              <option value="me">Assigned to Me</option>
            </select>
            <select className="filter-select" value={filters.overdue} onChange={e => setFilter('overdue', e.target.value)}>
              <option value="">All Dates</option>
              <option value="true">Overdue Only</option>
            </select>
            {(filters.status || filters.priority || filters.assignedTo || filters.overdue) && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFilters({ status: '', priority: '', assignedTo: '', overdue: '' })}>
                ✕ Clear
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">≡</div>
            <div className="empty-state-title">No tasks found</div>
            <div className="empty-state-desc">{Object.values(filters).some(Boolean) ? 'Try adjusting your filters' : 'Tasks will appear here once created in projects'}</div>
          </div>
        ) : (
          <table className="task-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Project</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Assigned To</th>
                <th>Due Date</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const isOverdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
                return (
                  <tr key={task._id}>
                    <td className="task-title-cell">
                      <span className="task-title-text">{task.title}</span>
                      {task.tags?.length > 0 && (
                        <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
                          {task.tags.map(tag => (
                            <span key={tag} style={{ fontSize: 9, padding: '1px 5px', background: 'var(--bg3)', color: 'var(--text3)', border: '1px solid var(--border)' }}>{tag}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td>
                      {task.project && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 6, height: 6, borderRadius: 1, background: task.project.color || 'var(--accent)', flexShrink: 0 }} />
                          <span style={{ fontSize: 12, color: 'var(--text2)' }}>{task.project.name}</span>
                        </div>
                      )}
                    </td>
                    <td>
                      <select
                        className={`badge badge-${task.status}`}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-mono)', fontSize: 10 }}
                        value={task.status}
                        onChange={e => handleStatusChange(task._id, e.target.value)}
                      >
                        <option value="todo">TODO</option>
                        <option value="in_progress">IN PROGRESS</option>
                        <option value="review">REVIEW</option>
                        <option value="done">DONE</option>
                      </select>
                    </td>
                    <td><span className={`badge badge-${task.priority}`}>{PRIORITY_LABELS[task.priority]}</span></td>
                    <td style={{ fontSize: 12 }}>
                      {task.assignedTo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 18, height: 18, background: 'var(--accent-dim)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 700, color: 'var(--accent)', flexShrink: 0 }}>
                            {task.assignedTo.name[0].toUpperCase()}
                          </div>
                          <span>{task.assignedTo.name}</span>
                        </div>
                      ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                    <td>
                      {task.dueDate ? (
                        <span className={`due-date${isOverdue ? ' overdue' : ''}`}>
                          {isOverdue && '⚠ '}{format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      ) : <span style={{ color: 'var(--text3)' }}>—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
