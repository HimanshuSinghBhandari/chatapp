// src/components/ChatArea.tsx
import React, { useState, useEffect, useRef } from 'react';
import { FaPaperPlane, FaImage, FaVideo } from 'react-icons/fa';
import { useChat } from './chat-context';
import { format } from 'date-fns';

const ChatArea: React.FC = () => {
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { 
    currentUser, 
    activeChat, 
    messages, 
    sendMessage, 
    fetchMessages,  
    setIsTyping, 
    typingUsers, 
    markMessagesAsRead 
  } = useChat();

  useEffect(() => {
    if (currentUser && activeChat) {
      fetchMessages(currentUser.id, activeChat.id);
      markMessagesAsRead();
    }
  }, [currentUser, activeChat, fetchMessages, markMessagesAsRead]);

  const handleSendMessage = () => {
    if ((message.trim() || fileInputRef.current?.files?.length) && currentUser && activeChat) {
      const file = fileInputRef.current?.files?.[0];
      sendMessage(message, file);
      setMessage('');
      setIsTyping(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = (type: 'image' | 'video') => {
    if (fileInputRef.current) {
      fileInputRef.current.accept = type === 'image' ? 'image/*' : 'video/*';
      fileInputRef.current.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(e.target.value);
    setIsTyping(true);
  };

  const groupedMessages = messages.reduce((groups, message) => {
    const date = format(new Date(message.timestamp), 'yyyy-MM-dd');
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(message);
    return groups;
  }, {} as { [date: string]: typeof messages });

  return (
    <div className="h-screen bg-white flex flex-col">
      <div className="p-4 bg-gray-100">
        <h2 className="font-bold">Chat with: {activeChat?.username}</h2>
      </div>

      <div className="flex-grow overflow-y-auto p-4">
        {Object.entries(groupedMessages).map(([date, msgs]) => (
          <div key={date}>
            <h3 className="text-center text-sm text-gray-500 my-2">{date}</h3>
            {msgs.map((msg) => (
              <ChatMessage
                key={msg.id}
                text={msg.content}
                isSent={msg.senderId === currentUser?.id}
                mediaUrl={msg.mediaUrl}
                mediaType={msg.mediaType}
                isRead={msg.isRead}
              />
            ))}
          </div>
        ))}
      </div>

      {typingUsers[activeChat?.id || 0] && (
        <div className="p-2 text-sm text-gray-500">
          {activeChat?.username} is typing...
        </div>
      )}

      <div className="p-4 bg-gray-100">
        <div className="flex items-center bg-white rounded-lg p-2">
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            placeholder="Type your message here"
            className="flex-grow outline-none"
          />
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            onChange={handleSendMessage}
          />
          <button className="mx-2 text-gray-500" onClick={() => handleFileUpload('image')}>
            <FaImage />
          </button>
          <button className="mr-2 text-gray-500" onClick={() => handleFileUpload('video')}>
            <FaVideo />
          </button>
          <button
            onClick={handleSendMessage}
            className="bg-orange-500 text-white p-2 rounded-full"
          >
            <FaPaperPlane />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ChatMessageProps {
  text: string;
  isSent: boolean;
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  isRead: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ text, isSent, mediaUrl, mediaType, isRead }) => {
  return (
    <div className={`mb-2 ${isSent ? 'text-right' : 'text-left'}`}>
      <span className={`inline-block p-2 rounded-lg ${isSent ? 'bg-orange-300' : 'bg-white border border-gray-300'}`}>
        {text}
        {mediaUrl && mediaType === 'image' && (
          <img src={mediaUrl} alt="Shared image" className="mt-2 max-w-full h-auto" />
        )}
        {mediaUrl && mediaType === 'video' && (
          <video src={mediaUrl} controls className="mt-2 max-w-full h-auto">
            Your browser does not support the video tag.
          </video>
        )}
      </span>
      {isSent && (
        <div className="text-xs text-gray-500 mt-1">
          {isRead ? 'Read' : 'Sent'}
        </div>
      )}
    </div>
  );
};

export default ChatArea;