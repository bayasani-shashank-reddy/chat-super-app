import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { useNavigate } from 'react-router-dom';

const C = { bg: '#0b141a', surface: '#202c33', teal: '#00a884', text: '#e9edef', textSub: '#8696a0', border: '#2a3942', red: '#f15c6d' };

export default function TicTacToe({ roomId }) {
  const { user } = useAuth();
  const socket = useSocket();
  const navigate = useNavigate();

  const [board, setBoard] = useState(Array(9).fill(''));
  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState('');
  const [waiting, setWaiting] = useState(true);  // true so spinner shows immediately
  const [status, setStatus] = useState('Connecting to server…');

  useEffect(() => {
    if (!socket || !user) return;

    const joinRoom = () => {
      socket.emit('createGame', { roomId, userId: user.id, gameType: 'tictactoe' });
    };

    // If socket is already connected emit now, otherwise wait for connect
    if (socket.connected) {
      joinRoom();
    } else {
      socket.once('connect', joinRoom);
    }

    socket.on('waitingForOpponent', () => {
      setWaiting(true);
      setGameStarted(false);
      setStatus('Waiting for opponent to join with the same room code…');
    });

    socket.on('gameStarted', (game) => {
      setGameStarted(true);
      setWaiting(false);
      setStatus('');
      setBoard(game.board || Array(9).fill(''));
      setTurn(game.turn);
      setWinner(null);
      // Determine symbol
      const meIdx = game.players.indexOf(user.id);
      setPlayerSymbol(meIdx === 0 ? 'X' : 'O');
    });

    socket.on('updateBoard', ({ board, turn }) => {
      setBoard([...board]);
      setTurn(turn);
    });

    socket.on('gameOver', ({ winner: w, board }) => {
      setWinner(w);
      setBoard([...board]);
    });

    socket.on('gameReset', () => {
      // Opponent reset — rejoin
      setGameStarted(false);
      setWaiting(true);
      setWinner(null);
      setBoard(Array(9).fill(''));
      setStatus('Opponent started a new game. Rejoining…');
      socket.emit('createGame', { roomId, userId: user.id, gameType: 'tictactoe' });
    });

    return () => {
      socket.off('waitingForOpponent');
      socket.off('gameStarted');
      socket.off('updateBoard');
      socket.off('gameOver');
      socket.off('gameReset');
    };
  }, [roomId, user, socket]);

  const makeMove = (i) => {
    if (!socket || board[i] !== '' || winner || turn !== user.id) return;
    socket.emit('makeMove', { roomId, index: i, userId: user.id });
  };

  const resetGame = () => {
    socket?.emit('resetGame', { roomId, userId: user.id, gameType: 'tictactoe' });
    setGameStarted(false);
    setWaiting(true);
    setWinner(null);
    setBoard(Array(9).fill(''));
    setStatus('Waiting for opponent to reconnect…');
  };

  const isMyTurn = turn === user.id;
  const winnerMsg = winner
    ? winner === user.id ? '🎉 You won!'
      : winner === 'draw' ? "It's a draw!"
        : '😔 Opponent won'
    : null;

  if (!gameStarted) {
    return (
      <GameShell roomId={roomId} title="Tic Tac Toe" emoji="⭕">
        {waiting
          ? <>
            <Spinner />
            <StatusPill color={C.teal}>{status || 'Waiting for opponent…'}</StatusPill>
            <p style={{ color: C.textSub, fontSize: 12, textAlign: 'center', maxWidth: 280 }}>
              Share room code <strong style={{ color: C.teal }}>{roomId}</strong> with your friend so they can join.
            </p>
          </>
          : <StatusPill color={C.textSub}>Connecting…</StatusPill>
        }
      </GameShell>
    );
  }

  return (
    <GameShell roomId={roomId} title="Tic Tac Toe" emoji="⭕">
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, justifyContent: 'center' }}>
        <Badge label="You" value={playerSymbol} color={C.teal} />
        <Badge label="Turn" value={isMyTurn ? 'Yours' : 'Theirs'} color={isMyTurn ? C.teal : C.textSub} />
      </div>

      {winnerMsg && <StatusPill color={winner === user.id ? C.teal : C.textSub}>{winnerMsg}</StatusPill>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 88px)', gap: 8, margin: '16px 0' }}>
        {board.map((cell, i) => (
          <button key={i} onClick={() => makeMove(i)}
            disabled={!!cell || !!winner || !isMyTurn}
            style={{
              width: 88, height: 88, borderRadius: 12,
              background: cell ? (cell === playerSymbol ? 'rgba(0,168,132,0.18)' : 'rgba(241,92,109,0.15)') : C.surface,
              border: `2px solid ${cell ? (cell === playerSymbol ? C.teal : C.red) : C.border}`,
              color: cell === playerSymbol ? C.teal : C.red,
              fontSize: 36, fontWeight: 800, cursor: cell || winner ? 'default' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => { if (!cell && !winner && isMyTurn) e.currentTarget.style.background = 'rgba(0,168,132,0.08)'; }}
            onMouseLeave={e => { if (!cell && !winner && isMyTurn) e.currentTarget.style.background = C.surface; }}
          >
            {cell}
          </button>
        ))}
      </div>

      {!isMyTurn && !winner && (
        <StatusPill color={C.textSub}>Opponent's turn…</StatusPill>
      )}

      {winner && <ActionBtn onClick={resetGame}>Play Again</ActionBtn>}
    </GameShell>
  );
}

/* ── Shared sub-components ─────────────────────────────── */
export function GameShell({ roomId, title, emoji, children }) {
  const navigate = useNavigate();
  return (
    <div style={{ height: '100%', background: '#0b141a', overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 16px' }}>
      <div style={{ width: '100%', maxWidth: 460, background: '#202c33', borderRadius: 20, padding: '32px 28px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', textAlign: 'center' }}>
        <button onClick={() => navigate('/games')} style={{ float: 'left', background: 'transparent', border: 'none', color: '#8696a0', cursor: 'pointer', fontSize: 13 }}>← Back</button>
        <div style={{ fontSize: 44, marginBottom: 8 }}>{emoji}</div>
        <h2 style={{ margin: '0 0 4px', color: '#e9edef', fontSize: 22, fontWeight: 700 }}>{title}</h2>
        <p style={{ margin: '0 0 20px', color: '#8696a0', fontSize: 12 }}>Room: <strong style={{ color: '#00a884' }}>{roomId}</strong></p>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>{children}</div>
      </div>
    </div>
  );
}
export function StatusPill({ children, color }) {
  return <div style={{ padding: '8px 20px', borderRadius: 20, background: color + '22', color, fontWeight: 600, fontSize: 14 }}>{children}</div>;
}
export function ActionBtn({ onClick, children, danger }) {
  const [h, setH] = useState(false);
  return (
    <button onClick={onClick}
      onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
      style={{ padding: '10px 32px', borderRadius: 24, border: 'none', background: h ? (danger ? '#c0392b' : '#008069') : (danger ? '#f15c6d' : '#00a884'), color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', transition: 'background 0.15s' }}>
      {children}
    </button>
  );
}
export function Badge({ label, value, color }) {
  return (
    <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '6px 14px', textAlign: 'center' }}>
      <div style={{ fontSize: 11, color: '#8696a0', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color }}>{value}</div>
    </div>
  );
}
export function Spinner() {
  return (
    <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid rgba(0,168,132,0.2)', borderTopColor: '#00a884', animation: 'spin .8s linear infinite' }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}