"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messages = exports.users = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
exports.users = (0, pg_core_1.pgTable)('users', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    username: (0, pg_core_1.text)('username').notNull().unique(),
    email: (0, pg_core_1.text)('email').notNull().unique(),
    password: (0, pg_core_1.text)('password').notNull(),
    isOnline: (0, pg_core_1.boolean)('is_online').default(false),
    lastSeen: (0, pg_core_1.timestamp)('last_seen').defaultNow(),
});
exports.messages = (0, pg_core_1.pgTable)('messages', {
    id: (0, pg_core_1.serial)('id').primaryKey(),
    senderId: (0, pg_core_1.serial)('sender_id').notNull().references(() => exports.users.id),
    receiverId: (0, pg_core_1.serial)('receiver_id').notNull().references(() => exports.users.id),
    content: (0, pg_core_1.text)('content').notNull(),
    timestamp: (0, pg_core_1.timestamp)('timestamp').defaultNow(),
    isRead: (0, pg_core_1.boolean)('is_read').default(false),
    mediaUrl: (0, pg_core_1.text)('media_url'),
});
