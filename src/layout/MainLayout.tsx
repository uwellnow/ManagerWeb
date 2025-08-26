import { useState } from "react";
import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";
import FullContainer from "./FullContainer.tsx";
import { DateProvider } from "../context/DateContext";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <DateProvider>
            <div className="flex flex-row h-screen">
                {/* 모바일 오버레이 */}
                {isSidebarOpen && (
                    <div 
                        className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}
                
                {/* 사이드바 */}
                <div className={`fixed lg:static inset-y-0 left-0 z-50 transform ${
                    isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0 transition-transform duration-300 ease-in-out`}>
                    <Sidebar onClose={() => setIsSidebarOpen(false)} />
                </div>
                
                {/* 메인 콘텐츠 */}
                <div className="flex flex-col flex-1 lg:ml-0 h-screen overflow-hidden">
                    <Header onMenuClick={toggleSidebar} />
                    <main className="flex-1 p-4 lg:p-6 overflow-auto">
                        <FullContainer />
                    </main>
                </div>
            </div>
        </DateProvider>
    );
};

export default MainLayout;