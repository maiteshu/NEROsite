import {format} from "date-fns";
import { Link } from "react-router-dom";
import { API_BASE } from "./config";
import Avatar from "./useravatar";


export default function Post({_id,title,summary,cover,content,createdAt,author}) {
    return(
    <div className="post">
      <div className="image">
        <Link to={`/post/${_id}`}>
         <img src={`${API_BASE}/${cover}`} alt=""/>
        </Link>
      </div>
        <div className="texts">
        <Link to={`/post/${_id}`}>
        <h2>{title}</h2>
        </Link>
       
       <p className="info">
        <Link className="author" to={`/user/${encodeURIComponent(author.username)}`}>{author.username}</Link>
        <time>{format(new Date(createdAt), 'd MMM, yyyy HH:mm')}</time>
       </p>
       <p className="summary">{summary}</p>  
        </div>
        
      </div>
          
    )
}