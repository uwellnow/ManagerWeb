import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";

const MainLayout = () => {
    return (
        <div className="flex">
            <Sidebar />
            <Header />
        </div>
    )
}