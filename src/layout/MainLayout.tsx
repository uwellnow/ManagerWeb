import Sidebar from "./Sidebar.tsx";
import {Outlet} from "react-router-dom";

const MainLayout = () => {
    return (
        <div className="flex min-h-screen">
            <Sidebar />

            <main className="flex-1 p-6">
                <Outlet />
            </main>
        </div>
    )
}

export default MainLayout;