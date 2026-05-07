const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const { protect, projectAdmin } = require('../middleware/auth');

// Middleware to load project
const loadProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id).populate('owner', 'name email').populate('members.user', 'name email role');
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    // Check access: owner or member
    const isOwner = project.owner._id.toString() === req.user._id.toString();
    const isMember = project.members.some(m => m.user._id.toString() === req.user._id.toString());
    if (!isOwner && !isMember) return res.status(403).json({ success: false, message: 'Access denied' });

    req.project = project;
    next();
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/projects - Get all projects for current user
router.get('/', protect, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.user._id },
        { 'members.user': req.user._id }
      ]
    }).populate('owner', 'name email').populate('members.user', 'name email');

    // Attach task counts
    const projectsWithCounts = await Promise.all(projects.map(async (p) => {
      const taskCounts = await Task.aggregate([
        { $match: { project: p._id } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      const counts = { todo: 0, in_progress: 0, review: 0, done: 0 };
      taskCounts.forEach(t => { counts[t._id] = t.count; });
      return { ...p.toObject(), taskCounts: counts };
    }));

    res.json({ success: true, projects: projectsWithCounts });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects - Create project
router.post('/', protect, [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
  body('dueDate').optional().isISO8601(),
  body('color').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const project = await Project.create({
      ...req.body,
      owner: req.user._id,
      members: [{ user: req.user._id, role: 'admin' }]
    });
    await project.populate('owner', 'name email');
    res.status(201).json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', protect, loadProject, (req, res) => {
  res.json({ success: true, project: req.project });
});

// PUT /api/projects/:id
router.put('/:id', protect, loadProject, projectAdmin(['admin']), [
  body('name').optional().trim().notEmpty(),
  body('status').optional().isIn(['active', 'completed', 'archived'])
], async (req, res) => {
  try {
    const allowed = ['name', 'description', 'status', 'dueDate', 'color'];
    const updates = {};
    allowed.forEach(f => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const project = await Project.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true })
      .populate('owner', 'name email').populate('members.user', 'name email');
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', protect, loadProject, projectAdmin(['admin']), async (req, res) => {
  try {
    await Task.deleteMany({ project: req.params.id });
    await Project.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Project and all tasks deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// POST /api/projects/:id/members - Add member
router.post('/:id/members', protect, loadProject, projectAdmin(['admin']), [
  body('email').isEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['admin', 'member'])
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ success: false, errors: errors.array() });

  try {
    const userToAdd = await User.findOne({ email: req.body.email });
    if (!userToAdd) return res.status(404).json({ success: false, message: 'User not found' });

    const project = req.project;
    const alreadyMember = project.members.some(m => m.user._id.toString() === userToAdd._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'User already a member' });

    project.members.push({ user: userToAdd._id, role: req.body.role || 'member' });
    await project.save();
    await project.populate('members.user', 'name email');

    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// DELETE /api/projects/:id/members/:userId
router.delete('/:id/members/:userId', protect, loadProject, projectAdmin(['admin']), async (req, res) => {
  try {
    const project = req.project;
    if (project.owner._id.toString() === req.params.userId) {
      return res.status(400).json({ success: false, message: 'Cannot remove project owner' });
    }
    project.members = project.members.filter(m => m.user._id.toString() !== req.params.userId);
    await project.save();
    res.json({ success: true, message: 'Member removed' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// GET /api/projects/:id/stats
router.get('/:id/stats', protect, loadProject, async (req, res) => {
  try {
    const stats = await Task.aggregate([
      { $match: { project: req.project._id } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          todo: { $sum: { $cond: [{ $eq: ['$status', 'todo'] }, 1, 0] } },
          in_progress: { $sum: { $cond: [{ $eq: ['$status', 'in_progress'] }, 1, 0] } },
          review: { $sum: { $cond: [{ $eq: ['$status', 'review'] }, 1, 0] } },
          done: { $sum: { $cond: [{ $eq: ['$status', 'done'] }, 1, 0] } },
          overdue: {
            $sum: {
              $cond: [
                { $and: [{ $lt: ['$dueDate', new Date()] }, { $ne: ['$status', 'done'] }, { $ne: ['$dueDate', null] }] },
                1, 0
              ]
            }
          }
        }
      }
    ]);
    res.json({ success: true, stats: stats[0] || { total: 0, todo: 0, in_progress: 0, review: 0, done: 0, overdue: 0 } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
