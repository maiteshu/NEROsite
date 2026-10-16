import './App.css';
import Header from './header';
import Layout from './layout';
import IndexPage from './pages/indexpage';
import LoginPage from './pages/loginpage';
import RegisterPage from './pages/registerpage';
import Post from './post';
import {Route, Routes} from "react-router-dom"
import { UserContextProvider } from './usercontext';
import CreatePost from './pages/createpost';
import PostPage from './pages/postpage'
import EditPost from './pages/editpost';
import SettingsPage from "./pages/settingspage";
import ProfilePage from "./pages/profilepage";

function App() {
  return (
    <UserContextProvider>
      <Routes>
      <Route path="/" element={<Layout />}>
       <Route index element={<IndexPage />} />
       <Route path="/login" element={<LoginPage />} />
       <Route path="/register" element={<RegisterPage />} />
       <Route path="/create" element={<CreatePost />} />
       <Route path="/post/:id" element={<PostPage />} />
       <Route path="/edit/:id" element={<EditPost />} />
       <Route path="/settings" element={<SettingsPage />} />
       <Route path="/user/:username" element={<ProfilePage />} />
      </Route>
    </Routes>
    </UserContextProvider>
  );
}

export default App;
