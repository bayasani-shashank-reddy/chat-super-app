import { useParams } from 'react-router-dom';
import ChatWindow from '../components/ChatWindow';

export default function Chat() {
  const { userId } = useParams();
  return <ChatWindow receiverId={userId} />;
}