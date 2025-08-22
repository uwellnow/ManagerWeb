import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { ordersApi } from "../../api/orders";
import type { OrderResponse } from "../../types/DTO/OrderResponseDto";

const OrderPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [orders, setOrders] = useState<OrderResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>("전체 주문");
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
                setOrders(data);
            } catch (error) {
                console.error('Failed to fetch orders:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, [isAuthenticated]);

    // 매장 목록 추출
    const stores = ["전체 주문", ...Array.from(new Set(orders.map(order => order.store_name)))];

    // 필터링된 주문 데이터
    const filteredOrders = selectedStore === "전체 주문" 
        ? orders 
        : orders.filter(order => order.store_name === selectedStore);

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

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                <span className="ml-3 text-gray-600">주문 데이터를 불러오는 중...</span>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <div className="text-red-500 text-lg font-semibold mb-2">데이터 로드 실패</div>
                    <div className="text-gray-600">주문 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-2 lg:p-6">
            {/* 상단 탭 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 lg:mb-6 gap-4">
                <div className="flex flex-wrap space-x-1 bg-white rounded-lg p-1">
                    {stores.map((store) => (
                        <button
                            key={store}
                            onClick={() => {
                                setSelectedStore(store);
                                setCurrentPage(1);
                            }}
                            className={`px-3 lg:px-4 py-2 rounded-md text-xs lg:text-sm font-medium transition-colors ${
                                selectedStore === store
                                    ? 'bg-purple-600 text-white'
                                    : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                            {store}
                        </button>
                    ))}
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2 lg:gap-4">
                    <button className="px-4 py-2 border border-gray-700 text-black rounded-md hover:bg-red-100 hover:border-gray-700 transition-colors text-sm lg:text-base">
                        엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* 주문 요약 */}
            <div className="mb-4">
                <h2 className="text-base lg:text-lg font-semibold text-gray-900">주문 ({filteredOrders.length})</h2>
            </div>

            {/* 주문 테이블 */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">매장명</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">운동 시점</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">주문 시간</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">사용자</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">멤버십 사용</th>
                                <th className="px-3 lg:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">결제 상태</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentOrders.map((order, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                                        <div className="text-xs lg:text-sm font-medium text-gray-900">
                                            {order.product_name.replace(/\\n/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                                        {order.store_name}
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getWorkoutTimeColor(order.product_time)}`}>
                                            {order.product_time}
                                        </span>
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                                        {formatOrderTime(order.order_time)}
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                                        {order.user_name}
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
                                        {getMembershipUsage(order.total_count_at_purchase, order.remain_count_after_purchase)}
                                    </td>
                                    <td className="px-3 lg:px-6 py-4 whitespace-nowrap text-xs lg:text-sm text-gray-900">
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
                <div className="flex justify-center mt-4 lg:mt-6">
                    <nav className="flex items-center space-x-1 lg:space-x-2">
                        <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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
                                    className={`px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium rounded-md ${
                                        currentPage === pageNum
                                            ? 'bg-purple-400 text-white'
                                            : 'text-gray-500 bg-white border border-none hover:bg-gray-50'
                                    }`}
                                >
                                    {pageNum}
                                </button>
                            );
                        })}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <span className="px-2 lg:px-3 py-2 text-xs lg:text-sm text-gray-500">...</span>
                        )}
                        
                        {totalPages > 5 && currentPage < totalPages - 2 && (
                            <button
                                onClick={() => setCurrentPage(totalPages)}
                                className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                {totalPages}
                            </button>
                        )}
                        
                        <button
                            onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                            disabled={currentPage === totalPages}
                            className="px-2 lg:px-3 py-2 text-xs lg:text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
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