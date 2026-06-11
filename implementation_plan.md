# Dashboard Expansion Implementation Plan

This plan outlines the approach to extend the **Manager**, **HR Admin**, **Production Admin**, **Sales Admin**, and **Marketing Admin** dashboards with the requested features. We will strictly use mock data and React state (`useState`) to simulate all functionality to ensure it works without requiring a live backend, adhering to the rule of "use mock data only". Existing UI components and styles will be reused.

## User Review Required
Please review the proposed mock features for each dashboard. Once approved, reply "approved" and I will proceed with updating the components.

## Proposed Changes

### 1. Manager Panel (`src/pages/Dashboard/ManagementPanel.tsx`)
**Goal:** High-level workflow viewing and management. No deletion/destructive privileges.
- **Add Sections/Tabs:**
  - **Teams & Employees Overview:** A table listing employees, their roles, and departments.
  - **Projects & Tasks:** A view of ongoing projects. Add a "Assign Project/Task" mock modal/form (only updates local state, no backend call).
  - **Reports & Department Coordination:** A mock analytics section and a placeholder "Message Admin" form.
- **Constraints enforced:** The UI will intentionally lack any "Delete User" or "Remove Employee" buttons.

### 2. HR Admin Panel (`src/pages/Dashboard/HRPanel.tsx`)
**Goal:** Employee, attendance, and leave management.
- **Add Sections:**
  - **Employee Directory (Department-wise):** A table grouped by department. Add an "Add Employee" button opening a mock form.
  - **Leave Requests:** A table showing pending leave requests with "Approve" and "Reject" buttons that update the local state.
  - **Attendance:** A mock calendar or list showing employee attendance status.

### 3. Production Admin Panel (`src/pages/Dashboard/ProductionPanel.tsx`)
**Goal:** Manage assigned projects and task progress.
- **Add Sections:**
  - **Manager-Assigned Tasks/Projects:** Explicit section showing tasks specifically assigned by the Manager.
  - **Production Clients:** A list of clients related to production workflows.
  - **Workflow & Progress:** Add a dropdown/slider to existing tasks/projects to update their status (e.g., "In Progress" -> "Completed") and update the local state.

### 4. Sales Admin Panel (`src/pages/Dashboard/SalesPanel.tsx`)
**Goal:** Leads, deals, commissions, and conversions.
- **Add Sections:**
  - **Deals & Conversions:** Extend the current funnel to track active deals. Add a "Track Deal" button.
  - **Add Client & Lead Management:** Add an "Add Client/Lead" mock form that pushes to the local state list.
  - **Commissions & Stats:** Keep the existing commission cards but add more detailed breakdown statistics.

### 5. Marketing Admin Panel (`src/pages/Dashboard/MarketingPanel.tsx`)
**Goal:** Campaigns, content, and analytics.
- **Add Sections:**
  - **Campaign Management:** A table of active marketing campaigns with a "Create Campaign" mock form.
  - **Content Planning & Social Media:** A Kanban-like or simple list view for social media tasks.
  - **Ad Tracking & Analytics:** Visual mock stats (using existing chart layouts or simple metric cards) for ad performance.

## Implementation Rules to be Followed
- No existing imports or routes will be broken.
- No existing functionality will be removed.
- All additions will be purely frontend mock-state extensions inside the existing Panel files.
- `tsc -b` and `vite build` will be run to ensure zero TypeScript errors.

## Verification Plan
1. Ensure `npm run build` succeeds with zero errors.
2. Verify each of the 5 updated panels renders correctly without blank screens.
