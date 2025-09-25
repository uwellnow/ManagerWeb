import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDate } from "../../context/DateContext";
import { ordersApi } from "../../api/orders";
import { exportOrdersToExcel } from "../../utils/excelExport";
import type { OrderResponse } from "../../types/DTO/OrderResponseDto";

const OrderPage = () => {
    const { isAuthenticated } = useAuth();
    const { dateRange } = useDate();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderResponse>([]);
    const [allOrders, setAllOrders] = useState<OrderResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>("오늘의 전체 주문");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchOrders = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await ordersApi.getOrders();

                console.log('Original orders data:', data); // Debug log
                console.log('All store names:', [...new Set(data.map(order => order.store_name))]); // Debug log

                // '테스트용' 제외
                const filteredData = data.filter(order => order.store_name !== '테스트용');
                console.log('After filtering test data:', filteredData); // Debug log
                console.log('Store names after filtering:', [...new Set(filteredData.map(order => order.store_name))]); // Debug log

                // 전체 데이터 저장 (매장 목록용)
                setAllOrders(filteredData);

                // '모든 전체 주문'이 선택된 경우 날짜 필터링 제거
                if (selectedStore === "모든 전체 주문") {
                    console.log('Setting all orders (no date filter)'); // Debug log
                    setOrders(filteredData);
                } else {
                    // 선택된 기간으로 필터링
                    const dateFilteredOrders = filteredData.filter(order => {
                        // 한국 시간대 기준으로 날짜 추출
                        const orderDateTime = new Date(order.order_time);
                        const koreanTime = new Date(orderDateTime.getTime() + (9 * 60 * 60 * 1000)); // UTC+9
                        const orderDate = koreanTime.toISOString().split('T')[0];
                        const matchesDate = orderDate >= dateRange.startDate && orderDate <= dateRange.endDate;
                        if (order.store_name === '세계대학조정대회') { // Debug log
                            console.log('세계대학조정대회 order:', order, 'date:', orderDate, 'dateRange:', dateRange, 'matches:', matchesDate);
                        }
                        return matchesDate;
                    });
                    console.log('Date filtered orders:', dateFilteredOrders); // Debug log
                    console.log('Store names after date filtering:', [...new Set(dateFilteredOrders.map(order => order.store_name))]); // Debug log

                    setOrders(dateFilteredOrders);
                }
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [isAuthenticated, dateRange, selectedStore]);

    // 매장 목록 추출 (전체 데이터에서 고정)
    const stores = ["모든 전체 주문", "오늘의 전체 주문", ...Array.from(new Set(allOrders.map(order => order.store_name)))];

    // 필터링된 주문 데이터

    const filteredOrders = selectedStore === "모든 전체 주문"
        ? orders  // 모든 전체 주문: 매장명 필터링 없음
        : selectedStore === "오늘의 전체 주문"
            ? orders  // 오늘의 전체 주문: 매장명 필터링 없음
            : orders.filter(order => order.store_name === selectedStore); // 특정 매장: 매장명 필터링

    // 페이지네이션
    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentOrders = filteredOrders.slice(startIndex, endIndex);

    // 날짜 포맷팅 함수
    const formatOrderTime = (orderTime: string) => {
        const date = new Date(orderTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
    };

    // 멤버십 사용 이력 계산
    const getMembershipUsage = (total: number, remain: number) => {
        const used = total - remain;
        return `${used}/${total}`;
    };

    // 운동 시점 색상
    const getWorkoutTimeColor = (time: string) => {
        switch (time) {
            case "운동 중": return "bg-orange-100 text-orange-400 border-none";
            case "운동 전": return "bg-yellow-100 text-yellow-400 border-none";
            case "운동 후": return "bg-green-100 text-green-400 border-none";
            default: return "bg-gray-100 text-gray-400 border-none";
        }
    };

    // 엑셀 다운로드 핸들러
    const handleExcelDownload = () => {
        exportOrdersToExcel(filteredOrders, selectedStore);
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">주문 데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">주문 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 상단 탭 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                {/* 매장 선택 탭 */}
                <div className="flex flex-wrap gap-1 sm:gap-2 bg-white rounded-lg sm:rounded-xl p-1 sm:p-2 shadow-sm">
                    {stores.map((store) => (
                        <button
                            key={store}
                            onClick={() => {
                                setSelectedStore(store);
                                setCurrentPage(1);
                            }}
                            className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-medium transition-colors whitespace-nowrap ${
                                selectedStore === store
                                    ? 'bg-mainRed text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {store}
                        </button>
                    ))}
                </div>
                
                {/* 엑셀 다운로드 버튼 */}
                <div className="flex justify-center lg:justify-end">
                    <button 
                        onClick={handleExcelDownload}
                        className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors text-sm sm:text-base lg:text-lg font-medium shadow-sm"
                    >
                        엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* 주문 요약 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">주문 ({filteredOrders.length})</h2>
            </div>

            {/* 주문 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">매장명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">운동 시점</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">주문 시간</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">멤버십 사용</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">결제 상태</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentOrders.map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none truncate">
                                            {order.product_name.replace(/\\n/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {order.store_name}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getWorkoutTimeColor(order.product_time)}`}>
                                            {order.product_time}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatOrderTime(order.order_time)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {order.user_name}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getMembershipUsage(order.total_count_at_purchase, order.remain_count_after_purchase)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        완료
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 페이지네이션 */}
            {totalPages > 1 && (
                <div className="flex justify-center mt-4 sm:mt-6 lg:mt-8">
                    <nav className="flex items-center space-x-1 sm:space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            &lt;
                        </button>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                            let pageNum;
                            if (totalPages <= 5) {
                                pageNum = i + 1;
                            } else if (currentPage <= 3) {
                                pageNum = i + 1;
                            } else if (currentPage >= totalPages - 2) {
                                pageNum = totalPages - 4 + i;
                            } else {
                                pageNum = currentPage - 2 + i;
                            }
                            
                            return (
                                <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium rounded-lg transition-colors ${
                                        currentPage === pageNum
                                            ? 'bg-mainRed text-white shadow-sm'
                                            : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <span className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base text-gray-500">...</span>
                        )}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                {totalPages}
                            </button>
                        )}
                        
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            &gt;
                        </button>
                    </nav>
                </div>
            )}
        </div>
    );
};

export default OrderPage;