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
const path_1 = __importDefault(require("path"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const socket_1 = require("./socket/socket");
const db_1 = require("./db/db");
const schema_1 = require("./db/schema");
const drizzle_orm_1 = require("drizzle-orm");
const bcrypt_1 = __importDefault(require("bcrypt"));
dotenv_1.default.config();
const app = (0, express_1.default)();
const server = http_1.default.createServer(app);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Serve static files from the 'uploads' directory
app.use('/uploads', express_1.default.static(path_1.default.join(__dirname, '../uploads')));
// Setup Socket.IO
(0, socket_1.setupSocket)(server);
// API routes
//Create users 
app.post('/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { username, email, password } = req.body;
    try {
        const hashedPassword = yield bcrypt_1.default.hash(password, 10);
        const newUser = yield db_1.db.insert(schema_1.users).values({
            username,
            email,
            password: hashedPassword,
        }).returning();
        res.status(201).json(newUser[0]);
    }
    catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// fetch Users
app.get('/users', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allUsers = yield db_1.db.select().from(schema_1.users);
        res.json(allUsers);
    }
    catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
// get users but exclude the current one:
app.get('/users/:currentUserId', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const currentUserId = parseInt(req.params.currentUserId, 10);
    try {
        const otherUsers = yield db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.ne)(schema_1.users.id, currentUserId));
        res.json(otherUsers);
    }
    catch (error) {
        console.error('Error fetching other users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
//Send and Receiever message store
app.get('/messages', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { userId, otherUserId, limit, offset } = req.query;
    const parsedUserId = parseInt(userId, 10);
    const parsedOtherUserId = parseInt(otherUserId, 10);
    if (isNaN(parsedUserId) || isNaN(parsedOtherUserId)) {
        return res.status(400).json({ error: 'Invalid userId or otherUserId' });
    }
    try {
        const messagesData = yield db_1.db.query.messages.findMany({
            where: (0, drizzle_orm_1.or)((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messages.senderId, parsedUserId), (0, drizzle_orm_1.eq)(schema_1.messages.receiverId, parsedOtherUserId)), (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(schema_1.messages.senderId, parsedOtherUserId), (0, drizzle_orm_1.eq)(schema_1.messages.receiverId, parsedUserId))),
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
// Login route
app.post('/login', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email, password } = req.body;
    try {
        const user = yield db_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.email, email)).limit(1);
        if (user.length === 0) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const isPasswordValid = yield bcrypt_1.default.compare(password, user[0].password);
        if (!isPasswordValid) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = jsonwebtoken_1.default.sign({ userId: user[0].id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        res.json({ user: { id: user[0].id, username: user[0].username, email: user[0].email }, token });
    }
    catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}));
const PORT = process.env.PORT || 3001;
// start the server and Check database Connection.
function startServer() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, db_1.checkDatabaseConnection)();
            server.listen(PORT, () => {
                console.log(`Server running on port ${PORT}`);
            });
        }
        catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    });
}
startServer();
