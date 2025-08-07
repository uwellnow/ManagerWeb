import dashboard from '../assets/dashboard.svg';
import nodashboard from '../assets/nodashboard.svg'
import order from '../assets/order.svg'
import stock from '../assets/stock.svg'
import error from '../assets/error_log.svg'
import uwellnowlogo from '../../public/uwellnow.svg'
import signout from '../assets/signout.svg'
import {NavLink} from "react-router-dom";

const sideItems = [
    {label: '대시보드', activeImg: dashboard, inactiveImg: nodashboard, path: '/dashboard'},
    {label: '주문', img: order, path: '/order'},
    {label: '재고', img: stock, path: '/stock'},
    {label: '오류 로그', img: error, path: '/error'},
]

const Sidebar = () => {

    return (
        <aside className="w-[345px] bg-white min-h-screen border-none border-gray-200">
            <div className="p-6 flex items-center justify-center space-x-4">
                <img src={uwellnowlogo} alt="uwellnow logo" className="w-8 h-8" />
                <span className="text-2xl font-semibold">uwellnow admin</span>
            </div>

            <nav className="mt-4 space-y-2 px-12">
                {sideItems.map(({ label, path, img, activeImg, inactiveImg }) => (
                    <NavLink
                        key={path}
                        to={path}
                        className={({ isActive }) =>
                            `flex items-center px-6 py-3 h-16 rounded-2xl text-md transition ${
                                isActive
                                    ? 'bg-mainRed text-white font-bold hover:text-white'
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
                                        className="w-7 h-7 mr-3"
                                    />
                                ) : (
                                    <img
                                        src={img}
                                        alt={label}
                                        className={`w-7 h-7 mr-3 ${isActive ? 'brightness-0 invert' : ''}`}
                                    />
                                )}
                                {label}
                            </>
                        )}
                    </NavLink>
                ))}
            </nav>


            <div className="mt-auto px-4 absolute bottom-6">
                <button className="flex items-center w-full px-4 py-3 text-md font-medium text-gray-600 rounded-lg">
                    <img src={signout} alt="로그아웃" className="mr-3" />
                    로그아웃
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;