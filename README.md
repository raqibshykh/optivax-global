# SaaS Admin Dashboard — Developer README

This README documents the current project flow, RBAC behaviour, mock infra, and developer instructions added during the dashboard RBAC enhancements.

**Quick start**
- **Install & run**: `npm install` then `npm run dev` (Vite server at `http://localhost:5173`).
- **Type-check:** `npx tsc --noEmit`.

**What changed (high level)**
- **Domain-scoped RBAC**: UI enforces domain-scoped visibility so `*_member` roles see only their assigned items; `*_admin` sees domain items; `management` and `super_admin` see all.
- **Employees pages**: domain-specific routes and menu entries point to `/sales/users`, `/marketing/users`, `/production/users`, `/management/users`, `/admin/users`, `/hr/users` and render `src/pages/HR/Employees.tsx` accordingly.
- **Tasks**: `src/pages/Common/Tasks.tsx` now persists tasks, shows assignee roles, and notifies admins when tasks are completed.
- **Mock server & persistence**: localStorage keys used: `mock_profiles`, `mock_tasks`, `mock_notifications`.
- **Realtime notifications**: when a task is completed the app creates notifications and dispatches a `CustomEvent("saas:notification", { detail })` so the UI (and `useSSE`) can react instantly.

**Developer checklist / flow**
- Start dev server:
```bash
npm install
npm run dev
```
- Type-check changes:
```bash
npx tsc --noEmit
```
- Common dev files to inspect:
  - `src/pages/Common/Tasks.tsx` — task board, persistence, notifications, manager panel.
  - `src/pages/HR/Employees.tsx` — employees list/create/edit with department scoping.
  - `src/mock/server.ts` — intercepts `/saas/v1/profiles/*` for local dev.
  - `src/services/notificationService.ts` — localStorage fallback for notifications (`mock_notifications`).
  - `src/utils/rbac.ts` — permission helpers used across UI.
  - `src/config/menuConfig.ts` and `src/App.tsx` — domain-specific routes and menus.

**LocalStorage keys & reset**
- `mock_profiles`: initial users seeded from `src/mock/users.ts` (reset by clearing this key).
- `mock_tasks`: persisted tasks for the Kanban board.
- `mock_notifications`: notifications created by mock flows (Tasks completion, manual sends).

Reset mocks in the browser console or DevTools Application tab:
```js
localStorage.removeItem('mock_profiles');
localStorage.removeItem('mock_tasks');
localStorage.removeItem('mock_notifications');
```

**Realtime behavior**
- The app supports two realtime mechanisms:
  - SSE: `src/hooks/useSSE.ts` connects to `/notifications/stream` when available and dispatches `saas:notification` events on incoming messages.
  - In-app dispatch: Task completion creates a `saas:notification` `CustomEvent` (same shape as SSE payload) and stores the notification in `mock_notifications`. `src/pages/Admin/Notifications.tsx` listens for this event and refreshes the notification list immediately.

Event shape (payload):
```js
{ id: string, type: 'task'|..., payload: { id, userId, title, message, read, createdAt, actionUrl } }
```

**Notifications UI**
- Notifications are read from the `NotificationService` which falls back to `mock_notifications` when API calls fail (see `src/services/notificationService.ts`).
- The Admin Notifications page (`src/pages/Admin/Notifications.tsx`) will refresh when it receives a `saas:notification` event.

**Tasks & admin notifications flow**
- Members can mark their assigned tasks `done` from the Kanban board (`src/pages/Common/Tasks.tsx`).
- When a task changes to `done`, the app:
  - persists tasks to `mock_tasks` (so changes survive reloads),
  - creates one or more notification records in `mock_notifications` for relevant admins (`*_admin` in the same department, plus `management`, `super_admin`, `hr_admin`),
  - dispatches `saas:notification` events so listeners update in real-time,
  - shows a small success toast to the user.

**Manager panel**
- Managers (`management` role) see a tracking panel in the Tasks page with:
  - grouping by assignee role,
  - filters for role and status,
  - links that navigate to the assignee's employees page (e.g. `/marketing/users?selected=u42`).

**Files I modified during this iteration**
- [src/pages/Common/Tasks.tsx](src/pages/Common/Tasks.tsx)
- [src/pages/HR/Employees.tsx](src/pages/HR/Employees.tsx)
- [src/services/notificationService.ts](src/services/notificationService.ts)
- [src/mock/server.ts](src/mock/server.ts)
- [src/config/menuConfig.ts](src/config/menuConfig.ts)
- [src/App.tsx](src/App.tsx)

**Testing / verification**
- Start dev server and sign in as different mock users (emails available in `src/mock/users.ts`).
- Verify:
  - Member sees only their tasks and can mark them done.
  - Admin receives the notification in `/[domain]/notifications` immediately (no page reload).
  - Manager sees role-grouped tasks and can navigate to employee profiles.

**Next recommended improvements**
- Add a mock `/saas/v1/notifications` and `/saas/v1/tasks` endpoints to `src/mock/server.ts` so the app uses consistent API calls (I can add these if you want).
- Broadcast notifications to other open tabs with `BroadcastChannel` for multi-tab realtime behavior.
- Add tests around `useSSE`, `useNotifications`, and `Tasks` RLS behavior.

If you want, I can now:
- add mock API endpoints for tasks & notifications, or
- add a sidebar unread badge wired to `useNotifications().unreadCount`, or
- implement cross-tab broadcasting with `BroadcastChannel`.

---

If you'd like any section expanded (API examples, diagrams, or commands), tell me which part and I'll add it.
