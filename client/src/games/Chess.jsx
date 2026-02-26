import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import { GameShell, StatusPill, ActionBtn, Badge, Spinner } from './TicTacToe';

/* ── Unicode piece map ─────────────────────────────────── */
const PIECES = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

/* ── Initial board setup ──────────────────────────────── */
const INIT_BOARD = () => {
  const b = Array(8).fill(null).map(() => Array(8).fill(null));
  const order = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  order.forEach((p, c) => { b[0][c] = 'b' + p; b[7][c] = 'w' + p; });
  for (let c = 0; c < 8; c++) { b[1][c] = 'bP'; b[6][c] = 'wP'; }
  return b;
};

/* ── Basic move generation ────────────────────────────── */
function getLegalMoves(board, r, c, color, lastPawnDouble) {
  const piece = board[r][c];
  if (!piece || piece[0] !== color) return [];
  const type = piece[1];
  const moves = [];
  const enemy = color === 'w' ? 'b' : 'w';
  const inBounds = (r, c) => r >= 0 && r < 8 && c >= 0 && c < 8;
  const isEmpty = (r, c) => inBounds(r, c) && !board[r][c];
  const isEnemy = (r, c) => inBounds(r, c) && board[r][c]?.[0] === enemy;

  const slide = (dirs) => {
    for (const [dr, dc] of dirs) {
      let nr = r + dr, nc = c + dc;
      while (inBounds(nr, nc)) {
        if (board[nr][nc]) { if (isEnemy(nr, nc)) moves.push([nr, nc]); break; }
        moves.push([nr, nc]);
        nr += dr; nc += dc;
      }
    }
  };

  if (type === 'P') {
    const dir = color === 'w' ? -1 : 1;
    const startRow = color === 'w' ? 6 : 1;
    if (isEmpty(r + dir, c)) {
      moves.push([r + dir, c]);
      if (r === startRow && isEmpty(r + 2 * dir, c)) moves.push([r + 2 * dir, c]);
    }
    for (const dc of [-1, 1]) {
      if (isEnemy(r + dir, c + dc)) moves.push([r + dir, c + dc]);
      // en passant
      if (lastPawnDouble && lastPawnDouble[0] === r && lastPawnDouble[1] === c + dc)
        moves.push([r + dir, c + dc]);
    }
  } else if (type === 'R') { slide([[1, 0], [-1, 0], [0, 1], [0, -1]]); }
  else if (type === 'B') { slide([[1, 1], [1, -1], [-1, 1], [-1, -1]]); }
  else if (type === 'Q') { slide([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]); }
  else if (type === 'N') {
    for (const [dr, dc] of [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]])
      if (inBounds(r + dr, c + dc) && board[r + dr][c + dc]?.[0] !== color) moves.push([r + dr, c + dc]);
  } else if (type === 'K') {
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]])
      if (inBounds(r + dr, c + dc) && board[r + dr][c + dc]?.[0] !== color) moves.push([r + dr, c + dc]);
    // Castling (simple: just check if squares empty, skip check-detection for brevity)
    const row = color === 'w' ? 7 : 0;
    if (r === row && c === 4) {
      if (!board[row][5] && !board[row][6] && board[row][7] === color + 'R') moves.push([row, 6]);
      if (!board[row][3] && !board[row][2] && !board[row][1] && board[row][0] === color + 'R') moves.push([row, 2]);
    }
  }
  return moves;
}

function isKingInCheck(board, color) {
  let kr = -1, kc = -1;
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++)
    if (board[r][c] === color + 'K') { kr = r; kc = c; }
  const enemy = color === 'w' ? 'b' : 'w';
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    if (board[r][c]?.[0] !== enemy) continue;
    const moves = getLegalMoves(board, r, c, enemy, null);
    if (moves.some(([mr, mc]) => mr === kr && mc === kc)) return true;
  }
  return false;
}

function applyMove(board, from, to, color) {
  const b = board.map(r => [...r]);
  const piece = b[from[0]][from[1]];
  b[to[0]][to[1]] = piece;
  b[from[0]][from[1]] = null;
  // Pawn promotion
  if (piece === 'wP' && to[0] === 0) b[to[0]][to[1]] = 'wQ';
  if (piece === 'bP' && to[0] === 7) b[to[0]][to[1]] = 'bQ';
  // Castling rook move
  if (piece === 'wK' && from[1] === 4 && to[1] === 6) { b[7][5] = 'wR'; b[7][7] = null; }
  if (piece === 'wK' && from[1] === 4 && to[1] === 2) { b[7][3] = 'wR'; b[7][0] = null; }
  if (piece === 'bK' && from[1] === 4 && to[1] === 6) { b[0][5] = 'bR'; b[0][7] = null; }
  if (piece === 'bK' && from[1] === 4 && to[1] === 2) { b[0][3] = 'bR'; b[0][0] = null; }
  return b;
}

/* ── Chess Component ───────────────────────────────────── */
export default function ChessGame({ roomId }) {
  const { user } = useAuth();
  const socket = useSocket();

  const [board, setBoard] = useState(INIT_BOARD());
  const [playerColor, setPlayerColor] = useState(null); // 'w' | 'b'
  const [turnColor, setTurnColor] = useState('w');
  const [selected, setSelected] = useState(null);  // [r,c]
  const [legalMoves, setLegalMoves] = useState([]);
  const [gameStarted, setGameStarted] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [status, setStatus] = useState('');
  const [gameOver, setGameOver] = useState(false);
  const [lastPawnDouble, setLastPawnDouble] = useState(null);

  useEffect(() => {
    if (!socket || !user) return;

    const join = () => socket.emit('createGame', { roomId, userId: user.id, gameType: 'chess' });
    if (socket.connected) join(); else socket.once('connect', join);

    socket.on('waitingForOpponent', () => { setWaiting(true); setGameStarted(false); });

    socket.on('gameStarted', ({ players }) => {
      setPlayerColor(players[0] === user.id ? 'w' : 'b');
      setGameStarted(true); setWaiting(false); setStatus('');
      setBoard(INIT_BOARD()); setTurnColor('w'); setGameOver(false);
      setSelected(null); setLegalMoves([]);
    });

    socket.on('chessMove', ({ board: b, turnColor: tc, lastPawnDouble: lpd }) => {
      setBoard(b);
      setTurnColor(tc);
      setLastPawnDouble(lpd);
      setSelected(null);
      setLegalMoves([]);
      // Check status for new current player
      if (isKingInCheck(b, tc)) setStatus('Check!');
      else setStatus('');
    });

    socket.on('chessGameOver', ({ winner }) => {
      setGameOver(true);
      setStatus(winner === user.id ? '🎉 You won by checkmate!' : '😔 Opponent wins by checkmate!');
    });

    socket.on('gameReset', () => {
      setGameStarted(false); setWaiting(true); setGameOver(false);
      setBoard(INIT_BOARD()); setTurnColor('w'); setStatus('');
      socket.emit('createGame', { roomId, userId: user.id, gameType: 'chess' });
    });

    return () => {
      socket.off('waitingForOpponent'); socket.off('gameStarted');
      socket.off('chessMove'); socket.off('chessGameOver'); socket.off('gameReset');
    };
  }, [roomId, user, socket]);

  const handleSquareClick = (r, c) => {
    if (!gameStarted || gameOver || turnColor !== playerColor) return;

    const piece = board[r][c];

    // If clicking a legal-move destination
    if (selected && legalMoves.some(([mr, mc]) => mr === r && mc === c)) {
      const from = selected;
      const newBoard = applyMove(board, from, [r, c], playerColor);

      // Detect checkmate for opponent
      const enemy = playerColor === 'w' ? 'b' : 'w';
      let opponentHasMoves = false;
      outer:
      for (let er = 0; er < 8; er++) {
        for (let ec = 0; ec < 8; ec++) {
          if (newBoard[er][ec]?.[0] !== enemy) continue;
          const moves = getLegalMoves(newBoard, er, ec, enemy, null);
          for (const [mr, mc] of moves) {
            const testBoard = applyMove(newBoard, [er, ec], [mr, mc], enemy);
            if (!isKingInCheck(testBoard, enemy)) { opponentHasMoves = true; break outer; }
          }
        }
      }

      const lpd = (board[r][c] === null && piece?.[1] === 'P' && Math.abs(r - from[0]) === 2)
        ? [r, c] : null;
      const nextTurn = enemy;

      setBoard(newBoard);
      setTurnColor(nextTurn);
      setSelected(null);
      setLegalMoves([]);
      setLastPawnDouble(lpd);

      if (!opponentHasMoves && isKingInCheck(newBoard, enemy)) {
        setGameOver(true);
        setStatus('🎉 Checkmate! You won!');
        socket?.emit('chessGameOver', { roomId, winner: user.id });
      } else {
        if (isKingInCheck(newBoard, enemy)) setStatus('Check!');
        else setStatus('');
        socket?.emit('chessMove', { roomId, board: newBoard, turnColor: nextTurn, lastPawnDouble: lpd });
      }
      return;
    }

    // Select a piece
    if (piece && piece[0] === playerColor) {
      const rawMoves = getLegalMoves(board, r, c, playerColor, lastPawnDouble);
      // Filter moves that leave own king in check
      const legal = rawMoves.filter(([mr, mc]) => {
        const testBoard = applyMove(board, [r, c], [mr, mc], playerColor);
        return !isKingInCheck(testBoard, playerColor);
      });
      setSelected([r, c]);
      setLegalMoves(legal);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const reset = () => {
    socket?.emit('resetGame', { roomId, userId: user.id, gameType: 'chess' });
    setGameStarted(false); setWaiting(true); setGameOver(false);
    setBoard(INIT_BOARD()); setTurnColor('w'); setStatus('');
    setSelected(null); setLegalMoves([]);
  };

  const isMyTurn = turnColor === playerColor;
  const colLabels = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  if (!gameStarted) return (
    <GameShell roomId={roomId} title="Chess" emoji="♛">
      {waiting
        ? <><Spinner /><StatusPill color="#00a884">Waiting for opponent…</StatusPill>
          <p style={{ color: '#8696a0', fontSize: 12 }}>Share room code <strong style={{ color: '#00a884' }}>{roomId}</strong></p></>
        : <StatusPill color="#8696a0">Connecting…</StatusPill>
      }
    </GameShell>
  );

  // Flip board for black player
  const displayRows = playerColor === 'b' ? [...Array(8).keys()].reverse() : [...Array(8).keys()];
  const displayCols = playerColor === 'b' ? [...Array(8).keys()].reverse() : [...Array(8).keys()];

  return (
    <GameShell roomId={roomId} title="Chess" emoji="♛">
      <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
        <Badge label="You" value={playerColor === 'w' ? '⬜ White' : '⬛ Black'} color="#e9edef" />
        <Badge label="Turn" value={isMyTurn ? 'Yours' : 'Theirs'} color={isMyTurn ? '#00a884' : '#8696a0'} />
      </div>

      {status && (
        <StatusPill color={status.includes('won') ? '#00a884' : status.includes('wins') ? '#f15c6d' : '#facc15'}>
          {status}
        </StatusPill>
      )}

      {/* Board */}
      <div style={{ userSelect: 'none' }}>
        {/* Column labels top */}
        <div style={{ display: 'flex', paddingLeft: 20, marginBottom: 2 }}>
          {displayCols.map(c => (
            <div key={c} style={{ width: 50, textAlign: 'center', color: '#8696a0', fontSize: 11 }}>
              {colLabels[c]}
            </div>
          ))}
        </div>

        {displayRows.map(r => (
          <div key={r} style={{ display: 'flex', alignItems: 'center' }}>
            {/* Row label */}
            <div style={{ width: 20, textAlign: 'center', color: '#8696a0', fontSize: 11 }}>{8 - r}</div>

            {displayCols.map(c => {
              const isLight = (r + c) % 2 === 0;
              const piece = board[r][c];
              const isSel = selected?.[0] === r && selected?.[1] === c;
              const isLegal = legalMoves.some(([mr, mc]) => mr === r && mc === c);
              const isCheck = piece?.[1] === 'K' && piece?.[0] === turnColor && isKingInCheck(board, turnColor);

              let bg = isLight ? '#3d5a6d' : '#2a3942';
              if (isSel) bg = '#00a88466';
              if (isCheck) bg = 'rgba(241,92,109,0.5)';

              return (
                <div key={c} onClick={() => handleSquareClick(r, c)} style={{
                  width: 50, height: 50, background: bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: isMyTurn && !gameOver ? 'pointer' : 'default',
                  position: 'relative', transition: 'background 0.1s',
                  border: isSel ? '2px solid #00a884' : '2px solid transparent',
                  boxSizing: 'border-box',
                }}>
                  {/* Legal-move dot or capture ring */}
                  {isLegal && (
                    piece
                      ? <div style={{ position: 'absolute', inset: 3, borderRadius: '50%', border: '3px solid rgba(0,168,132,0.7)', pointerEvents: 'none' }} />
                      : <div style={{ width: 14, height: 14, borderRadius: '50%', background: 'rgba(0,168,132,0.55)', pointerEvents: 'none' }} />
                  )}
                  {/* Piece */}
                  {piece && (
                    <span style={{
                      fontSize: 34, lineHeight: 1,
                      filter: piece[0] === 'w'
                        ? 'drop-shadow(0 0 2px rgba(255,255,255,0.5))'
                        : 'drop-shadow(0 0 2px rgba(0,0,0,0.8))',
                    }}>
                      {PIECES[piece]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {!isMyTurn && !gameOver && <StatusPill color="#8696a0">Opponent's turn…</StatusPill>}
      {gameOver && <ActionBtn onClick={reset}>New Game</ActionBtn>}
    </GameShell>
  );
}