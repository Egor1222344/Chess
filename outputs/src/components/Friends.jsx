import { useState, useEffect } from 'react';
import { database } from '../firebase';
import { ref, onValue, push, set, remove } from 'firebase/database';
import { useAuth } from '../contexts/AuthContext';
import './Friends.css';

export default function Friends() {
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const { currentUser, userProfile } = useAuth();

  useEffect(() => {
    if (!currentUser) return;

    // Загружаем список друзей
    const friendsRef = ref(database, `users/${currentUser.uid}/friends`);
    const unsubFriends = onValue(friendsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const friendsList = Object.keys(data).map((uid) => data[uid]);
        setFriends(friendsList);
      } else {
        setFriends([]);
      }
    });

    // Загружаем заявки в друзья
    const requestsRef = ref(database, `friendRequests/${currentUser.uid}`);
    const unsubRequests = onValue(requestsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const requestsList = Object.keys(data).map((key) => ({
          id: key,
          ...data[key]
        }));
        setFriendRequests(requestsList);
      } else {
        setFriendRequests([]);
      }
    });

    return () => {
      unsubFriends();
      unsubRequests();
    };
  }, [currentUser]);

  async function searchUsers() {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const results = Object.keys(data)
          .filter((uid) => {
            const user = data[uid];
            return (
              uid !== currentUser.uid &&
              user.username.toLowerCase().includes(searchQuery.toLowerCase())
            );
          })
          .map((uid) => ({
            uid,
            ...data[uid]
          }));
        setSearchResults(results.slice(0, 10));
      }
    }, { onlyOnce: true });
  }

  async function sendFriendRequest(friendUid, friendUsername) {
    const requestRef = ref(database, `friendRequests/${friendUid}`);
    await push(requestRef, {
      fromUid: currentUser.uid,
      fromUsername: userProfile.username,
      timestamp: Date.now()
    });

    alert(`Заявка отправлена пользователю ${friendUsername}`);
    setSearchQuery('');
    setSearchResults([]);
  }

  async function acceptFriendRequest(request) {
    // Добавляем друга себе
    await set(ref(database, `users/${currentUser.uid}/friends/${request.fromUid}`), {
      uid: request.fromUid,
      username: request.fromUsername
    });

    // Добавляем себя в друзья к ним
    await set(ref(database, `users/${request.fromUid}/friends/${currentUser.uid}`), {
      uid: currentUser.uid,
      username: userProfile.username
    });

    // Удаляем заявку
    await remove(ref(database, `friendRequests/${currentUser.uid}/${request.id}`));
  }

  async function rejectFriendRequest(requestId) {
    await remove(ref(database, `friendRequests/${currentUser.uid}/${requestId}`));
  }

  async function removeFriend(friendUid) {
    if (!confirm('Удалить из друзей?')) return;

    await remove(ref(database, `users/${currentUser.uid}/friends/${friendUid}`));
    await remove(ref(database, `users/${friendUid}/friends/${currentUser.uid}`));
  }

  if (!currentUser) {
    return <div className="not-auth">Войдите, чтобы добавлять друзей</div>;
  }

  return (
    <div className="friends-page">
      <h1>Друзья</h1>

      <div className="friends-search">
        <input
          type="text"
          className="input-field"
          placeholder="Найти друга по нику..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <button onClick={searchUsers} className="btn btn-primary">
          Поиск
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="search-results">
          <h3>Результаты поиска</h3>
          {searchResults.map((user) => (
            <div key={user.uid} className="user-card">
              <div className="user-info">
                <div className="username">{user.username}</div>
                <div className="user-rating">Рейтинг: {user.rating}</div>
              </div>
              <button
                onClick={() => sendFriendRequest(user.uid, user.username)}
                className="btn btn-primary btn-sm"
              >
                Добавить
              </button>
            </div>
          ))}
        </div>
      )}

      {friendRequests.length > 0 && (
        <div className="friend-requests">
          <h3>Заявки в друзья</h3>
          {friendRequests.map((request) => (
            <div key={request.id} className="request-card">
              <div className="username">{request.fromUsername}</div>
              <div className="request-actions">
                <button
                  onClick={() => acceptFriendRequest(request)}
                  className="btn btn-primary btn-sm"
                >
                  Принять
                </button>
                <button
                  onClick={() => rejectFriendRequest(request.id)}
                  className="btn btn-secondary btn-sm"
                >
                  Отклонить
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="friends-list">
        <h3>Мои друзья ({friends.length})</h3>
        {friends.length === 0 && (
          <p className="no-friends">У тебя пока нет друзей. Найди их через поиск!</p>
        )}
        <div className="friends-grid">
          {friends.map((friend) => (
            <div key={friend.uid} className="friend-card">
              <div className="friend-info">
                <div className="username">{friend.username}</div>
              </div>
              <button
                onClick={() => removeFriend(friend.uid)}
                className="btn btn-secondary btn-sm"
              >
                Удалить
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
