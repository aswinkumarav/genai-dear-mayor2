import LandingPage from "../src/pages/landingPage";
import Chat from "./pages/chat/Chat";
import ChatLayout from "./pages/layout/ChatLayout";

const APP_ROUTES = [
  {
    path: "/",
    element: <LandingPage />, // Landing Pages
  },
  {
    path: "/",
    element: <ChatLayout />,
    children: [
      {
        path: "/:usecase",
        element: <Chat/>
      }
    ],
  },

];

export default APP_ROUTES;