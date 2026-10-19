import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, push, onValue, update, get } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './Multiplayer.css';

export default function Multiplayer() {
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [game, setGame] = useState(null);
  const [fen, setFen] = useState('start');
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    const gamesRef = ref(database, 'games');
    const unsubscribe = onValue(gamesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const gamesList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setGames(gamesList.filter(g => g.status === 'waiting' || g.players[currentUser.uid]));
      }
    });

    return () => unsubscribe();
  }, [currentUser]);

  useEffect(() => {
    if (!currentGame) return;

    const gameRef = ref(database, `games/${currentGame}`);
    const unsubscribe = onValue(gameRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const chessGame = new Chess(data.fen || 'start');
        setGame(chessGame);
        setFen(data.fen || 'start');
      }
    });

    return () => unsubscribe();
  }, [currentGame]);

  async function createGame() {
    const gamesRef = ref(database, 'games');
    const newGame = await push(gamesRef, {
      status: 'waiting',
      fen: 'start',
      players: {
        [currentUser.uid]: {
          uid: currentUser.uid,
          username: userProfile.username,
          color: 'w'
        }
      },
      turn: 'w',
      createdAt: Date.now(),
      createdBy: currentUser.uid
    });

    setCurrentGame(newGame.key);
  }

  async function joinGame(gameId) {
    const gameRef = ref(database, `games/${gameId}`);
    const snapshot = await get(gameRef);
    const gameData = snapshot.val();

    if (!gameData.players[currentUser.uid]) {
      await update(gameRef, {
        [`players/${currentUser.uid}`]: {
          uid: currentUser.uid,
          username: userProfile.username,
          color: 'b'
        },
        status: 'playing'
      });
    }

    setCurrentGame(gameId);
  }

  async function makeMove(sourceSquare, targetSquare) {
    if (!game || !currentGame) return;

    const gameRef = ref(database, `games/${currentGame}`);
    const snapshot = await get(gameRef);
    const gameData = snapshot.val();

    const myColor = gameData.players[currentUser.uid].color;

    if (gameData.turn !== myColor) return;

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return;

      const newFen = game.fen();
      const nextTurn = game.turn();

      await update(gameRef, {
        fen: newFen,
        turn: nextTurn,
        lastMove: {
          from: sourceSquare,
          to: targetSquare,
          san: move.san,
          time: Date.now()
        }
      });

      if (game.isGameOver()) {
        let result = 'draw';
        if (game.isCheckmate()) {
          result = nextTurn === 'w' ? 'black' : 'white';
        }

        await update(gameRef, {
          status: 'finished',
          result: result
        });
      }

    } catch (e) {
      console.error('Ошибка хода', e);
    }
  }

  function onDrop({ sourceSquare, targetSquare }) {
    makeMove(sourceSquare, targetSquare);
  }

  if (!currentUser) {
    return <div className="not-auth">Войдите, чтобы играть онлайн</div>;
  }

  if (currentGame && game) {
    return (
      <div className="multiplayer-game">
        <div className="game-header">
          <div className="game-status">
            {game.isGameOver()
              ? 'Игра окончена'
              : `Ход ${game.turn() === 'w' ? 'белых' : 'чёрных'}`}
          </div>
          <button onClick={() => setCurrentGame(null)} className="btn btn-secondary">
            Покинуть игру
          </button>
        </div>

        <div className="chessboard-wrapper">
          <Chessboard
            position={fen}
            onDrop={onDrop}
            boardStyle={{
              borderRadius: 'var(--radius-lg)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)'
            }}
            darkSquareStyle={{ backgroundColor: '#1E293B' }}
            lightSquareStyle={{ backgroundColor: '#334155' }}
            dropSquareStyle={{ backgroundColor: 'rgba(56, 189, 248, 0.3)' }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="multiplayer-lobby">
      <div className="lobby-header">
        <h1>Мультиплеер</h1>
        <button onClick={createGame} className="btn btn-primary">
          Создать игру
        </button>
      </div>

      <div className="games-grid">
        {games.length === 0 && (
          <p className="no-games">Нет доступных игр. Создай первую!</p>
        )}
        {games.map((g) => (
          <div key={g.id} className="game-card">
            <div className="game-info">
              <div className="game-title">
                Игра #{g.id.substring(0, 6)}
              </div>
              <div className="game-status-badge">
                {g.status === 'waiting' ? 'Ожидание' : 'В игре'}
              </div>
            </div>
            <button
              onClick={() => joinGame(g.id)}
              className="btn btn-primary btn-sm"
            >
              {g.players[currentUser.uid] ? 'Продолжить' : 'Присоединиться'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
