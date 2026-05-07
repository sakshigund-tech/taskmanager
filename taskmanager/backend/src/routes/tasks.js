const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Task = require('../models/Task');
const Project = require('../models/Project');
const { protect } = require('../middleware/auth');

// Check if user has access to a project
const checkProjectAccess = async (projectId, userId) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  const isOwner = project.owner.toString() === userId.toString();
  const isMember = project.members.some(m => m.user.toString() === userId.toString());
  if (!isOwner && !isMember) return null;
  return project;
};

// Check if user is project admin/owner
const isProjectAdmin = (project, userId) => {
  if (project.owner.toString() === userId.toString()) return true;
  const member = project.members.find(m => m.user.toString() === userId.toString());
  return member && member.role === 'admin';
};

// GET /api/tasks - Get tasks (with filters)
router.get('/', protect, async (req, res) => {
  try {
    const { project, status, priority, assignedTo, overdue, page = 1, limit = 50 } = req.query;

    // Get user's projects
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).select('_id');
    const projectIds = userProjects.map(p => p._id);

    const filter = { project: { $in: projectIds } };
    if (project) filter.project = project;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo === 'me' ? req.user._id : assignedTo;
    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'done' };
    }

    const tasks = await Task.find(filter)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Task.countDocuments(filter);

    res.json({ success: true, tasks, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks - Create task
router.post('/', protect, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('project').notEmpty().withMessage('Project is required'),
  body('status').optional().isIn(['todo', 'in_progress', 'review', 'done']),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  body('dueDate').optional().isISO8601()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const project = await checkProjectAccess(req.body.project, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    // Only admins can assign to others
    if (req.body.assignedTo && req.body.assignedTo !== req.user._id.toString()) {
      if (!isProjectAdmin(project, req.user._id)) {
        req.body.assignedTo = req.user._id;
      }
    }

    const task = await Task.create({ ...req.body, createdBy: req.user._id });
    await task.populate('assignedTo', 'name email');
    await task.populate('createdBy', 'name email');
    await task.populate('project', 'name color');

    res.status(201).json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/:id
router.get('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('createdBy', 'name email')
      .populate('project', 'name color owner members')
      .populate('comments.user', 'name email');

    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await checkProjectAccess(task.project._id, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    res.json({ success: true, task });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// PUT /api/tasks/:id
router.put('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await checkProjectAccess(task.project._id, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    const isAdmin = isProjectAdmin(project, req.user._id);
    const isAssignee = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    // Members can only update status of their assigned tasks
    if (!isAdmin && !isCreator) {
      if (!isAssignee) return res.status(403).json({ success: false, message: 'Not authorized' });
      const allowed = { status: req.body.status };
      const updated = await Task.findByIdAndUpdate(req.params.id, allowed, { new: true })
        .populate('assignedTo', 'name email').populate('createdBy', 'name email').populate('project', 'name color');
      return res.json({ success: true, task: updated });
    }

    const allowedFields = ['title', 'description', 'status', 'priority', 'assignedTo', 'dueDate', 'tags'];
    const updates = {};
    allowedFields.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const updated = await Task.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('assignedTo', 'name email').populate('createdBy', 'name email').populate('project', 'name color');

    res.json({ success: true, task: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/tasks/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await checkProjectAccess(task.project._id, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    const isAdmin = isProjectAdmin(project, req.user._id);
    const isCreator = task.createdBy.toString() === req.user._id.toString();

    if (!isAdmin && !isCreator) return res.status(403).json({ success: false, message: 'Not authorized' });

    await Task.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/tasks/:id/comments
router.post('/:id/comments', protect, [
  body('text').trim().notEmpty().withMessage('Comment text is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const task = await Task.findById(req.params.id).populate('project');
    if (!task) return res.status(404).json({ success: false, message: 'Task not found' });

    const project = await checkProjectAccess(task.project._id, req.user._id);
    if (!project) return res.status(403).json({ success: false, message: 'Access denied' });

    task.comments.push({ user: req.user._id, text: req.body.text });
    await task.save();
    await task.populate('comments.user', 'name email');

    res.status(201).json({ success: true, comments: task.comments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/tasks/dashboard/stats
router.get('/dashboard/stats', protect, async (req, res) => {
  try {
    const userProjects = await Project.find({
      $or: [{ owner: req.user._id }, { 'members.user': req.user._id }]
    }).select('_id');
    const projectIds = userProjects.map(p => p._id);

    const [totalStats, myTasks, overdueTasks, recentTasks] = await Promise.all([
      Task.aggregate([
        { $match: { project: { $in: projectIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Task.countDocuments({ project: { $in: projectIds }, assignedTo: req.user._id, status: { $ne: 'done' } }),
      Task.countDocuments({
        project: { $in: projectIds },
        dueDate: { $lt: new Date() },
        status: { $ne: 'done' }
      }),
      Task.find({ project: { $in: projectIds } })
        .populate('project', 'name color')
        .populate('assignedTo', 'name')
        .sort({ updatedAt: -1 })
        .limit(5)
    ]);

    const statusCounts = { todo: 0, in_progress: 0, review: 0, done: 0 };
    totalStats.forEach(s => { statusCounts[s._id] = s.count; });

    res.json({
      success: true,
      stats: {
        ...statusCounts,
        total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
        myTasks,
        overdueTasks,
        projects: userProjects.length
      },
      recentTasks
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
