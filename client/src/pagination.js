import { Link } from "react-router-dom";

function getPages(page, totalPages) {
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
        else if (pages[pages.length - 1] !== '...') pages.push('...');
        
    }
    return pages;
}

export default function Pagination({page, totalPages, basepath = '/'}) {
    if (totalPages <= 1) return null;
    const href = (p) => (p === 1 ? basepath: `${basepath}?page=${p}`);

    return(
        <nav className="pagination">
            {page > 1
            ? <Link to={href(page - 1)}>Prev</Link>
            : <span className="disabled">Prev</span>}

            {getPages(page, totalPages).map((p, i) =>
            p === '...'
            ? <span key={`gap-${i}`} className="gap">...</span>
            : <Link key={p} to={href(p)} className={p === page ? 'current' : ''}>{p}</Link>
        )}

    {page < totalPages
        ? <Link to={href(page + 1)}>Next</Link>
        : <span className="disabled">Next</span>
    }
        
        </nav>
    );
}