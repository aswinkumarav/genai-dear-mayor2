import { AppStateProvider } from "../../state/AppProvider";
import Layout from "./Layout";

function ChatLayout() {
  return (
    <AppStateProvider>
        <Layout />
    </AppStateProvider>
  );
}

export default ChatLayout;