import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';
import ContactList from '../components/ContactList';
import GroupList from '../components/GroupList';
import ProfileModal from '../components/ProfileModal';
import { Phone, Gamepad2, Users, LogOut, MoreVertical } from 'lucide-react';

/* ─── Palette ─────────────────────────────────────────────── */
const C = {
  sidebarBg: '#111b21',
  headerBg: '#202c33',
  tabBar: '#202c33',
  border: '#2a3942',
  teal: '#00a884',
  tealDim: '#005c4b',
  text: '#e9edef',
  textSub: '#8696a0',
  icon: '#aebac1',
  red: '#f15c6d',
};

/* ─── Deterministic avatar ────────────────────────────────── */
const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b', '#2b4162'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function InitialAvatar({ name = '?', src, size = 42 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: C.teal,
      overflow: 'hidden',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.trim().slice(0, 2).toUpperCase()
      }
    </div>
  );
}

/* ─── Small icon button ───────────────────────────────────── */
function IconBtn({ children, onClick, title, dangerColor }) {
  const [h, setH] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? 'rgba(255,255,255,0.07)' : 'transparent',
        border: 'none', borderRadius: 8, padding: 7,
        cursor: 'pointer',
        color: h && dangerColor ? dangerColor : C.icon,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
      }}>
      {children}
    </button>
  );
}

/* ─── Main Layout ─────────────────────────────────────────── */
export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState('chats');
  const [showProfile, setShowProfile] = useState(false);

  useEffect(() => {
    const p = location.pathname.split('/')[1];
    if (['chats', 'calls', 'games', 'groups'].includes(p)) setActiveTab(p);
    else if (p === 'group') setActiveTab('groups');
    else if (p === '') setActiveTab('chats');
  }, [location]);

  const tabs = [
    { id: 'chats', label: 'CHATS' },
    { id: 'calls', label: 'CALLS', icon: Phone },
    { id: 'games', label: 'GAMES', icon: Gamepad2 },
    { id: 'groups', label: 'GROUPS', icon: Users },
  ];

  const displayName = user?.displayName || user?.username || 'Me';

  return (
    <div style={{
      display: 'flex', height: '100vh', overflow: 'hidden',
      fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
      background: C.sidebarBg, color: C.text,
    }}>

      {/* ══════════ LEFT PANEL ══════════ */}
      <aside style={{
        width: 360, minWidth: 280,
        display: 'flex', flexDirection: 'column',
        borderRight: `1px solid ${C.border}`,
        background: C.sidebarBg,
      }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center',
          justifyContent: 'space-between',
          padding: '9px 14px',
          background: C.headerBg,
          flexShrink: 0,
        }}>
          {/* My profile — clickable to open edit modal */}
          <div
            onClick={() => setShowProfile(true)}
            title="Edit Profile"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              cursor: 'pointer', borderRadius: 8, padding: '4px 6px',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ position: 'relative' }}>
              <InitialAvatar name={displayName} src={user?.avatar} size={40} />
              <span style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 10, height: 10, borderRadius: '50%',
                background: C.teal, border: `2px solid ${C.headerBg}`,
              }} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, lineHeight: 1.2 }}>
                {displayName}
              </div>
              <div style={{ fontSize: 11, color: C.teal, display: 'flex', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.teal, display: 'inline-block' }} />
                Connected
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', gap: 2 }}>
            <IconBtn title="Games" onClick={() => { setActiveTab('games'); navigate('/games'); }}>
              <Gamepad2 size={20} />
            </IconBtn>
            <IconBtn title="Groups" onClick={() => { setActiveTab('groups'); navigate('/groups'); }}>
              <Users size={20} />
            </IconBtn>
            <NotificationBell />
            <IconBtn title="More"><MoreVertical size={20} /></IconBtn>
            <IconBtn title="Logout" dangerColor={C.red} onClick={logout}><LogOut size={20} /></IconBtn>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          background: C.tabBar,
          borderBottom: `2px solid ${C.border}`,
          flexShrink: 0,
        }}>
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); navigate(`/${tab.id}`); }}
                style={{
                  flex: 1, padding: '11px 6px 9px',
                  background: 'transparent', border: 'none',
                  borderBottom: isActive ? `3px solid ${C.teal}` : '3px solid transparent',
                  color: isActive ? C.teal : C.textSub,
                  fontSize: 12, fontWeight: 700, letterSpacing: 0.9,
                  cursor: 'pointer', transition: 'color 0.2s, border-color 0.2s',
                  marginBottom: -2,
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = C.text; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = C.textSub; }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Sidebar content — switches between ContactList and GroupList */}
        <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden' }}>
          {activeTab === 'groups' ? <GroupList /> : <ContactList />}
        </div>
      </aside>

      {/* ══════════ MAIN AREA ══════════ */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#0b141a', overflow: 'hidden' }}>
        <Outlet />
      </main>

      {/* Profile modal overlay */}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </div>
  );
}