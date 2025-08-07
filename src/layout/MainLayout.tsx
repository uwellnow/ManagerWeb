import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";
import FullContainer from "./FullContainer.tsx";

const MainLayout = () => {
    return (
        <div className="flex flex-row min-h-screen">
            <Sidebar />
            <div className="flex flex-col flex-1">
                <Header />

                <main className="flex-1 p-6">
                    <FullContainer />
                </main>
            </div>



        </div>
    )
}

export default MainLayout;