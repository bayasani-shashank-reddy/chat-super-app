import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import axios from 'axios';

/* ─── Palette ─────────────────────────────────────────────── */
const C = {
  bg: '#0b141a', surface: '#111b21', headerBg: '#202c33',
  border: '#2a3942', teal: '#00a884', tealDim: '#005c4b',
  text: '#e9edef', textSub: '#8696a0',
  msgSent: '#005c4b', msgRecv: '#202c33',
  inputBg: '#2a3942', red: '#f15c6d',
};

const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b', '#2b4162'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function GroupAvatar({ name = '', src, size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: src ? 'transparent' : avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: C.teal, overflow: 'hidden',
    }}>
      {src ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}
function formatTime(ts) {
  if (!ts) return '';
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/* ── Tab labels ── */
const PANELS = { none: 'none', edit: 'edit', addMember: 'addMember', members: 'members' };

export default function GroupChat() {
  const { user } = useAuth();
  const socket = useSocket();
  const { groupId } = useParams();

  const [group, setGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [panel, setPanel] = useState(PANELS.none);

  // Edit state
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editAvatarPreview, setEditAvatarPreview] = useState('');
  const [editAvatarB64, setEditAvatarB64] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  // Add member state
  const [allUsers, setAllUsers] = useState([]);
  const [addSearch, setAddSearch] = useState('');
  const [addingId, setAddingId] = useState(null);
  const [addMsg, setAddMsg] = useState('');

  const messagesEndRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!socket || !user || !groupId) return;
    socket.emit('joinGroup', groupId);

    const handleReceive = (message) => setMessages(prev => [...prev, message]);
    const handleGroupUpdated = (updated) => {
      if (updated._id === groupId) {
        setGroup(updated);
        setEditName(updated.name);
        setEditDesc(updated.description || '');
        setEditAvatarPreview(updated.avatar || '');
      }
    };

    socket.on('receiveGroupMessage', handleReceive);
    socket.on('groupUpdated', handleGroupUpdated);

    axios.get(`/api/groups/${groupId}`).then(res => {
      setGroup(res.data);
      setEditName(res.data.name);
      setEditDesc(res.data.description || '');
      setEditAvatarPreview(res.data.avatar || '');
    });
    axios.get(`/api/groups/${groupId}/messages`).then(res => setMessages(res.data));

    return () => {
      socket.off('receiveGroupMessage', handleReceive);
      socket.off('groupUpdated', handleGroupUpdated);
    };
  }, [groupId, user, socket]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const sendMessage = () => {
    if (!socket || !input.trim()) return;
    socket.emit('sendGroupMessage', { groupId, sender: user.id, content: input });
    setInput('');
  };

  const isAdmin = group?.admins?.some(a => (a._id || a).toString() === user?.id);

  // ── Edit group ──
  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => { setEditAvatarPreview(ev.target.result); setEditAvatarB64(ev.target.result); };
    reader.readAsDataURL(file);
  };

  const handleSaveGroup = async () => {
    setSaving(true); setSaveMsg('');
    try {
      const payload = { name: editName, description: editDesc };
      if (editAvatarB64) payload.avatar = editAvatarB64;
      const res = await axios.put(`/api/groups/${groupId}`, payload);
      setGroup(res.data);
      setSaveMsg('✓ Saved!');
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (err) { setSaveMsg(err?.response?.data?.error || 'Failed.'); }
    setSaving(false);
  };

  // ── Add member ──
  const openAddMember = async () => {
    setPanel(PANELS.addMember);
    setAddMsg(''); setAddSearch('');
    if (allUsers.length === 0) {
      const res = await axios.get('/api/auth/users');
      setAllUsers(res.data);
    }
  };

  const memberIds = new Set(group?.members?.map(m => (m._id || m).toString()) || []);
  const filteredUsers = allUsers.filter(u =>
    !memberIds.has(u._id) &&
    (u.username?.toLowerCase().includes(addSearch.toLowerCase()) ||
      u.email?.toLowerCase().includes(addSearch.toLowerCase()))
  );

  const handleAddMember = async (uid) => {
    setAddingId(uid); setAddMsg('');
    try {
      const res = await axios.post(`/api/groups/${groupId}/members`, { userId: uid });
      setGroup(res.data);
      setAddMsg('✓ Member added!');
      setTimeout(() => setAddMsg(''), 3000);
    } catch (err) { setAddMsg(err?.response?.data?.error || 'Failed to add member.'); }
    setAddingId(null);
  };

  const handleRemoveMember = async (uid) => {
    try {
      await axios.delete(`/api/groups/${groupId}/members/${uid}`);
      setGroup(prev => ({ ...prev, members: prev.members.filter(m => (m._id || m).toString() !== uid) }));
    } catch (err) { console.error(err); }
  };

  // ── No groupId state ──
  if (!groupId) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textSub, fontSize: 15 }}>
      Select a group to start chatting
    </div>
  );
  if (!group) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: C.textSub }}>Loading…</div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.bg }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: C.headerBg, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <GroupAvatar name={group.name} src={group.avatar} size={42} />
          <div>
            <div style={{ fontSize: 16, fontWeight: 600, color: C.text }}>{group.name}</div>
            <div style={{ fontSize: 12, color: C.textSub }}>{group.members?.length || 0} members</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <HeaderBtn active={panel === PANELS.members} onClick={() => setPanel(p => p === PANELS.members ? PANELS.none : PANELS.members)}>👥 Members</HeaderBtn>
          {isAdmin && (
            <>
              <HeaderBtn active={panel === PANELS.addMember} onClick={() => panel === PANELS.addMember ? setPanel(PANELS.none) : openAddMember()}>➕ Add</HeaderBtn>
              <HeaderBtn active={panel === PANELS.edit} onClick={() => setPanel(p => p === PANELS.edit ? PANELS.none : PANELS.edit)}>✏️ Edit</HeaderBtn>
            </>
          )}
        </div>
      </div>

      {/* ── Members panel ── */}
      {panel === PANELS.members && (
        <div style={{ background: C.surface, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, maxHeight: 220, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: 0.5 }}>MEMBERS ({group.members?.length})</p>
          {group.members?.map(m => {
            const uid = m._id || m; const uname = m.username || '?';
            const mIsAdmin = group.admins?.some(a => (a._id || a).toString() === uid.toString());
            return (
              <div key={uid} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <GroupAvatar name={uname} src={m.avatar} size={32} />
                <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{uname}</span>
                {mIsAdmin && <span style={{ fontSize: 10, color: C.teal, border: `1px solid ${C.teal}`, borderRadius: 4, padding: '1px 6px' }}>admin</span>}
                {isAdmin && uid.toString() !== user?.id && (
                  <button onClick={() => handleRemoveMember(uid.toString())} style={{ background: 'transparent', border: 'none', color: C.red, cursor: 'pointer', fontSize: 16 }} title="Remove">✕</button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Add Member panel ── */}
      {panel === PANELS.addMember && isAdmin && (
        <div style={{ background: C.surface, padding: '12px 16px', borderBottom: `1px solid ${C.border}`, maxHeight: 260, overflowY: 'auto' }}>
          <p style={{ margin: '0 0 8px', fontSize: 11, color: C.teal, fontWeight: 700, letterSpacing: 0.5 }}>ADD MEMBER FROM CONTACTS</p>
          <input
            value={addSearch} onChange={e => setAddSearch(e.target.value)}
            placeholder="Search by name or email…"
            style={{ width: '100%', boxSizing: 'border-box', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 12px', color: C.text, fontSize: 13, outline: 'none', marginBottom: 8 }}
          />
          {addMsg && <div style={{ fontSize: 12, color: addMsg.startsWith('✓') ? C.teal : C.red, marginBottom: 6 }}>{addMsg}</div>}
          {filteredUsers.length === 0 ? (
            <p style={{ color: C.textSub, fontSize: 13 }}>All contacts are already in this group</p>
          ) : filteredUsers.map(u => (
            <div key={u._id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <GroupAvatar name={u.username} src={u.avatar} size={30} />
              <span style={{ fontSize: 13, color: C.text, flex: 1 }}>{u.username}</span>
              <button
                onClick={() => handleAddMember(u._id)}
                disabled={addingId === u._id}
                style={{
                  background: C.teal, border: 'none', color: '#fff',
                  borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600,
                  cursor: addingId === u._id ? 'not-allowed' : 'pointer', opacity: addingId === u._id ? 0.6 : 1,
                }}
              >
                {addingId === u._id ? '…' : 'Add'}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit Group panel ── */}
      {panel === PANELS.edit && isAdmin && (
        <div style={{ background: C.surface, padding: '12px 16px', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
              <div onClick={() => fileRef.current?.click()} style={{ cursor: 'pointer', borderRadius: '50%', overflow: 'hidden', width: 52, height: 52, border: `2px solid ${C.tealDim}` }}>
                {editAvatarPreview ? <img src={editAvatarPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : <GroupAvatar name={editName} size={52} />}
              </div>
              <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
              <span style={{ fontSize: 11, color: C.textSub }}>📷 Change</span>
            </div>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 11, color: C.teal, fontWeight: 600, display: 'block', marginBottom: 3 }}>GROUP NAME</label>
                <input value={editName} onChange={e => setEditName(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 14, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontSize: 11, color: C.teal, fontWeight: 600, display: 'block', marginBottom: 3 }}>DESCRIPTION</label>
                <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Optional…" style={{ width: '100%', boxSizing: 'border-box', background: C.inputBg, border: `1px solid ${C.border}`, borderRadius: 6, padding: '7px 10px', color: C.text, fontSize: 14, outline: 'none' }} />
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 6 }}>
              <button onClick={handleSaveGroup} disabled={saving} style={{ background: C.teal, color: '#fff', border: 'none', borderRadius: 8, padding: '8px 18px', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: 13, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving…' : 'Save'}
              </button>
              {saveMsg && <span style={{ fontSize: 11, color: saveMsg.startsWith('✓') ? C.teal : C.red }}>{saveMsg}</span>}
            </div>
          </div>
        </div>
      )}

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px 6px' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: C.textSub, marginTop: 40, fontSize: 14 }}>No messages yet. Say hello! 👋</div>
        )}
        {messages.map((msg, idx) => {
          const isMine = (msg.sender?._id || msg.sender) === user?.id;
          return (
            <div key={idx} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start', marginBottom: 6 }}>
              <div style={{ maxWidth: '68%', background: isMine ? C.msgSent : C.msgRecv, borderRadius: isMine ? '12px 12px 2px 12px' : '12px 12px 12px 2px', padding: '8px 12px', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' }}>
                {!isMine && msg.sender?.username && (
                  <div style={{ fontSize: 12, fontWeight: 700, color: C.teal, marginBottom: 3 }}>{msg.sender.username}</div>
                )}
                {msg.content && <p style={{ margin: 0, fontSize: 14, color: C.text, lineHeight: 1.4 }}>{msg.content}</p>}
                {msg.fileUrl && (
                  msg.fileType === 'image'
                    ? <img src={msg.fileUrl} alt="shared" style={{ maxWidth: '100%', borderRadius: 8 }} />
                    : <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.teal }}>View file</a>
                )}
                <div style={{ fontSize: 11, color: C.textSub, textAlign: 'right', marginTop: 4 }}>{formatTime(msg.timestamp || msg.createdAt)}</div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 16px', background: C.headerBg, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
        <input
          type="text" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message…"
          style={{ flex: 1, background: C.inputBg, border: 'none', borderRadius: 24, padding: '10px 16px', color: C.text, fontSize: 14, outline: 'none' }}
        />
        <button onClick={sendMessage} disabled={!input.trim()} style={{ background: C.teal, border: 'none', borderRadius: '50%', width: 42, height: 42, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: input.trim() ? 'pointer' : 'not-allowed', opacity: input.trim() ? 1 : 0.5, flexShrink: 0, fontSize: 18, transition: 'opacity 0.2s' }}>
          ➤
        </button>
      </div>
    </div>
  );
}

function HeaderBtn({ children, onClick, active }) {
  return (
    <button onClick={onClick} style={{
      background: active ? 'rgba(0,168,132,0.15)' : 'transparent',
      border: `1px solid ${active ? '#00a884' : 'transparent'}`,
      color: active ? '#00a884' : '#8696a0',
      borderRadius: 8, padding: '5px 10px', cursor: 'pointer',
      fontSize: 12, fontWeight: 600, transition: 'all 0.2s',
    }}>
      {children}
    </button>
  );
}