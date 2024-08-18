// src/components/LeftPanel.tsx
import React, { useState, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import { motion } from 'framer-motion';
import { useChat } from './chat-context';
import axios from 'axios';

interface User {
  id: number;
  username: string;
  email: string;
  isOnline: boolean;
  lastSeen: string;
}

const LeftPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState('All');
  const { currentUser, setActiveChat, typingUsers } = useChat();
  const [users, setUsers] = useState<User[]>([]);

  const tabs = ['All', 'Online', 'Offline'];

  useEffect(() => {
    const fetchUsers = async () => {
      if (currentUser) {
        try {
          const response = await axios.get(`http://localhost:3001/users/${currentUser.id}`);
          setUsers(response.data);
        } catch (error) {
          console.error('Error fetching users:', error);
        }
      }
    };

    fetchUsers();
  }, [currentUser]);

  const filteredUsers = users.filter(user => {
    if (activeTab === 'All') return true;
    if (activeTab === 'Online') return user.isOnline;
    if (activeTab === 'Offline') return !user.isOnline;
    return true;
  });

  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      <div className="p-4 bg-white">
        <div className="relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full pl-10 p-2 rounded-lg border border-gray-300"
          />
        </div>
      </div>

      <div className="flex bg-white p-1 space-x-5">
        {tabs.map((tab) => (
          <motion.button
            key={tab}
            className={`flex-1 text-center py-1 px-2 text-xs rounded-full ${
              activeTab === tab ? 'bg-red-500 text-white' : 'bg-gray-200 text-black'
            }`}
            onClick={() => setActiveTab(tab)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {tab}
          </motion.button>
        ))}
      </div>

      <div className="flex-grow overflow-y-auto bg-white">
        {filteredUsers.map((user) => (
          <MessageRow
            key={user.id}
            id={user.id}
            name={user.username}
            isOnline={user.isOnline}
            lastSeen={user.lastSeen}
            isTyping={typingUsers[user.id] || false}
            onClick={() => setActiveChat(user)}
          />
        ))}
      </div>
    </div>
  );
};

interface MessageRowProps {
  id: number;
  name: string;
  isOnline: boolean;
  lastSeen: string;
  isTyping: boolean;
  onClick: () => void;
}

const MessageRow: React.FC<MessageRowProps> = ({ name, isOnline, lastSeen, isTyping, onClick }) => {
  return (
    <motion.div
      className="flex items-center p-3 border-b border-gray-200 bg-white hover:bg-gray-100 cursor-pointer"
      whileHover={{ backgroundColor: '#f3f4f6' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      onClick={onClick}
    >
      <img src="https://picsum.photos/600/300?random=1" alt="Profile" className="w-12 h-12 rounded-full mr-3" />
      <div className="flex-grow">
        <div className="flex items-baseline">
          <span className="font-bold">{name}</span>
          <span className={`ml-2 w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-500'}`}></span>
        </div>
        <p className="text-sm text-gray-600">
          {isTyping ? 'Typing...' : (isOnline ? 'Online' : `Last seen: ${lastSeen}`)}
        </p>
      </div>
    </motion.div>
  );
};

export default LeftPanel;