import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { stocksApi } from "../../api/stocks";
import type { StockResponse, StockData, StockLogResponse, StockLogData, StorageStockResponse, ProductData } from "../../types/DTO/StockResponseDto";

const StockPage = () => {
    const { isAuthenticated, storeName } = useAuth();
    const navigate = useNavigate();
    const [stocks, setStocks] = useState<StockResponse>([]);
    const [productsData, setProductsData] = useState<ProductData[]>([]);
    const [stockLogs, setStockLogs] = useState<StockLogResponse>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    // storeName이 있으면 해당 매장으로 초기 선택, 없으면 중앙창고
    const [selectedStore, setSelectedStore] = useState<string>(() => {
        // 초기값은 storeName이 있으면 해당 매장, 없으면 중앙창고
        return storeName || "중앙창고";
    });
    const [storageStocks, setStorageStocks] = useState<StorageStockResponse>([]);
    // storeName이 있으면 해당 매장으로 초기 선택, 없으면 중앙창고
    const [selectedLogStore, setSelectedLogStore] = useState<string>(() => {
        return storeName || "중앙창고";
    });
    const [currentLogPage, setCurrentLogPage] = useState(1);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedStock, setSelectedStock] = useState<StockData | null>(null);
    const [restockCount, setRestockCount] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [useCountUnit, setUseCountUnit] = useState(false); // 횟수 단위 체크박스 상태
    const [reason, setReason] = useState(""); // 재고 보충 이유 (비고)
    const [isLogModalOpen, setIsLogModalOpen] = useState(false);
    const [selectedLog, setSelectedLog] = useState<StockLogData | null>(null);
    const [sortBy, setSortBy] = useState<"id" | "name">("id"); // 정렬 기준
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
                // 매장 관리자는 storage API 호출 안 함 (403 에러 방지)
                const [stocksData, productsData, logsData] = await Promise.all([
                    stocksApi.getStocks(),
                    stocksApi.getProducts(),
                    stocksApi.getStockLogs()
                ]);
                
                // 전체 관리자만 storage API 호출
                const storageStocks: StorageStockResponse = storeName 
                    ? [] 
                    : await stocksApi.getStorageStocks();
                
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

    // storeName이 변경되면 해당 매장으로 자동 선택
    useEffect(() => {
        if (storeName) {
            setSelectedStore(storeName);
            setSelectedLogStore(storeName);
        } else if (!storeName) {
            // 전체 관리자가 되었을 때 중앙창고로 리셋
            if (selectedStore !== "중앙창고") {
                setSelectedStore("중앙창고");
            }
            if (selectedLogStore !== "중앙창고") {
                setSelectedLogStore("중앙창고");
            }
        }
    }, [storeName]);

    // 매장 목록 추출 (중앙창고 먼저)
    const storeSet = Array.from(new Set(stocks.map(stock => stock.storeName)));
    // storeName이 있으면 해당 매장만, 없으면 모든 매장
    const availableStores = storeName 
        ? [storeName] // 매장 관리자는 자신의 매장만
        : ["중앙창고", ...storeSet]; // 전체 관리자는 모든 매장
    const stores = availableStores;
    
    // 로그 매장 목록 추출 (중앙창고 먼저)
    const logStoreSet = Array.from(new Set(stockLogs.map(log => log.store_name))).filter(name => name !== "중앙창고");
    // storeName이 있으면 해당 매장만, 없으면 모든 매장
    const availableLogStores = storeName
        ? [storeName] // 매장 관리자는 자신의 매장만
        : ["중앙창고", ...logStoreSet]; // 전체 관리자는 모든 매장
    const logStores = availableLogStores;

    // 필터링된 재고 데이터 (중앙창고 포함)
    const filteredStocks = selectedStore === "중앙창고"
    ? productsData
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
        .sort((a, b) => sortBy === "id" ? a.productId - b.productId : a.productName.localeCompare(b.productName))
    : stocks.filter(stock => stock.storeName === selectedStore)
        .sort((a, b) => sortBy === "id" ? a.productId - b.productId : a.productName.localeCompare(b.productName));

    // 필터링된 로그 데이터 (변경량이 양수인 경우만)
    const filteredLogs = stockLogs
        .filter(log => log.store_name === selectedLogStore && log.change_amount > 0)
        .sort((a, b) => b.id - a.id);

    // 재고 페이지네이션 제거 - 모든 항목 표시
    const currentStocks = filteredStocks;

    // 로그 페이지네이션
    const totalLogPages = Math.ceil(filteredLogs.length / logsPerPage);
    const startLogIndex = (currentLogPage - 1) * logsPerPage;
    const endLogIndex = startLogIndex + logsPerPage;
    const currentLogs = filteredLogs.slice(startLogIndex, endLogIndex);

    // 제품 이름 포맷팅 함수 (제품 ID에 따라 구분자 추가)
    const formatProductName = (productId: number, productName: string): string => {
        let formattedName = productName.replace(/\\n/g, ' ');
        
        if (productId === 8) {
            formattedName += ' (유어스핏)';
        } else if (productId === 11) {
            formattedName += ' (바이젝)';
        }
        
        return formattedName;
    };

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
        setUseCountUnit(false); // 기본값은 통 단위
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
        setUseCountUnit(false); // 체크박스 상태 초기화
        setReason(""); // 비고 초기화
    };

    // 로그 클릭 핸들러
    const handleLogClick = (log: StockLogData) => {
        setSelectedLog(log);
        setIsLogModalOpen(true);
    };

    // 로그 모달 닫기
    const handleCloseLogModal = () => {
        setIsLogModalOpen(false);
        setSelectedLog(null);
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

                
                const confirm = window.confirm(
                    `${count}개(통)가 충전됩니다.\n계속하시겠습니까?`
                );
                
                if (!confirm) {
                    setIsSubmitting(false);
                    return;
                }
                
                await stocksApi.restockStorageStock({
                    productId: selectedStock.productId,
                    updateCount: count,
                    updatedAt: new Date().toISOString(),
                    managerName: selectedStock.manager,
                    reason: reason.trim() || undefined // 비고가 있으면 전송
                });
                
                // 매장 관리자는 storage API 호출 안 함
                const logsData = await stocksApi.getStockLogs();
                const updatedStorageData: StorageStockResponse = storeName 
                    ? [] 
                    : await stocksApi.getStorageStocks();
                
                setStorageStocks(updatedStorageData);
                setStockLogs(logsData); 
                
            } else {
                const oneCapacity = selectedStock.one_capacity || 0;
                const isStoreManager = !!storeName; // 매장 관계자 여부
                
                // 확인 메시지 표시 (통 단위인지 횟수 단위인지에 따라)
                if (!useCountUnit && oneCapacity > 0) {
                    // 통 단위일 때 확인 메시지 (실제 증가할 횟수 표시)
                    const totalCount = count * oneCapacity;
                    const confirmMessage = count > 0
                        ? isStoreManager
                            ? `${count}통 (${totalCount}회)이 충전됩니다.\n(중앙창고에 반영되지 않습니다)\n계속하시겠습니까?`
                            : `${count}통 (${totalCount}회)이 충전됩니다.\n중앙창고에서 ${count}통이 차감됩니다.\n계속하시겠습니까?`
                        : isStoreManager
                            ? `${Math.abs(count)}통 (${Math.abs(totalCount)}회)이 차감됩니다.\n(중앙창고에 반영되지 않습니다)\n계속하시겠습니까?`
                            : `${Math.abs(count)}통 (${Math.abs(totalCount)}회)이 차감됩니다.\n중앙창고에 ${Math.abs(count)}통이 반환됩니다.\n계속하시겠습니까?`;
                    
                    const confirm = window.confirm(confirmMessage);
                    if (!confirm) {
                        setIsSubmitting(false);
                        return;
                    }
                } else if (useCountUnit) {
                    // 횟수 단위일 때 확인 메시지
                    const confirmMessage = count > 0
                        ? `${count}회가 충전됩니다.\n(중앙창고에 반영되지 않습니다)\n계속하시겠습니까?`
                        : `${Math.abs(count)}회가 차감됩니다.\n(중앙창고에 반영되지 않습니다)\n계속하시겠습니까?`;
                    
                    const confirm = window.confirm(confirmMessage);
                    if (!confirm) {
                        setIsSubmitting(false);
                        return;
                    }
                }
                
                // 백엔드에 입력값 그대로 전송 (통 단위면 통 개수, 횟수 단위면 횟수)
                // 매장 관계자는 항상 isCountUnit: true로 설정하여 중앙창고 차감 안되도록
                await stocksApi.restockStock({
                    productId: selectedStock.productId,
                    storeName: selectedStock.storeName,
                    updateCount: count, // 입력값 그대로 전송
                    updatedAt: new Date().toISOString(),
                    managerName: selectedStock.manager,
                    isCountUnit: isStoreManager ? true : useCountUnit, // 매장 관계자는 항상 true
                    reason: reason.trim() || undefined // 비고가 있으면 전송
                });

                // 매장 관리자는 storage API 호출 안 함
                const [updatedStocksData, productData, logsData] = await Promise.all([
                    stocksApi.getStocks(),
                    stocksApi.getProducts(),
                    stocksApi.getStockLogs()
                ]);
                
                // 전체 관리자만 storage API 호출
                const updatedStorageData: StorageStockResponse = storeName 
                    ? [] 
                    : await stocksApi.getStorageStocks();

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
                setStorageStocks(updatedStorageData);  
            }

            handleCloseModal();
            alert("재고가 성공적으로 보충되었습니다.");
            
        } catch (error: any) {
            console.error('Failed to restock:', error);
            
            // 400 에러일 경우 중앙창고 재고 확인 메시지
            if (error?.response?.status === 400) {
                alert("중앙창고의 재고를 확인해 주세요.");
            } else {
                alert("재고 보충에 실패했습니다. 다시 시도해주세요.");
            }
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
                {/* 매장 선택 탭 - 전체 관리자만 표시 */}
                {!storeName && (
                    <div className="flex flex-wrap gap-1 sm:gap-2 bg-white rounded-lg sm:rounded-xl p-1 sm:p-2 shadow-sm">
                        {stores.map((store) => (
                            <button
                                key={store}
                                onClick={() => {
                                    setSelectedStore(store);
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
                )}
                {/* 매장 관리자는 현재 매장 표시 */}
                {storeName && (
                    <div className="px-3 sm:px-4 py-2 sm:py-3 bg-mainRed text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base">
                        {storeName}
                    </div>
                )}
            </div>

            {/* 재고 요약 */}
            <div className="mb-4 sm:mb-6 flex items-center justify-between gap-4">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">재고 ({filteredStocks.length})</h2>
                <div className="flex items-center gap-2 bg-white rounded-lg sm:rounded-xl p-1 shadow-sm">
                    <button
                        onClick={() => setSortBy("id")}
                        className={`px-3 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                            sortBy === "id"
                                ? 'bg-mainRed text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        ID 기준
                    </button>
                    <button
                        onClick={() => setSortBy("name")}
                        className={`px-3 sm:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                            sortBy === "name"
                                ? 'bg-mainRed text-white shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                    >
                        제품명 기준
                    </button>
                </div>
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
                                        <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none overflow-x-auto whitespace-nowrap">
                                            {formatProductName(stock.productId, stock.productName)}
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
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:tgext-sm lg:text-base text-gray-900">
                                        {stock.manager}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {selectedStore === "중앙창고" 
                                            ? `${stock.productCount}통`
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


            {/* 재고 로그 섹션 */}
            <div className="mt-8 sm:mt-10 lg:mt-12">
                {/* 로그 상단 탭 */}
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                    {/* 로그 매장 선택 탭 - 전체 관리자만 표시 */}
                    {!storeName && (
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
                    )}
                    {/* 매장 관리자는 현재 매장 표시 */}
                    {storeName && (
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-mainRed text-white rounded-lg sm:rounded-xl font-medium text-sm sm:text-base">
                            {storeName}
                        </div>
                    )}
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
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">제품명</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">마지막 충전 시간</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 전 재고</th>
                                    <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">충전 후 재고</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {currentLogs.map((log, index) => (
                                    <tr 
                                        key={index} 
                                        onClick={() => handleLogClick(log)}
                                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                                    >
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900 max-w-32 sm:max-w-48 lg:max-w-none overflow-x-auto whitespace-nowrap">
                                                {log.product_name ? formatProductName(log.product_id, log.product_name) : `제품 ID: ${log.product_id}`}
                                            </div>
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {formatUpdateTime(log.logged_at)}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.manager}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.store_name === "중앙창고" 
                                                ? (() => {
                                                    const product = productsData.find(p => p.id === log.product_id);
                                                    const oneCapacity = product?.one_capacity || 1;
                                                    return `${Math.floor(log.previous_count / oneCapacity)}통`;
                                                })()
                                                : `${log.previous_count}회`
                                            }
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {log.store_name === "중앙창고" 
                                                ? (() => {
                                                    const product = productsData.find(p => p.id === log.product_id);
                                                    const oneCapacity = product?.one_capacity || 1;
                                                    return `${Math.floor(log.new_count / oneCapacity)}통`;
                                                })()
                                                : `${log.new_count}회`
                                            }
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
                                    value={formatProductName(selectedStock.productId, selectedStock.productName)}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
                                    비고 <span className="text-gray-400 text-xs">(선택사항)</span>
                                </label>
                                <textarea
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    placeholder="재고 보충 이유를 입력해주세요 (선택)"
                                    rows={3}
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent resize-none"
                                />
                            </div>

                            {/* 매장 재고만 횟수 단위 체크박스 표시 */}
                            {selectedStock?.storeName !== "중앙창고" && (
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="useCountUnit"
                                        checked={useCountUnit}
                                        onChange={(e) => setUseCountUnit(e.target.checked)}
                                        className="w-4 h-4 text-mainRed border-gray-300 rounded focus:ring-mainRed"
                                    />
                                    <label htmlFor="useCountUnit" className="text-sm sm:text-base font-medium text-gray-700 cursor-pointer">
                                        횟수 단위로 충전
                                    </label>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">
                                    보충하신 양을 입력해주세요
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        value={restockCount}
                                        onChange={(e) => setRestockCount(e.target.value)}
                                        placeholder={
                                            selectedStock?.storeName === "중앙창고" 
                                                ? "충전할 통 개수" 
                                                : useCountUnit 
                                                    ? "충전할 횟수"
                                                    : "충전할 통 개수"
                                        }
                                        className={`w-full px-3 sm:px-4 py-2 sm:py-3 bg-white border border-gray-300 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base ${
                                            selectedStock?.storeName !== "중앙창고" && !useCountUnit ? "pr-16 sm:pr-20" : ""
                                        }`}
                                    />

                                    {/* 매장 재고 & 통 단위일 때만 1통 버튼 표시 (input 필드 안) */}
                                    {selectedStock?.storeName !== "중앙창고" && !useCountUnit && (
                                        <button
                                            type="button"
                                            onClick={() => setRestockCount("1")}
                                            className="absolute right-2 top-1/3 transform -translate-y-1/2 px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-black rounded-md hover:bg-gray-50 transition-colors z-10"
                                        >
                                            1통
                                        </button>
                                    )}

                                    {/* 중앙창고 설명 */}
                                    {selectedStock?.storeName === "중앙창고" && selectedStock.one_capacity && selectedStock.one_capacity > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            1통 = {selectedStock.one_capacity}회 
                                            {restockCount && !isNaN(parseInt(restockCount)) && (
                                                <span className="font-semibold text-mainRed ml-2">
                                                    (총 {parseInt(restockCount) * selectedStock.one_capacity}회)
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    
                                    {/* 매장 재고 & 통 단위일 때만 변환 정보 표시 */}
                                    {selectedStock?.storeName !== "중앙창고" && !useCountUnit && selectedStock.one_capacity && selectedStock.one_capacity > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            1통 = {selectedStock.one_capacity}회 
                                            {restockCount && !isNaN(parseInt(restockCount)) && (
                                                <span className="font-semibold text-mainRed ml-2">
                                                    {storeName 
                                                        ? `(총 ${parseInt(restockCount) * selectedStock.one_capacity}회)`
                                                        : `(총 ${parseInt(restockCount) * selectedStock.one_capacity}회 / 중앙창고 ${parseInt(restockCount)}통 차감)`
                                                    }
                                                </span>
                                            )}
                                        </p>
                                    )}
                                    {/* 매장 재고 & 횟수 단위일 때 변환 정보 표시 */}
                                    {selectedStock?.storeName !== "중앙창고" && useCountUnit && selectedStock.one_capacity && selectedStock.one_capacity > 0 && (
                                        <p className="text-xs text-gray-500 mt-2">
                                            1통 = {selectedStock.one_capacity}회 
                                            {restockCount && !isNaN(parseInt(restockCount)) && (
                                                <span className="font-semibold text-mainRed ml-2">
                                                    (총 {parseInt(restockCount)}회)
                                                </span>
                                            )}
                                        </p>
                                    )}
                                </div>
                                <p className="text-xs sm:text-sm text-gray-500 mt-1 sm:mt-2">
                                    {selectedStock?.storeName === "중앙창고" 
                                        ? "숫자만 입력해주세요 (예: 30, -10)" 
                                        : useCountUnit 
                                            ? "횟수 단위로 입력해주세요 (예: 30, -10)" 
                                            : "통 단위로 입력해주세요 (예: 1, 2, -1)"}
                                </p>
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

            {/* 재고 로그 상세 모달 */}
            {isLogModalOpen && selectedLog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">재고 충전 상세</h3>
                            <button
                                onClick={handleCloseLogModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 sm:space-y-4 scrollbar-hide">
                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">충전 매장</label>
                                <input
                                    type="text"
                                    value={selectedLog.store_name}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base font-semibold"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">충전 일시</label>
                                <input
                                    type="text"
                                    value={formatUpdateTime(selectedLog.logged_at)}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">담당자</label>
                                <input
                                    type="text"
                                    value={selectedLog.manager}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">제품명</label>
                                <input
                                    type="text"
                                    value={selectedLog.product_name ? formatProductName(selectedLog.product_id, selectedLog.product_name) : `제품 ID: ${selectedLog.product_id}`}
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">충전 전 재고</label>
                                    <input
                                        type="text"
                                        value={
                                            selectedLog.store_name === "중앙창고"
                                                ? (() => {
                                                    const product = productsData.find(p => p.id === selectedLog.product_id);
                                                    const oneCapacity = product?.one_capacity || 1;
                                                    return `${Math.floor(selectedLog.previous_count / oneCapacity)}통`;
                                                })()
                                                : `${selectedLog.previous_count}회`
                                        }
                                        disabled
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">충전 후 재고</label>
                                    <input
                                        type="text"
                                        value={
                                            selectedLog.store_name === "중앙창고"
                                                ? (() => {
                                                    const product = productsData.find(p => p.id === selectedLog.product_id);
                                                    const oneCapacity = product?.one_capacity || 1;
                                                    return `${Math.floor(selectedLog.new_count / oneCapacity)}통`;
                                                })()
                                                : `${selectedLog.new_count}회`
                                        }
                                        disabled
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">변경량</label>
                                <input
                                    type="text"
                                    value={
                                        selectedLog.store_name === "중앙창고"
                                            ? (() => {
                                                const product = productsData.find(p => p.id === selectedLog.product_id);
                                                const oneCapacity = product?.one_capacity || 1;
                                                return `+${Math.floor(selectedLog.change_amount / oneCapacity)}통`;
                                            })()
                                            : `+${selectedLog.change_amount}회`
                                    }
                                    disabled
                                    className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-sm sm:text-base font-semibold text-green-600"
                                />
                            </div>

                            {selectedLog.reason && (
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">비고</label>
                                    <textarea
                                        value={selectedLog.reason}
                                        disabled
                                        rows={3}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base resize-none"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleCloseLogModal}
                                className="w-full bg-gray-600 text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:bg-gray-700 transition-colors text-sm sm:text-base lg:text-lg font-medium"
                            >
                                닫기
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StockPage;