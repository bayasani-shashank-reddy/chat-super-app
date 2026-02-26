import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, Eye, EyeOff, ArrowRight, MessageSquare } from 'lucide-react';

/* ── Palette ────────────────────────────────────────────── */
const C = {
  bg: '#111b21',
  surface: '#202c33',
  field: '#2a3942',
  teal: '#00a884',
  tealDark: '#006d57',
  text: '#e9edef',
  textSub: '#8696a0',
  border: '#2a3942',
  red: '#f15c6d',
};

const FEATURES = [
  { emoji: '💬', title: 'Real-time Messaging', desc: 'Instant chat with end-to-end encryption' },
  { emoji: '📞', title: 'HD Voice & Video', desc: 'Crystal-clear calls with anyone, anywhere' },
  { emoji: '🎮', title: 'Multiplayer Games', desc: 'Play Tic Tac Toe, Chess, and more with friends' },
  { emoji: '👥', title: 'Group Chats', desc: 'Stay connected with communities you care about' },
];

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [focus, setFocus] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid email or password.');
    } finally { setLoading(false); }
  };

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
      background: C.bg,
    }}>
      {/* ── LEFT PANEL – Branding ────────────────────────── */}
      <div style={{
        flex: '0 0 48%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 56px',
        background: '#0b141a',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* decorative teal circle */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,168,132,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,168,132,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: C.teal,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 6px 20px rgba(0,168,132,0.4)`,
          }}>
            <MessageSquare size={28} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>
              ChatApp
            </p>
            <p style={{ margin: 0, fontSize: 12, color: C.teal, fontWeight: 600 }}>
              Connect · Chat · Play
            </p>
          </div>
        </div>

        <h1 style={{ margin: '0 0 10px', color: C.text, fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>
          The messaging<br />app you'll love
        </h1>
        <p style={{ margin: '0 0 44px', color: C.textSub, fontSize: 15, lineHeight: 1.6 }}>
          Stay connected with friends, family, and colleagues — all in one beautiful place.
        </p>

        {/* Feature list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {FEATURES.map(f => (
            <div key={f.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div style={{
                width: 42, height: 42, borderRadius: 12, flexShrink: 0,
                background: 'rgba(0,168,132,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 20,
              }}>{f.emoji}</div>
              <div>
                <p style={{ margin: 0, color: C.text, fontSize: 14, fontWeight: 600 }}>{f.title}</p>
                <p style={{ margin: '2px 0 0', color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Encryption note */}
        <div style={{
          marginTop: 44, padding: '10px 16px',
          background: 'rgba(0,168,132,0.08)',
          borderRadius: 10, border: `1px solid rgba(0,168,132,0.2)`,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span>🔒</span>
          <span style={{ color: C.teal, fontSize: 12, fontWeight: 600 }}>
            End-to-end encrypted · Your messages stay private
          </span>
        </div>
      </div>

      {/* ── RIGHT PANEL – Form ───────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', background: C.bg,
        borderLeft: `1px solid ${C.border}`,
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          {/* Heading */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ margin: 0, color: C.text, fontSize: 28, fontWeight: 800 }}>
              Welcome back 👋
            </h2>
            <p style={{ margin: '8px 0 0', color: C.textSub, fontSize: 14 }}>
              Sign in to continue to ChatApp
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(241,92,109,0.1)', border: `1px solid rgba(241,92,109,0.3)`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Email */}
            <FieldGroup label="Email address">
              <InputField
                type="email" value={email} placeholder="you@example.com"
                onChange={e => setEmail(e.target.value)}
                focused={focus === 'email'} onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
                icon={<Mail size={17} />}
              />
            </FieldGroup>

            {/* Password */}
            <FieldGroup label="Password">
              <InputField
                type={showPwd ? 'text' : 'password'} value={password} placeholder="••••••••"
                onChange={e => setPassword(e.target.value)}
                focused={focus === 'pwd'} onFocus={() => setFocus('pwd')} onBlur={() => setFocus('')}
                icon={<Lock size={17} />}
                right={
                  <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1}
                    style={{ background: 'transparent', border: 'none', color: C.textSub, cursor: 'pointer', padding: '0 4px', display: 'flex' }}>
                    {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              />
            </FieldGroup>

            {/* Submit */}
            <SubmitBtn loading={loading} label="Sign in" loadingLabel="Signing in…" />
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '28px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.textSub, fontSize: 12 }}>Don't have an account?</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <Link to="/register" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: '13px', borderRadius: 12, textAlign: 'center',
              border: `1.5px solid ${C.teal}`, color: C.teal,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              transition: 'background 0.2s',
              background: 'transparent',
              boxSizing: 'border-box',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,168,132,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Create new account
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Shared form sub-components ───────────────────────── */
function FieldGroup({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', color: '#8696a0', fontSize: 12, fontWeight: 600, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase' }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function InputField({ type, value, placeholder, onChange, focused, onFocus, onBlur, icon, right }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: '#2a3942', borderRadius: 12, padding: '13px 14px',
      border: `1.5px solid ${focused ? '#00a884' : 'transparent'}`,
      boxShadow: focused ? '0 0 0 3px rgba(0,168,132,0.12)' : 'none',
      transition: 'border-color 0.2s, box-shadow 0.2s',
    }}>
      <span style={{ color: focused ? '#00a884' : '#8696a0', display: 'flex', transition: 'color 0.2s' }}>{icon}</span>
      <input
        type={type} value={value} placeholder={placeholder}
        onChange={onChange} onFocus={onFocus} onBlur={onBlur}
        required
        style={{
          flex: 1, background: 'transparent', border: 'none', outline: 'none',
          color: '#e9edef', fontSize: 14, caretColor: '#00a884',
        }}
      />
      {right}
    </div>
  );
}

export function SubmitBtn({ loading, label, loadingLabel }) {
  const [h, setH] = useState(false);
  return (
    <button type="submit" disabled={loading}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{
        width: '100%', padding: '14px', borderRadius: 12, border: 'none',
        background: loading ? 'rgba(0,168,132,0.5)' : h ? '#008069' : '#00a884',
        color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'wait' : 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        transition: 'background 0.18s, transform 0.12s',
        transform: h && !loading ? 'translateY(-1px)' : 'none',
        boxShadow: h && !loading ? '0 6px 18px rgba(0,168,132,0.35)' : 'none',
      }}
    >
      {loading ? (
        <>
          <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
          {loadingLabel}
        </>
      ) : (
        <>
          {label}
          <ArrowRight size={18} />
        </>
      )}
    </button>
  );
}

/* CSS keyframes for spinner injected once */
if (typeof document !== 'undefined' && !document.getElementById('chatapp-spin')) {
  const s = document.createElement('style');
  s.id = 'chatapp-spin';
  s.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
  document.head.appendChild(s);
}