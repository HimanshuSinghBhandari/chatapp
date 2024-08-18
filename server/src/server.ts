// src/server.ts
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import jwt from 'jsonwebtoken';
import { setupSocket } from './socket/socket';
import { db, checkDatabaseConnection } from './db/db';
import { messages, users } from './db/schema';
import { and, desc, eq, ne, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';

dotenv.config();

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Serve static files from the 'uploads' directory
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Setup Socket.IO
setupSocket(server);

// API routes
//Create users 
app.post('/users', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await db.insert(users).values({
      username,
      email,
      password: hashedPassword,
    }).returning();

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// fetch Users

app.get('/users', async (req, res) => {
  try {
    const allUsers = await db.select().from(users);
    res.json(allUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// get users but exclude the current one:

app.get('/users/:currentUserId', async (req, res) => {
  const currentUserId = parseInt(req.params.currentUserId, 10);
  
  try {
    const otherUsers = await db.select().from(users).where(ne(users.id, currentUserId));
    res.json(otherUsers);
  } catch (error) {
    console.error('Error fetching other users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

//Send and Receiever message store
app.get('/messages', async (req, res) => {
  const { userId, otherUserId, limit, offset } = req.query;

  const parsedUserId = parseInt(userId as string, 10);
  const parsedOtherUserId = parseInt(otherUserId as string, 10);

  if (isNaN(parsedUserId) || isNaN(parsedOtherUserId)) {
    return res.status(400).json({ error: 'Invalid userId or otherUserId' });
  }

  try {
    const messagesData = await db.query.messages.findMany({
      where: or(
        and(
          eq(messages.senderId, parsedUserId),
          eq(messages.receiverId, parsedOtherUserId)
        ),
        and(
          eq(messages.senderId, parsedOtherUserId),
          eq(messages.receiverId, parsedUserId)
        )
      ),
      limit: Number(limit) || 20,
      offset: Number(offset) || 0,
      orderBy: [desc(messages.timestamp)]
    });

    res.json(messagesData);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await db.select().from(users).where(eq(users.email, email)).limit(1);

    if (user.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isPasswordValid = await bcrypt.compare(password, user[0].password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ userId: user[0].id }, process.env.JWT_SECRET!, { expiresIn: '1h' });

    res.json({ user: { id: user[0].id, username: user[0].username, email: user[0].email }, token });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

const PORT = process.env.PORT || 3001;

// start the server and Check database Connection.
async function startServer() {
  try {
    await checkDatabaseConnection();
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();