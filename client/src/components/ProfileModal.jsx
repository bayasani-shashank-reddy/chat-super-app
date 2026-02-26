import { useState, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';

/* ─── Palette (matches Home.jsx) ─────────────────────────── */
const C = {
    bg: '#111b21',
    surface: '#202c33',
    border: '#2a3942',
    teal: '#00a884',
    tealDim: '#005c4b',
    text: '#e9edef',
    textSub: '#8696a0',
    red: '#f15c6d',
    inputBg: '#2a3942',
};

const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419', '#1a535c', '#3d405b', '#2b4162'];
function avatarBg(name = '') {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
    return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Field({ label, value, onChange, type = 'text', readOnly = false, placeholder = '' }) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: C.teal, fontWeight: 600, marginBottom: 5, letterSpacing: 0.5 }}>
                {label}
            </label>
            <input
                type={type}
                value={value}
                onChange={onChange}
                readOnly={readOnly}
                placeholder={placeholder}
                style={{
                    width: '100%', boxSizing: 'border-box',
                    background: readOnly ? 'transparent' : C.inputBg,
                    border: `1px solid ${readOnly ? 'transparent' : C.border}`,
                    borderRadius: 8, padding: '10px 14px',
                    color: readOnly ? C.textSub : C.text,
                    fontSize: 14, outline: 'none',
                    transition: 'border-color 0.2s',
                }}
                onFocus={e => { if (!readOnly) e.target.style.borderColor = C.teal; }}
                onBlur={e => { if (!readOnly) e.target.style.borderColor = C.border; }}
            />
        </div>
    );
}

export default function ProfileModal({ onClose }) {
    const { user, updateUser } = useAuth();
    const fileRef = useRef(null);

    const [username, setUsername] = useState(user?.username || '');
    const [displayName, setDisplayName] = useState(user?.displayName || '');
    const [avatarPreview, setAvatarPreview] = useState(user?.avatar || '');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [avatarBase64, setAvatarBase64] = useState(null);

    const handleAvatarChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            setAvatarPreview(ev.target.result);
            setAvatarBase64(ev.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setError('');
        setSuccess('');
        if (newPassword && newPassword !== confirmPassword) {
            setError('New passwords do not match.');
            return;
        }
        if (newPassword && !currentPassword) {
            setError('Enter your current password to set a new one.');
            return;
        }
        setSaving(true);
        try {
            const payload = { username, displayName };
            if (avatarBase64) payload.avatar = avatarBase64;
            if (newPassword) { payload.currentPassword = currentPassword; payload.newPassword = newPassword; }
            await updateUser(payload);
            setSuccess('Profile updated successfully!');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
            setAvatarBase64(null);
        } catch (err) {
            setError(err?.response?.data?.error || 'Failed to update profile.');
        }
        setSaving(false);
    };

    // click outside to close
    const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose(); };

    const displayLabel = user?.displayName || user?.username || 'Me';

    return (
        <div
            onClick={handleBackdrop}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
        >
            <div style={{
                background: C.surface, borderRadius: 16,
                width: 420, maxWidth: '95vw', maxHeight: '90vh',
                overflowY: 'auto', padding: 28,
                boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                border: `1px solid ${C.border}`,
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.text }}>Edit Profile</h2>
                    <button
                        onClick={onClose}
                        style={{ background: 'transparent', border: 'none', color: C.textSub, fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
                    >
                        ✕
                    </button>
                </div>

                {/* Avatar */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24 }}>
                    <div
                        onClick={() => fileRef.current?.click()}
                        style={{
                            position: 'relative', cursor: 'pointer',
                            width: 90, height: 90, borderRadius: '50%',
                            overflow: 'hidden', border: `3px solid ${C.tealDim}`,
                        }}
                    >
                        {avatarPreview ? (
                            <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            <div style={{
                                width: '100%', height: '100%',
                                background: avatarBg(displayLabel),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                fontSize: 28, fontWeight: 700, color: C.teal,
                            }}>
                                {displayLabel.trim().slice(0, 2).toUpperCase()}
                            </div>
                        )}
                        {/* Hover overlay */}
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(0,0,0,0.45)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            opacity: 0,
                            transition: 'opacity 0.2s',
                        }}
                            onMouseEnter={e => e.currentTarget.style.opacity = 1}
                            onMouseLeave={e => e.currentTarget.style.opacity = 0}
                        >
                            <span style={{ fontSize: 22 }}>📷</span>
                        </div>
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
                    <p style={{ margin: '8px 0 0', fontSize: 12, color: C.textSub }}>Click avatar to change photo</p>
                </div>

                {/* Fields */}
                <Field label="USERNAME" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" />
                <Field label="DISPLAY NAME" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="How others see you" />
                <Field label="EMAIL" value={user?.email || ''} readOnly />

                {/* Password Section */}
                <div style={{
                    borderTop: `1px solid ${C.border}`,
                    paddingTop: 16, marginTop: 8, marginBottom: 16
                }}>
                    <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: C.textSub, letterSpacing: 0.5 }}>
                        CHANGE PASSWORD (optional)
                    </p>
                    <Field label="CURRENT PASSWORD" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} type="password" placeholder="••••••••" />
                    <Field label="NEW PASSWORD" value={newPassword} onChange={e => setNewPassword(e.target.value)} type="password" placeholder="••••••••" />
                    <Field label="CONFIRM NEW PASSWORD" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} type="password" placeholder="••••••••" />
                </div>

                {/* Feedback */}
                {error && (
                    <div style={{ background: 'rgba(241,92,109,0.15)', border: `1px solid ${C.red}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: C.red, fontSize: 13 }}>
                        {error}
                    </div>
                )}
                {success && (
                    <div style={{ background: 'rgba(0,168,132,0.15)', border: `1px solid ${C.teal}`, borderRadius: 8, padding: '10px 14px', marginBottom: 14, color: C.teal, fontSize: 13 }}>
                        {success}
                    </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                    <button
                        onClick={onClose}
                        style={{
                            padding: '10px 22px', borderRadius: 8, border: `1px solid ${C.border}`,
                            background: 'transparent', color: C.textSub, fontSize: 14, cursor: 'pointer',
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        style={{
                            padding: '10px 22px', borderRadius: 8, border: 'none',
                            background: C.teal, color: '#fff', fontSize: 14, fontWeight: 600,
                            cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
                            transition: 'opacity 0.2s',
                        }}
                    >
                        {saving ? 'Saving…' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
