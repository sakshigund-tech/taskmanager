import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import API from '../utils/api';
import { format } from 'date-fns';

const COLORS = ['#e8ff47','#4dffa4','#4d9fff','#ff8c42','#a855f7','#ff4d6a','#06b6d4','#f43f5e'];

function ProjectModal({ project, onClose, onSave }) {
  const [form, setForm] = useState(project ? {
    name: project.name, description: project.description || '',
    color: project.color || '#e8ff47', dueDate: project.dueDate ? format(new Date(project.dueDate), 'yyyy-MM-dd') : '',
    status: project.status || 'active'
  } : { name: '', description: '', color: '#e8ff47', dueDate: '', status: 'active' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      if (project) {
        const res = await API.put(`/projects/${project._id}`, form);
        onSave(res.data.project);
      } else {
        const res = await API.post('/projects', form);
        onSave(res.data.project);
      }
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error saving project');
    } finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{project ? 'Edit Project' : 'New Project'}</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Name *</label>
            <input className="form-input" value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} required placeholder="e.g. Website Redesign" />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="What's this project about?" />
          </div>
          <div className="form-group">
            <label className="form-label">Color</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {COLORS.map(c => (
                <button key={c} type="button" onClick={() => setForm(f=>({...f,color:c}))} style={{
                  width: 28, height: 28, background: c, border: form.color===c ? '2px solid white' : '2px solid transparent',
                  borderRadius: 4, cursor: 'pointer', outline: 'none'
                }} />
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(f=>({...f,dueDate:e.target.value}))} />
          </div>
          {project && (
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e=>setForm(f=>({...f,status:e.target.value}))}>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Saving...' : project ? 'Save Changes' : 'Create Project'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'create' | project

  useEffect(() => {
    API.get('/projects').then(res => setProjects(res.data.projects)).finally(() => setLoading(false));
  }, []);

  const handleSave = (saved) => {
    setProjects(prev => {
      const exists = prev.find(p => p._id === saved._id);
      return exists ? prev.map(p => p._id === saved._id ? saved : p) : [saved, ...prev];
    });
  };

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Projects</div>
        <div className="page-subtitle">// {projects.length} project{projects.length !== 1 ? 's' : ''}</div>
        <div className="page-header-actions">
          <button className="btn btn-primary" onClick={() => setModal('create')}>+ New Project</button>
        </div>
      </div>

      <div className="page-content">
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">⬡</div>
            <div className="empty-state-title">No projects yet</div>
            <div className="empty-state-desc">Create your first project to get started</div>
            <button className="btn btn-primary" onClick={() => setModal('create')}>+ Create Project</button>
          </div>
        ) : (
          <div className="projects-grid">
            {projects.map(project => {
              const counts = project.taskCounts || {};
              const total = Object.values(counts).reduce((a, b) => a + b, 0);
              return (
                <div key={project._id} style={{ position: 'relative' }}>
                  <Link to={`/projects/${project._id}`} className="project-card">
                    <div className="project-card-accent" style={{ background: project.color || '#e8ff47' }} />
                    <div className="project-card-header">
                      <div>
                        <div className="project-card-name">{project.name}</div>
                      </div>
                      <span className={`project-status-badge ${project.status}`}>{project.status}</span>
                    </div>
                    <div className="project-card-desc">{project.description || 'No description'}</div>
                    {total > 0 && (
                      <div className="task-mini-bar">
                        {counts.done > 0 && <div className="task-mini-bar-seg" style={{ flex: counts.done, background: 'var(--accent2)' }} />}
                        {counts.review > 0 && <div className="task-mini-bar-seg" style={{ flex: counts.review, background: 'var(--orange)' }} />}
                        {counts.in_progress > 0 && <div className="task-mini-bar-seg" style={{ flex: counts.in_progress, background: 'var(--blue)' }} />}
                        {counts.todo > 0 && <div className="task-mini-bar-seg" style={{ flex: counts.todo, background: 'var(--border2)' }} />}
                      </div>
                    )}
                    <div className="project-card-footer">
                      <div className="project-members">
                        {project.members?.slice(0, 4).map((m, i) => (
                          <div key={i} className="member-dot">
                            {(m.user?.name || '?')[0].toUpperCase()}
                          </div>
                        ))}
                        {project.members?.length > 4 && <div className="member-dot">+{project.members.length - 4}</div>}
                      </div>
                      <div className="project-task-count">{total} task{total !== 1 ? 's' : ''}</div>
                    </div>
                  </Link>
                  <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', top: 12, right: 8 }}
                    onClick={(e) => { e.preventDefault(); setModal(project); }}>✎</button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {modal && (
        <ProjectModal
          project={modal === 'create' ? null : modal}
          onClose={() => setModal(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
