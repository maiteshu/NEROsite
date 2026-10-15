import {API_BASE} from "./config";

export default function Avatar({user, size = 40}) {
  const style = {width: size, height: size, fontSize: size * 0.45};
  if (user?.avatar) {
    return <img className="avatar" style={style} src={`${API_BASE}/${user.avatar}`} alt="" />;
  }
  return (
    <span className="avatar avatar-fallback" style={style}>
      {(user?.username || '?')[0].toUpperCase()}
    </span>
  );
}