import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import { Search } from 'lucide-react';

const C = {
  bg: '#111b21',
  surface: '#202c33',
  surface2: '#2a3942',
  border: '#2a3942',
  teal: '#00a884',
  tealDim: '#005c4b',
  text: '#e9edef',
  textSub: '#8696a0',
  icon: '#aebac1',
  selected: '#2a3942',
};

// Deterministic avatar background per username
const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b', '#2b4162'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function InitialAvatar({ name = '?', size = 44 }) {
  const initials = name.trim().slice(0, 2).toUpperCase();
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: C.teal,
    }}>
      {initials}
    </div>
  );
}

export default function ContactList() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { userId: selectedUserId } = useParams();

  const [contacts, setContacts] = useState([]);
  const [search, setSearch] = useState('');
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [lastMessages, setLastMessages] = useState({});
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => {
    axios.get('/api/auth/users')
      .then(res => setContacts(res.data))
      .catch(err => console.error('Failed to load contacts:', err));
  }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('user-online', uid => setOnlineUsers(p => [...p, uid]));
    socket.on('user-offline', uid => setOnlineUsers(p => p.filter(id => id !== uid)));
    return () => { socket.off('user-online'); socket.off('user-offline'); };
  }, [socket]);

  useEffect(() => {
    contacts.forEach(contact => {
      axios.get(`/api/messages/${contact._id}?limit=1`)
        .then(res => {
          if (res.data.length > 0)
            setLastMessages(p => ({ ...p, [contact._id]: res.data[0] }));
        })
        .catch(() => { });
    });
  }, [contacts]);

  const filtered = contacts.filter(c =>
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* ── Search bar ── */}
      <div style={{ padding: '8px 12px', background: C.bg }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: C.surface,
          borderRadius: 8,
          padding: '6px 12px',
          border: searchFocus ? `1px solid ${C.teal}` : '1px solid transparent',
          transition: 'border-color 0.2s',
        }}>
          <Search size={16} color={C.textSub} />
          <input
            type="text"
            placeholder="Search contacts…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)}
            onBlur={() => setSearchFocus(false)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: C.text, fontSize: 14,
            }}
          />
        </div>
      </div>

      {/* ── Contact rows ── */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <p style={{ padding: 16, textAlign: 'center', color: C.textSub, fontSize: 13 }}>
            No contacts found
          </p>
        ) : (
          filtered.map(contact => {
            const lastMsg = lastMessages[contact._id];
            const isOnline = onlineUsers.includes(contact._id);
            const isSelected = selectedUserId === contact._id;

            const lastText = lastMsg?.content
              ? lastMsg.content
              : lastMsg?.fileUrl ? '📎 File'
                : 'No messages yet';

            const timeLabel = lastMsg
              ? formatDistanceToNow(new Date(lastMsg.timestamp), { addSuffix: false })
              : '';

            return (
              <ContactRow
                key={contact._id}
                contact={contact}
                isOnline={isOnline}
                isSelected={isSelected}
                lastText={lastText}
                timeLabel={timeLabel}
                onClick={() => navigate(`/chats/${contact._id}`)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}

function ContactRow({ contact, isOnline, isSelected, lastText, timeLabel, onClick }) {
  const [hovered, setHovered] = useState(false);
  const bg = isSelected ? C.selected : hovered ? C.surface2 : 'transparent';

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 16px',
        background: bg,
        cursor: 'pointer',
        transition: 'background 0.15s',
        borderBottom: `1px solid ${C.border}`,
      }}
    >
      {/* Avatar with online dot */}
      <div style={{ position: 'relative' }}>
        <InitialAvatar name={contact.username} size={46} />
        {isOnline && (
          <span style={{
            position: 'absolute', bottom: 2, right: 2,
            width: 11, height: 11, borderRadius: '50%',
            background: '#00a884',
            border: `2px solid ${C.bg}`,
            boxShadow: '0 0 6px rgba(0,168,132,0.6)',
          }} />
        )}
      </div>

      {/* Text area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {contact.username}
          </span>
          {timeLabel && (
            <span style={{ fontSize: 11, color: C.textSub, flexShrink: 0, marginLeft: 8 }}>
              {timeLabel}
            </span>
          )}
        </div>
        <span style={{ fontSize: 13, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
          {lastText}
        </span>
      </div>
    </div>
  );
}