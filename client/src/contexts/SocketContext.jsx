import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import io from 'socket.io-client';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (!user) return;

    // In dev: localhost:5000. In production: set VITE_SERVER_URL in Vercel env vars
    const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';
    const newSocket = io(SERVER_URL, {
      query: { userId: user.id }
    });

    // Join a personal room named after userId so calls/DMs can reach us by ID
    newSocket.on('connect', () => {
      newSocket.emit('register', user.id);
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};