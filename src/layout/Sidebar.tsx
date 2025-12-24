import dashboard from '../assets/dashboard.svg';
import nodashboard from '../assets/nodashboard.svg'
import order from '../assets/order.svg'
import customer from '../assets/customer.svg'
import stock from '../assets/stock.svg'
import error from '../assets/error_log.svg'
import uwellnowlogo from '../assets/uwellnow.svg'
import signout from '../assets/signout.svg'
import {NavLink, useNavigate} from "react-router-dom";
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
    onClose?: () => void;
}

const sideItems = [
    {label: '대시보드', activeImg: dashboard, inactiveImg: nodashboard, path: '/dashboard'},
    {label: '주문', img: order, path: '/order'},
    {label: '고객 정보', img: customer, path: '/customer'},
    {label: '재고', img: stock, path: '/stock'},
    {label: '에러 로그', img: error, path: '/error-log'},
    {label: 'KPI 분석', img: error, path: '/kpi'},
    {label: '점검중', img: error, path: '/maintenance'},
]

const Sidebar = ({ onClose }: SidebarProps) => {
    const { logout, storeName } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    const handleNavClick = () => {
        // 모바일에서 네비게이션 클릭 시 사이드바 닫기
        if (onClose) {
            onClose();
        }
    };

    return (
        <aside className="w-80 lg:w-80 h-screen bg-white border-none border-gray-200 shadow-lg lg:shadow-none flex flex-col">
            {/* 모바일 헤더 */}
            <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center space-x-4">
                    <img src={uwellnowlogo} alt="uwellnow logo" className="w-8 h-8" />
                    <span className="text-xl font-semibold">uwellnow admin</span>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* 데스크톱 로고 */}
            <div className="hidden lg:flex items-center justify-center p-6 space-x-4">
                <img src={uwellnowlogo} alt="uwellnow logo" className="w-8 h-8" />
                <span className="text-2xl font-semibold">uwellnow admin</span>
            </div>

            <nav className="mt-4 space-y-2 px-6 lg:px-12 flex-1">
                {sideItems
                    .filter(item => {
                        // 매장 관리자는 주문, 고객 정보, 재고, 점검중만 표시
                        if (storeName) {
                            return ['/order', '/customer', '/stock', '/maintenance'].includes(item.path);
                        }
                        // 전체 관리자는 모든 메뉴 표시
                        return true;
                    })
                    .map(({ label, path, img, activeImg, inactiveImg }) => (
                        <NavLink
                            key={path}
                            to={path}
                            onClick={handleNavClick}
                            className={({ isActive }) =>
                                `flex items-center px-4 lg:px-6 py-3 h-14 lg:h-16 rounded-2xl text-sm lg:text-md transition ${
                                    isActive
                                        ? 'bg-mainRed text-white font-bold text-base lg:text-lg hover:text-white'
                                        : 'text-lightGray font-medium hover:text-lightGray'
                                }`
                            }
                        >
                            {({ isActive }) => (
                                <>
                                    {activeImg && inactiveImg ? (
                                        <img
                                            src={isActive ? activeImg : inactiveImg}
                                            alt={label}
                                            className="w-6 h-6 lg:w-7 lg:h-7 mr-3"
                                        />
                                    ) : (
                                        <img
                                            src={img}
                                            alt={label}
                                            className={`w-6 h-6 lg:w-7 lg:h-7 mr-3 ${isActive ? 'brightness-0 invert' : ''}`}
                                        />
                                    )}
                                    <span className="hidden sm:inline">{label}</span>
                                    <span className="sm:hidden text-xs">{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
            </nav>

            <div className="px-4 pb-6">
                <button 
                    onClick={handleLogout}
                    className="flex items-center w-full px-4 py-3 text-sm lg:text-md font-medium text-lightGray rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors duration-200"
                >
                    <img src={signout} alt="로그아웃" className="mr-3 w-5 h-5 lg:w-6 lg:h-6" />
                    <span className="hidden sm:inline">로그아웃</span>
                    <span className="sm:hidden text-xs">로그아웃</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;