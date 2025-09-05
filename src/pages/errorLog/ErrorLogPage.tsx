import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { errorLogsApi } from "../../api/errorLogs";
import type { ErrorLogItem } from "../../types/DTO/ErrorLogResponseDto";

const ErrorLogPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [errorLogs, setErrorLogs] = useState<ErrorLogItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [selectedStore, setSelectedStore] = useState<string>("전체 에러");
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchErrorLogs = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await errorLogsApi.getErrorLogs();
               

                // 객체를 배열로 변환하고 '테스트용' 제외
                const errorLogsArray = Object.values(data).filter(log => {
                    // machine_id로 매장명 확인하여 '테스트용' 제외
                    const storeName = getStoreNameByMachineId(log.machine_id);
                    return storeName !== '테스트';
                });
                setErrorLogs(errorLogsArray);
            } catch (error) {
                console.error('Failed to fetch error logs:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchErrorLogs();
    }, [isAuthenticated]); // selectedDate 의존성 제거

    // 기기 ID로 매장명 매핑 함수
    const getStoreNameByMachineId = (machineId: number): string => {
        switch (machineId) {
            case 20250000:
                return '테스트';
            case 20255621:
                return '세계대학조정대회';
            case 20259764:
                return '머슬비치';
            case 20258575:
                return '멋짐';
            default:
                return `기기 ${machineId}`;
        }
    };

    // 매장명을 기기 ID로 매핑하여 설정
    const errorLogsWithMappedStoreName = errorLogs.map(log => ({
        ...log,
        store_name: getStoreNameByMachineId(log.machine_id)
    }));

    // 매장 목록 추출 (매핑된 매장명 기준)
    const stores = ["전체 에러", ...Array.from(new Set(errorLogsWithMappedStoreName.map(log => log.store_name)))];

    // 필터링된 에러 로그 데이터
    const filteredErrorLogs = selectedStore === "전체 에러" 
        ? errorLogsWithMappedStoreName 
        : errorLogsWithMappedStoreName.filter(log => log.store_name === selectedStore);

    // 페이지네이션
    const totalPages = Math.ceil(filteredErrorLogs.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentErrorLogs = filteredErrorLogs.slice(startIndex, endIndex);

    // 날짜 포맷팅 함수
    const formatTimestamp = (timestamp: string) => {
        const date = new Date(timestamp);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
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
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">에러 로그를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">에러 로그를 불러오지 못했습니다. 다시 시도해주세요.</div>
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
                    <button className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-lg sm:rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors text-sm sm:text-base lg:text-lg font-medium shadow-sm">
                        엑셀 다운로드
                    </button>
                </div>
            </div>

            {/* 에러 로그 요약 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">에러 로그 ({filteredErrorLogs.length})</h2>
            </div>

            {/* 에러 로그 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">시간</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">기기 ID</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">매장명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">에러 상세</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentErrorLogs.map((log, index) => (
                                <tr key={index} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        <div className="text-xs sm:text-sm lg:text-base font-medium text-gray-900">
                                            {log.id}
                                        </div>
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatTimestamp(log.timestamp)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {log.machine_id}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getStoreNameByMachineId(log.machine_id)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        <div className="max-w-32 sm:max-w-48 lg:max-w-64 xl:max-w-96 truncate" title={log.error_detail}>
                                            {log.error_detail}
                                        </div>
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

export default ErrorLogPage;
