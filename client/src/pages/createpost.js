import {useContext, useEffect, useState} from "react";
import 'react-quill/dist/quill.snow.css';
import {Navigate} from "react-router-dom";
import Editor from "../editor";
import {API_BASE} from "../config";
import {UserContext} from "../usercontext";

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];
const MAX_SIZE = 2 * 1024 * 1024; // must match the API limit (2 MB)

const isEmpty = (title, summary, content) =>
  !title.trim() && !summary.trim() && !content.replace(/<[^>]*>/g, '').trim();

export default function CreatePost() {
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [files, setFiles] = useState(null);
  const [preview, setPreview] = useState(null);
  const [coverError, setCoverError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [redirect, setRedirect] = useState(false);
  const {userInfo} = useContext(UserContext);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);

  // ---------- draft system ----------
  const draftKey = userInfo?.id ? `draft:new-post:${userInfo.id}` : null;

  useEffect(() => {
    if (!draftKey) return;
    try {
      const saved = JSON.parse(localStorage.getItem(draftKey));
      if (saved) {
        setTitle(saved.title || '');
        setSummary(saved.summary || '');
        setContent(saved.content || '');
      }
    } catch (e) {}
    setDraftLoaded(true);
  }, [draftKey]);

  useEffect(() => {
    if (!draftKey || !draftLoaded) return;
    const timer = setTimeout(() => {
      try {
        if (isEmpty(title, summary, content)) {
          localStorage.removeItem(draftKey);
          setDraftSaved(false);
        } else {
          localStorage.setItem(draftKey, JSON.stringify({title, summary, content}));
          setDraftSaved(true);
        }
      } catch (e) {}
    }, 400);
    return () => clearTimeout(timer);
  }, [title, summary, content, draftKey, draftLoaded]);

  function discardDraft() {
    if (!window.confirm('Discard this draft?')) return;
    try { localStorage.removeItem(draftKey); } catch (e) {}
    setTitle('');
    setSummary('');
    setContent('');
    setDraftSaved(false);
  }

  // ---------- cover image ----------
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);

  function rejectCover(ev, message) {
    setCoverError(message);
    ev.target.value = '';
    setFiles(null);
    setPreview(null);
  }

  function onCoverChange(ev) {
    const file = ev.target.files[0];
    setCoverError('');
    if (!file) { setFiles(null); setPreview(null); return; }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return rejectCover(ev, 'Only PNG, JPG, WEBP or GIF images are allowed.');
    }
    if (file.size > MAX_SIZE) {
      return rejectCover(ev, 'The image must be 2 MB or smaller.');
    }
    setFiles(ev.target.files);
    setPreview(URL.createObjectURL(file));
  }

  // ---------- create post ----------
  async function createNewPost(ev) {
    ev.preventDefault();
    if (submitting) return;
    if (!files?.[0]) {
      setCoverError('Please choose a cover image.');
      return;
    }

    const data = new FormData();
    data.set('title', title);
    data.set('summary', summary);
    data.set('content', content);
    data.set('file', files[0]);

    setSubmitting(true);
    try {
      const response = await fetch(`${API_BASE}/post`, {
        method: 'POST',
        body: data,
        credentials: 'include',
      });
      if (response.ok) {
        try { localStorage.removeItem(draftKey); } catch (e) {}
        setRedirect(true);
      } else {
        const msg = await response.json().catch(() => null);
        setCoverError(typeof msg === 'string' ? msg : 'Could not create the post.');
      }
    } catch (e) {
      setCoverError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (redirect) return <Navigate to="/" />;

return (
    <form className="create-post" onSubmit={createNewPost}>

      <input
        type="text"
        placeholder="Title"
        value={title}
        onChange={ev => setTitle(ev.target.value)}
      />

      <input
        type="text"
        placeholder="Summary"
        value={summary}
        onChange={ev => setSummary(ev.target.value)}
      />

      <input
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={onCoverChange}
      />
      {coverError && <div className="comment-error">{coverError}</div>}
      {preview && <img className="cover-preview" src={preview} alt="Cover preview" />}

      <Editor value={content} onChange={setContent} />

      {draftSaved && (
        <div className="draft-status">
          Draft saved in this browser
          <button type="button" className="draft-discard" onClick={discardDraft}>
            Delete draft
          </button>
        </div>
      )}

      <button type="submit" className="publish-btn" disabled={submitting}>
        {submitting ? 'Publishing...' : 'Create post'}
      </button>
    </form>
  );
}