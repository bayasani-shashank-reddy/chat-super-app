import { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';

/* ─── Palette ─────────────────────────────────────────────── */
const C = {
  surface: '#111b21',
  headerBg: '#202c33',
  border: '#2a3942',
  teal: '#00a884',
  tealDim: '#005c4b',
  text: '#e9edef',
  textSub: '#8696a0',
  inputBg: '#2a3942',
  hover: 'rgba(255,255,255,0.05)',
  red: '#f15c6d',
};

const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b', '#2b4162'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function GroupAvatar({ name = '', src, size = 44 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.36, fontWeight: 700, color: C.teal,
      overflow: 'hidden',
    }}>
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function GroupList() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const [groups, setGroups] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [allUsers, setAllUsers] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Load groups on mount
  useEffect(() => {
    axios.get('/api/groups').then(res => setGroups(res.data));
  }, []);

  // ── Real-time socket listeners ──────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // A new group was created that we are a member of
    const onGroupCreated = (group) => {
      setGroups(prev => {
        const exists = prev.some(g => g._id === group._id);
        return exists ? prev : [group, ...prev];
      });
    };

    // A group we belong to was updated (name / avatar / members changed)
    const onGroupUpdated = (group) => {
      setGroups(prev => prev.map(g => g._id === group._id ? group : g));
    };

    // We were removed from a group
    const onGroupRemoved = ({ groupId }) => {
      setGroups(prev => prev.filter(g => g._id !== groupId));
    };

    socket.on('groupCreated', onGroupCreated);
    socket.on('groupUpdated', onGroupUpdated);
    socket.on('groupRemoved', onGroupRemoved);

    return () => {
      socket.off('groupCreated', onGroupCreated);
      socket.off('groupUpdated', onGroupUpdated);
      socket.off('groupRemoved', onGroupRemoved);
    };
  }, [socket]);

  const openCreate = async () => {
    setShowCreate(true);
    setNewName(''); setNewDesc(''); setSelectedMembers([]); setCreateError('');
    if (allUsers.length === 0) {
      const res = await axios.get('/api/auth/users');
      setAllUsers(res.data);
    }
  };

  const toggleMember = (id) => {
    setSelectedMembers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreate = async () => {
    if (!newName.trim()) { setCreateError('Group name is required.'); return; }
    setCreating(true); setCreateError('');
    try {
      const res = await axios.post('/api/groups', {
        name: newName.trim(),
        description: newDesc.trim(),
        members: selectedMembers,
      });
      // The socket 'groupCreated' event will add it to the list for all members
      // For the creator, also add locally immediately
      setGroups(prev => {
        const exists = prev.some(g => g._id === res.data._id);
        return exists ? prev : [res.data, ...prev];
      });
      setShowCreate(false);
      navigate(`/group/${res.data._id}`);
    } catch (err) {
      setCreateError(err?.response?.data?.error || 'Failed to create group.');
    }
    setCreating(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: `1px solid ${C.border}`,
      }}>
        <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Your Groups</span>
        <button
          onClick={showCreate ? () => setShowCreate(false) : openCreate}
          style={{
            background: showCreate ? 'transparent' : C.teal,
            border: showCreate ? `1px solid ${C.border}` : 'none',
            color: showCreate ? C.textSub : '#fff',
            borderRadius: 8, padding: '6px 14px',
            fontSize: 13, fontWeight: 600, cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {showCreate ? 'Cancel' : '+ New Group'}
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div style={{ background: C.headerBg, padding: 16, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 10 }}>
            <label style={{ fontSize: 11, color: C.teal, fontWeight: 600, display: 'block', marginBottom: 4 }}>GROUP NAME *</label>
            <input
              value={newName} onChange={e => setNewName(e.target.value)}
              placeholder="My awesome group"
              style={{ width: '100%', boxSizing: 'border-box', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 14, outline: 'none' }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 11, color: C.teal, fontWeight: 600, display: 'block', marginBottom: 4 }}>DESCRIPTION</label>
            <input
              value={newDesc} onChange={e => setNewDesc(e.target.value)}
              placeholder="Optional…"
              style={{ width: '100%', boxSizing: 'border-box', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px', color: C.text, fontSize: 14, outline: 'none' }}
            />
          </div>
          {allUsers.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, color: C.teal, fontWeight: 600, display: 'block', marginBottom: 6 }}>
                ADD MEMBERS ({selectedMembers.length} selected)
              </label>
              <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                {allUsers.map(u => {
                  const sel = selectedMembers.includes(u._id);
                  return (
                    <div
                      key={u._id}
                      onClick={() => toggleMember(u._id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10,
                        padding: '6px 8px', borderRadius: 6, cursor: 'pointer',
                        background: sel ? 'rgba(0,168,132,0.15)' : 'transparent',
                        border: `1px solid ${sel ? C.teal : 'transparent'}`,
                        transition: 'all 0.15s',
                      }}
                    >
                      <GroupAvatar name={u.username} src={u.avatar} size={30} />
                      <span style={{ fontSize: 13, color: C.text }}>{u.username}</span>
                      {sel && <span style={{ marginLeft: 'auto', color: C.teal, fontSize: 16 }}>✓</span>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {createError && <div style={{ color: C.red, fontSize: 12, marginBottom: 10 }}>{createError}</div>}
          <button
            onClick={handleCreate} disabled={creating}
            style={{
              width: '100%', background: C.teal, border: 'none',
              borderRadius: 8, padding: '10px 0', color: '#fff',
              fontWeight: 700, fontSize: 14, cursor: creating ? 'not-allowed' : 'pointer',
              opacity: creating ? 0.7 : 1, transition: 'opacity 0.2s',
            }}
          >
            {creating ? 'Creating…' : 'Create Group'}
          </button>
        </div>
      )}

      {/* Group list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {groups.length === 0 ? (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 40, fontSize: 14 }}>
            No groups yet. Create one!
          </div>
        ) : groups.map(group => (
          <div
            key={group._id}
            onClick={() => navigate(`/group/${group._id}`)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '12px 16px', cursor: 'pointer',
              borderBottom: `1px solid ${C.border}`, transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = C.hover}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <GroupAvatar name={group.name} src={group.avatar} size={44} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {group.name}
              </div>
              <div style={{ fontSize: 12, color: C.textSub }}>
                {group.members?.length || 0} members
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}