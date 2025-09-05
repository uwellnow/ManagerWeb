

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { membersApi } from "../../api/members";
import type { Member, RefundLog } from "../../types/DTO/MemberResponseDto";

const CustomerPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [members, setMembers] = useState<Member[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedMemberType, setSelectedMemberType] = useState<string>("전체 회원");
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
    const [selectedMember, setSelectedMember] = useState<Member | null>(null);
    const [refundCount, setRefundCount] = useState("");
    const [refundReason, setRefundReason] = useState("");
    const [processedBy, setProcessedBy] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [refunds, setRefunds] = useState<RefundLog[]>([]);
    const [isRefundsLoading, setIsRefundsLoading] = useState(true);
    const [isRefundsError, setIsRefundsError] = useState(false);
    const itemsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchMembers = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await membersApi.getMembers();
                setMembers(data.members);
            } catch (error) {
                console.error('Failed to fetch members:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMembers();
    }, [isAuthenticated]);

    useEffect(() => {
        const fetchRefunds = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsRefundsLoading(true);
                setIsRefundsError(false);
                const data = await membersApi.getRefunds();
                setRefunds(data.refunds);
            } catch (error) {
                console.error('Failed to fetch refunds:', error);
                setIsRefundsError(true);
            } finally {
                setIsRefundsLoading(false);
            }
        };

        fetchRefunds();
    }, [isAuthenticated]);

    // 회원 구분 결정 함수
    const getMemberType = (member: Member): string => {
        if (member.memberships.length === 0) {
            return "일반 회원";
        }
        
        // 멤버십 이름으로 구분
        const membershipNames = member.memberships.map(m => m.name);
        
        if (membershipNames.some(name => name.includes("트레이너"))) {
            return "트레이너";
        }
        if (membershipNames.some(name => name.includes("서포터즈") || name.includes("앰배서더"))) {
            return "서포터즈";
        }
        
        return "일반 회원";
    };

    // 회원 구분별 필터링
    const filteredMembers = selectedMemberType === "전체 회원"
        ? members
        : members.filter(member => getMemberType(member) === selectedMemberType);

    // 페이지네이션
    const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentMembers = filteredMembers.slice(startIndex, endIndex);

    // 성별 표시 함수
    const getGenderDisplay = (gender: string | null): string => {
        if (!gender) return "-";
        if (gender === "M" || gender === "남") return "남";
        if (gender === "F" || gender === "여") return "여";
        return gender;
    };

    // 생년월일 표시 함수
    const getBirthDisplay = (birth: string | null): string => {
        if (!birth) return "-";
        return birth;
    };

    // 전화번호 포맷팅 함수
    const formatPhoneNumber = (phone: string): string => {
        if (!phone) return "-";
        // 하이픈이 없는 경우 추가
        if (phone.length === 11 && !phone.includes('-')) {
            return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
        }
        return phone;
    };

    // 결제일시 계산 (가장 최근 멤버십의 결제일)
    const getPaymentDate = (member: Member): string => {
        if (member.memberships.length === 0) return "-";
        
        // 바코드에서 날짜 추출 (예: 202508175011216 -> 2025.08.17)
        const latestMembership = member.memberships[member.memberships.length - 1];
        const barcode = latestMembership.barcode;
        
        if (barcode.length >= 8) {
            const year = barcode.substring(0, 4);
            const month = barcode.substring(4, 6);
            const day = barcode.substring(6, 8);
            return `${year}.${month}.${day}`;
        }
        
        return "-";
    };

    // 이용현황 계산 (remain/total)
    const getUsageStatus = (member: Member): string => {
        if (member.memberships.length === 0) return "-";
        
        // 가장 최근 멤버십의 이용현황
        const latestMembership = member.memberships[member.memberships.length - 1];
        return `${latestMembership.remain_count}/${latestMembership.total_count}`;
    };

    // 환불 시간 포맷팅 함수
    const formatRefundTime = (createdAt: string) => {
        const date = new Date(createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = date.getHours();
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const ampm = hours >= 12 ? '오후' : '오전';
        const displayHours = hours > 12 ? hours - 12 : hours;
        
        return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
    };

    // 환불 모달 열기
    const handleRefundClick = (member: Member) => {
        setSelectedMember(member);
        setRefundCount("1");
        setRefundReason("");
        setProcessedBy("");
        setIsRefundModalOpen(true);
    };

    // 환불 모달 닫기
    const handleCloseRefundModal = () => {
        setIsRefundModalOpen(false);
        setSelectedMember(null);
        setRefundCount("");
        setRefundReason("");
        setProcessedBy("");
    };

    // 환불 처리 함수
    const handleRefundSubmit = async () => {
        if (!selectedMember || !refundCount.trim() || !refundReason.trim() || !processedBy.trim()) {
            alert("모든 필드를 입력해주세요.");
            return;
        }

        const count = parseInt(refundCount);
        if (isNaN(count) || count <= 0) {
            alert("올바른 환불 개수를 입력해주세요.");
            return;
        }

        try {
            setIsSubmitting(true);
            const latestMembership = selectedMember.memberships[selectedMember.memberships.length - 1];
            
            await membersApi.refundMember({
                membership_id: latestMembership.id,
                refund_count: count,
                refund_reason: refundReason,
                processed_by: processedBy
            });
            
            // 성공 시 모달 닫고 데이터 새로고침
            handleCloseRefundModal();
            
            // 데이터 새로고침
            const [membersData, refundsData] = await Promise.all([
                membersApi.getMembers(),
                membersApi.getRefunds()
            ]);
            setMembers(membersData.members);
            setRefunds(refundsData.refunds);
            
            alert("환불이 완료되었습니다.");
        } catch (error) {
            console.error('Failed to refund:', error);
            alert("환불 처리에 실패했습니다. 다시 시도해주세요.");
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
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">회원 데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">회원 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
        </div>
        );
    }

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 상단 탭 */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                {/* 회원 구분 선택 탭 */}
                <div className="flex flex-wrap gap-1 sm:gap-2 bg-white rounded-lg sm:rounded-xl p-1 sm:p-2 shadow-sm">
                    {["전체 회원", "일반 회원", "트레이너", "서포터즈"].map((memberType) => (
                        <button
                            key={memberType}
                            onClick={() => {
                                setSelectedMemberType(memberType);
                                setCurrentPage(1);
                            }}
                            className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-medium transition-colors whitespace-nowrap ${
                                selectedMemberType === memberType
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {memberType}
                        </button>
                    ))}
                </div>
                
                {/* 수동 회원 등록 버튼 */}
                <div className="flex justify-center lg:justify-end">
                    <button className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-black text-white rounded-lg sm:rounded-xl hover:bg-gray-800 transition-colors text-sm sm:text-base lg:text-lg font-medium shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        수동 회원 등록
                    </button>
                </div>
            </div>

            {/* 회원 요약 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    {selectedMemberType} ({filteredMembers.length})
                </h2>
            </div>

            {/* 회원 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원 구분</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">성별</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">결제일시</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">이용 현황</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentMembers.map((member) => (
                                <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900 font-medium">
                                        {member.name}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getMemberType(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getGenderDisplay(member.gender)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getBirthDisplay(member.birth)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {formatPhoneNumber(member.phone)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getPaymentDate(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getUsageStatus(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4">
                                        {member.memberships.length > 0 ? (
                                            <button 
                                                onClick={() => handleRefundClick(member)}
                                                className="inline-flex px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-full bg-gray-600 text-white border-none hover:bg-gray-700 transition-colors"
                                            >
                                                환불
                                            </button>
                                        ) : (
                                            <span className="text-gray-400 text-xs sm:text-sm">-</span>
                                        )}
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

            {/* 환불 로그 섹션 */}
            <div className="mt-8 sm:mt-12">
                <div className="mb-4 sm:mb-6">
                    <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">환불 로그 ({refunds.length})</h2>
                </div>

                {isRefundsLoading ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="flex flex-col items-center gap-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-sm sm:text-base lg:text-lg text-gray-600">환불 로그를 불러오는 중...</span>
                        </div>
                    </div>
                ) : isRefundsError ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                            <div className="text-gray-600 text-sm sm:text-base lg:text-lg">환불 로그를 불러오지 못했습니다. 다시 시도해주세요.</div>
                        </div>
                    </div>
                ) : refunds.length === 0 ? (
                    <div className="flex items-center justify-center p-8">
                        <div className="text-center max-w-md">
                            <div className="text-gray-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">환불 로그 없음</div>
                            <div className="text-gray-600 text-sm sm:text-base lg:text-lg">표시할 환불 로그가 없습니다.</div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불전/후 잔수</th>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불 잔수</th>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불 시간</th>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">담당자</th>
                                        <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불 사유</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {refunds.map((refund) => (
                                        <tr key={refund.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900 font-medium">
                                                {refund.member_name}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {refund.before_remain_count} → {refund.after_remain_count}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {refund.refund_count}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {formatRefundTime(refund.created_at)}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {refund.processed_by}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {refund.refund_reason}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>

            {/* 환불 모달 */}
            {isRefundModalOpen && selectedMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">환불관리</h3>
                            <button
                                onClick={handleCloseRefundModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                            {/* 왼쪽 컬럼 */}
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">회원명</label>
                                    <input
                                        type="text"
                                        value={selectedMember.name}
                                        disabled
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">회원 구분</label>
                                    <input
                                        type="text"
                                        value={getMemberType(selectedMember)}
                                        disabled
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">환불 사유</label>
                                    <input
                                        type="text"
                                        value={refundReason}
                                        onChange={(e) => setRefundReason(e.target.value)}
                                        placeholder="환불 사유를 입력하세요"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">환불 개수</label>
                                    <input
                                        type="number"
                                        value={refundCount}
                                        onChange={(e) => setRefundCount(e.target.value)}
                                        placeholder="1"
                                        min="1"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* 오른쪽 컬럼 */}
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">환불 담당자명</label>
                                    <input
                                        type="text"
                                        value={processedBy}
                                        onChange={(e) => setProcessedBy(e.target.value)}
                                        placeholder="담당자명을 입력하세요"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">현재 보유 잔수</label>
                                    <input
                                        type="text"
                                        value={selectedMember.memberships.length > 0 ? selectedMember.memberships[selectedMember.memberships.length - 1].remain_count : "0"}
                                        disabled
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleRefundSubmit}
                                disabled={isSubmitting || !refundCount.trim() || !refundReason.trim() || !processedBy.trim()}
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

export default CustomerPage;