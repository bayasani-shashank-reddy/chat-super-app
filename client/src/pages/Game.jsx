import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useParams } from 'react-router-dom';
import { useSocket } from '../contexts/SocketContext';

export default function Game() {
  const { user } = useAuth();
  const socket = useSocket();
  const { roomId = 'default' } = useParams();
  const [board, setBoard] = useState(Array(9).fill(''));
  const [turn, setTurn] = useState(null);
  const [winner, setWinner] = useState(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [playerSymbol, setPlayerSymbol] = useState('');

  // Set up socket listeners
  useEffect(() => {
    if (!socket || !user) return;

    socket.emit('createGame', { roomId, userId: user.id, gameType: 'tictactoe' });

    const handleGameStarted = (game) => {
      setGameStarted(true);
      setBoard(game.board);
      setTurn(game.turn);
      const symbol = game.players[0] === user.id ? 'X' : 'O';
      setPlayerSymbol(symbol);
    };

    const handleUpdateBoard = ({ board, turn }) => {
      setBoard(board);
      setTurn(turn);
    };

    const handleGameOver = ({ winner, board }) => {
      setWinner(winner);
      setBoard(board);
    };

    socket.on('gameStarted', handleGameStarted);
    socket.on('updateBoard', handleUpdateBoard);
    socket.on('gameOver', handleGameOver);

    return () => {
      socket.off('gameStarted', handleGameStarted);
      socket.off('updateBoard', handleUpdateBoard);
      socket.off('gameOver', handleGameOver);
    };
  }, [roomId, user, socket]);

  const makeMove = (index) => {
    if (!socket) return;
    if (board[index] !== '' || winner || turn !== user.id) return;
    socket.emit('makeMove', { roomId, index, userId: user.id });
  };

  const joinGame = () => {
    if (!socket) return;
    socket.emit('joinGame', { roomId, userId: user.id });
  };

  if (!gameStarted) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h2 className="text-2xl mb-4">Game Room: {roomId}</h2>
        <button onClick={joinGame} className="bg-blue-600 text-white px-6 py-2 rounded">Join Game</button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h2 className="text-2xl mb-4">Tic Tac Toe</h2>
      {winner ? (
        <p className="mb-4 text-xl">{winner === user.id ? 'You won!' : winner ? 'Opponent won' : 'Draw'}</p>
      ) : (
        <p className="mb-4">Your turn: {turn === user.id ? 'Yes' : 'No'}</p>
      )}
      <div className="grid grid-cols-3 gap-2">
        {board.map((cell, i) => (
          <button
            key={i}
            onClick={() => makeMove(i)}
            className="w-20 h-20 border border-gray-400 text-2xl font-bold flex items-center justify-center"
            disabled={cell !== '' || winner !== null || turn !== user.id}
          >
            {cell}
          </button>
        ))}
      </div>
    </div>
  );
}