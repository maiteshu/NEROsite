import {useContext, useEffect, useState} from "react";
import {useParams, Link} from "react-router-dom";
import {format} from "date-fns";
import {UserContext} from "../usercontext";
import {API_BASE} from "../config";
import Avatar from "../useravatar";
import Post from "../post";

export default function ProfilePage() {
  const {username} = useParams();
  const {userInfo} = useContext(UserContext);
  const [profile, setProfile] = useState(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setProfile(null);
    setNotFound(false);
    fetch(`${API_BASE}/user/${encodeURIComponent(username)}`)
      .then(res => {
        if (!res.ok) { setNotFound(true); return null; }
        return res.json();
      })
      .then(data => { if (data) setProfile(data); });
  }, [username]);

  if (notFound) return <p>User not found.</p>;
  if (!profile) return '';

  const {user, posts} = profile;
  const isMe = userInfo?.id === user._id;

  return (
    <div className="profile-page">
      <div className="profile-head">
        <Avatar user={user} size={96} />
        <h1>@{user.username}</h1>
        <p className="profile-meta">
          {posts.length} {posts.length === 1 ? 'post' : 'posts'}
          {user.createdAt && ` · Joined ${format(new Date(user.createdAt), 'd MMM, yyyy')}`}
        </p>
        {isMe && <Link className="profile-edit" to="/settings">Change profile picture</Link>}
      </div>

      {posts.length === 0 && <p className="profile-empty">No posts yet.</p>}
      {posts.map(post => <Post key={post._id} {...post} />)}
    </div>
  );
}