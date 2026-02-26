import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Bell } from 'lucide-react';
import axios from 'axios';

const C = {
  bg: '#202c33',
  surface: '#2a3942',
  teal: '#00a884',
  text: '#e9edef',
  textSub: '#8696a0',
  icon: '#aebac1',
  red: '#f15c6d',
};

export default function NotificationBell() {
  const { user } = useAuth();
  const socket = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!socket || !user) return;
    socket.emit('joinNotificationRoom', user.id);
    const handle = (notif) => setNotifications(p => [notif, ...p]);
    socket.on('newNotification', handle);
    axios.get('/api/notifications').then(res => setNotifications(res.data));
    return () => socket.off('newNotification', handle);
  }, [user, socket]);

  const markAsRead = async (id) => {
    await axios.put(`/api/notifications/${id}/read`);
    setNotifications(p => p.filter(n => n._id !== id));
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        title="Notifications"
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 36, height: 36, borderRadius: 8,
          background: hovered ? 'rgba(255,255,255,0.07)' : 'transparent',
          border: 'none', cursor: 'pointer',
          color: hovered ? C.text : C.icon,
          transition: 'background 0.15s, color 0.15s',
        }}
      >
        <Bell size={20} />
        {notifications.length > 0 && (
          <span style={{
            position: 'absolute', top: 4, right: 4,
            width: 16, height: 16, borderRadius: '50%',
            background: C.red, color: '#fff',
            fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 6px rgba(241,92,109,0.5)`,
          }}>
            {notifications.length > 9 ? '9+' : notifications.length}
          </span>
        )}
      </button>

      {showDropdown && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 6px)',
          width: 280, borderRadius: 10, overflow: 'hidden',
          background: C.bg,
          border: `1px solid ${C.surface}`,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          zIndex: 999,
        }}>
          <div style={{ padding: '12px 16px', borderBottom: `1px solid ${C.surface}` }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.4 }}>Notifications</span>
          </div>

          {notifications.length === 0 ? (
            <p style={{ padding: '16px', textAlign: 'center', fontSize: 13, color: C.textSub }}>
              You're all caught up 🎉
            </p>
          ) : (
            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {notifications.map(notif => (
                <NotifRow key={notif._id} notif={notif} onDismiss={markAsRead} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NotifRow({ notif, onDismiss }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      onClick={() => onDismiss(notif._id)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '10px 16px',
        background: hovered ? 'rgba(0,168,132,0.08)' : 'transparent',
        borderBottom: `1px solid ${C.surface}`,
        cursor: 'pointer',
        transition: 'background 0.15s',
      }}
    >
      <p style={{ fontSize: 13, color: C.text, marginBottom: 2 }}>{notif.content}</p>
      <p style={{ fontSize: 11, color: C.textSub }}>Tap to dismiss</p>
    </div>
  );
}