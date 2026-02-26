import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, MessageSquare, CheckCircle } from 'lucide-react';
import { SubmitBtn } from './Login';

const C = {
  bg: '#111b21', surface: '#202c33', field: '#2a3942',
  teal: '#00a884', text: '#e9edef', textSub: '#8696a0',
  border: '#2a3942', red: '#f15c6d',
};

const STEPS = [
  { icon: '✉️', text: 'Verify your email to get started' },
  { icon: '🔐', text: 'Your data is encrypted and secure' },
  { icon: '⚡', text: 'Start messaging in seconds' },
];

function PasswordStrength({ password }) {
  const strength = password.length === 0 ? 0
    : password.length < 6 ? 1
      : password.length < 10 ? 2
        : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4
          : 3;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#f15c6d', '#f59e0b', '#00a884', '#00a884'];

  if (!password) return null;
  return (
    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
      {[1, 2, 3, 4].map(n => (
        <div key={n} style={{
          flex: 1, height: 3, borderRadius: 3,
          background: n <= strength ? colors[strength] : C.border,
          transition: 'background 0.3s',
        }} />
      ))}
      <span style={{ color: colors[strength], fontSize: 11, fontWeight: 600, minWidth: 42 }}>
        {labels[strength]}
      </span>
    </div>
  );
}

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showCon, setShowCon] = useState(false);
  const [focus, setFocus] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setError(''); setLoading(true);
    try {
      await register(username, email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const fieldStyle = (key) => ({
    display: 'flex', alignItems: 'center', gap: 10,
    background: C.field, borderRadius: 12, padding: '13px 14px',
    border: `1.5px solid ${focus === key ? C.teal : 'transparent'}`,
    boxShadow: focus === key ? '0 0 0 3px rgba(0,168,132,0.12)' : 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  });
  const iconColor = (key) => ({ color: focus === key ? C.teal : C.textSub, display: 'flex', transition: 'color 0.2s' });
  const inputStyle = {
    flex: 1, background: 'transparent', border: 'none', outline: 'none',
    color: C.text, fontSize: 14, caretColor: C.teal,
  };
  const labelStyle = {
    display: 'block', color: C.textSub, fontSize: 12,
    fontWeight: 600, marginBottom: 8, letterSpacing: 0.5, textTransform: 'uppercase',
  };

  const passwordsMatch = confirm && password === confirm;

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif',
      background: C.bg,
    }}>
      {/* ── LEFT – Branding ─────────────────────────────── */}
      <div style={{
        flex: '0 0 46%', display: 'flex', flexDirection: 'column',
        justifyContent: 'center', padding: '60px 52px',
        background: '#0b141a', position: 'relative', overflow: 'hidden',
      }}>
        {/* Glows */}
        <div style={{ position: 'absolute', top: -80, right: -80, width: 360, height: 360, borderRadius: '50%', background: 'radial-gradient(#00a88414 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -80, left: -40, width: 260, height: 260, borderRadius: '50%', background: 'radial-gradient(#00a88410 0%, transparent 70%)', pointerEvents: 'none' }} />

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 52 }}>
          <div style={{ width: 52, height: 52, borderRadius: 16, background: C.teal, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 6px 20px rgba(0,168,132,0.4)' }}>
            <MessageSquare size={28} color="#fff" />
          </div>
          <div>
            <p style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: -0.5 }}>ChatApp</p>
            <p style={{ margin: 0, fontSize: 12, color: C.teal, fontWeight: 600 }}>Connect · Chat · Play</p>
          </div>
        </div>

        <h1 style={{ margin: '0 0 10px', color: C.text, fontSize: 32, fontWeight: 800, lineHeight: 1.2 }}>
          Join millions of<br />people chatting
        </h1>
        <p style={{ margin: '0 0 48px', color: C.textSub, fontSize: 15, lineHeight: 1.6 }}>
          Create your free account and start connecting with friends and family today.
        </p>

        {/* Steps */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {STEPS.map((s, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 40, height: 40, borderRadius: 12, flexShrink: 0,
                background: 'rgba(0,168,132,0.12)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18,
              }}>{s.icon}</div>
              <p style={{ margin: 0, color: C.textSub, fontSize: 14, lineHeight: 1.5 }}>{s.text}</p>
            </div>
          ))}
        </div>

        {/* Testimonial */}
        <div style={{
          marginTop: 52, padding: '18px 20px',
          background: 'rgba(0,168,132,0.07)',
          borderRadius: 14, border: `1px solid rgba(0,168,132,0.18)`,
        }}>
          <p style={{ margin: '0 0 10px', color: C.text, fontSize: 14, lineHeight: 1.6, fontStyle: 'italic' }}>
            "ChatApp completely replaced WhatsApp for our team. The games feature is incredible!"
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: '#005c4b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: C.teal }}>SH</div>
            <div>
              <p style={{ margin: 0, color: C.text, fontSize: 13, fontWeight: 600 }}>Shashank R.</p>
              <p style={{ margin: 0, color: C.textSub, fontSize: 11 }}>Software Developer</p>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT – Form ─────────────────────────────────── */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: '48px 56px', background: C.bg,
        borderLeft: `1px solid ${C.border}`,
        overflowY: 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 400 }}>
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ margin: 0, color: C.text, fontSize: 28, fontWeight: 800 }}>Create account ✨</h2>
            <p style={{ margin: '8px 0 0', color: C.textSub, fontSize: 14 }}>Fill in the details below to get started</p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              background: 'rgba(241,92,109,0.1)', border: `1px solid rgba(241,92,109,0.3)`,
              borderRadius: 10, padding: '12px 16px', marginBottom: 20,
              color: C.red, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8,
            }}>⚠️ {error}</div>
          )}

          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Username */}
            <div>
              <label style={labelStyle}>Username</label>
              <div style={fieldStyle('user')}>
                <span style={iconColor('user')}><User size={17} /></span>
                <input type="text" value={username} placeholder="johndoe" required
                  onChange={e => setUsername(e.target.value)}
                  onFocus={() => setFocus('user')} onBlur={() => setFocus('')}
                  style={inputStyle} />
              </div>
            </div>

            {/* Email */}
            <div>
              <label style={labelStyle}>Email address</label>
              <div style={fieldStyle('email')}>
                <span style={iconColor('email')}><Mail size={17} /></span>
                <input type="email" value={email} placeholder="you@example.com" required
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocus('email')} onBlur={() => setFocus('')}
                  style={inputStyle} />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={labelStyle}>Password</label>
              <div style={fieldStyle('pwd')}>
                <span style={iconColor('pwd')}><Lock size={17} /></span>
                <input type={showPwd ? 'text' : 'password'} value={password} placeholder="Min. 6 characters" required
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocus('pwd')} onBlur={() => setFocus('')}
                  style={inputStyle} />
                <button type="button" onClick={() => setShowPwd(p => !p)} tabIndex={-1}
                  style={{ background: 'transparent', border: 'none', color: C.textSub, cursor: 'pointer', padding: '0 4px', display: 'flex' }}>
                  {showPwd ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
              <PasswordStrength password={password} />
            </div>

            {/* Confirm Password */}
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <div style={fieldStyle('con')}>
                <span style={iconColor('con')}><Lock size={17} /></span>
                <input type={showCon ? 'text' : 'password'} value={confirm} placeholder="Repeat your password" required
                  onChange={e => setConfirm(e.target.value)}
                  onFocus={() => setFocus('con')} onBlur={() => setFocus('')}
                  style={inputStyle} />
                {passwordsMatch
                  ? <CheckCircle size={17} color={C.teal} />
                  : <button type="button" onClick={() => setShowCon(p => !p)} tabIndex={-1}
                    style={{ background: 'transparent', border: 'none', color: C.textSub, cursor: 'pointer', padding: '0 4px', display: 'flex' }}>
                    {showCon ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                }
              </div>
            </div>

            {/* Terms */}
            <p style={{ margin: 0, color: C.textSub, fontSize: 12, lineHeight: 1.5 }}>
              By signing up you agree to our{' '}
              <span style={{ color: C.teal, cursor: 'pointer' }}>Terms of Service</span> and{' '}
              <span style={{ color: C.teal, cursor: 'pointer' }}>Privacy Policy</span>.
            </p>

            <SubmitBtn loading={loading} label="Create Account" loadingLabel="Creating account…" />
          </form>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: C.border }} />
            <span style={{ color: C.textSub, fontSize: 12 }}>Already have an account?</span>
            <div style={{ flex: 1, height: 1, background: C.border }} />
          </div>

          <Link to="/login" style={{ textDecoration: 'none' }}>
            <div style={{
              width: '100%', padding: 13, borderRadius: 12, textAlign: 'center',
              border: `1.5px solid ${C.teal}`, color: C.teal,
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              boxSizing: 'border-box',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,168,132,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              Sign in instead
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}