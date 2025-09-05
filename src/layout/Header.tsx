import uwellnowlogo from '../assets/uwellnow.svg'
import { useAuth } from '../context/AuthContext';
import { useDate } from '../context/DateContext';
import { useNavigate, useLocation } from 'react-router-dom';

interface DateRange {
    startDate: string;
    endDate: string;
}

interface HeaderProps {
    onMenuClick: () => void;
}

const Header = ({ onMenuClick }: HeaderProps) => {
    const { logout } = useAuth();
    const { selectedDate, setSelectedDate, dateRange, setDateRange } = useDate();
    const navigate = useNavigate();
    const location = useLocation();
    
    const isOrderPage = location.pathname === '/order';
    
    const formatDateForDisplay = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('ko-KR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const formatDateRangeForDisplay = (startDate: string, endDate: string) => {
        if (startDate === endDate) {
            return formatDateForDisplay(startDate);
        }
        
        return `${formatDateForDisplay(startDate)} ~ ${formatDateForDisplay(endDate)}`;
    };

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    return(
        <div className="flex items-center flex-shrink-0 h-16 lg:h-[100px] bg-white w-full justify-between px-4 lg:px-8">
            {/* 모바일 메뉴 버튼 */}
            <button
                onClick={onMenuClick}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
            >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {/* 날짜 선택기 */}
            <div className="flex items-center space-x-2">
                {isOrderPage ? (
                    // 주문 페이지: 기간 선택 모드
                    <div className="flex items-center space-x-2">
                        <span className="text-grayBlue font-semibold text-lg lg:text-2xl">
                            {formatDateRangeForDisplay(dateRange.startDate, dateRange.endDate)}
                        </span>
                        <div className="flex items-center space-x-1">
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateRange.startDate}
                                    onChange={(e) => setDateRange((prev: DateRange) => ({ ...prev, startDate: e.target.value }) as DateRange)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <svg 
                                    className="w-5 h-5 lg:w-6 lg:h-6 text-grayBlue cursor-pointer" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span className="text-grayBlue text-sm lg:text-base">~</span>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={dateRange.endDate}
                                    onChange={(e) => setDateRange((prev: DateRange) => ({ ...prev, endDate: e.target.value }) as DateRange)}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                    max={new Date().toISOString().split('T')[0]}
                                />
                                <svg 
                                    className="w-5 h-5 lg:w-6 lg:h-6 text-grayBlue cursor-pointer" 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>
                ) : (
                    // 다른 페이지: 단일 날짜 선택
                    <div className="flex items-center space-x-2">
                        <span className="text-grayBlue font-semibold text-lg lg:text-2xl">
                            {formatDateForDisplay(selectedDate)}
                        </span>
                        <div className="relative">
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                                max={new Date().toISOString().split('T')[0]}
                            />
                            <svg 
                                className="w-5 h-5 lg:w-6 lg:h-6 text-grayBlue cursor-pointer" 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </div>
                    </div>
                )}
            </div>
            
            {/* 사용자 정보 */}
            <div className="flex items-center space-x-2 lg:space-x-4">
                <div className="rounded-full overflow-hidden size-8 lg:size-12">
                    <img src={uwellnowlogo} alt="uwellnow logo" className="w-full h-full object-cover"/>
                </div>

                <div className="hidden sm:flex flex-col space-y-1">
                    <div className="text-black font-bold text-sm lg:text-md">유웰나우 관리자</div>
                    <button 
                        onClick={handleLogout}
                        className="text-gray-600 font-medium text-xs lg:text-sm hover:text-red-500 transition-colors duration-200 cursor-pointer"
                    >
                        로그아웃
                    </button>
                </div>
                
                {/* 모바일에서만 로그아웃 버튼 */}
                <button 
                    onClick={handleLogout}
                    className="sm:hidden p-2 rounded-md text-gray-600 hover:text-red-500 hover:bg-red-50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default Header;