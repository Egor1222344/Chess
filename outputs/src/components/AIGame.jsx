import { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import Chessboard from 'chessboardjsx';
import './AIGame.css';

export default function AIGame() {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState('start');
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState('Выберите уровень сложности');
  const [thinking, setThinking] = useState(false);
  const [difficulty, setDifficulty] = useState(null);
  const [worker, setWorker] = useState(null);

  useEffect(() => {
    // Инициализируем Stockfish worker
    if (typeof Worker !== 'undefined' && !worker) {
      try {
        const stockfish = new Worker('/stockfish.js');
        stockfish.postMessage('uci');
        setWorker(stockfish);

        stockfish.onmessage = function(event) {
          const message = event.data;

          if (message.includes('bestmove')) {
            const match = message.match(/bestmove ([a-h][1-8])([a-h][1-8])/);
            if (match) {
              const from = match[1];
              const to = match[2];
              makeAIMove(from, to);
            }
            setThinking(false);
          }
        };
      } catch (e) {
        console.error('Stockfish не загружен, используем простой ИИ', e);
      }
    }

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  useEffect(() => {
    updateStatus();
  }, [game]);

  function updateStatus() {
    let statusMsg = '';

    if (game.isCheckmate()) {
      statusMsg = game.turn() === 'w' ? 'Чёрные победили! Мат.' : 'Белые победили! Мат.';
    } else if (game.isDraw()) {
      statusMsg = 'Ничья!';
    } else if (game.isCheck()) {
      statusMsg = 'Шах!';
    } else if (difficulty) {
      statusMsg = game.turn() === 'w' ? 'Ваш ход' : 'ИИ думает...';
    }

    setStatus(statusMsg);
  }

  function selectDifficulty(level) {
    setDifficulty(level);
    resetGame();
  }

  function onDrop({ sourceSquare, targetSquare }) {
    if (thinking || game.turn() === 'b') return;

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

      if (!game.isGameOver()) {
        setThinking(true);
        setTimeout(() => {
          if (worker) {
            requestStockfishMove();
          } else {
            makeSimpleAIMove();
          }
        }, 300);
      }

    } catch (e) {
      console.error('Неверный ход', e);
    }
  }

  function requestStockfishMove() {
    if (!worker) {
      makeSimpleAIMove();
      return;
    }

    // Настройка сложности через глубину поиска
    const depth = difficulty === 1 ? 1 :
                  difficulty === 2 ? 3 :
                  difficulty === 3 ? 5 :
                  difficulty === 4 ? 8 : 10;

    worker.postMessage(`position fen ${game.fen()}`);
    worker.postMessage(`go depth ${depth}`);
  }

  function makeAIMove(from, to) {
    try {
      const move = game.move({ from, to, promotion: 'q' });
      if (move) {
        setFen(game.fen());
        setHistory([...history, move]);
        updateStatus();
      }
    } catch (e) {
      console.error('Ошибка хода ИИ', e);
      setThinking(false);
    }
  }

  function makeSimpleAIMove() {
    const moves = game.moves();
    if (moves.length === 0) {
      setThinking(false);
      return;
    }

    // Простая эвристика на основе сложности
    let selectedMove;

    if (difficulty <= 2) {
      // Лёгкий уровень - случайные ходы
      selectedMove = moves[Math.floor(Math.random() * moves.length)];
    } else {
      // Средний уровень - приоритет на взятия
      const captures = moves.filter(m => m.includes('x'));
      selectedMove = captures.length > 0 && Math.random() > 0.3
        ? captures[Math.floor(Math.random() * captures.length)]
        : moves[Math.floor(Math.random() * moves.length)];
    }

    game.move(selectedMove);
    setFen(game.fen());
    setHistory([...history, selectedMove]);
    setThinking(false);
    updateStatus();
  }

  function resetGame() {
    const newGame = new Chess();
    setGame(newGame);
    setFen('start');
    setHistory([]);
    setThinking(false);
    updateStatus();
  }

  function undoMove() {
    if (thinking) return;
    game.undo(); // Отменяем ход ИИ
    game.undo(); // Отменяем наш ход
    setFen(game.fen());
    setHistory(history.slice(0, -2));
    updateStatus();
  }

  if (!difficulty) {
    return (
      <div className="ai-game-setup">
        <h1>Игра против ИИ</h1>
        <p className="subtitle">Выберите уровень сложности</p>

        <div className="difficulty-grid">
          {[1, 2, 3, 4, 5].map((level) => (
            <button
              key={level}
              onClick={() => selectDifficulty(level)}
              className="difficulty-card"
            >
              <div className="difficulty-level">Уровень {level}</div>
              <div className="difficulty-label">
                {level === 1 && 'Новичок'}
                {level === 2 && 'Лёгкий'}
                {level === 3 && 'Средний'}
                {level === 4 && 'Сложный'}
                {level === 5 && 'Эксперт'}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="chess-game">
      <div className="game-header">
        <div>
          <div className="game-status">{status}</div>
          <div className="difficulty-indicator">
            Уровень {difficulty} {thinking && '⏳'}
          </div>
        </div>
        <div className="game-controls">
          <button
            onClick={undoMove}
            className="btn btn-secondary"
            disabled={history.length < 2 || thinking}
          >
            Отменить
          </button>
          <button onClick={resetGame} className="btn btn-secondary">
            Новая игра
          </button>
          <button onClick={() => setDifficulty(null)} className="btn btn-secondary">
            Сменить уровень
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
              {Math.floor(i / 2) + 1}.{i % 2 === 0 ? '' : '..'} {move.san || move}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
