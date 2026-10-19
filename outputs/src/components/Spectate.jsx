import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, query, orderByChild } from 'firebase/database';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './Spectate.css';

export default function Spectate() {
  const [activeGames, setActiveGames] = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [fen, setFen] = useState('start');

  useEffect(() => {
    const gamesRef = ref(database, 'games');
    const activeGamesQuery = query(gamesRef, orderByChild('status'));

    const unsubscribe = onValue(activeGamesQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gamesList = Object.keys(data)
          .map((key) => ({
            id: key,
            ...data[key]
          }))
          .filter((g) => g.status === 'playing');
        setActiveGames(gamesList);
      } else {
        setActiveGames([]);
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!selectedGame) return;

    const gameRef = ref(database, `games/${selectedGame}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data && data.fen) {
        setFen(data.fen);
      }
    });

    return () => unsubscribe();
  }, [selectedGame]);

  if (selectedGame) {
    const gameData = activeGames.find((g) => g.id === selectedGame);

    return (
      <div className="spectate-view">
        <div className="spectate-header">
          <div>
            <h2>Трансляция</h2>
            {gameData && (
              <p className="players-info">
                {Object.values(gameData.players).map((p) => p.username).join(' vs ')}
              </p>
            )}
          </div>
          <button onClick={() => setSelectedGame(null)} className="btn btn-secondary">
            Назад к списку
          </button>
        </div>

        <div className="chessboard-wrapper">
          <Chessboard
            position={fen}
            draggable={false}
            boardStyle={{
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
            darkSquareStyle={{ backgroundColor: '#1E293B' }}
            lightSquareStyle={{ backgroundColor: '#334155' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="spectate-lobby">
      <h1>Трансляции матчей</h1>
      <p className="subtitle">Смотри игры других игроков в реальном времени</p>

      <div className="games-grid">
        {activeGames.length === 0 && (
          <p className="no-games">Сейчас нет активных игр</p>
        )}
        {activeGames.map((g) => (
          <div key={g.id} className="game-card" onClick={() => setSelectedGame(g.id)}>
            <div className="game-info">
              <div className="game-title">
                {Object.values(g.players).map((p) => p.username).join(' vs ')}
              </div>
              <div className="game-details">
                Игра #{g.id.substring(0, 6)}
              </div>
            </div>
            <button className="btn btn-primary btn-sm">
              Смотреть
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
