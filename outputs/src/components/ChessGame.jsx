import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './ChessGame.css';

export default function ChessGame({ mode = 'ai', gameId = null, currentColor = 'w' }) {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('');

  useEffect(() => {
    updateStatus();
  }, [game]);

  function updateStatus() {
    let statusMsg = '';

    if (game.isCheckmate()) {
      statusMsg = 'Мат! Игра окончена.';
    } else if (game.isDraw()) {
      statusMsg = 'Ничья!';
    } else if (game.isCheck()) {
      statusMsg = 'Шах!';
    } else {
      statusMsg = game.turn() === 'w' ? 'Ход белых' : 'Ход чёрных';
    }

    setStatus(statusMsg);
  }

  function onDrop({ sourceSquare, targetSquare }) {
    // Проверяем, что это ход текущего игрока
    if (mode === 'online' && game.turn() !== currentColor) {
      return;
    }

    try {
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q'
      });

      if (move === null) return;

      setFen(game.fen());
      setHistory([...history, move]);
      updateStatus();

      // Если игра с ИИ и ход белых завершён, делаем ход ИИ
      if (mode === 'ai' && game.turn() === 'b' && !game.isGameOver()) {
        setTimeout(makeAIMove, 500);
      }

    } catch (e) {
      console.error('Неверный ход', e);
    }
  }

  function makeAIMove() {
    const moves = game.moves();

    if (moves.length === 0) return;

    // Простой случайный выбор хода (для начала)
    const randomIndex = Math.floor(Math.random() * moves.length);
    const move = moves[randomIndex];

    game.move(move);
    setFen(game.fen());
    setHistory([...history, move]);
    updateStatus();
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setFen('start');
    setHistory([]);
    updateStatus();
  }

  function undoMove() {
    game.undo();
    if (mode === 'ai') {
      game.undo(); // Отменяем и ход ИИ
    }
    setFen(game.fen());
    setHistory(history.slice(0, -1));
    updateStatus();
  }

  return (
    <div className="chess-game">
      <div className="game-header">
        <div className="game-status">{status}</div>
        <div className="game-controls">
          <button onClick={undoMove} className="btn btn-secondary" disabled={history.length === 0}>
            Отменить ход
          </button>
          <button onClick={resetGame} className="btn btn-secondary">
            Новая игра
          </button>
        </div>
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

      <div className="move-history">
        <h3>История ходов</h3>
        <div className="moves-list">
          {history.map((move, i) => (
            <span key={i} className="move-item">
              {i + 1}. {move.san}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
