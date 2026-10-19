import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, push, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import './Chat.css';

export default function Chat({ gameId = 'global', title = 'Глобальный чат' }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    const chatRef = ref(database, `chats/${gameId}`);
    const chatQuery = query(chatRef, orderByChild('timestamp'), limitToLast(50));

    const unsubscribe = onValue(chatQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const messagesList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setMessages(messagesList.sort((a, b) => a.timestamp - b.timestamp));
      } else {
        setMessages([]);
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  async function sendMessage(e) {
    e.preventDefault();

    if (!newMessage.trim() || !currentUser) return;

    const messagesRef = ref(database, `chats/${gameId}`);
    await push(messagesRef, {
      text: newMessage.trim(),
      userId: currentUser.uid,
      username: userProfile?.username || 'Игрок',
      timestamp: Date.now()
    });

    setNewMessage('');
  }

  if (!currentUser) {
    return (
      <div className="chat-container">
        <div className="chat-not-auth">Войдите, чтобы писать в чат</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="chat-header">
        <h3>{title}</h3>
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="no-messages">Пока нет сообщений</div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message ${msg.userId === currentUser.uid ? 'own' : ''}`}
          >
            <div className="message-author">{msg.username}</div>
            <div className="message-text">{msg.text}</div>
            <div className="message-time">
              {new Date(msg.timestamp).toLocaleTimeString('ru-RU', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={sendMessage} className="chat-input-form">
        <input
          type="text"
          className="input-field"
          placeholder="Напишите сообщение..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          maxLength={200}
        />
        <button type="submit" className="btn btn-primary">
          Отправить
        </button>
      </form>
    </div>
  );
}
