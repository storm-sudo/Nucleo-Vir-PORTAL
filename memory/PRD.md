# Nucleo-vir Therapeutics Enterprise Portal

## Product Overview
A comprehensive, responsive enterprise application for Nucleo-vir Therapeutics - a biotech company. The portal provides HR management, lab operations, project management, procurement-to-payment automation, and internal communication tools.

## Core Requirements

### Authentication & Access Control
- **Email/Password Login** for all users
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
8. **Lab Notebook** - Research notes and documentation (rich text with tiptap)
9. **Lab Inventory** - Stock management, request system
10. **Stationary Inventory** - Office supplies tracking (Admin)
11. **Equipment Schedule** - Lab equipment booking
12. **Chat** - Group-based messaging (Admin can create groups)
13. **Calendar** - Event scheduling
14. **Helpdesk** - Internal ticketing system
15. **Work Assignments** - Kanban task board (react-beautiful-dnd)
16. **Portal Guide** - Help documentation
17. **Procurement** - Full P2P automation (NEW - March 2026)

## Procurement Module (NEW - March 2026)

### Users & Roles
- **CA (Chartered Accountant)**: nikita@nucleovir.com - Full procurement access
- **Directors** (for approvals):
  - yogesh.ostwal@nucleovir.com (Priority 1)
  - sunil.k@nucleovir.com (Priority 2)
  - ayush@nucleovir.com (Priority 3)

### Features Implemented
1. **Quotation Management**
   - Upload quotations with OCR data extraction (Tesseract fallback)
   - Manual confirmation for low-confidence OCR (<80%)
   - Status tracking (draft, confirmed, converted_to_po)

2. **Purchase Orders (PO)**
   - Generate POs from approved quotations
   - PDF export with company header, item table, totals, signature blocks
   - 3-quotation rule enforcement for amounts ₹50,001-₹2,00,000

3. **Approval Engine**
   - ≤ ₹50,000: Single Director approval
   - ₹50,001-₹2,00,000: Single Director + 3 quotations required
   - ₹2,00,001-₹10,00,000: All three Directors must approve
   - > ₹10,00,000: Board resolution required

4. **Goods Receipt Notes (GRN)**
   - Create from approved POs
   - QC status tracking (Passed/Failed/Partial)
   - Asset tagging support

5. **Payment Vouchers**
   - Create from GRN after invoice received
   - TDS calculation
   - Mark paid with payment reference

6. **Reports Export**
   - PO Register (CSV, Excel, PDF)
   - Payment Register (CSV, Excel, PDF)
   - Vendor Aging (CSV, Excel, PDF)
   - GST/TDS Report (CSV, Excel, PDF)

7. **Notifications**
   - Bell icon with dropdown in header
   - Unread count badge
   - Links to relevant entity (PO, quotation)

8. **Audit Trail**
   - Full action logging for all state changes
   - 7-year retention policy (no hard deletes)

### API Endpoints
- `POST /api/quotations/upload` - Upload with OCR
- `POST /api/quotations` - Create/update quotation
- `GET /api/quotations` - List quotations
- `GET /api/quotations/{id}` - Get single quotation
- `POST /api/po/generate` - Generate PO from quotation
- `GET /api/po` - List purchase orders
- `GET /api/po/{id}` - Get PO with approvals
- `GET /api/po/{id}/pdf` - Download PO PDF
- `GET /api/approvals/pending` - Pending approvals for user
- `POST /api/approvals/{id}/decision` - Approve/reject
- `POST /api/grn` - Create GRN
- `GET /api/grn` - List GRNs
- `POST /api/vouchers/create` - Create voucher
- `GET /api/vouchers` - List vouchers
- `POST /api/vouchers/{id}/approve` - Approve voucher
- `POST /api/vouchers/{id}/mark-paid` - Record payment
- `GET /api/reports/export` - Export reports
- `GET /api/notifications` - Get notifications
- `POST /api/notifications/{id}/read` - Mark notification read
- `GET /api/procurement/access` - Check user access

## Technical Architecture

### Stack
- **Frontend**: React 18, TailwindCSS, Shadcn UI, React Router, react-beautiful-dnd, tiptap
- **Backend**: FastAPI, Python 3.x
- **Database**: MongoDB (Motor async driver)
- **Auth**: Email/Password with bcrypt hashing

### Key Files
```
/app/
├── backend/
│   ├── server.py          # Main API routes
│   ├── procurement.py     # Procurement module (1400+ lines)
│   ├── requirements.txt
│   └── .env               # MONGO_URL, DB_NAME
├── frontend/
│   ├── src/
│   │   ├── App.js
│   │   ├── config.js
│   │   ├── components/
│   │   │   ├── AppLayout.js     # With notification bell
│   │   │   ├── ui/              # Shadcn components
│   │   │   └── ...
│   │   └── pages/
│   │       ├── Procurement.js   # Full P2P UI
│   │       └── ...
│   └── .env
├── storage/
│   └── Finance/             # Document storage
│       ├── Purchase/Quotations/
│       ├── Purchase/PO/
│       ├── Purchase/GRN/
│       └── PaymentProof/Voucher/
└── memory/
    └── PRD.md
```

## Testing Status (March 2026)
- ✅ 100% backend tests passed (25/25)
- ✅ 100% frontend UI tests passed
- ✅ All procurement endpoints working
- ✅ Role-based access verified
- ✅ Approval workflow tested
- ✅ PDF export working
- ✅ Report exports (CSV, Excel, PDF) working
- ✅ Notification bell with dropdown working

## Test Credentials
- **CA**: nikita@nucleovir.com / Nv@CA2026!
- **Director**: yogesh.ostwal@nucleovir.com / Nv@Dir2026!
- **Director**: sunil.k@nucleovir.com / Nv@Dir2026!
- **Director**: ayush@nucleovir.com / Nv@Dir2026!

## Deployment
- **Preview**: https://staging-repo.preview.emergentagent.com

## Future Enhancements (Backlog)
- [ ] Cloud OCR integration (Google Vision/Azure Form Recognizer)
- [ ] PO template customization with company logo
- [ ] Digital signature support
- [ ] ID Card Generation with barcode/QR
- [ ] PDF Payslip Generation
- [ ] Google Drive Integration for backups
- [ ] Calendar email/in-app reminders
- [ ] Attendance heatmap visualization
