import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { stocksApi } from "../../api/stocks";
import type { StockResponse, StockData } from "../../types/DTO/StockResponseDto";

const StockPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [stocks, setStocks] = useState<StockResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>("전체 재고");
    const [currentPage, setCurrentPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
    const [restockCount, setRestockCount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchStocks = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await stocksApi.getStocks();
                
                // '테스트용' 제외
                const filteredStocks = data.filter(stock => stock.storeName !== '테스트용');
                
                setStocks(filteredStocks);

            } catch (error) {
                console.error('Failed to fetch stocks:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchStocks();
    }, [isAuthenticated]); // selectedDate 의존성 제거

    // 매장 목록 추출
    const stores = ["전체 재고", ...Array.from(new Set(stocks.map(stock => stock.storeName)))];

    // 필터링된 재고 데이터
    const filteredStocks = selectedStore === "전체 재고" 
        ? stocks 
        : stocks.filter(stock => stock.storeName === selectedStore);

    // 페이지네이션
    const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStocks = filteredStocks.slice(startIndex, endIndex);

    // 날짜 포맷팅 함수
    const formatUpdateTime = (updateTime: string) => {
        const date = new Date(updateTime);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
    };

    // 현재 시간 포맷팅 함수
    const getCurrentTimeFormatted = () => {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
    };

    // 재고 현황 포맷팅
    const formatStockCount = (count: number, productTime: string) => {
        if (productTime === "재고관리") {
            if (count >= 100) {
                return `${count}개`;
            } else {
                return `${count}회 (${count}L)`;
            }
        }
        return `${count}회`;
    };

    // 운동 시점 색상
    const getWorkoutTimeColor = (time: string) => {
        switch (time) {
            case "운동 중": return "bg-orange-100 text-orange-400 border-none";
            case "운동 전": return "bg-yellow-100 text-yellow-400 border-none";
            case "운동 후": return "bg-green-100 text-green-400 border-none";
            case "재고관리": return "bg-gray-100 text-gray-400 border-none";
            default: return "bg-gray-100 text-gray-400 border-none";
        }
    };

    // 재고 상태 색상
    const getStockStatusColor = (status: string) => {
        switch (status) {
            case "품절": return "bg-gray-200 text-gray-600 border-none";
            case "위험": return "bg-red-100 text-red-600 border-none";
            case "주의": return "bg-orange-100 text-orange-600 border-none";
            case "안전": return "bg-green-100 text-green-600 border-none";
            default: return "bg-gray-100 text-gray-600 border-none";
        }
    };

    // 충전 버튼 클릭 핸들러
    const handleRestockClick = (stock: StockData) => {
        setSelectedStock(stock);
        setRestockCount("");
        setIsModalOpen(true);
    };

    // 모달 닫기
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedStock(null);
        setRestockCount("");
    };

    // 재고 보충 제출
    const handleRestockSubmit = async () => {
        if (!selectedStock || !restockCount.trim()) return;

        const count = parseInt(restockCount);
        if (isNaN(count) || count <= 0) {
            alert("올바른 수량을 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);
            await stocksApi.restockStock({
                productId: selectedStock.productId,
                storeName: selectedStock.storeName,
                updateCount: count,
                updatedAt: new Date().toISOString(),
                managerName: selectedStock.manager
            });

            // 성공 시 모달 닫고 데이터 새로고침
            handleCloseModal();
            const updatedData = await stocksApi.getStocks();
            setStocks(updatedData);
            alert("재고가 성공적으로 보충되었습니다.");
        } catch (error) {
            console.error('Failed to restock:', error);
            alert("재고 보충에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
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
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">재고 데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">재고 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
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
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {store}
                        </button>
                    ))}
                </div>
            </div>

            {/* 재고 요약 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">재고 ({filteredStocks.length})</h2>
            </div>

            {/* 재고 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">운동 시점</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">마지막 충전 시간</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">재고 현황</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">재고 상태</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 여부</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentStocks.map((stock, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none truncate">
                                            {stock.productName.replace(/\\n/g, ' ')}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        {stock.productTime !== "재고관리" && (
                                            <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getWorkoutTimeColor(stock.productTime)}`}>
                                                {stock.productTime}
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatUpdateTime(stock.updatedAddTime)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {stock.manager}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatStockCount(stock.productCount, stock.productTime)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getStockStatusColor(stock.productStatus)}`}>
                                            {stock.productStatus}
                                        </span>
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <button 
                                            onClick={() => handleRestockClick(stock)}
                                            className="inline-flex px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-full bg-black text-white border-none hover:bg-gray-800 transition-colors"
                                        >
                                            충전
                                        </button>
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
                                            ? 'bg-purple-600 text-white shadow-sm'
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

            {/* 재고 보충 모달 */}
            {isModalOpen && selectedStock && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">재고 보충</h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">담당자 명</label>
                                <input
                                    type="text"
                                    value={selectedStock.manager}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">보충 일시</label>
                                <input
                                    type="text"
                                    value={getCurrentTimeFormatted()}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">제품명</label>
                                <input
                                    type="text"
                                    value={selectedStock.productName.replace(/\\n/g, ' ')}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">보충하신 양을 입력해주세요</label>
                                <input
                                    type="number"
                                    value={restockCount}
                                    onChange={(e) => setRestockCount(e.target.value)}
                                    placeholder="30"
                                    min="1"
                                    step="1"
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm sm:text-base"
                                />
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">숫자만 입력해주세요 (예: 30)</p>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleRestockSubmit}
                                disabled={isSubmitting || !restockCount.trim()}
                                className="w-full bg-red-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base lg:text-lg font-medium"
                            >
                                {isSubmitting ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockPage;