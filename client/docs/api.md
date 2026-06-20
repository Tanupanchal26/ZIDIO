# IntellMeet — Collaboration Platform API

Base URL: `http://localhost:5000/api/v1`

All authenticated endpoints require:
```
Authorization: Bearer <access_token>
```

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/signup` | Register new user |
| POST | `/auth/login` | Login → returns access + refresh tokens |
| POST | `/auth/logout` | Revoke refresh token |
| POST | `/auth/refresh` | Rotate refresh token |
| POST | `/auth/forgot-password` | Send password reset email |
| POST | `/auth/reset-password/:token` | Reset password |
| GET  | `/auth/verify-email/:token` | Verify email address |

---

## Meetings

All routes require auth + tenant scope.

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| POST | `/meetings` | Create meeting | employee |
| GET | `/meetings` | List meetings (paginated) | employee |
| GET | `/meetings/:id` | Get meeting detail | participant |
| PUT | `/meetings/:id` | Update meeting | host / admin |
| DELETE | `/meetings/:id` | Delete meeting | host / manager |
| POST | `/meetings/:id/invite` | Invite participants | host |
| POST | `/meetings/:id/rsvp` | Respond to invite | invitee |
| POST | `/meetings/:id/start` | Start meeting | host |
| POST | `/meetings/:id/end` | End meeting | host / admin |
| GET | `/meetings/:id/notes` | Get meeting notes | participant |
| PUT | `/meetings/:id/notes` | Upsert meeting notes | participant |

### POST /meetings — Request Body
```json
{
  "title": "Q4 Planning",
  "description": "Optional description",
  "scheduledAt": "2025-02-01T10:00:00Z",
  "maxDuration": 60,
  "participants": ["<userId>"],
  "team": "<teamId>",
  "agenda": [{ "title": "Review goals", "duration": 15, "order": 0 }],
  "isRecurring": false,
  "settings": {
    "waitingRoom": false,
    "muteOnEntry": false,
    "recordingEnabled": false,
    "chatEnabled": true
  }
}
```

### Meeting Status Values
- `scheduled` — not yet started
- `active` — currently in progress
- `ended` — completed

### GET /meetings — Query Params
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number (default: 1) |
| `limit` | number | Items per page (max: 100) |
| `status` | string | Filter by status |
| `search` | string | Search by title |

---

## Teams

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| POST | `/teams` | Create team | employee |
| GET | `/teams` | List my teams | employee |
| GET | `/teams/:id` | Get team detail | member |
| PUT | `/teams/:id` | Update team | team admin |
| DELETE | `/teams/:id` | Delete team | team owner |
| POST | `/teams/:id/members` | Invite member | team admin |
| DELETE | `/teams/:id/members/:userId` | Remove member | team admin / self |
| PATCH | `/teams/:id/members/:userId/role` | Update member role | team owner |
| GET | `/teams/:teamId/channels` | List channels | team member |
| POST | `/teams/:teamId/channels` | Create channel | team member |

### Team Member Roles (RBAC)
| Role | Permissions |
|------|-------------|
| `owner` | Full control, cannot be reassigned via API |
| `admin` | Manage members, channels, settings |
| `member` | Read/write in channels, create channels |
| `guest` | Read-only access |

### POST /teams — Request Body
```json
{
  "name": "Engineering",
  "description": "Backend and frontend engineers",
  "isPrivate": false,
  "settings": {
    "allowGuestInvite": false,
    "notifyOnMessage": true
  }
}
```

---

## Channels

| Method | Endpoint | Description | Min Role |
|--------|----------|-------------|----------|
| GET | `/channels/:id` | Get channel | member |
| PUT | `/channels/:id` | Update channel | creator / team admin |
| DELETE | `/channels/:id` | Archive channel | team admin |
| GET | `/channels/:id/messages` | List messages (paginated) | member |
| POST | `/channels/:id/messages` | Send message | member |
| PUT | `/channels/:id/messages/:msgId` | Edit message | sender |
| DELETE | `/channels/:id/messages/:msgId` | Soft-delete message | sender |
| POST | `/channels/:id/messages/:msgId/react` | Toggle reaction | member |
| POST | `/channels/:id/messages/:msgId/pin` | Pin message | team admin |
| DELETE | `/channels/:id/messages/:msgId/pin` | Unpin message | team admin |

### Channel Types
- `public` — visible to all team members
- `private` — invite-only
- `announcement` — admin-post only
- `dm` — direct message

### POST /channels/:id/messages — Request Body
```json
{
  "content": "Hello team!",
  "mentions": ["<userId>"],
  "attachments": [
    { "url": "https://...", "name": "file.pdf", "mimeType": "application/pdf", "size": 102400 }
  ],
  "parentId": "<messageId>"
}
```

### GET /channels/:id/messages — Query Params
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page (max: 100) |
| `before` | ISO date | Load messages before this timestamp (cursor pagination) |

---

## Notifications

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/notifications` | List notifications (paginated) |
| POST | `/notifications/read-all` | Mark all as read |
| PATCH | `/notifications/:id/read` | Mark single as read |
| DELETE | `/notifications/:id` | Delete notification |

### GET /notifications — Query Params
| Param | Type | Description |
|-------|------|-------------|
| `page` | number | Page number |
| `limit` | number | Items per page |
| `unreadOnly` | boolean | Filter unread only |

### Notification Types
| Type | Trigger |
|------|---------|
| `meeting_invite` | Invited to a meeting |
| `meeting_started` | Meeting has started |
| `meeting_ended` | Meeting has ended |
| `meeting_reminder` | Pre-meeting reminder |
| `team_invite` | Added to a team |
| `team_role_changed` | Role updated in team |
| `channel_mention` | Mentioned in a message |
| `message_reply` | Reply to your message |
| `task_assigned` | Task assigned to you |
| `task_due` | Task due soon |
| `system` | System notification |

---

## Real-Time Socket Events

Connect to: `ws://localhost:5000`

### Channel Chat
| Event (client → server) | Payload | Description |
|------------------------|---------|-------------|
| `channel:join` | `channelId` | Join channel room |
| `channel:message` | `{ channelId, content, mentions?, attachments? }` | Send message |
| `channel:typing` | `{ channelId }` | Broadcast typing indicator |
| `channel:leave` | `channelId` | Leave channel room |

| Event (server → client) | Payload | Description |
|------------------------|---------|-------------|
| `channel:message` | Message object | New message broadcast |
| `channel:typing` | `{ userId, name }` | Typing indicator |

### Meeting
| Event (client → server) | Payload | Description |
|------------------------|---------|-------------|
| `meeting:join` | `roomId` | Join meeting room |
| `meeting:signal` | `{ roomId, signal, to }` | WebRTC signaling |
| `meeting:leave` | `roomId` | Leave meeting room |

| Event (server → client) | Payload | Description |
|------------------------|---------|-------------|
| `meeting:user-joined` | `{ socketId }` | Peer joined |
| `meeting:user-left` | `{ socketId }` | Peer left |
| `meeting:signal` | `{ signal, from }` | WebRTC signal |

### Notifications
| Event (client → server) | Payload | Description |
|------------------------|---------|-------------|
| `notification:subscribe` | `userId` | Subscribe to user room |

| Event (server → client) | Payload | Description |
|------------------------|---------|-------------|
| `notification:new` | Notification object | Real-time push |

---

## Error Response Format
```json
{
  "success": false,
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [{ "field": "title", "message": "title is required" }]
}
```

## Success Response Format
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... }
}
```

## Paginated Response Format
```json
{
  "success": true,
  "statusCode": 200,
  "data": [ ... ],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 20
  }
}
```
