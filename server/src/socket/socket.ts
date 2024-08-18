// src/socket.ts
import { Server as SocketIOServer } from 'socket.io';
import http from 'http';
import { db } from '../db/db';
import { and, eq } from 'drizzle-orm';
import { messages, users } from '../db/schema';
import fs from 'fs';
import path from 'path';

export function setupSocket(server: http.Server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth.userId;

    // Update user status to online
    db.update(users).set({ isOnline: true }).where(eq(users.id, userId)).execute();

    // Join a room with the user's ID
    socket.join(userId);

    // Handle real-time messaging
    socket.on('sendMessage', async (message) => {
      const newMessage = await db.insert(messages).values({
        senderId: message.senderId,
        receiverId: message.receiverId,
        content: message.content,
        timestamp: new Date(),
        isRead: false,
        mediaUrl: message.mediaUrl,
        mediaType: message.mediaType
      }).returning();

      io.to(message.receiverId).emit('newMessage', newMessage[0]);
    });

    // Handle file uploads
    socket.on('uploadFile', async (data, callback) => {
      try {
        const { file, senderId, receiverId, content } = data;
        const fileName = `${Date.now()}-${file.name}`;
        const filePath = path.join(__dirname, '../../uploads', fileName);

        // Create a buffer from the ArrayBuffer
        const buffer = Buffer.from(file.data);

        // Write the file
        fs.writeFileSync(filePath, buffer);

        const mediaUrl = `/uploads/${fileName}`;
        const mediaType = file.type.startsWith('image/') ? 'image' : 'video';

        const newMessage = await db.insert(messages).values({
          senderId,
          receiverId,
          content: content || '',
          timestamp: new Date(),
          isRead: false,
          mediaUrl,
          mediaType
        }).returning();

        io.to(receiverId).emit('newMessage', newMessage[0]);
        callback({ success: true, message: newMessage[0] });
      } catch (error) {
        console.error('File upload error:', error);
        callback({ error: 'File upload failed' });
      }
    });


    // Handle typing indicator
    socket.on('typing', (data) => {
      socket.to(data.receiverId).emit('userTyping', { userId: data.senderId });
    });

    // Handle stop typing
    socket.on('stopTyping', (data) => {
      socket.to(data.receiverId).emit('userStoppedTyping', { userId: data.senderId });
    });

    // Handle marking messages as read
    socket.on('markMessagesAsRead', async (data) => {
        const { senderId, receiverId } = data;
        await db.update(messages)
          .set({ isRead: true })
          .where(
            and(
              eq(messages.senderId, senderId),
              eq(messages.receiverId, receiverId),
              eq(messages.isRead, false)
            )
          )
          .execute();
  
        // Notify the sender that their messages have been read
        io.to(senderId.toString()).emit('messagesRead', { readBy: receiverId });
      });
  
    // Handle disconnect
    socket.on('disconnect', () => {
      db.update(users).set({ isOnline: false }).where(eq(users.id, userId)).execute();
    });
  });

  return io;
}