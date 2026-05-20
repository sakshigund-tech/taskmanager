================================================================================
TASKFLOW — TEAM TASK MANAGER
Full-Stack Web Application
================================================================================

LIVE URL: https://taskmanager-production.up.railway.app
GITHUB:   https://github.com/sakshigund-tech/taskmanager

--------------------------------------------------------------------------------
PROJECT OVERVIEW
--------------------------------------------------------------------------------
TaskFlow is a full-stack collaborative task management application that allows
teams to create projects, assign tasks, track progress, and manage access using
role-based permissions (Admin / Member).

--------------------------------------------------------------------------------
TECH STACK
--------------------------------------------------------------------------------
Backend:
  - Node.js + Express.js (REST API)
  - MongoDB + Mongoose (Database)
  - JSON Web Tokens (Authentication)
  - bcryptjs (Password hashing)
  - express-validator (Input validation)

Frontend:
  - React 18 (SPA)
  - React Router v6 (Navigation)
  - Axios (HTTP client)
  - date-fns (Date formatting)

Deployment:
  - Railway (Backend + Frontend)
  - MongoDB Atlas (Database)

--------------------------------------------------------------------------------
FEATURES
--------------------------------------------------------------------------------

Authentication:
  [x] User registration with name, email, password, role
  [x] Secure login with JWT tokens
  [x] Token stored in localStorage, auto-refresh on load
  [x] Protected routes (redirect to login if unauthenticated)
  [x] Profile endpoint (/api/auth/me)

Role-Based Access Control:
  [x] Global roles: Admin / Member
  [x] Project-level roles: Project Admin / Project Member
  [x] Admins can create/edit/delete projects & tasks
  [x] Admins can add/remove project members
  [x] Members can update status of their assigned tasks
  [x] Members cannot assign tasks to other users

Project Management:
  [x] Create, edit, delete projects
  [x] Project name, description, color, due date, status
  [x] Add/remove team members by email
  [x] Assign project-level roles (admin/member)
  [x] Project status: active / completed / archived
  [x] Task progress bar on project cards

Task Management:
  [x] Create tasks within projects
  [x] Fields: title, description, status, priority, assignee, due date, tags
  [x] Status: todo / in_progress / review / done
  [x] Priority: low / medium / high / urgent
  [x] Kanban board view (drag-free, click to edit)
  [x] List/table view with inline status changes
  [x] Task comments (with user + timestamp)
  [x] Task deletion (admin/creator only)

Dashboard:
  [x] Stats: total, in-progress, done, overdue, my tasks, project count
  [x] Recent task activity feed
  [x] Active project cards with progress bars

Filters & Search:
  [x] Filter tasks by status, priority, assigned-to, overdue
  [x] Clear all filters button
  [x] User search endpoint for adding members

--------------------------------------------------------------------------------
API ENDPOINTS
--------------------------------------------------------------------------------

Auth:
  POST   /api/auth/register       Register new user
  POST   /api/auth/login          Login, returns JWT
  GET    /api/auth/me             Get current user (protected)
  PUT    /api/auth/profile        Update profile (protected)

Projects:
  GET    /api/projects            Get all user's projects
  POST   /api/projects            Create project
  GET    /api/projects/:id        Get project by ID
  PUT    /api/projects/:id        Update project (admin)
  DELETE /api/projects/:id        Delete project + tasks (admin)
  POST   /api/projects/:id/members      Add member by email
  DELETE /api/projects/:id/members/:uid Remove member
  GET    /api/projects/:id/stats  Get task stats for project

Tasks:
  GET    /api/tasks               Get all tasks (with filters)
  POST   /api/tasks               Create task
  GET    /api/tasks/:id           Get task by ID
  PUT    /api/tasks/:id           Update task
  DELETE /api/tasks/:id           Delete task
  POST   /api/tasks/:id/comments  Add comment
  GET    /api/tasks/dashboard/stats  Dashboard statistics

Users:
  GET    /api/users               List all users (admin only)
  GET    /api/users/search?q=     Search users by name/email
  PUT    /api/users/:id/role      Change user role (admin only)

Health:
  GET    /api/health              Health check

--------------------------------------------------------------------------------
DATABASE SCHEMA
--------------------------------------------------------------------------------

User:
  - name (String, required)
  - email (String, unique, required)
  - password (String, hashed, required)
  - role (enum: admin | member, default: member)
  - timestamps

Project:
  - name, description, color, dueDate, status
  - owner (ref: User)
  - members: [{ user (ref: User), role (admin|member) }]
  - timestamps

Task:
  - title, description, tags
  - project (ref: Project)
  - assignedTo (ref: User)
  - createdBy (ref: User)
  - status (todo | in_progress | review | done)
  - priority (low | medium | high | urgent)
  - dueDate
  - comments: [{ user, text, createdAt }]
  - timestamps (indexed on project+status, assignedTo, dueDate)

--------------------------------------------------------------------------------
LOCAL DEVELOPMENT SETUP
--------------------------------------------------------------------------------

Prerequisites:
  - Node.js 18+
  - MongoDB (local or Atlas)
  - npm

1. Clone the repository:
   git clone <your-repo-url>
   cd taskmanager

2. Setup Backend:
   cd backend
   cp .env.example .env
   # Edit .env: set MONGODB_URI and JWT_SECRET
   npm install
   npm run dev        # Runs on http://localhost:5000

3. Setup Frontend:
   cd ../frontend
   cp .env.example .env
   # Edit .env: set REACT_APP_API_URL=http://localhost:5000/api
   npm install
   npm start          # Runs on http://localhost:3000

--------------------------------------------------------------------------------
RAILWAY DEPLOYMENT (Step by Step)
--------------------------------------------------------------------------------

Step 1 — Push code to GitHub
  - Create two GitHub repos OR one monorepo
  - Push backend/ and frontend/ directories

Step 2 — Setup MongoDB Atlas
  - Go to https://cloud.mongodb.com
  - Create a free cluster
  - Get connection string: mongodb+srv://...

Step 3 — Deploy Backend on Railway
  - Go to https://railway.app → New Project → Deploy from GitHub
  - Select your backend repo (or set root directory to /backend)
  - Add environment variables:
      MONGODB_URI=<your atlas connection string>
      JWT_SECRET=<random 64-char string>
      NODE_ENV=production
      CLIENT_URL=<your frontend railway url>  ← add after frontend is up
  - Railway auto-detects Node.js and runs "npm start"
  - Copy the backend Railway URL (e.g. https://taskflow-backend.up.railway.app)

Step 4 — Deploy Frontend on Railway
  - New Service → Deploy from GitHub → select frontend repo
  - Add environment variables:
      REACT_APP_API_URL=https://your-backend.up.railway.app/api
  - Railway builds with "npm run build" then serves with npx serve
  - Copy the frontend Railway URL

Step 5 — Update Backend CLIENT_URL
  - Go back to backend service → Variables
  - Set CLIENT_URL to your frontend Railway URL
  - Redeploy

Step 6 — Test
  - Visit your frontend URL
  - Register an admin account, then a member account
  - Create a project, add tasks, assign to member
  - Verify role restrictions (member can't delete, can't assign to others)

--------------------------------------------------------------------------------
SECURITY NOTES
--------------------------------------------------------------------------------
  - Passwords hashed with bcrypt (12 rounds)
  - JWT expires in 7 days
  - All routes (except register/login) require Bearer token
  - Input validation on all POST/PUT endpoints
  - CORS configured to allow only CLIENT_URL in production
  - No sensitive data returned in API responses (password field excluded)

--------------------------------------------------------------------------------
FOLDER STRUCTURE
--------------------------------------------------------------------------------

taskmanager/
├── backend/
│   ├── src/
│   │   ├── server.js           Entry point
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Project.js
│   │   │   └── Task.js
│   │   ├── routes/
│   │   │   ├── auth.js
│   │   │   ├── projects.js
│   │   │   ├── tasks.js
│   │   │   └── users.js
│   │   └── middleware/
│   │       └── auth.js
│   ├── package.json
│   ├── railway.json
│   └── .env.example
│
└── frontend/
    ├── public/
    │   └── index.html
    ├── src/
    │   ├── App.jsx             Routes
    │   ├── index.js
    │   ├── index.css           Design system
    │   ├── context/
    │   │   └── AuthContext.jsx Auth state
    │   ├── utils/
    │   │   └── api.js          Axios instance
    │   ├── components/
    │   │   └── Layout.jsx      Sidebar + Outlet
    │   └── pages/
    │       ├── Login.jsx
    │       ├── Register.jsx
    │       ├── Dashboard.jsx
    │       ├── Projects.jsx
    │       ├── ProjectDetail.jsx  Kanban + Members
    │       └── Tasks.jsx          Table + Filters
    ├── package.json
    ├── railway.json
    └── .env.example

================================================================================
