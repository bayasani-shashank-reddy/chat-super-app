import { useNavigate } from 'react-router-dom';
import { Gamepad2, Cpu } from 'lucide-react';

const games = [
  { id: 'tictactoe', name: 'Tic Tac Toe', icon: Gamepad2, color: 'bg-blue-500' },
  { id: 'chess', name: 'Chess', icon: Cpu, color: 'bg-green-500' },
  { id: 'connect4', name: 'Connect Four', icon: Gamepad2, color: 'bg-purple-500' },
  { id: 'rps', name: 'Rock Paper Scissors', icon: Gamepad2, color: 'bg-orange-500' },
];

export default function GamesView() {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Play a Game</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map(game => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => navigate(`/games/${game.id}`)}
              className={`${game.color} text-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition transform hover:-translate-y-1`}
            >
              <Icon className="w-12 h-12 mx-auto mb-3" />
              <h3 className="text-xl font-semibold text-center">{game.name}</h3>
            </button>
          );
        })}
      </div>
    </div>
  );
}