import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const C = {
  bg: '#0b141a',
  surface: '#202c33',
  card: '#202c33',
  teal: '#00a884',
  text: '#e9edef',
  textSub: '#8696a0',
  border: '#2a3942',
};

const GAMES = [
  {
    id: 'tictactoe',
    name: 'Tic Tac Toe',
    emoji: '⭕',
    desc: '2 players · Classic strategy',
    gradient: 'linear-gradient(135deg, #005c4b 0%, #007a63 100%)',
  },
  {
    id: 'chess',
    name: 'Chess',
    emoji: '♛',
    desc: '2 players · Board game',
    gradient: 'linear-gradient(135deg, #1d3557 0%, #2a4a7f 100%)',
  },
  {
    id: 'connect4',
    name: 'Connect Four',
    emoji: '🔴',
    desc: '2 players · Drop & connect',
    gradient: 'linear-gradient(135deg, #7a4419 0%, #b05a22 100%)',
  },
  {
    id: 'rps',
    name: 'Rock Paper Scissors',
    emoji: '✂️',
    desc: '2 players · Best of 5',
    gradient: 'linear-gradient(135deg, #6a3d9a 0%, #8b52cc 100%)',
  },
];

export default function GameLobby() {
  const navigate = useNavigate();
  const [roomId, setRoomId] = useState('');

  const goToGame = (gameId) => {
    const room = roomId.trim() || gameId + '-' + Math.random().toString(36).slice(2, 7);
    navigate(`/games/${gameId}?room=${room}`);
  };

  return (
    <div style={{
      height: '100%', background: C.bg, overflowY: 'auto',
      padding: '32px 40px',
      fontFamily: 'Segoe UI, system-ui, sans-serif',
    }}>
      <div style={{ maxWidth: 640, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>🎮</div>
          <h1 style={{ margin: 0, color: C.text, fontSize: 26, fontWeight: 700 }}>
            Game Lobby
          </h1>
          <p style={{ margin: '8px 0 0', color: C.textSub, fontSize: 14 }}>
            Choose a game and invite a friend to play
          </p>
        </div>

        {/* Room ID input */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 28,
          background: C.surface, borderRadius: 10, padding: '10px 16px',
          border: `1px solid ${C.border}`,
        }}>
          <input
            type="text"
            placeholder="Enter room code to join a friend's game…"
            value={roomId}
            onChange={e => setRoomId(e.target.value)}
            style={{
              flex: 1, background: 'transparent', border: 'none', outline: 'none',
              color: C.text, fontSize: 14, caretColor: C.teal,
            }}
          />
          {roomId && (
            <span style={{ color: C.teal, fontSize: 12, fontWeight: 600, alignSelf: 'center' }}>
              Code set ✓
            </span>
          )}
        </div>

        {/* Game cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {GAMES.map(game => (
            <GameCard key={game.id} game={game} onClick={() => goToGame(game.id)} />
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, color: C.textSub, fontSize: 12 }}>
          Share the room code with a friend so they can join the same game room.
        </p>
      </div>
    </div>
  );
}

function GameCard({ game, onClick }) {
  const [h, setH] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        background: h ? game.gradient : C.card,
        borderRadius: 14,
        padding: '24px 20px',
        cursor: 'pointer',
        border: `1px solid ${h ? 'transparent' : C.border}`,
        transition: 'background 0.25s, transform 0.15s, box-shadow 0.25s',
        transform: h ? 'translateY(-2px)' : 'none',
        boxShadow: h ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
      }}
    >
      <div style={{ fontSize: 40, marginBottom: 12 }}>{game.emoji}</div>
      <h3 style={{ margin: 0, color: '#e9edef', fontSize: 16, fontWeight: 700 }}>{game.name}</h3>
      <p style={{ margin: '6px 0 16px', color: h ? 'rgba(255,255,255,0.7)' : '#8696a0', fontSize: 12 }}>
        {game.desc}
      </p>
      <div style={{
        display: 'inline-block', padding: '6px 16px',
        background: h ? 'rgba(255,255,255,0.18)' : 'rgba(0,168,132,0.15)',
        borderRadius: 20, color: h ? '#fff' : '#00a884',
        fontSize: 12, fontWeight: 700, transition: 'background 0.25s, color 0.25s',
      }}>
        Play Now →
      </div>
    </div>
  );
}