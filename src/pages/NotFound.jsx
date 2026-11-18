import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';

export default function NotFound({ title = 'Page not found', text = "The page or SOP you're looking for doesn't exist.", children }) {
  return (
    <div className="card pad notfound">
      <div className="empty" style={{ padding: 20 }}>
        <div className="ei"><Icon n="search" /></div>
        <h3>{title}</h3>
        <p className="muted">{text}</p>
        {children || <Link className="btn pri" to="/sops">Back to SOPs</Link>}
      </div>
    </div>
  );
}
