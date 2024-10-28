import React from "react";
import ReactDOM from "react-dom/client";
import { initializeIcons } from "@fluentui/react";
import App from './App'
import APP_ROUTES from "./routes";
import "./index.css";
import { RouterProvider, createBrowserRouter } from 'react-router-dom';

initializeIcons();


const Root = () => (
    <App />
  );

const router = createBrowserRouter([
    { element: <Root />, children: APP_ROUTES },
  ]);



ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <RouterProvider router={router} />
    </React.StrictMode>
);