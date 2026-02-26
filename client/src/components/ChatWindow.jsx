import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';
import {
  Paperclip, Send, Phone, Video, MoreVertical, Globe,
  Image, MapPin, Mic, User, FileText,
  Info, CheckSquare, BellOff, Timer, Heart, List,
  XCircle, Flag, Ban, Trash2, SmilePlus,
} from 'lucide-react';

/* ── Palette ─────────────────────────────────────────────── */
const C = {
  chatBg: '#0b141a',
  sentBg: '#005c4b',
  recvBg: '#202c33',
  headerBg: '#202c33',
  inputBar: '#202c33',
  inputField: '#2a3942',
  teal: '#00a884',
  text: '#e9edef',
  textSub: '#8696a0',
  icon: '#aebac1',
  border: '#2a3942',
  menuBg: '#233138',
};

/* ── Avatar helpers ──────────────────────────────────────── */
const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function InitialAvatar({ name = '?', size = 40 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, fontSize: size * 0.38, fontWeight: 700, color: C.teal,
    }}>
      {name.trim().slice(0, 2).toUpperCase()}
    </div>
  );
}

function IconBtn({ children, onClick, title, hoverTeal }) {
  const [h, setH] = useState(false);
  return (
    <button title={title} onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        background: h ? 'rgba(255,255,255,0.08)' : 'transparent',
        border: 'none', borderRadius: 8, padding: 7, cursor: 'pointer',
        color: h && hoverTeal ? C.teal : C.icon,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.15s, color 0.15s',
      }}>
      {children}
    </button>
  );
}

/* ── Attachment popup items ──────────────────────────────── */
const ATTACH_ITEMS = [
  { icon: Image, label: 'Photos & Videos', color: '#a855f7', accept: 'image/*,video/*' },
  { icon: FileText, label: 'Document', color: '#3b82f6', accept: '*/*' },
  { icon: MapPin, label: 'Location', color: '#22c55e', action: 'location' },
  { icon: Mic, label: 'Audio', color: '#f59e0b', accept: 'audio/*' },
  { icon: User, label: 'Contact', color: '#ec4899', action: 'contact' },
];

/* ── 3-Dot menu sections ─────────────────────────────────── */
const MENU_SECTIONS = [
  [
    { icon: Info, label: 'Contact info' },
    { icon: CheckSquare, label: 'Select messages' },
    { icon: BellOff, label: 'Mute notifications' },
    { icon: Timer, label: 'Disappearing messages' },
    { icon: Heart, label: 'Add to favourites' },
    { icon: List, label: 'Add to list' },
    { icon: XCircle, label: 'Close chat' },
  ],
  [
    { icon: Flag, label: 'Report' },
    { icon: Ban, label: 'Block' },
    { icon: Trash2, label: 'Clear chat', danger: true },
    { icon: Trash2, label: 'Delete chat', danger: true },
  ],
];

/* ── Main component ──────────────────────────────────────── */
export default function ChatWindow({ receiverId }) {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [receiver, setReceiver] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [translating, setTranslating] = useState({});
  const [showAttach, setShowAttach] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  /* Load receiver info and message history */
  useEffect(() => {
    if (!receiverId) return;
    axios.get(`/api/auth/users/${receiverId}`).then(r => setReceiver(r.data)).catch(() => { });
    axios.get(`/api/messages/${receiverId}`).then(r => setMessages(r.data)).catch(() => { });
  }, [receiverId]);

  /* Real-time message updates */
  useEffect(() => {
    if (!socket) return;
    const onRecv = (m) => {
      if (m.sender === receiverId || m.receiver === receiverId) setMessages(p => [...p, m]);
    };
    const onSent = (m) => {
      if (m.receiver === receiverId || m.sender === receiverId) setMessages(p => [...p, m]);
    };
    socket.on('receiveMessage', onRecv);
    socket.on('messageSent', onSent);
    return () => { socket.off('receiveMessage', onRecv); socket.off('messageSent', onSent); };
  }, [socket, receiverId]);

  /* Auto-scroll to latest message */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /* Close popups on outside click */
  useEffect(() => {
    const close = () => { setShowAttach(false); setShowMenu(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, []);

  /* Send text message */
  const sendMessage = () => {
    if (!socket || !input.trim() || !receiverId) return;
    socket.emit('sendMessage', { sender: user.id, receiver: receiverId, content: input });
    setInput('');
  };

  /* File selected from OS picker → upload immediately, then send */
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    e.target.value = ''; // allow same file again
    if (!file || !socket || !receiverId) return;

    setUploadError('');
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = localStorage.getItem('token') || '';
      const res = await axios.post('/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const { fileUrl, fileType } = res.data;
      socket.emit('sendMessage', { sender: user.id, receiver: receiverId, fileUrl, fileType });
    } catch (err) {
      console.error('Upload failed:', err);
      setUploadError('Upload failed. Please try again.');
      setTimeout(() => setUploadError(''), 4000);
    } finally {
      setUploading(false);
    }
  };

  /* Translate a received message */
  const translateMessage = async (msgId, text) => {
    setTranslating(p => ({ ...p, [msgId]: true }));
    try {
      const res = await fetch('https://libretranslate.de/translate', {
        method: 'POST',
        body: JSON.stringify({ q: text, source: 'auto', target: 'en' }),
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setMessages(p => p.map(m => m._id === msgId ? { ...m, translatedContent: data.translatedText } : m));
    } catch {
      alert('Translation service unavailable');
    } finally {
      setTranslating(p => ({ ...p, [msgId]: false }));
    }
  };

  /* Attachment menu item clicked */
  const handleAttachItem = (item, e) => {
    e.stopPropagation();
    setShowAttach(false);
    if (item.action === 'location') {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const url = `https://maps.google.com/?q=${pos.coords.latitude},${pos.coords.longitude}`;
          socket.emit('sendMessage', { sender: user.id, receiver: receiverId, content: `📍 Location: ${url}` });
        },
        () => alert('Location access denied')
      );
    } else if (item.action === 'contact') {
      alert('Contact sharing: select a contact to share.');
    } else if (item.accept) {
      // Set the accept attribute directly and click — one step, no second prompt
      fileInputRef.current.accept = item.accept;
      fileInputRef.current.click();
    }
  };

  /* 3-dot menu action */
  const handleMenuAction = (label, e) => {
    e.stopPropagation();
    setShowMenu(false);
    if (label === 'Clear chat') { if (window.confirm('Clear all messages?')) setMessages([]); }
    else if (label === 'Contact info') { window.alert(`Contact: ${receiver?.username}\nEmail: ${receiver?.email}`); }
    else if (label === 'Block') { window.alert(`${receiver?.username} has been blocked.`); }
    else if (label === 'Report') { window.alert(`${receiver?.username} has been reported.`); }
    else if (label === 'Mute notifications') { window.alert('Notifications muted for this chat.'); }
  };

  /* ── Empty / no chat selected ── */
  if (!receiverId) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', background: C.chatBg, gap: 16,
      }}>
        <div style={{
          width: 88, height: 88, borderRadius: '50%',
          background: 'rgba(0,168,132,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 42,
        }}>💬</div>
        <p style={{ color: C.text, fontSize: 24, fontWeight: 600, margin: 0 }}>ChatApp Web</p>
        <p style={{ color: C.textSub, fontSize: 14, margin: 0, textAlign: 'center', maxWidth: 360 }}>
          Send and receive messages without keeping your phone online.<br />
          Select a contact from the left to start chatting.
        </p>
        <span style={{
          marginTop: 4, padding: '6px 20px',
          border: `1px solid ${C.teal}`, borderRadius: 20,
          color: C.teal, fontSize: 13, fontWeight: 600,
        }}>
          🔒 End-to-end encrypted
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: C.chatBg, position: 'relative' }}>

      {/* ── HEADER ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 16px',
        background: C.headerBg, borderBottom: `1px solid ${C.border}`, flexShrink: 0,
      }}>
        <InitialAvatar name={receiver?.username || '?'} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: C.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {receiver?.username}
          </p>
          <p style={{ margin: 0, fontSize: 12, color: C.teal }}>Online</p>
        </div>

        <div style={{ display: 'flex', gap: 2, position: 'relative' }}>
          <IconBtn title="Video call" onClick={() => navigate(`/calls/${receiverId}?video=true`)}>
            <Video size={20} />
          </IconBtn>
          <IconBtn title="Voice call" onClick={() => navigate(`/calls/${receiverId}`)}>
            <Phone size={20} />
          </IconBtn>

          {/* 3-dot menu */}
          <div style={{ position: 'relative' }}>
            <IconBtn title="More options" onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}>
              <MoreVertical size={20} />
            </IconBtn>
            {showMenu && (
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', top: '110%', right: 0,
                width: 240, borderRadius: 10, background: C.menuBg,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                border: `1px solid ${C.border}`, zIndex: 200, overflow: 'hidden',
              }}>
                {MENU_SECTIONS.map((section, si) => (
                  <div key={si}>
                    {si > 0 && <div style={{ height: 1, background: C.border, margin: '4px 0' }} />}
                    {section.map(item => (
                      <MenuItem key={item.label} item={item} onClick={(e) => handleMenuAction(item.label, e)} />
                    ))}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MESSAGES ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px 6%',
        display: 'flex', flexDirection: 'column', gap: 4,
        scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent',
      }}>
        {messages.map((msg, idx) => {
          const isSent = msg.sender === user.id;
          const showDate = idx === 0 ||
            format(new Date(msg.timestamp), 'yyyyMMdd') !==
            format(new Date(messages[idx - 1].timestamp), 'yyyyMMdd');

          return (
            <div key={msg._id || idx}>
              {showDate && (
                <div style={{ display: 'flex', justifyContent: 'center', margin: '12px 0 8px' }}>
                  <span style={{
                    background: '#182229', color: C.textSub,
                    fontSize: 12, padding: '4px 14px', borderRadius: 8,
                    boxShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}>
                    {format(new Date(msg.timestamp), 'MMM d, yyyy')}
                  </span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start', marginBottom: 2 }}>
                <div style={{ maxWidth: '65%', position: 'relative' }}>
                  <div style={{
                    background: isSent ? C.sentBg : C.recvBg,
                    borderRadius: isSent ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                    padding: '8px 12px 24px 12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                    minWidth: 60, position: 'relative',
                  }}>
                    {msg.content && (
                      <p style={{ margin: 0, color: C.text, fontSize: 14.5, lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {msg.translatedContent || msg.content}
                      </p>
                    )}
                    {msg.translatedContent && (
                      <p style={{ margin: '4px 0 0', color: C.textSub, fontSize: 12, fontStyle: 'italic' }}>Translated</p>
                    )}
                    {msg.fileUrl && (
                      <div style={{ marginTop: msg.content ? 8 : 0 }}>
                        {msg.fileType === 'image' || msg.fileUrl?.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                          <img src={msg.fileUrl} alt="shared"
                            onClick={() => window.open(msg.fileUrl, '_blank')}
                            style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8, cursor: 'pointer', display: 'block' }}
                          />
                        ) : msg.fileType === 'video' || msg.fileUrl?.match(/\.(mp4|webm|ogg)$/i) ? (
                          <video controls src={msg.fileUrl} style={{ maxWidth: '100%', maxHeight: 220, borderRadius: 8 }} />
                        ) : (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer"
                            style={{ color: C.teal, fontSize: 13, textDecoration: 'underline' }}>
                            📎 View file
                          </a>
                        )}
                      </div>
                    )}
                    <span style={{
                      position: 'absolute', bottom: 5, right: 10,
                      fontSize: 11, color: 'rgba(233,237,239,0.5)', whiteSpace: 'nowrap',
                    }}>
                      {format(new Date(msg.timestamp), 'HH:mm')}
                    </span>
                  </div>

                  {/* Translate button for received messages */}
                  {!isSent && msg.content && !msg.translatedContent && (
                    <button onClick={() => translateMessage(msg._id, msg.content)}
                      disabled={translating[msg._id]}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 4,
                        marginTop: 4, background: 'transparent', border: 'none',
                        color: C.textSub, fontSize: 12, cursor: 'pointer', padding: '2px 4px',
                      }}
                      onMouseEnter={e => e.currentTarget.style.color = C.teal}
                      onMouseLeave={e => e.currentTarget.style.color = C.textSub}
                    >
                      <Globe size={12} />
                      {translating[msg._id] ? 'Translating…' : 'Translate'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* ── INPUT BAR ── */}
      <div style={{
        background: C.inputBar, padding: '8px 16px',
        flexShrink: 0, borderTop: `1px solid ${C.border}`,
      }}>
        {/* Upload progress / error banners */}
        {uploading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, padding: '6px 12px', background: 'rgba(0,168,132,0.1)', borderRadius: 8 }}>
            <style>{`@keyframes wa-spin{to{transform:rotate(360deg)}}`}</style>
            <div style={{ width: 14, height: 14, border: '2px solid rgba(0,168,132,0.3)', borderTopColor: C.teal, borderRadius: '50%', flexShrink: 0, animation: 'wa-spin .7s linear infinite' }} />
            <span style={{ color: C.teal, fontSize: 13 }}>Uploading…</span>
          </div>
        )}
        {uploadError && (
          <div style={{ marginBottom: 8, padding: '6px 12px', background: 'rgba(241,92,109,0.1)', borderRadius: 8, color: '#f15c6d', fontSize: 13 }}>
            ⚠️ {uploadError}
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
          <IconBtn title="Emoji" hoverTeal><SmilePlus size={22} /></IconBtn>

          {/* Attach button + popup */}
          <div style={{ position: 'relative' }}>
            <IconBtn title="Attach" hoverTeal onClick={(e) => { e.stopPropagation(); setShowAttach(v => !v); }}>
              <Paperclip size={22} />
            </IconBtn>
            {showAttach && (
              <div onClick={e => e.stopPropagation()} style={{
                position: 'absolute', bottom: '110%', left: 0, marginBottom: 8,
                background: C.menuBg, borderRadius: 12,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
                border: `1px solid ${C.border}`,
                padding: '8px 0', minWidth: 200, zIndex: 200,
              }}>
                {ATTACH_ITEMS.map(item => (
                  <AttachMenuItem key={item.label} item={item} onClick={(e) => handleAttachItem(item, e)} />
                ))}
              </div>
            )}
          </div>

          {/* Single hidden file input — programmatically triggered, never shown to user */}
          <input
            ref={fileInputRef}
            type="file"
            style={{ display: 'none' }}
            onChange={handleFileChange}
          />

          {/* Text input */}
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            placeholder="Type a message…"
            disabled={uploading}
            style={{
              flex: 1, background: C.inputField, border: 'none', outline: 'none',
              borderRadius: 24, padding: '10px 18px',
              color: C.text, fontSize: 15, caretColor: C.teal,
              opacity: uploading ? 0.6 : 1,
            }}
          />

          {/* Send button */}
          <button onClick={sendMessage} title="Send" disabled={uploading}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: C.teal, border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', flexShrink: 0,
              boxShadow: '0 2px 8px rgba(0,168,132,0.4)',
              transition: 'background 0.15s, transform 0.1s',
              opacity: uploading ? 0.6 : 1,
            }}
            onMouseEnter={e => { if (!uploading) { e.currentTarget.style.background = '#008069'; e.currentTarget.style.transform = 'scale(1.05)'; } }}
            onMouseLeave={e => { e.currentTarget.style.background = C.teal; e.currentTarget.style.transform = 'scale(1)'; }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Attachment menu item ────────────────────────────────── */
function AttachMenuItem({ item, onClick }) {
  const [h, setH] = useState(false);
  const Icon = item.icon;
  return (
    <div onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '10px 18px', cursor: 'pointer',
        background: h ? 'rgba(255,255,255,0.06)' : 'transparent',
        transition: 'background 0.15s',
      }}>
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: item.color + '22',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <Icon size={18} color={item.color} />
      </div>
      <span style={{ color: '#e9edef', fontSize: 14 }}>{item.label}</span>
    </div>
  );
}

/* ── 3-dot menu item ─────────────────────────────────────── */
function MenuItem({ item, onClick }) {
  const [h, setH] = useState(false);
  const Icon = item.icon;
  return (
    <div onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12, padding: '11px 16px',
        cursor: 'pointer',
        background: h ? 'rgba(255,255,255,0.05)' : 'transparent',
        transition: 'background 0.15s',
      }}>
      <Icon size={18} color={item.danger ? '#f15c6d' : '#aebac1'} />
      <span style={{ fontSize: 14, color: item.danger ? '#f15c6d' : '#e9edef' }}>
        {item.label}
      </span>
    </div>
  );
}