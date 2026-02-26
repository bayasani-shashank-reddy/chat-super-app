import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white p-6 rounded shadow mb-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Welcome, {user?.username}!</h1>
            <p className="text-gray-600">Email: {user?.email}</p>
          </div>
          <button onClick={logout} className="bg-red-500 text-white px-4 py-2 rounded hover:bg-red-600">Logout</button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link to="/chat" className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">💬 Chat</h2>
            <p className="text-gray-600">Real-time messaging</p>
          </Link>
          <Link to="/groups" className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">👥 Groups</h2>
            <p className="text-gray-600">Create or join groups</p>
          </Link>
          <Link to="/games" className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">🎮 Games</h2>
            <p className="text-gray-600">Play multiplayer games</p>
          </Link>
          <Link to="/call" className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">📞 Video Call</h2>
            <p className="text-gray-600">Start or join a call</p>
          </Link>
          <Link to="/game" className="bg-white p-6 rounded shadow hover:shadow-lg transition">
            <h2 className="text-xl font-semibold mb-2">🎮 Tic Tac Toe</h2>
            <p className="text-gray-600">Play with friends</p>
          </Link>
        </div>
      </div>
    </div>
  );
}