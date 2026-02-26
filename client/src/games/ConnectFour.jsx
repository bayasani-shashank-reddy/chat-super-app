import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameShell, StatusPill, ActionBtn, Badge, Spinner } from './TicTacToe';

const ROWS = 6, COLS = 7;
const empty = () => Array(ROWS).fill(null).map(() => Array(COLS).fill(null));

export default function ConnectFour({ roomId }) {
  const { user } = useAuth();
  const socket = useSocket();

  const [board, setBoard] = useState(empty());
  const [players, setPlayers] = useState([]);
  const [currentTurn, setCurrentTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [myColor, setMyColor] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [hoverCol, setHoverCol] = useState(null);

  useEffect(() => {
    if (!socket || !user) return;

    const join = () => socket.emit('createGame', { roomId, userId: user.id, gameType: 'connect4' });
    if (socket.connected) join(); else socket.once('connect', join);

    socket.on('waitingForOpponent', () => { setWaiting(true); setGameStarted(false); });

    socket.on('gameStarted', (game) => {
      setPlayers(game.players);
      setCurrentTurn(game.turn);
      setGameStarted(true); setWaiting(false);
      setMyColor(game.players[0] === user.id ? 'red' : 'yellow');
      setBoard(game.board || empty()); setWinner(null);
    });

    socket.on('connectFourUpdate', ({ board, turn }) => { setBoard(board); setCurrentTurn(turn); });
    socket.on('connectFourGameOver', ({ winner: w, board }) => { setBoard(board); setWinner(w); });

    socket.on('gameReset', () => {
      setGameStarted(false); setWaiting(true); setWinner(null); setBoard(empty());
      socket.emit('createGame', { roomId, userId: user.id, gameType: 'connect4' });
    });

    return () => {
      socket.off('waitingForOpponent'); socket.off('gameStarted');
      socket.off('connectFourUpdate'); socket.off('connectFourGameOver'); socket.off('gameReset');
    };
  }, [roomId, user, socket]);

  const drop = (col) => {
    if (!socket || winner || currentTurn !== user.id) return;
    socket.emit('makeConnectFourMove', { roomId, column: col, userId: user.id });
  };
  const reset = () => {
    socket?.emit('resetGame', { roomId, userId: user.id, gameType: 'connect4' });
    setGameStarted(false); setWaiting(true); setWinner(null); setBoard(empty());
  };

  const cellBg = (row, col) => {
    const cell = board[row]?.[col];
    if (!cell) return '#2a3942';
    const isMe = cell === user.id;
    return (isMe ? myColor === 'red' : myColor !== 'red') ? '#ef4444' : '#facc15';
  };
  const cellShadow = (row, col) => {
    const cell = board[row]?.[col];
    if (!cell) return 'none';
    const isMe = cell === user.id;
    return (isMe ? myColor === 'red' : myColor !== 'red')
      ? '0 0 10px rgba(239,68,68,0.5)' : '0 0 10px rgba(250,204,21,0.5)';
  };

  const isMyTurn = currentTurn === user.id;

  if (!gameStarted) return (
    <GameShell roomId={roomId} title="Connect Four" emoji="🔴">
      {waiting
        ? <><Spinner /><StatusPill color="#00a884">Waiting for opponent…</StatusPill>
          <p style={{ color: '#8696a0', fontSize: 12 }}>Share room code <strong style={{ color: '#00a884' }}>{roomId}</strong></p></>
        : <StatusPill color="#8696a0">Connecting…</StatusPill>
      }
    </GameShell>
  );

  return (
    <GameShell roomId={roomId} title="Connect Four" emoji="🔴">
      <div style={{ display: 'flex', gap: 16, marginBottom: 12, justifyContent: 'center' }}>
        <Badge label="You" value={myColor === 'red' ? '🔴' : '🟡'} color={myColor === 'red' ? '#ef4444' : '#facc15'} />
        <Badge label="Turn" value={isMyTurn ? 'Yours' : 'Theirs'} color={isMyTurn ? '#00a884' : '#8696a0'} />
      </div>

      {winner !== null && (
        <StatusPill color={winner === user.id ? '#00a884' : winner === null || winner === 'draw' ? '#8696a0' : '#f15c6d'}>
          {winner === user.id ? '🎉 You won!' : winner === 'draw' ? "It's a draw!" : '😔 Opponent won'}
        </StatusPill>
      )}

      <div style={{ background: '#1a6fba', padding: 10, borderRadius: 14, display: 'inline-block', boxShadow: '0 6px 20px rgba(0,0,0,0.5)' }}>
        {/* Column hover indicators */}
        <div style={{ display: 'flex', marginBottom: 4 }}>
          {Array(COLS).fill(0).map((_, c) => (
            <div key={c} style={{
              width: 44, height: 6, marginRight: c < COLS - 1 ? 8 : 0, borderRadius: 3,
              background: isMyTurn && hoverCol === c ? (myColor === 'red' ? '#ef4444aa' : '#facc15aa') : 'transparent',
              transition: 'background 0.15s',
            }} />
          ))}
        </div>

        {board.map((row, r) => (
          <div key={r} style={{ display: 'flex' }}>
            {(row || Array(COLS).fill(null)).map((_, c) => (
              <div key={c}
                onClick={() => drop(c)}
                onMouseEnter={() => setHoverCol(c)}
                onMouseLeave={() => setHoverCol(null)}
                style={{
                  width: 44, height: 44, borderRadius: '50%',
                  marginRight: c < COLS - 1 ? 8 : 0, marginBottom: r < ROWS - 1 ? 8 : 0,
                  cursor: winner || !isMyTurn ? 'default' : 'pointer',
                  background: cellBg(r, c),
                  boxShadow: cellShadow(r, c),
                  transition: 'background 0.2s',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      {!isMyTurn && !winner && <StatusPill color="#8696a0">Opponent's turn…</StatusPill>}
      {winner !== null && <ActionBtn onClick={reset}>Play Again</ActionBtn>}
    </GameShell>
  );
}