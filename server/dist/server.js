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
// src/server.ts
const express_1 = __importDefault(require("express"));
const http_1 = __importDefault(require("http"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const socket_1 = require("./socket/socket");
const db_1 = require("./db/db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Setup Socket.IO
(0, socket_1.setupSocket)(server);
// API routes
app.get('/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { senderId, receiverId, limit, offset } = req.query;
    // Parse senderId and receiverId as numbers
    const parsedSenderId = parseInt(senderId, 10);
    const parsedReceiverId = parseInt(receiverId, 10);
    if (isNaN(parsedSenderId) || isNaN(parsedReceiverId)) {
        return res.status(400).json({ error: 'Invalid senderId or receiverId' });
    }
    try {
        const messagesData = yield db_1.db.query.messages.findMany({
            where: (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messages.senderId, parsedSenderId), (0, drizzle_orm_1.eq)(schema_1.messages.receiverId, parsedReceiverId)),
            limit: Number(limit) || 20,
            offset: Number(offset) || 0,
            orderBy: [(0, drizzle_orm_1.desc)(schema_1.messages.timestamp)]
        });
        res.json(messagesData);
    }
    catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
