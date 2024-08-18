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
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSocket = setupSocket;
// src/socket.ts
const socket_io_1 = require("socket.io");
const db_1 = require("../db/db");
const drizzle_orm_1 = require("drizzle-orm");
const schema_1 = require("../db/schema");
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
                isRead: false
            }).returning();
            io.to(message.receiverId).emit('newMessage', newMessage[0]);
        }));
        // Handle typing indicator
        socket.on('typing', (data) => {
            socket.to(data.receiverId).emit('userTyping', { userId: data.senderId });
        });
        // Handle stop typing
        socket.on('stopTyping', (data) => {
            socket.to(data.receiverId).emit('userStoppedTyping', { userId: data.senderId });
        });
        // Handle disconnect
        socket.on('disconnect', () => {
            db_1.db.update(schema_1.users).set({ isOnline: false }).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId)).execute();
        });
    });
    return io;
}
