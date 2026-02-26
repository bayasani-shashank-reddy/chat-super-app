import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Home from './pages/Home';
import Chat from './pages/Chat';
import Call from './pages/Call';
import CallsView from './components/CallsView';
import Games from './pages/Games';
import GameRoom from './pages/GameRoom';
import GroupChat from './pages/GroupChat';
import Dashboard from './pages/Dashboard';

function App() {
  const { user, loading } = useAuth();

  if (loading) return (
    <div style={{
      display: 'flex', height: '100vh', alignItems: 'center', justifyContent: 'center',
      background: '#111b21', color: '#00a884', fontSize: 16, fontWeight: 600,
      fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      Loading…
    </div>
  );

  return (
    <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route path="/" element={user ? <Home /> : <Navigate to="/login" />}>
        <Route index element={<Navigate to="chats" />} />
        <Route path="chats" element={<Chat />} />
        <Route path="chats/:userId" element={<Chat />} />
        <Route path="calls" element={<CallsView />} />
        <Route path="calls/:userId" element={<Call />} />
        <Route path="games" element={<Games />} />
        <Route path="games/:gameType" element={<GameRoom />} />
        {/* groups list is shown in sidebar; main area shows group chat or welcome */}
        <Route path="groups" element={<GroupsWelcome />} />
        <Route path="group/:groupId" element={<GroupChat />} />
      </Route>
    </Routes>
  );
}

/* Simple placeholder shown in the main area when on the Groups tab but no group selected */
function GroupsWelcome() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      height: '100%', gap: 16,
      color: '#8696a0', fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      <div style={{ fontSize: 64 }}>👥</div>
      <p style={{ fontSize: 18, fontWeight: 600, color: '#e9edef', margin: 0 }}>Your Groups</p>
      <p style={{ fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 260 }}>
        Select a group from the sidebar to start chatting, or create a new one with the <strong style={{ color: '#00a884' }}>+ New Group</strong> button.
      </p>
    </div>
  );
}

export default App;