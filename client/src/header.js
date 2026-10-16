import { Link } from "react-router-dom";
import { useContext, useEffect } from "react";
import { UserContext } from "./usercontext";
import { API_BASE } from "./config";
import Avatar from "./useravatar";

export default function Header() {
  const { setUserInfo, userInfo } = useContext(UserContext);

  useEffect(() => {
    fetch(`${API_BASE}/profile`, {
      credentials: 'include',
    }).then(response => {
      response.json().then(userInfo => {
        setUserInfo(userInfo);
      });
    });
  }, []);

  function logout() {
    fetch(`${API_BASE}/logout`, {
      credentials: 'include',
      method: 'POST',
    });
    setUserInfo(null);
  }

  const username = userInfo?.username;

  return (
    <header>
      <Link to="/" className="logo">NEROsite</Link>
      <nav>
        {username && (
          <>
            <Link to="/settings"><Avatar user={userInfo} size={28} /></Link>
            <Link to={`/user/${encodeURIComponent(username)}`}>My profile</Link>
            <Link to="/create">Create new post</Link>
            <a onClick={logout}>Logout</a>
          </>
        )}
        {!username && (
          <>
            <Link to="/login">Login</Link>
            <Link to="/register">Register</Link>
          </>
        )}
      </nav>
    </header>
  );
}