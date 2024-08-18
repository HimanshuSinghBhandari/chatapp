import React, { useState } from 'react';
import { useChat } from './chat-context';
import axios from 'axios';

const UsernamePage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(false);
  const { setCurrentUser } = useChat();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      // Handle login
      if (email.trim() && password.trim()) {
        try {
          const response = await axios.post('http://localhost:3001/login', {
            email,
            password,
          });
          setCurrentUser(response.data.user);
          localStorage.setItem('token', response.data.token);
        } catch (error) {
          console.error('Error logging in:', error);
          alert('Failed to log in. Please check your credentials and try again.');
        }
      }
    } else {
      // Handle signup
      if (username.trim() && email.trim() && password.trim()) {
        try {
          const response = await axios.post('http://localhost:3001/users', {
            username,
            email,
            password,
          });
          setCurrentUser(response.data);
        } catch (error) {
          console.error('Error creating user:', error);
          alert('Failed to create user. Please try again.');
        }
      }
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4">{isLogin ? 'Login to Your Account' : 'Create Your Account'}</h2>
        {!isLogin && (
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            className="w-full p-2 mb-4 border rounded"
            required={!isLogin}
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <button type="submit" className="w-full bg-orange-500 text-white p-2 rounded mb-4">
          {isLogin ? 'Login' : 'Join Chat'}
        </button>
        <button
          type="button"
          onClick={() => setIsLogin(!isLogin)}
          className="w-full bg-gray-200 text-gray-800 p-2 rounded"
        >
          {isLogin ? 'Need an account? Sign up' : 'Already have an account? Login'}
        </button>
      </form>
    </div>
  );
};

export default UsernamePage;