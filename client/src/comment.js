import {useContext, useEffect, useState} from "react";
import {format} from "date-fns";
import {Link} from "react-router-dom";
import {UserContext} from "./usercontext";
import {API_BASE} from "./config";

export default function Comments({postId, postAuthorId}) {
  const {userInfo} = useContext(UserContext);
  const [comments, setComments] = useState([]);
  const [content, setContent] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API_BASE}/post/${postId}/comments`)
      .then(res => res.json())
      .then(data => setComments(Array.isArray(data) ? data : []));
  }, [postId]);

  async function addComment(ev) {
    ev.preventDefault();
    setError('');
    const res = await fetch(`${API_BASE}/post/${postId}/comments`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({content}),
      credentials: 'include',
    });
    if (res.ok) {
      const newComment = await res.json();
      setComments([newComment, ...comments]);
      setContent('');
    } else {
      const msg = await res.json();
      setError(typeof msg === 'string' ? msg : 'Could not post comment');
    }
  }

  async function deleteComment(commentId) {
    if (!window.confirm('Delete this comment?')) return;
    const res = await fetch(`${API_BASE}/comments/${commentId}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    if (res.ok) {
      setComments(comments.filter(c => c._id !== commentId));
    }
  }

  return (
    <div className="comments">
      <h3>Comments ({comments.length})</h3>

      {userInfo?.id ? (
        <form className="comment-form" onSubmit={addComment}>
          <textarea
            placeholder="Write a comment..."
            value={content}
            maxLength={1000}
            onChange={ev => setContent(ev.target.value)}
          />
          <button type="submit">Post comment</button>
          {error && <div className="comment-error">{error}</div>}
        </form>
      ) : (
        <p><Link to="/login">Log in</Link> to leave a comment.</p>
      )}

      {comments.map(c => (
        <div className="comment" key={c._id}>
          <div className="comment-header">
            <strong>@{c.author?.username}</strong>
            <time>{format(new Date(c.createdAt), 'd MMM, yyyy HH:mm')}</time>
            {(userInfo?.id === c.author?._id || userInfo?.id === postAuthorId) && (
              <button className="comment-delete" onClick={() => deleteComment(c._id)}>
                Delete
              </button>
            )}
          </div>
          <p>{c.content}</p>
        </div>
      ))}
    </div>
  );
}