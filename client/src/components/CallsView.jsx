import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { Phone, PhoneMissed, PhoneIncoming, PhoneOutgoing, Video } from 'lucide-react';
import axios from 'axios';

const C = {
  bg: '#111b21',
  surface: '#202c33',
  border: '#2a3942',
  teal: '#00a884',
  text: '#e9edef',
  textSub: '#8696a0',
  red: '#f15c6d',
  green: '#25d366',
  hover: 'rgba(255,255,255,0.05)',
};

const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function SmallAvatar({ name = '?', size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(name), flexShrink: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.36, fontWeight: 700, color: C.teal,
    }}>
      {name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function CallsView() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [incomingCall, setIncomingCall] = useState(null);

  useEffect(() => {
    axios.get('/api/auth/users').then(r => setContacts(r.data)).catch(() => { });
  }, []);

  // Listen for incoming calls from any page while on /calls
  useEffect(() => {
    if (!socket) return;
    const onIncoming = ({ from, offer, callerName, isVideo }) => {
      setIncomingCall({ from, offer, callerName, isVideo });
    };
    socket.on('incoming-call', onIncoming);
    return () => socket.off('incoming-call', onIncoming);
  }, [socket]);

  const callUser = (contactId, video = false) => {
    navigate(`/calls/${contactId}${video ? '?video=true' : ''}`);
  };

  const answerIncoming = () => {
    if (!incomingCall) return;
    // Navigate to calls page with the caller's id — Call.jsx handles answering
    navigate(`/calls/${incomingCall.from}${incomingCall.isVideo ? '?video=true' : ''}`);
    setIncomingCall(null);
  };

  const declineIncoming = () => {
    socket?.emit('decline-call', { to: incomingCall?.from });
    setIncomingCall(null);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b141a', color: C.text, fontFamily: 'Segoe UI, system-ui, sans-serif' }}>

      {/* Incoming call overlay */}
      {incomingCall && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.75)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{
            background: C.surface, borderRadius: 20, padding: '40px 60px',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
            boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          }}>
            <SmallAvatar name={incomingCall.callerName} size={80} />
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: C.text, fontSize: 20, fontWeight: 600, margin: 0 }}>{incomingCall.callerName}</p>
              <p style={{ color: C.teal, fontSize: 14, margin: '6px 0 0' }}>
                Incoming {incomingCall.isVideo ? '📹 video' : '📞 audio'} call…
              </p>
            </div>
            <div style={{ display: 'flex', gap: 32 }}>
              <ActionBtn color={C.red} onClick={declineIncoming} label="Decline">
                <Phone size={24} style={{ transform: 'rotate(135deg)' }} />
              </ActionBtn>
              <ActionBtn color={C.green} onClick={answerIncoming} label="Answer">
                <Phone size={24} />
              </ActionBtn>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: C.surface }}>
        <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: C.text }}>Contacts — Start a Call</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: C.textSub }}>Click 📞 or 📹 to call someone</p>
      </div>

      {/* Contacts */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {contacts.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 60, fontSize: 14 }}>
            No contacts found
          </div>
        ) : contacts.map(contact => (
          <div
            key={contact._id}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 20px', borderBottom: `1px solid ${C.border}`,
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <SmallAvatar name={contact.username} size={44} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text }}>{contact.username}</div>
              <div style={{ fontSize: 12, color: C.textSub }}>{contact.email}</div>
            </div>
            {/* Audio call */}
            <button
              onClick={() => callUser(contact._id, false)}
              title="Audio call"
              style={{
                background: 'rgba(0,168,132,0.15)', border: 'none', borderRadius: '50%',
                width: 38, height: 38, cursor: 'pointer', color: C.teal,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,168,132,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,168,132,0.15)'}
            >
              <Phone size={18} />
            </button>
            {/* Video call */}
            <button
              onClick={() => callUser(contact._id, true)}
              title="Video call"
              style={{
                background: 'rgba(0,168,132,0.15)', border: 'none', borderRadius: '50%',
                width: 38, height: 38, cursor: 'pointer', color: C.teal,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginLeft: 6,
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,168,132,0.3)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,168,132,0.15)'}
            >
              <Video size={18} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActionBtn({ color, onClick, label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button onClick={onClick} style={{
        width: 60, height: 60, borderRadius: '50%',
        background: color, border: 'none', cursor: 'pointer',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px ${color}55`,
      }}>
        {children}
      </button>
      <span style={{ fontSize: 12, color: '#8696a0' }}>{label}</span>
    </div>
  );
}