import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { format, isPast } from 'date-fns';

const STATUS_LABELS = { todo: 'TODO', in_progress: 'IN PROGRESS', review: 'REVIEW', done: 'DONE' };

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentTasks, setRecentTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      API.get('/tasks/dashboard/stats'),
      API.get('/projects')
    ]).then(([statsRes, projRes]) => {
      setStats(statsRes.data.stats);
      setRecentTasks(statsRes.data.recentTasks);
      setProjects(projRes.data.projects.slice(0, 3));
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="loading-screen"><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">// welcome back, {user?.name}</div>
        <div className="page-header-actions">
          <Link to="/projects" className="btn btn-secondary btn-sm">⬡ All Projects</Link>
          <Link to="/tasks" className="btn btn-primary btn-sm">≡ All Tasks</Link>
        </div>
      </div>

      <div className="page-content">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Tasks</div>
            <div className="stat-value">{stats?.total || 0}</div>
            <div className="stat-sub">{stats?.projects} projects</div>
          </div>
          <div className="stat-card blue">
            <div className="stat-label">In Progress</div>
            <div className="stat-value">{stats?.in_progress || 0}</div>
            <div className="stat-sub">active work</div>
          </div>
          <div className="stat-card green">
            <div className="stat-label">Completed</div>
            <div className="stat-value">{stats?.done || 0}</div>
            <div className="stat-sub">tasks done</div>
          </div>
          <div className="stat-card red">
            <div className="stat-label">Overdue</div>
            <div className="stat-value">{stats?.overdueTasks || 0}</div>
            <div className="stat-sub">need attention</div>
          </div>
          <div className="stat-card orange">
            <div className="stat-label">My Tasks</div>
            <div className="stat-value">{stats?.myTasks || 0}</div>
            <div className="stat-sub">assigned to me</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          <div>
            <div className="section-header">
              <div className="section-title">Recent Activity</div>
              <Link to="/tasks" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {recentTasks.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-desc">No tasks yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentTasks.map(task => (
                  <div key={task._id} style={{
                    background: 'var(--bg2)', border: '1px solid var(--border)',
                    padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 12
                  }}>
                    <div style={{ width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                      background: task.status === 'done' ? 'var(--accent2)' :
                        task.status === 'in_progress' ? 'var(--blue)' :
                        task.status === 'review' ? 'var(--orange)' : 'var(--border2)' }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text3)' }}>{task.project?.name}</div>
                    </div>
                    <span className={`badge badge-${task.status}`}>{STATUS_LABELS[task.status]}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="section-header">
              <div className="section-title">Active Projects</div>
              <Link to="/projects" className="btn btn-ghost btn-sm">View all →</Link>
            </div>
            {projects.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px 0' }}>
                <div className="empty-state-desc">No projects yet</div>
                <Link to="/projects" className="btn btn-primary btn-sm">Create one →</Link>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {projects.map(project => {
                  const counts = project.taskCounts || {};
                  const total = Object.values(counts).reduce((a, b) => a + b, 0);
                  const done = counts.done || 0;
                  const pct = total ? Math.round((done / total) * 100) : 0;
                  return (
                    <Link key={project._id} to={`/projects/${project._id}`} style={{ textDecoration: 'none' }}>
                      <div style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        padding: '14px 16px', borderTop: `3px solid ${project.color || '#6366f1'}`,
                        transition: 'border-color 0.15s'
                      }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>{project.name}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 3, background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: project.color || '#6366f1', borderRadius: 2 }} />
                          </div>
                          <div style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{pct}%</div>
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>
                          {done}/{total} tasks done · {project.members?.length || 0} members
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
