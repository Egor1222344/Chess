import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, query, orderByChild, limitToFirst } from 'firebase/database';
import './Leaderboard.css';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const usersRef = ref(database, 'users');
    const leadersQuery = query(usersRef, orderByChild('rating'), limitToFirst(100));

    const unsubscribe = onValue(leadersQuery, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const usersList = Object.keys(data)
          .map((key) => ({
            uid: key,
            ...data[key]
          }))
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 50);
        setLeaders(usersList);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  function getRankIcon(rank) {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return rank;
  }

  if (loading) {
    return (
      <div className="leaderboard-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="leaderboard-page">
      <h1>Таблица лидеров</h1>
      <p className="subtitle">Топ-50 игроков по рейтингу</p>

      <div className="leaderboard-table">
        <div className="table-header">
          <div className="rank-col">Место</div>
          <div className="username-col">Игрок</div>
          <div className="stats-col">Побед</div>
          <div className="stats-col">Поражений</div>
          <div className="stats-col">Ничьих</div>
          <div className="rating-col">Рейтинг</div>
        </div>

        {leaders.map((user, index) => (
          <div key={user.uid} className="table-row">
            <div className="rank-col rank-cell">
              <span className="rank-badge">{getRankIcon(index + 1)}</span>
            </div>
            <div className="username-col">
              <span className="username">{user.username}</span>
            </div>
            <div className="stats-col">{user.wins || 0}</div>
            <div className="stats-col">{user.losses || 0}</div>
            <div className="stats-col">{user.draws || 0}</div>
            <div className="rating-col">
              <span className="rating">{user.rating || 1200}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
