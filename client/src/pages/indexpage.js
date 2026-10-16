import { useEffect, useState } from "react";
import Post from "../post";
import { API_BASE } from "../config";
import { useSearchParams } from "react-router-dom";
import Pagination from "../pagination";

export default function IndexPage() {
    const [searchParams] = useSearchParams();
    const page = Math.max(parseInt(searchParams.get('page')) || 1, 1);
    const [data, setData] = useState(null);

    useEffect( () => {
        fetch(`${API_BASE}/post?page=${page}`)
        .then(res => res.json())
        .then(d => {
            setData(d);
            window.scrollTo(0, 0);
        });
    }, [page]);

    if(!data || !Array.isArray(data.posts)) return '';

    return (
        <>
        {data.posts.map(post => <Post key={post._id} {...post} />)}
        <Pagination page={data.page} totalPages={data.totalPages} />
        </>
    )
}