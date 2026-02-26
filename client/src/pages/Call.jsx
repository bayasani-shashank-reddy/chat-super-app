import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';
import Peer from 'simple-peer';
import { Mic, MicOff, Video, VideoOff, PhoneOff, Phone } from 'lucide-react';
import axios from 'axios';

const C = {
  bg: '#111b21',
  surface: '#202c33',
  teal: '#00a884',
  red: '#f15c6d',
  text: '#e9edef',
  textSub: '#8696a0',
};

const AVATAR_COLORS = ['#005c4b', '#1d3557', '#6a3d9a', '#7a4419'];
function avatarBg(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffffffff;
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function Avatar({ name = '?', size = 80 }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: avatarBg(name),
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 700, color: C.teal,
    }}>
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default function Call() {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();
  const { userId: remoteUserId } = useParams();
  const [searchParams] = useSearchParams();
  const isVideoCall = searchParams.get('video') === 'true';

  const [stream, setStream] = useState(null);
  const [callAccepted, setCallAccepted] = useState(false);
  const [callEnded, setCallEnded] = useState(false);
  const [calling, setCalling] = useState(false);
  const [incomingCall, setIncomingCall] = useState(null);
  const [remoteUser, setRemoteUser] = useState(null);
  const [audioMuted, setAudioMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(!isVideoCall);
  const [callError, setCallError] = useState('');

  const myVideo = useRef();
  const userVideo = useRef();
  const connectionRef = useRef();
  const streamRef = useRef();   // keep ref in sync for cleanup in callbacks

  /* ── Get media stream ── */
  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: isVideoCall, audio: true })
      .then(s => {
        setStream(s);
        streamRef.current = s;
        if (myVideo.current) myVideo.current.srcObject = s;
      })
      .catch(() => setCallError('Camera/microphone access denied. Please allow permissions.'));

    if (remoteUserId) {
      axios.get(`/api/auth/users/${remoteUserId}`)
        .then(r => setRemoteUser(r.data))
        .catch(() => { });
    }

    return () => {
      streamRef.current?.getTracks().forEach(t => t.stop());
      connectionRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remoteUserId]);

  /* ── Socket events ── */
  useEffect(() => {
    if (!socket) return;

    const onIncoming = ({ from, offer, callerName, isVideo }) => {
      setIncomingCall({ from, offer, callerName: callerName || 'Someone', isVideo });
    };

    const onAnswered = ({ answer }) => {
      connectionRef.current?.signal(answer);
      setCallAccepted(true);
    };

    const onIce = ({ candidate }) => {
      connectionRef.current?.signal(candidate);
    };

    const onEnded = () => {
      setCallEnded(true);
      connectionRef.current?.destroy();
      streamRef.current?.getTracks().forEach(t => t.stop());
    };

    const onDeclined = () => {
      setCalling(false);
      setCallError('Call was declined.');
      setTimeout(() => setCallError(''), 4000);
    };

    socket.on('incoming-call', onIncoming);
    socket.on('call-answered', onAnswered);
    socket.on('ice-candidate', onIce);
    socket.on('call-ended', onEnded);
    socket.on('call-declined', onDeclined);

    return () => {
      socket.off('incoming-call', onIncoming);
      socket.off('call-answered', onAnswered);
      socket.off('ice-candidate', onIce);
      socket.off('call-ended', onEnded);
      socket.off('call-declined', onDeclined);
    };
  }, [socket]);

  const startCall = () => {
    if (!socket || !stream || !remoteUserId) {
      setCallError('No media stream. Please check your microphone/camera.');
      return;
    }
    setCalling(true);
    setCallError('');

    const peer = new Peer({ initiator: true, trickle: true, stream });

    peer.on('signal', data => {
      if (data.type === 'offer') {
        socket.emit('call-user', {
          from: user.id,
          to: remoteUserId,
          offer: data,
          callerName: user.displayName || user.username,
          isVideo: isVideoCall,
        });
      } else {
        // ICE candidate
        socket.emit('ice-candidate', { to: remoteUserId, candidate: data });
      }
    });

    peer.on('stream', rs => {
      if (userVideo.current) userVideo.current.srcObject = rs;
    });

    peer.on('error', err => {
      console.error('Peer error:', err);
      setCallError('Connection failed. Try again.');
      setCalling(false);
    });

    connectionRef.current = peer;
  };

  const answerCall = () => {
    if (!socket || !stream || !incomingCall) return;
    setCallAccepted(true);
    setIncomingCall(null);

    const peer = new Peer({ initiator: false, trickle: true, stream });

    peer.on('signal', data => {
      if (data.type === 'answer') {
        socket.emit('answer-call', { to: incomingCall.from, answer: data });
      } else {
        socket.emit('ice-candidate', { to: incomingCall.from, candidate: data });
      }
    });

    peer.on('stream', rs => {
      if (userVideo.current) userVideo.current.srcObject = rs;
    });

    peer.on('error', err => {
      console.error('Peer answerer error:', err);
      setCallError('Connection failed.');
    });

    peer.signal(incomingCall.offer);
    connectionRef.current = peer;
  };

  const declineCall = () => {
    socket?.emit('decline-call', { to: incomingCall?.from });
    setIncomingCall(null);
    streamRef.current?.getTracks().forEach(t => t.stop());
  };

  const endCall = () => {
    const target = remoteUserId || incomingCall?.from;
    socket?.emit('end-call', { to: target });
    setCallEnded(true);
    connectionRef.current?.destroy();
    streamRef.current?.getTracks().forEach(t => t.stop());
    setTimeout(() => navigate(-1), 1500);
  };

  const toggleAudio = () => {
    stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setAudioMuted(p => !p);
  };

  const toggleVideo = () => {
    stream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setVideoOff(p => !p);
  };

  /* ── Incoming call overlay ── */
  if (incomingCall && !callAccepted) {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', height: '100%', background: C.bg, gap: 24,
      }}>
        <div style={{
          background: C.surface, padding: '40px 60px', borderRadius: 20,
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20,
          boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
        }}>
          <Avatar name={incomingCall.callerName} size={80} />
          <div style={{ textAlign: 'center' }}>
            <p style={{ color: C.text, fontSize: 20, fontWeight: 600, margin: 0 }}>
              {incomingCall.callerName}
            </p>
            <p style={{ color: C.teal, fontSize: 14, margin: '6px 0 0' }}>
              Incoming {incomingCall.isVideo ? '📹 video' : '📞 audio'} call…
            </p>
          </div>
          <div style={{ display: 'flex', gap: 32, marginTop: 8 }}>
            <CallBtn color={C.red} icon={<PhoneOff size={24} />} label="Decline" onClick={declineCall} />
            <CallBtn color={C.teal} icon={<Phone size={24} />} label="Answer" onClick={answerCall} />
          </div>
        </div>
      </div>
    );
  }

  /* ── Call ended ── */
  if (callEnded) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: C.bg, gap: 16 }}>
        <div style={{ fontSize: 52 }}>📵</div>
        <p style={{ color: C.text, fontSize: 20, fontWeight: 600, margin: 0 }}>Call ended</p>
        <button onClick={() => navigate(-1)} style={{
          marginTop: 8, padding: '10px 28px', borderRadius: 24,
          background: C.teal, border: 'none', color: '#fff',
          fontSize: 14, fontWeight: 600, cursor: 'pointer',
        }}>← Back</button>
      </div>
    );
  }

  /* ── No remote userId = Idle/waiting state ── */
  if (!remoteUserId) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', background: C.bg, gap: 12, color: C.textSub }}>
        <div style={{ fontSize: 52 }}>📞</div>
        <p style={{ fontSize: 16, margin: 0, color: C.text }}>Calls</p>
        <p style={{ fontSize: 13, margin: 0 }}>Open a chat and press the call button to start a call.</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b141a', position: 'relative' }}>
      {/* Error banner */}
      {callError && (
        <div style={{
          position: 'absolute', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(241,92,109,0.9)', color: '#fff',
          padding: '10px 20px', borderRadius: 8, fontSize: 14, zIndex: 10,
          boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
        }}>
          {callError}
        </div>
      )}

      {/* Video area */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: callAccepted ? '1fr 1fr' : '1fr', gap: 8, padding: 8 }}>
        {/* My video */}
        <div style={{ position: 'relative', background: '#182229', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
          <video ref={myVideo} autoPlay muted
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: isVideoCall && !videoOff ? 'block' : 'none' }} />
          {(!isVideoCall || videoOff) && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Avatar name={user?.displayName || user?.username || '?'} size={80} />
            </div>
          )}
          <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: C.text, fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>
            You
          </span>
        </div>

        {/* Remote video */}
        {callAccepted && (
          <div style={{ position: 'relative', background: '#182229', borderRadius: 12, overflow: 'hidden', minHeight: 200 }}>
            <video ref={userVideo} autoPlay style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <span style={{ position: 'absolute', bottom: 12, left: 12, background: 'rgba(0,0,0,0.6)', color: C.text, fontSize: 12, padding: '3px 10px', borderRadius: 6 }}>
              {remoteUser?.username || 'Remote'}
            </span>
          </div>
        )}
      </div>

      {/* Center info while waiting */}
      {!callAccepted && !calling && remoteUser && (
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <p style={{ color: C.text, fontSize: 22, fontWeight: 600, margin: 0 }}>{remoteUser.username}</p>
          <p style={{ color: C.textSub, fontSize: 14, margin: '6px 0 0' }}>Tap Start to call</p>
        </div>
      )}
      {calling && !callAccepted && (
        <div style={{ position: 'absolute', top: '40%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
          <p style={{ color: C.text, fontSize: 22, fontWeight: 600, margin: 0 }}>{remoteUser?.username}</p>
          <p style={{ color: C.teal, fontSize: 14, margin: '6px 0 0' }}>Calling…</p>
        </div>
      )}

      {/* Controls */}
      <div style={{
        display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 20,
        padding: '16px 0', background: 'rgba(0,0,0,0.5)', flexShrink: 0,
      }}>
        <ControlBtn icon={audioMuted ? <MicOff size={22} /> : <Mic size={22} />}
          active={audioMuted} label={audioMuted ? 'Unmute' : 'Mute'} onClick={toggleAudio} />

        {isVideoCall && (
          <ControlBtn icon={videoOff ? <VideoOff size={22} /> : <Video size={22} />}
            active={videoOff} label={videoOff ? 'Cam On' : 'Cam Off'} onClick={toggleVideo} />
        )}

        {!callAccepted && !calling && (
          <CallBtn color={C.teal} icon={isVideoCall ? <Video size={24} /> : <Phone size={24} />}
            label="Start" onClick={startCall} />
        )}
        {(callAccepted || calling) && (
          <CallBtn color={C.red} icon={<PhoneOff size={24} />} label="End" onClick={endCall} />
        )}
      </div>
    </div>
  );
}

function ControlBtn({ icon, label, active, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button onClick={onClick} style={{
        width: 52, height: 52, borderRadius: '50%',
        background: active ? 'rgba(241,92,109,0.25)' : 'rgba(255,255,255,0.15)',
        border: 'none', cursor: 'pointer',
        color: active ? '#f15c6d' : '#e9edef',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'background 0.2s',
      }}>
        {icon}
      </button>
      <span style={{ fontSize: 11, color: '#8696a0' }}>{label}</span>
    </div>
  );
}

function CallBtn({ color, icon, label, onClick }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <button onClick={onClick} style={{
        width: 60, height: 60, borderRadius: '50%',
        background: color, border: 'none', cursor: 'pointer',
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: `0 4px 16px ${color}55`,
        transition: 'transform 0.15s',
      }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {icon}
      </button>
      <span style={{ fontSize: 12, color: '#8696a0' }}>{label}</span>
    </div>
  );
}