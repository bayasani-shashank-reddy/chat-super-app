import { useParams, useSearchParams } from 'react-router-dom';
import TicTacToe from '../games/TicTacToe';
import Chess from '../games/Chess';
import ConnectFour from '../games/ConnectFour';
import RockPaperScissors from '../games/RockPaperScissors';

const gameComponents = {
  tictactoe: TicTacToe,
  chess: Chess,
  connect4: ConnectFour,
  rps: RockPaperScissors,
};

export default function GameRoom() {
  // gameType comes from the URL path: /games/:gameType
  const { gameType } = useParams();
  // roomId comes from the query string: ?room=abc123
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room') || gameType + '-default';

  const GameComponent = gameComponents[gameType] || TicTacToe;

  return <GameComponent roomId={roomId} />;
}