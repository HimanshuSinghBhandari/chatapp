// src/context/ChatContext.tsx
import React, { createContext, useState, useEffect, useContext } from 'react';
import io, { Socket } from 'socket.io-client';
import axios from 'axios';
import { debounce } from 'lodash';

interface Message {
  id: number;
  senderId: number;
  receiverId: number;
  content: string;
  timestamp: string;
  isRead: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
}

interface User {
  id: number;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: string;
}

interface ChatContextType {
  socket: Socket | null;
  currentUser: User | null;
  messages: Message[];
  activeChat: User | null;
  unreadMessages: { [userId: number]: number };
  isTyping: boolean;
  typingUsers: { [userId: number]: boolean };
  sendMessage: (content: string, file?: File) => void;
  setActiveChat: (user: User | null) => void;
  setCurrentUser: (user: User) => void;
  fetchMessages: (senderId: number, receiverId: number) => Promise<void>;
  clearUnreadMessages: (userId: number) => void;
  setIsTyping: (isTyping: boolean) => void;
  markMessagesAsRead: () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeChat, setActiveChat] = useState<User | null>(null);
  const [unreadMessages, setUnreadMessages] = useState<{ [userId: number]: number }>({});
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState<{ [userId: number]: boolean }>({});

  useEffect(() => {
    if (currentUser) {
      const newSocket = io('http://localhost:3001', {
        auth: { userId: currentUser.id }
      });
      setSocket(newSocket);

      newSocket.on('newMessage', (message: Message) => {
        setMessages((prevMessages) => {
          if (activeChat && (message.senderId === activeChat.id || message.receiverId === activeChat.id)) {
            return [...prevMessages, message];
          }
          setUnreadMessages((prev) => ({
            ...prev,
            [message.senderId]: (prev[message.senderId] || 0) + 1
          }));
          return prevMessages;
        });
      });

      newSocket.on('userTyping', ({ userId }) => {
        setTypingUsers((prev) => ({ ...prev, [userId]: true }));
      });

      newSocket.on('userStoppedTyping', ({ userId }) => {
        setTypingUsers((prev) => ({ ...prev, [userId]: false }));
      });

      newSocket.on('messagesRead', ({ readBy }) => {
        setMessages((prevMessages) =>
          prevMessages.map((msg) =>
            msg.senderId === currentUser.id && msg.receiverId === readBy
              ? { ...msg, isRead: true }
              : msg
          )
        );
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [currentUser, activeChat]);

  useEffect(() => {
    if (socket && currentUser && activeChat) {
      const debouncedStopTyping = debounce(() => {
        setIsTyping(false);
        socket.emit('stopTyping', { senderId: currentUser.id, receiverId: activeChat.id });
      }, 2000);

      if (isTyping) {
        socket.emit('typing', { senderId: currentUser.id, receiverId: activeChat.id });
      } 

      return () => {
        debouncedStopTyping.cancel();
        if (isTyping) {
            socket.emit('stopTyping', { senderId: currentUser.id, receiverId: activeChat.id });
        }
      };
    }
  }, [isTyping, socket, currentUser, activeChat]);

  const sendMessage = (content: string, file?: File) => {
    if (socket && currentUser && activeChat) {
      if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
          if (event.target && event.target.result) {
            socket.emit('uploadFile', {
              file: {
                name: file.name,
                type: file.type,
                data: event.target.result
              },
              senderId: currentUser.id,
              receiverId: activeChat.id,
              content
            }, (response: { success: boolean; message: Message; error?: string }) => {
              if (response.success) {
                setMessages((prevMessages) => [...prevMessages, response.message]);
              } else {
                console.error('Error sending file:', response.error, 'Full response:', response);
              }
            });
          } else {
            console.error('Failed to read file');
          }
        };
        reader.onerror = function(event){
            console.log('FileReader error:', event.target?.error);
        }
        reader.readAsArrayBuffer(file);
      } else {
        const message = {
          senderId: currentUser.id,
          receiverId: activeChat.id,
          content,
        };
        socket.emit('sendMessage', message);
        setMessages((prevMessages) => [...prevMessages, { ...message, id: Date.now(), timestamp: new Date().toISOString(), isRead: false }]);
      }
      socket.emit('markMessagesAsRead', { senderId: activeChat.id, receiverId: currentUser.id });
    }
  };

  const fetchMessages = async (userId: number, otherUserId: number) => {
    try {
      const response = await axios.get(`http://localhost:3001/messages`, {
        params: { userId, otherUserId, limit: 20, offset: 0 },
      });
      setMessages(response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const clearUnreadMessages = (userId: number) => {
    setUnreadMessages((prev) => ({ ...prev, [userId]: 0 }));
  };

  const markMessagesAsRead = () => {
    if (socket && currentUser && activeChat) {
      socket.emit('markMessagesAsRead', { senderId: activeChat.id, receiverId: currentUser.id });
    }
  };

  return (
    <ChatContext.Provider
      value={{
        socket,
        currentUser,
        messages,
        activeChat,
        unreadMessages,
        isTyping,
        typingUsers,
        sendMessage,
        setActiveChat,
        setCurrentUser,
        fetchMessages,
        clearUnreadMessages,
        setIsTyping,
        markMessagesAsRead,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};