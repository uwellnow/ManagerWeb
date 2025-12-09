import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { systemStatusApi } from "../../api/systemStatus";
import type { SystemStatus } from "../../types/DTO/SystemStatusResponseDto";

const MaintenancePage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [systemStatuses, setSystemStatuses] = useState<SystemStatus[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [updatingId, setUpdatingId] = useState<number | null>(null);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchSystemStatuses = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await systemStatusApi.getSystemStatuses();
                
                // API 응답이 배열이거나 객체일 수 있음
                const statuses = Array.isArray(data) ? data : (data.statuses || []);
                setSystemStatuses(statuses);
            } catch (error) {
                console.error('Failed to fetch system statuses:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSystemStatuses();
    }, [isAuthenticated]);

    // API Key를 매장명으로 변환
    const getStoreNameByApiKey = (apiKey: string): string => {
        const storeMap: Record<string, string> = {
            '20250000': '테스트',
            '20252354': '인트로피트니스',
            '20258575': '멋짐',
            '20255621': '세계대학조정대회',
            '20259764': '머슬비치',
            '20252323': '유어스핏',
            '20252424': '바이젝',
        };
        return storeMap[apiKey] || apiKey;
    };

    // 상태 타입을 한글로 변환
    const getStatusTypeDisplay = (statusType: string): string => {
        switch (statusType) {
            case 'MACHINE':
                return '기기 점검';
            case 'SERVER':
                return '서버 점검';
            default:
                return statusType;
        }
    };

    const handleToggleStatus = async (status: SystemStatus) => {
        const newIsActive = !status.is_active;
        const storeName = getStoreNameByApiKey(status.api_key);
        const confirmMessage = `${storeName}의 상태를 ${newIsActive ? 'ON' : 'OFF'}로 변경하시겠습니까?`;
        
        if (!window.confirm(confirmMessage)) {
            return;
        }

        try {
            setUpdatingId(status.id);
            await systemStatusApi.updateSystemStatus(status.id, {
                api_key: status.api_key,
                is_active: newIsActive,
                status_type: status.status_type,
            });

            // 성공 시 목록 새로고침
            const data = await systemStatusApi.getSystemStatuses();
            const statuses = Array.isArray(data) ? data : (data.statuses || []);
            setSystemStatuses(statuses);
        } catch (error) {
            console.error('Failed to update system status:', error);
            alert('상태 변경에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setUpdatingId(null);
        }
    };

    // 날짜 포맷팅 함수
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
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
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">점검 상태를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">점검 상태를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 헤더 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    시스템 점검 상태 ({systemStatuses.length})
                </h2>
            </div>

            {/* 시스템 상태 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">ID</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">매장명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">점검 여부</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">상태 타입</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">업데이트 일시</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {systemStatuses.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-2 sm:px-3 lg:px-6 py-8 text-center text-gray-500">
                                        등록된 점검 상태가 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                systemStatuses.map((status) => (
                                    <tr key={status.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900 font-medium">
                                            {status.id}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {getStoreNameByApiKey(status.api_key)}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                            <button
                                                onClick={() => handleToggleStatus(status)}
                                                disabled={updatingId === status.id}
                                                className={`px-3 sm:px-4 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg border-none transition-colors ${
                                                    status.is_active
                                                        ? 'bg-mainRed text-white hover:bg-red-400'
                                                        : 'bg-gray-700 text-white hover:bg-gray-400'
                                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                                            >
                                                {updatingId === status.id ? '변경 중...' : status.is_active ? 'ON' : 'OFF'}
                                            </button>
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {getStatusTypeDisplay(status.status_type)}
                                        </td>
                                        <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                            {formatDate(status.created_at)} 
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default MaintenancePage;

