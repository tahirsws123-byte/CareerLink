import { Outlet, useLocation } from "react-router-dom";
import AuthenticatedHeader from "./AuthenticatedHeader";
import ChatDock from "./ChatDock";
import SettingsHeader from "./SettingsHeader";

export default function MainLayout() {
  const { pathname } = useLocation();
  const isSettings = pathname === "/settings";
  return (
    <>
      {isSettings ? <SettingsHeader /> : <AuthenticatedHeader />}

      <main>
        <Outlet />
      </main>
      {!isSettings && <ChatDock />}
    </>
  );
}