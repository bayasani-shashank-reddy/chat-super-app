import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';

export default function UserList() {
  const { user } = useAuth();
  const socket = useSocket();
  const { userId: selectedUserId } = useParams();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    axios.get('/api/auth/users')
      .then(res => setUsers(res.data))
      .catch(err => console.error('Failed to load users:', err))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('user-online', (userId) => {
      setOnlineUsers(prev => [...prev, userId]);
    });
    socket.on('user-offline', (userId) => {
      setOnlineUsers(prev => prev.filter(id => id !== userId));
    });
    return () => {
      socket.off('user-online');
      socket.off('user-offline');
    };
  }, [socket]);

  if (loading) return <div className="p-4 text-center">Loading contacts...</div>;

  return (
    <div className="h-full flex flex-col bg-gray-50 border-r">
      <div className="p-4 bg-white border-b">
        <h2 className="text-xl font-semibold text-gray-800">Chats</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {users.length === 0 ? (
          <p className="p-4 text-gray-500 text-center">No other users found.</p>
        ) : (
          <ul className="space-y-1 p-2">
            {users.map(u => (
              <li key={u._id}>
                <Link
                  to={`/chat/${u._id}`}
                  className={`flex items-center p-3 rounded-lg transition ${
                    selectedUserId === u._id ? 'bg-blue-100' : 'hover:bg-gray-100'
                  }`}
                >
                  <div className="relative">
                    <img
                      src={u.avatar || '/default-avatar.png'}
                      alt={u.username}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                    {onlineUsers.includes(u._id) && (
                      <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                    )}
                  </div>
                  <div className="ml-3 flex-1 min-w-0">
                    <p className="font-semibold text-gray-800">{u.username}</p>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}