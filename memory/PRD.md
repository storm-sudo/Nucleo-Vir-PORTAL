# Nucleo-vir Therapeutics Enterprise Portal

## Product Overview
A comprehensive, responsive enterprise application for Nucleo-vir Therapeutics - a biotech company. The portal provides HR management, lab operations, project management, and internal communication tools.

## Core Requirements

### Authentication & Access Control
- **Google OAuth** via Emergent Auth (auth.emergentagent.com)
- **Domain Restriction**: Only @nucleovir.com emails allowed
- **Role-Based Access Control**: Admin, HR, Employee, Accountant, CA, Intern
- **Admin Whitelist**: yogesh.ostwal@nucleovir.com, ayush@nucleovir.com, sunil.k@nucleovir.com, nikita@nucleovir.com, shahebaz.kazi@nucleovir.com

### Modules Implemented
1. **Dashboard** - Stats overview, notifications, quick actions
2. **Employee Management** - CRUD operations, role assignment
3. **Attendance** - Check-in/out, statistics, CSV export (Admin)
4. **Leave Requests** - Request and approval workflow
5. **Payroll** - Salary management, payslip records
6. **Payment Requests** - CA uploads, approval workflow
7. **Projects** - Project tracking with Kanban-style board
8. **Lab Notebook** - Research notes and documentation
9. **Lab Inventory** - Stock management, request system
10. **Stationary Inventory** - Office supplies tracking (Admin)
11. **Equipment Schedule** - Lab equipment booking
12. **Chat** - Group-based messaging (Admin can create groups)
13. **Calendar** - Event scheduling
14. **Helpdesk** - Internal ticketing system
15. **Work Assignments** - Kanban task board
16. **Portal Guide** - Help documentation

## Technical Architecture

### Stack
- **Frontend**: React 18, TailwindCSS, Shadcn UI, React Router
- **Backend**: FastAPI, Python 3.x
- **Database**: MongoDB (Motor async driver)
- **Auth**: Emergent Google OAuth

### Key Files
```
/app/
├── backend/
│   ├── server.py          # All API routes (1600+ lines)
│   ├── requirements.txt
│   └── .env               # MONGO_URL, DB_NAME, CORS_ORIGINS
├── frontend/
│   ├── src/
│   │   ├── App.js         # Main router
│   │   ├── config.js      # Backend URL config (NEW)
│   │   ├── components/
│   │   │   ├── AppLayout.js
│   │   │   ├── ProtectedRoute.js
│   │   │   └── ui/        # Shadcn components
│   │   └── pages/         # All page components
│   └── .env               # REACT_APP_BACKEND_URL
└── memory/
    └── PRD.md             # This file
```

### API Endpoints
- `/api/health` - Health check for deployment
- `/api/auth/session-data` - OAuth session exchange
- `/api/auth/me` - Get current user
- `/api/auth/logout` - Logout
- `/api/employees` - CRUD
- `/api/attendance/*` - Attendance management
- `/api/leave-requests` - Leave management
- `/api/payroll` - Payroll records
- `/api/payment-requests` - Payment workflow
- `/api/projects` - Project management
- `/api/tasks` - Work assignments
- `/api/lab-notebook` - Lab notes
- `/api/inventory` - Lab inventory
- `/api/stationary` - Stationary inventory
- `/api/equipment-bookings` - Equipment scheduling
- `/api/chat/*` - Chat groups and messages
- `/api/calendar/events` - Calendar events
- `/api/helpdesk/tickets` - Support tickets
- `/api/announcements` - Admin announcements
- `/api/notifications` - User notifications
- `/api/dashboard/stats` - Dashboard statistics

## What's Been Implemented (as of Feb 16, 2026)

### Completed Features
- ✅ Landing page with hero, about, services, contact form
- ✅ Google OAuth login with domain restriction
- ✅ Role-based dashboard with stats and notifications
- ✅ Full CRUD for all modules
- ✅ Attendance tracking with statistics and CSV export
- ✅ Leave request workflow
- ✅ Payroll management
- ✅ Payment request workflow
- ✅ Project management
- ✅ Lab notebook with entries
- ✅ Lab inventory with request system
- ✅ Stationary inventory (Admin only)
- ✅ Equipment scheduling
- ✅ Group chat with admin-managed groups
- ✅ Calendar events
- ✅ Helpdesk ticketing
- ✅ Work assignments Kanban board
- ✅ Confirmation dialogs for destructive actions
- ✅ Health check endpoint for deployment

### Recent Fixes (Feb 16, 2026)
1. **Added `/api/health` endpoint** - Fixed deployment restart loop
2. **Fixed Backend URL for Production** - Created `/app/frontend/src/config.js` with fallback to `window.location.origin` for production compatibility
3. **Fixed Auth Endpoint** - Corrected URL to `demobackend.emergentagent.com/auth/v1/env/oauth/session-data`
4. **Updated all 20+ files** to use centralized config for backend URL

## Testing Status
- ✅ All 50 backend API tests passed (100%)
- ✅ Frontend navigation and UI tests passed
- ✅ Authentication flow verified
- ✅ Protected routes working
- ✅ Dashboard loading correctly
- ✅ All CRUD operations functional

## Deployment
- **Preview**: https://biotech-portal-3.preview.emergentagent.com ✅ Working
- **Production**: https://biotech-portal-3.emergent.host (needs redeployment to pick up config changes)

## Future Enhancements (Backlog)
- [ ] ID Card Generation with barcode/QR
- [ ] PDF Payslip Generation
- [ ] Google Drive Integration for backups
- [ ] Calendar email/in-app reminders
- [ ] Attendance heatmap visualization
- [ ] Refactor server.py into modular structure

## Environment Variables
### Backend (.env)
```
MONGO_URL=mongodb://localhost:27017
DB_NAME=test_database
CORS_ORIGINS=*
RESEND_API_KEY=<your_key>
SENDER_EMAIL=onboarding@resend.dev
```

### Frontend (.env)
```
REACT_APP_BACKEND_URL=https://biotech-portal-3.preview.emergentagent.com
WDS_SOCKET_PORT=443
```

## Notes
- Authentication requires @nucleovir.com email domain
- Admins are determined by whitelist in server.py
- Session tokens stored in httpOnly cookies (7 days)
- All MongoDB queries exclude `_id` field to avoid serialization issues
