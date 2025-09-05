import { useState } from "react";
import { useLocation, Outlet } from "react-router-dom";
import Sidebar from "./Sidebar.tsx";
import Header from "./Header.tsx";
import FullContainer from "./FullContainer.tsx";
import { DateProvider } from "../context/DateContext";

const MainLayout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const location = useLocation();

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    // 로그인 페이지인 경우 레이아웃 없이 Outlet만 렌더링
    if (location.pathname === '/') {
        return (
            <DateProvider>
                <Outlet />
            </DateProvider>
        );
    }

    // 다른 페이지들은 사이드바와 헤더가 있는 레이아웃 사용
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