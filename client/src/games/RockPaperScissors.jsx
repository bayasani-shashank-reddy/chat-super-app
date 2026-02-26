import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameShell, StatusPill, ActionBtn, Badge, Spinner } from './TicTacToe';

const MOVES = { rock: '🪨', paper: '📄', scissors: '✂️' };

export default function RockPaperScissors({ roomId }) {
  const { user } = useAuth();
  const socket = useSocket();

  const [players, setPlayers] = useState([]);
  const [round, setRound] = useState(1);
  const [myMove, setMyMove] = useState(null);
  const [opponentMove, setOpponentMove] = useState(null);
  const [result, setResult] = useState(null);
  const [scores, setScores] = useState({ me: 0, opp: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [finalWinner, setFinalWinner] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    if (!socket || !user) return;

    const join = () => socket.emit('createGame', { roomId, userId: user.id, gameType: 'rps' });
    if (socket.connected) join(); else socket.once('connect', join);

    socket.on('waitingForOpponent', () => {
      setWaiting(true); setGameStarted(false);
    });

    socket.on('gameStarted', ({ players }) => {
      setPlayers(players);
      setGameStarted(true); setWaiting(false);
      setGameOver(false); setRound(1);
      setMyMove(null); setOpponentMove(null);
      setResult(null); setScores({ me: 0, opp: 0 }); setFinalWinner(null);
    });

    socket.on('rpsRoundResult', ({ round, moves, winner, scores: sc }) => {
      const oppId = players.find(p => p !== user.id) || Object.keys(sc).find(k => k !== user.id);
      setRound(round + 1);
      setMyMove(moves[user.id]);
      setOpponentMove(moves[oppId]);
      setResult(winner === user.id ? 'win' : winner === 'draw' ? 'draw' : 'lose');
      setScores({ me: sc[user.id] || 0, opp: sc[oppId] || 0 });
      // Auto-clear for next round after 2 seconds
      setTimeout(() => { setMyMove(null); setOpponentMove(null); setResult(null); }, 2000);
    });

    socket.on('rpsGameOver', ({ winner }) => {
      setFinalWinner(winner); setGameOver(true);
    });

    socket.on('gameReset', () => {
      setGameStarted(false); setWaiting(true);
      setGameOver(false); setMyMove(null); setResult(null);
      socket.emit('createGame', { roomId, userId: user.id, gameType: 'rps' });
    });

    return () => {
      socket.off('waitingForOpponent'); socket.off('gameStarted');
      socket.off('rpsRoundResult'); socket.off('rpsGameOver'); socket.off('gameReset');
    };
  }, [roomId, user, socket]);

  const join = () => { socket?.emit('joinGame', { roomId, userId: user.id }); };
  const makeMove = (move) => {
    if (myMove || gameOver || !socket) return;
    socket.emit('makeRPSMove', { roomId, move, userId: user.id });
    setMyMove(move);
  };
  const reset = () => {
    socket?.emit('resetGame', { roomId, userId: user.id, gameType: 'rps' });
    setGameStarted(false); setWaiting(true); setGameOver(false);
    setMyMove(null); setResult(null);
  };

  if (!gameStarted) return (
    <GameShell roomId={roomId} title="Rock Paper Scissors" emoji="✂️">
      {waiting
        ? <><Spinner /><StatusPill color="#00a884">Waiting for opponent…</StatusPill>
          <p style={{ color: '#8696a0', fontSize: 12 }}>Share room code <strong style={{ color: '#00a884' }}>{roomId}</strong></p></>
        : <StatusPill color="#8696a0">Connecting…</StatusPill>
      }
    </GameShell>
  );

  if (gameOver) return (
    <GameShell roomId={roomId} title="Rock Paper Scissors" emoji="✂️">
      <div style={{ fontSize: 52 }}>{finalWinner === user.id ? '🏆' : finalWinner ? '😔' : '🤝'}</div>
      <StatusPill color={finalWinner === user.id ? '#00a884' : finalWinner ? '#f15c6d' : '#8696a0'}>
        {finalWinner === user.id ? 'You are the champion!' : finalWinner ? 'Opponent wins' : "It's a tie!"}
      </StatusPill>
      <ActionBtn onClick={reset}>Play Again</ActionBtn>
    </GameShell>
  );

  const resultColor = result === 'win' ? '#00a884' : result === 'lose' ? '#f15c6d' : '#8696a0';
  const resultText = result === 'win' ? '🎉 You won this round!' : result === 'lose' ? '😔 You lost' : result === 'draw' ? '🤝 Draw' : null;

  return (
    <GameShell roomId={roomId} title="Rock Paper Scissors" emoji="✂️">
      <div style={{ display: 'flex', gap: 24 }}>
        <Badge label="You" value={scores.me} color="#00a884" />
        <Badge label={`Round ${round}/5`} value="🎮" color="#e9edef" />
        <Badge label="Opponent" value={scores.opp} color="#f15c6d" />
      </div>

      {myMove && opponentMove && (
        <div style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', gap: 32, justifyContent: 'center', fontSize: 48, marginBottom: 8 }}>
            <span>{MOVES[myMove]}</span>
            <span style={{ fontSize: 20, color: '#8696a0', alignSelf: 'center' }}>vs</span>
            <span>{MOVES[opponentMove]}</span>
          </div>
          {resultText && <StatusPill color={resultColor}>{resultText}</StatusPill>}
        </div>
      )}

      {!myMove && (
        <div>
          <p style={{ color: '#8696a0', fontSize: 13, marginBottom: 12 }}>Choose your move:</p>
          <div style={{ display: 'flex', gap: 16 }}>
            {Object.entries(MOVES).map(([move, emoji]) => (
              <button key={move} onClick={() => makeMove(move)}
                style={{ fontSize: 36, padding: '16px 20px', borderRadius: 14, background: '#2a3942', border: '2px solid #2a3942', cursor: 'pointer', transition: 'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,168,132,0.15)'; e.currentTarget.style.borderColor = '#00a884'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#2a3942'; e.currentTarget.style.borderColor = '#2a3942'; }}
              >{emoji}</button>
            ))}
          </div>
        </div>
      )}

      {myMove && !opponentMove && <StatusPill color="#00a884">Waiting for opponent's move…</StatusPill>}
    </GameShell>
  );
}