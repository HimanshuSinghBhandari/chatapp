// import React from 'react'
import LeftPanel from './component/left-panel'
import ChatArea from './component/chat-area'
import UsernamePage from './component/Username-page'
import { ChatProvider, useChat } from './component/chat-context'
import './App.css'

function ChatInterface() {
  return (
    <div className="flex h-screen">
      <div className='w-[40%]'>
        <LeftPanel />
      </div>
      <div className='w-[60%]'>
        <ChatArea />
      </div>
    </div>
  );
}

function AppContent() {
  const { currentUser } = useChat();

  return currentUser ? <ChatInterface /> : <UsernamePage />;
}

function App() {
  return (
    <ChatProvider>
      <AppContent />
    </ChatProvider>
  );
}

export default App;