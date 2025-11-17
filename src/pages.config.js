import Chat from './pages/Chat';
import Users from './pages/Users';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Chat": Chat,
    "Users": Users,
}

export const pagesConfig = {
    mainPage: "Chat",
    Pages: PAGES,
    Layout: __Layout,
};