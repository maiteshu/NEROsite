import {useContext, useState} from "react";
import {UserContext} from "../usercontext";
import {API_BASE} from "../config";
import Avatar from "../useravatar";

export default function SettingsPage() {
  const {userInfo, setUserInfo} = useContext(UserContext);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [message, setMessage] = useState('');

  function onPick(ev) {
    const f = ev.target.files[0];
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setMessage('');
  }

  async function upload(ev) {
    ev.preventDefault();
    if (!file) return;
    const data = new FormData();
    data.set('file', file);
    const res = await fetch(`${API_BASE}/profile/avatar`, {
      method: 'PUT',
      body: data,
      credentials: 'include',
    });
    const body = await res.json();
    if (res.ok) {
      setUserInfo({...userInfo, avatar: body.avatar});
      setFile(null);
      setPreview(null);
      setMessage('Profile picture updated!');
    } else {
      setMessage(typeof body === 'string' ? body : 'Upload failed');
    }
  }

  if (!userInfo?.id) return <p>Please log in.</p>;

  return (
    <form className="settings" onSubmit={upload}>
      <h1>Profile picture</h1>
      <div className="settings-avatar">
        {preview
          ? <img className="avatar" style={{width: 120, height: 120}} src={preview} alt="" />
          : <Avatar user={userInfo} size={120} />}
      </div>
      <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={onPick} />
      <button type="submit" disabled={!file}>Save</button>
      {message && <div className="settings-message">{message}</div>}
    </form>
  );
}