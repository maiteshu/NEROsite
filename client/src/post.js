import {format} from "date-fns";
import { Link } from "react-router-dom";
import { API_BASE } from "./config";
import Avatar from "./avatar";

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
        <Avatar user={author} size={20} />
        <a className="author">{author.username}</a>
        <time>{format(new Date(createdAt), 'd MMM, yyyy HH:mm')}</time>
       </p>
       <p className="summary">{summary}</p>  
        </div>
        
      </div>
          
    )
}