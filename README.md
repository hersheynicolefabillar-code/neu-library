# 📚 NEU Library Visitor Management System

A full-stack web application for tracking and managing library visitors at **New Era University**. Built with vanilla HTML/CSS/JavaScript frontend, Node.js + Express backend, and Supabase (PostgreSQL) as the database.

---

## 🌐 Live Demo

| Service | URL |
|---|---|
| Frontend | https://neu-library.vercel.app |
| Backend API | https://neu-library-backend.onrender.com |
| Database | Supabase (PostgreSQL) |

---

## ✨ Features

### For Students & Faculty
- Register with NEU institutional email (`@neu.edu.ph` only)
- Fill in complete profile — Student ID, Contact Number, College, Course, Year Level
- Log in securely using Supabase Auth
- Submit library check-ins with purpose of visit
- View a welcome confirmation screen after check-in

### For Administrators
- Dashboard with visitor statistics (Day / Week / Month)
- Breakdown of visitors by College and Purpose
- Search and view all visitor logs
- User management — ban or unban any user

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML, CSS, JavaScript (Vanilla) |
| Backend | Node.js, Express.js |
| Database | Supabase (PostgreSQL) |
| Authentication | Supabase Auth (JWT) |
| Deployment (Frontend) | Vercel |
| Deployment (Backend) | Render |
| Version Control | GitHub |

---

## 📁 Project Structure

```
neu-library/
├── backend/
│   ├── config/
│   │   └── db.js                  # Supabase client (service-role)
│   ├── middleware/
│   │   └── auth.js                # JWT verification + ban check
│   ├── routes/
│   │   ├── auth.js                # Register, Login, Me
│   │   ├── visits.js              # Check-in, My visits
│   │   └── admin.js               # Stats, Logs, User management
│   ├── .env                       # Supabase credentials (not in GitHub)
│   ├── package.json
│   ├── seed.js                    # Seeds sample data into Supabase
│   ├── supabase_schema.sql        # Database schema (run once in Supabase)
│   ├── add_columns.sql            # Adds extra columns to users/visits
│   └── server.js                  # Express entry point
│
└── frontend/
    ├── css/
    │   └── style.css              # NEU brand styles (navy & gold)
    ├── js/
    │   └── app.js                 # API wrapper, Auth helpers, Constants
    ├── index.html                 # Login + Register page
    ├── checkin.html               # Student/Faculty check-in page
    └── admin.html                 # Admin dashboard
```

---

## 🚀 Local Setup

### Prerequisites
- Node.js v18+ — https://nodejs.org
- Supabase account — https://supabase.com
- Git — https://git-scm.com

### Step 1 — Clone the repository
```bash
git clone https://github.com/hersheynicolefabillar-code/neu-library.git
cd neu-library
```

### Step 2 — Set up Supabase
1. Go to https://supabase.com and create a new project
2. Open **SQL Editor** → paste and run `backend/supabase_schema.sql`
3. Then run `backend/add_columns.sql` to add extra columns

### Step 3 — Configure environment variables
Create `backend/.env` with your Supabase credentials:
```env
PORT=5000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Step 4 — Install dependencies and seed
```bash
cd backend
npm install
node seed.js
```

### Step 5 — Start the backend
```bash
npm run dev
```
Server runs at `http://localhost:5000`

### Step 6 — Open the frontend
Open `frontend/index.html` with **Live Server** in VS Code.

---

## 🔑 Default Accounts (after seeding)

| Role | Email | Password |
|---|---|---|
| Admin | admin@neu.edu.ph | admin123 |
| Student | m.santos@neu.edu.ph | password123 |
| Faculty | l.bautista@neu.edu.ph | password123 |

---

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Visits
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/visits` | Submit a check-in |
| GET | `/api/visits/my` | Get my visit history |

### Admin (admin role only)
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/stats?filter=day` | Dashboard statistics |
| GET | `/api/admin/logs?search=&page=1` | All visitor logs |
| GET | `/api/admin/users?search=` | All registered users |
| PATCH | `/api/admin/users/:id/ban` | Ban or unban a user |

---

## 🔒 Security

- Only `@neu.edu.ph` emails are accepted — validated on both frontend and backend
- Passwords are managed by Supabase Auth (bcrypt internally)
- JWT tokens issued and verified by Supabase
- Banned users are blocked at the middleware level
- Service-role key is server-side only — never exposed to the browser
- Row Level Security disabled in favor of server-side service-role protection

---

## 🗄️ Database Tables

### `users`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key (from Supabase Auth) |
| email | TEXT | Institutional email |
| full_name | TEXT | Full name |
| role | TEXT | student / faculty / admin |
| college | TEXT | College / Program |
| course | TEXT | Course (e.g. BSCS) |
| student_id | TEXT | Student ID number |
| contact | TEXT | Contact number |
| year_level | TEXT | Year level |
| status | TEXT | active / banned |
| created_at | TIMESTAMPTZ | Registration date |

### `visits`
| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| user_id | UUID | Reference to users table |
| full_name | TEXT | Visitor's name |
| email | TEXT | Visitor's email |
| college | TEXT | College at time of visit |
| course | TEXT | Course at time of visit |
| student_id | TEXT | Student ID |
| contact | TEXT | Contact number |
| year_level | TEXT | Year level |
| purpose | TEXT | Reason for visit |
| check_in_time | TIMESTAMPTZ | Date and time of check-in |

---

## 👨‍💻 Development

### Push updates to GitHub
```bash
git add .
git commit -m "your message here"
git push
```
Vercel and Render will automatically redeploy on every push.

---

## 📄 License

This project was developed for **New Era University Library** as a Visitor Management System.

© 2026 New Era University Library
