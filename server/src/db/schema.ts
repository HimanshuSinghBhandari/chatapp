import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: text('username').notNull().unique(),
  email: text('email').notNull().unique(),
  password: text('password').notNull(),
  isOnline: boolean('is_online').default(false),
  lastSeen: timestamp('last_seen').defaultNow(),
});

export const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  senderId: serial('sender_id').notNull().references(() => users.id),
  receiverId: serial('receiver_id').notNull().references(() => users.id),
  content: text('content').notNull(),
  timestamp: timestamp('timestamp').defaultNow(),
  isRead: boolean('is_read').default(false),
  mediaUrl: text('media_url'),
  mediaType: text('media_type'),
});
