import {useContext, useEffect, useState} from "react";
import 'react-quill/dist/quill.snow.css';
import { Navigate } from "react-router-dom";
import Editor from "../editor";
import { API_BASE } from "../config";
import {UserContext} from "../usercontext";


export default function CreatePost(){
    const [title,setTitle]=useState('');
    const [summary,setSummary]=useState('');
    const [content,setContent]=useState('');
    const [files, setFile]=useState('');
    const [redirect, setRedirect]=useState(false);
    const {userInfo} = useContext(UserContext);
    const [draftLoaded, setDraftLoaded] = useState(false);
    const [draftSaved, setDraftSaved] = useState(false);

// draft system
  const draftKey = userInfo?.id ? `draft:new-post:${userInfo.id}` : null;

  const isEmpty = (title, summary, content) =>
    !title.trim() && !summary.trim() && !content.replace(/<[^>]*>/g, '').trim();

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
  
//create post system
    async function createNewPost(ev) {
        ev.preventDefault();
        const data = new FormData();
        data.set('title',title);
        data.set('summary', summary);
        data.set('content', content);
        data.set('file', files[0]);
        const response = await fetch(`${API_BASE}/post`, {
            method: 'POST',
            body: data,
            credentials:'include',
        });
        if (response.ok) {
            try { localStorage.removeItem(draftKey); } catch (e) {}
            setRedirect(true);
        }
    }


  if (redirect) {
    return <Navigate to={'/'} />
  }
    return (
        <form onSubmit={createNewPost}>
            <input type="title"
            placeholder={'Title'}
            value={title}
            onChange={ev => setTitle(ev.target.value)}/>
            <input type="summary"
            placeholder={'Summary'}
            value={summary}
            onChange={ev => setSummary(ev.target.value)}/>
            <input type="file"
            onChange={ev => setFile(ev.target.files)}/>
            <Editor value={content} onChange={setContent} />
            {draftSaved &&
            <div className="draft-status">
                Draft saved in this browser
                <button className="draft-discard" onClick={discardDraft}>Delete draft</button>
                </div>}
            <button style={{marginTop:'5px'}}>Create post</button>
        </form>
    )
}