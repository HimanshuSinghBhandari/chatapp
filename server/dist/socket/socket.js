"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
// src/socket.ts
const socket_io_1 = require("socket.io");
const db_1 = require("../db/db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
function setupSocket(server) {
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: process.env.CLIENT_URL || 'http://localhost:3000',
            methods: ['GET', 'POST']
        }
    });
    io.on('connection', (socket) => {
        const userId = socket.handshake.auth.userId;
        // Update user status to online
        db_1.db.update(schema_1.users).set({ isOnline: true }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).execute();
        // Join a room with the user's ID
        socket.join(userId);
        // Handle real-time messaging
        socket.on('sendMessage', (message) => __awaiter(this, void 0, void 0, function* () {
            const newMessage = yield db_1.db.insert(schema_1.messages).values({
                senderId: message.senderId,
                receiverId: message.receiverId,
                content: message.content,
                timestamp: new Date(),
                isRead: false,
                mediaUrl: message.mediaUrl,
                mediaType: message.mediaType
            }).returning();
            io.to(message.receiverId).emit('newMessage', newMessage[0]);
        }));
        // Handle file uploads
        socket.on('uploadFile', (data, callback) => __awaiter(this, void 0, void 0, function* () {
            try {
                const { file, senderId, receiverId, content } = data;
                const fileName = `${Date.now()}-${file.name}`;
                const filePath = path_1.default.join(__dirname, '../../uploads', fileName);
                // Create a buffer from the ArrayBuffer
                const buffer = Buffer.from(file.data);
                // Write the file
                fs_1.default.writeFileSync(filePath, buffer);
                const mediaUrl = `/uploads/${fileName}`;
                const mediaType = file.type.startsWith('image/') ? 'image' : 'video';
                const newMessage = yield db_1.db.insert(schema_1.messages).values({
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
            }
            catch (error) {
                console.error('File upload error:', error);
                callback({ error: 'File upload failed' });
            }
        }));
        // Handle typing indicator
        socket.on('typing', (data) => {
            socket.to(data.receiverId).emit('userTyping', { userId: data.senderId });
        });
        // Handle stop typing
        socket.on('stopTyping', (data) => {
            socket.to(data.receiverId).emit('userStoppedTyping', { userId: data.senderId });
        });
        // Handle marking messages as read
        socket.on('markMessagesAsRead', (data) => __awaiter(this, void 0, void 0, function* () {
            const { senderId, receiverId } = data;
            yield db_1.db.update(schema_1.messages)
                .set({ isRead: true })
                .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messages.senderId, senderId), (0, drizzle_orm_1.eq)(schema_1.messages.receiverId, receiverId), (0, drizzle_orm_1.eq)(schema_1.messages.isRead, false)))
                .execute();
            // Notify the sender that their messages have been read
            io.to(senderId.toString()).emit('messagesRead', { readBy: receiverId });
        }));
        // Handle disconnect
        socket.on('disconnect', () => {
            db_1.db.update(schema_1.users).set({ isOnline: false }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).execute();
        });
    });
    return io;
}
