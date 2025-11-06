import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { stocksApi } from "../../api/stocks";
import type { StockResponse, StockData, StockLogResponse, StorageStockResponse, ProductData } from "../../types/DTO/StockResponseDto";

const StockPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [stocks, setStocks] = useState<StockResponse>([]);
    const [productsData, setProductsData] = useState<ProductData[]>([]);
    const [stockLogs, setStockLogs] = useState<StockLogResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>("중앙창고");
    const [storageStocks, setStorageStocks] = useState<StorageStockResponse>([]);
    const [selectedLogStore, setSelectedLogStore] = useState<string>("전체 로그");
    const [currentPage, setCurrentPage] = useState(1);
    const [currentLogPage, setCurrentLogPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
    const [restockCount, setRestockCount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const itemsPerPage = 10;
    const logsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchData = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                
                // 재고 데이터, 제품 데이터, 로그 데이터를 병렬로 가져오기
                const [stocksData, productsData, logsData, storageStocks] = await Promise.all([
                    stocksApi.getStocks(),
                    stocksApi.getProducts(),
                    stocksApi.getStockLogs(),
                    stocksApi.getStorageStocks()
                ]);
                
                // '테스트용' 제외
                const filteredStocks = stocksData.filter(stock => stock.storeName !== '테스트용');
                
                // one_capacity 값 추가
                const stocksWithCapacity = filteredStocks.map(stock => {
                    const product = productsData.find(p => p.id === stock.productId);
                    return {
                        ...stock,
                        one_capacity: product?.one_capacity || 0
                    };
                });
                
                setStocks(stocksWithCapacity);
                setStockLogs(logsData);
                setStorageStocks(storageStocks);
                setProductsData(productsData);

            } catch (error) {
                console.error('Failed to fetch data:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [isAuthenticated]);

    // 매장 목록 추출
    const stores = ["중앙창고", ...Array.from(new Set(stocks.map(stock => stock.storeName)))];
    
    // 로그 매장 목록 추출
    const logStores = ["전체 로그", ...Array.from(new Set(stockLogs.map(log => log.store_name)))];

    // 필터링된 재고 데이터 (중앙창고 포함)
    const filteredStocks = selectedStore === "중앙창고"
    ? productsData
        .filter(product => {
            // ID 1~7번 또는 100~101번만 표시
            return (product.id >= 1 && product.id <= 7) || (product.id >= 100 && product.id <= 101);
        })
        .map(product => {
            // storageStocks에서 해당 제품의 재고 정보 찾기
            const storageStock = storageStocks.find(s => s.productId === product.id);
            const count = storageStock?.count || 0;
            
            // 재고 상태 계산 (통 기준)
            let status: "품절" | "위험" | "주의" | "안전";
            if (count === 0) {
                status = "품절";
            } else if (count < 10) {
                status = "위험";
            } else if (count < 20) {
                status = "주의";
            } else {
                status = "안전";
            }
            
            return {
                productId: product.id,
                productName: product.name,
                productTime: "재고관리" as const,
                productDescription: product.description,
                productCount: count,
                updatedAddTime: storageStock?.lastRestockedAt || new Date().toISOString(),
                manager: storageStock?.manager || "-",
                productStatus: status,
                storeName: "중앙창고",
                one_capacity: product.one_capacity || 0
            };
        })
        .sort((a, b) => a.productId - b.productId)
    : stocks.filter(stock => stock.storeName === selectedStore)
        .sort((a, b) => a.productId - b.productId);

    // 필터링된 로그 데이터 (ID 기준 오름차순)
    const filteredLogs = selectedLogStore === "전체 로그"
        ? stockLogs.sort((a, b) => b.id - a.id)
        : stockLogs.filter(log => log.store_name === selectedLogStore).sort((a, b) => a.id - b.id);

    // 재고 페이지네이션
    const totalPages = Math.ceil(filteredStocks.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentStocks = filteredStocks.slice(startIndex, endIndex);

    // 로그 페이지네이션
    const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);
    const startLogIndex = (currentLogPage - 1) * logsPerPage;
    const endLogIndex = startLogIndex + logsPerPage;
    const currentLogs = filteredLogs.slice(startLogIndex, endLogIndex);

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
                return `${count}회`;
            } else {
                return `${count}회`;
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
        setSelectedStock({
            ...stock,
            manager: "" 
        });
        setRestockCount("");
        setIsModalOpen(true);
    };

    const handleStorageRestockClick = (stock: StockData) => {
        setSelectedStock({
            ...stock,
            manager: "",
            storeName: "중앙창고",
        });
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

        if (!selectedStock.manager.trim()) {
            alert("담당자 이름을 입력해주세요.");
            return;
        }

        const count = parseInt(restockCount);
        if (isNaN(count)) {
            alert("올바른 수량을 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);

            if (selectedStock.storeName === "중앙창고") {
                const oneCapacity = selectedStock.one_capacity || 0;
                
                if (oneCapacity === 0) {
                    alert("제품 정보를 불러올 수 없습니다. 다시 시도해주세요.");
                    return;
                }
                
                const convertedCount = count * oneCapacity; 
                
                const confirm = window.confirm(
                    `${count}개(통)가 충전됩니다.\n계속하시겠습니까?`
                );
                
                if (!confirm) {
                    setIsSubmitting(false);
                    return;
                }
                
                await stocksApi.restockStorageStock({
                    productId: selectedStock.productId,
                    updateCount: convertedCount,  // 👈 변환된 횟수 전송
                    updatedAt: new Date().toISOString(),
                    managerName: selectedStock.manager
                });
                
                const updatedStorageData = await stocksApi.getStorageStocks();
                setStorageStocks(updatedStorageData);
                
            } else {
                await stocksApi.restockStock({
                    productId: selectedStock.productId,
                    storeName: selectedStock.storeName,
                    updateCount: count,
                    updatedAt: new Date().toISOString(),
                    managerName: selectedStock.manager
                });

                const [updatedStocksData, productData, logsData] = await Promise.all([
                    stocksApi.getStocks(),
                    stocksApi.getProducts(),
                    stocksApi.getStockLogs()
                ]);

                const filteredStocks = updatedStocksData.filter(stock => stock.storeName !== '테스트용');
                const stocksWithCapacity = filteredStocks.map(stock => {
                    const product = productData.find(p => p.id === stock.productId);
                    return {
                        ...stock,
                        one_capacity: product?.one_capacity || 0
                    };
                });
                
                setStocks(stocksWithCapacity);
                setStockLogs(logsData);
                setProductsData(productData);
            }

            handleCloseModal();
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
                                    ? 'bg-mainRed text-white shadow-sm'
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
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                {selectedStore !== "중앙창고" && (
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                                    운동 시점
                                </th> )}
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">마지막 충전 시간</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">재고 현황</th>
                                {selectedStore !== "중앙창고" && (
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">
                                    재고 상태
                                </th> )}
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 여부</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentStocks.map((stock, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900 font-medium">
                                        {stock.productId}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none truncate">
                                            {stock.productName.replace(/\\n/g, ' ')}
                                        </div>
                                    </td>
                                    
                                    {selectedStore !== "중앙창고" && (
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            {stock.productTime !== "재고관리" && (
                                                <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getWorkoutTimeColor(stock.productTime)}`}>
                                                    {stock.productTime}
                                                </span>
                                            )}
                                        </td>
                                    )}

                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatUpdateTime(stock.updatedAddTime)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {stock.manager}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {selectedStore === "중앙창고" 
                                            ? `${stock.productCount}개`
                                            : formatStockCount(stock.productCount, stock.productTime)
                                        }
                                    </td>
                                    
                                    {selectedStore !== "중앙창고" && (
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getStockStatusColor(stock.productStatus)}`}>
                                                {stock.productStatus}
                                            </span>
                                        </td>
                                    )}

                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <button 
                                            onClick={() => {
                                                selectedStore === "중앙창고" 
                                                    ? handleStorageRestockClick(stock)
                                                    : handleRestockClick(stock)
                                            }}
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

            {/* 재고 로그 섹션 */}
            <div className="mt-8 sm:mt-10 lg:mt-12">
                {/* 로그 상단 탭 */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                    {/* 로그 매장 선택 탭 */}
                    <div className="flex flex-wrap gap-1 sm:gap-2 bg-white rounded-lg sm:rounded-xl p-1 sm:p-2 shadow-sm">
                        {logStores.map((store) => (
                            <button
                                key={store}
                                onClick={() => {
                                    setSelectedLogStore(store);
                                    setCurrentLogPage(1);
                                }}
                                className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-medium transition-colors whitespace-nowrap ${
                                    selectedLogStore === store
                                        ? 'bg-mainRed text-white shadow-sm'
                                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                }`}
                            >
                                {store}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 재고 로그 요약 */}
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">재고 충전 ({filteredLogs.length})</h2>
                </div>

                {/* 재고 로그 테이블 */}
                <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">운동 시점</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">마지막 충전 시간</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 전 재고</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 후 재고</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentLogs.map((log, index) => (
                                    <tr key={index} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900 font-medium">
                                            {log.id}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none truncate">
                                                {log.product_name?.replace("\\n", " ") || `제품 ID: ${log.product_id}`}
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            {log.product_time && (
                                                <span className={`inline-flex px-2 py-1 text-xs sm:text-sm font-semibold rounded-full ${getWorkoutTimeColor(log.product_time)}`}>
                                                    {log.product_time}
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {formatUpdateTime(log.logged_at)}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.manager}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.previous_count}회
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.new_count}회
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 로그 페이지네이션 */}
                {totalLogPages > 1 && (
                    <div className="flex justify-center mt-4 sm:mt-6 lg:mt-8">
                        <nav className="flex items-center space-x-1 sm:space-x-2">
                            <button
                                onClick={() => setCurrentLogPage(Math.max(1, currentLogPage - 1))}
                                disabled={currentLogPage === 1}
                                className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                &lt;
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalLogPages) }, (_, i) => {
                                let pageNum;
                                if (totalLogPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentLogPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentLogPage >= totalLogPages - 2) {
                                    pageNum = totalLogPages - 4 + i;
                                } else {
                                    pageNum = currentLogPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentLogPage(pageNum)}
                                        className={`px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium rounded-lg transition-colors ${
                                            currentLogPage === pageNum
                                                ? 'bg-mainRed text-white shadow-sm'
                                                : 'text-gray-500 bg-white border border-gray-300 hover:bg-gray-50'
                                        }`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            
                            {totalLogPages > 5 && currentLogPage < totalLogPages - 2 && (
                                <span className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base text-gray-500">...</span>
                            )}
                            
                            {totalLogPages > 5 && currentLogPage < totalLogPages - 2 && (
                                <button
                                    onClick={() => setCurrentLogPage(totalLogPages)}
                                    className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    {totalLogPages}
                                </button>
                            )}
                            
                            <button
                                onClick={() => setCurrentLogPage(Math.min(totalLogPages, currentLogPage + 1))}
                                disabled={currentLogPage === totalLogPages}
                                className="px-2 sm:px-3 lg:px-4 py-2 text-xs sm:text-sm lg:text-base font-medium text-gray-500 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                &gt;
                            </button>
                        </nav>
                    </div>
                )}
            </div>

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
                                    onChange={(e) => setSelectedStock(prev => prev ? { ...prev, manager: e.target.value } : null)}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
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
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={restockCount}
                                        onChange={(e) => setRestockCount(e.target.value)}
                                        placeholder={selectedStock?.storeName === "중앙창고" ? "충전할 통 개수" : "충전할 횟수"}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                    />

                                    {selectedStock?.storeName === "중앙창고" && selectedStock.one_capacity && selectedStock.one_capacity > 0 && (
                                        <p className="text-xs text-gray-500 mt-3">
                                            1통 = {selectedStock.one_capacity}회 
                                            {restockCount && !isNaN(parseInt(restockCount)) && (
                                                <span className="font-semibold text-mainRed ml-2">
                                                    (총 {parseInt(restockCount) * selectedStock.one_capacity}회)
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    
                                    {selectedStock?.storeName != "중앙창고" && (
                                        <button
                                        type="button"
                                        onClick={() => setRestockCount(selectedStock.one_capacity?.toString() || "0")}
                                        className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-black rounded-md hover:bg-gray-50 transition-colors"
                                    >
                                        1통
                                    </button>
                                    )}
                                    
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">숫자만 입력해주세요 (예: 30, -10)</p>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleRestockSubmit}
                                disabled={isSubmitting || !restockCount.trim() || !selectedStock?.manager.trim()}
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