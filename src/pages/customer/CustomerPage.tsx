

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useDate } from "../../context/DateContext";
import { membersApi } from "../../api/members";
import type { Member, Membership, RefundLog } from "../../types/DTO/MemberResponseDto";
import { exportMembersToExcel } from "../../utils/excelExport";

const CustomerPage = () => {
    const { isAuthenticated, storeName } = useAuth();
    const { selectedDate } = useDate(); // Header의 날짜 선택 사용
    const navigate = useNavigate();
    const [allMembers, setAllMembers] = useState<Member[]>([]); // 전체 회원 데이터
    const [members, setMembers] = useState<Member[]>([]); // 현재 표시되는 회원 데이터
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
    const [searchQuery, setSearchQuery] = useState("");
    const [onlyMembershipMembers, setOnlyMembershipMembers] = useState(false);
    
    // 구독권 플랜 옵션 (수동 등록 / 기존 회원 멤버십 등록 공통)
    const SUBSCRIPTION_PLANS = [
        { value: 'starter' as const, label: '스타터 Starter 1개월 - 11,900원' },
        { value: 'daily_1month' as const, label: '데일리 Daily 1개월 - 29,900원' },
        { value: 'daily_3month' as const, label: '데일리 Daily 3개월 - 59,700원' },
        { value: 'pro_1month' as const, label: '프로 Pro 1개월 - 99,000원' },
        { value: 'pro_3month' as const, label: '프로 Pro 3개월 - 207,000원' },
    ] as const;

    // 회원 등록 모달 상태
    const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
    const [registerForm, setRegisterForm] = useState({
        name: '',
        registrant_name: '',
        gender: '',
        birth: '',
        phone: '',
        plan: '' as '' | 'starter' | 'daily_1month' | 'daily_3month' | 'pro_1month' | 'pro_3month'
    });
    const [isRegisterSubmitting, setIsRegisterSubmitting] = useState(false);

    // 기존 회원 멤버십 등록 모달 상태
    const [isAddMembershipModalOpen, setIsAddMembershipModalOpen] = useState(false);
    const [addMembershipMember, setAddMembershipMember] = useState<Member | null>(null);
    const [addMembershipPlan, setAddMembershipPlan] = useState<'starter' | 'daily_1month' | 'daily_3month' | 'pro_1month' | 'pro_3month'>('starter');
    const [isAddMembershipSubmitting, setIsAddMembershipSubmitting] = useState(false);

    // 멤버십 리스트 모달 (행 클릭 시)
    const [membershipListMember, setMembershipListMember] = useState<Member | null>(null);

    // 등록 완료 후 주문번호 안내 모달
    const [orderNumberModalBarcode, setOrderNumberModalBarcode] = useState<string | null>(null);
    
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
                let sortedAllMembers = (data.members as Member[]) || [];
                if (storeName) {
                    sortedAllMembers = sortedAllMembers.filter(member => member.registrant_store === storeName);
                }
                setAllMembers(sortedAllMembers);
                setMembers(sortedAllMembers);
            } catch (error) {
                console.error('Failed to fetch members:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchMembers();
    }, [isAuthenticated]);

    // 날짜가 변경될 때 페이지를 1로 리셋
    useEffect(() => {
        setCurrentPage(1);
    }, [selectedDate]);

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

    // 회원 구분 결정 함수 - 데이터베이스에서 받아온 member_type 그대로 사용
    const getMemberType = (member: Member): string => {
        // 특정 전화번호들은 관리자로 분류 (하이픈 없는 형식)
        const adminPhones = [
            '01056124767', '01085172296', '01027455601', '01020412103', '01043200842'
        ];
        if (adminPhones.includes(member.phone)) {
            return "관리자";
        }
        
        // member_type이 있으면 그대로 사용 (데이터베이스 값 우선)
        if (member.member_type) {
            return member.member_type;
        }
        
        // member_type이 없는 경우에만 멤버십 이름으로 구분
        if (member.memberships.length === 0) {
            return "일반 회원"; // 기본값
        }
        
        const membershipNames = member.memberships.map(m => m.name);
        
        if (membershipNames.some(name => name.includes("트레이너"))) {
            return "트레이너";
        }
        if (membershipNames.some(name => name.includes("서포터즈") || name.includes("앰버서더"))) {
            return "서포터즈";
        }
        if (membershipNames.some(name => name.includes("관리자"))) {
            return "관리자";
        }
        
        return "일반 회원"; // 기본값
    };


    // 회원 구분별 필터링
    let filteredMembers = selectedMemberType === "전체 회원"
        ? members
        : members.filter(member => getMemberType(member) === selectedMemberType);
    
    // 멤버십 구매 회원만 필터링 (체크박스가 체크되었을 때)
    if (onlyMembershipMembers) {
        filteredMembers = filteredMembers.filter(member => member.memberships && member.memberships.length > 0);
    }
    
    // 이름 검색 필터
    if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        filteredMembers = filteredMembers.filter(member => (member.name || "").toLowerCase().includes(q));
    }

    // 날짜 필터링 (첫 멤버십 구매 날짜 기준)
    if (selectedDate) {
        filteredMembers = filteredMembers.filter(member => {
            // 멤버십이 없는 경우 날짜 필터링 적용 안 함 (전체 회원에 포함)
            if (member.memberships.length === 0) return true;
            
            // id가 가장 낮은 멤버십 찾기 (첫 구매)
            const firstMembership = member.memberships.reduce((prev, current) => 
                (current.id < prev.id) ? current : prev
            );
            
            const createdAt = (firstMembership as any).created_at;
            if (!createdAt) return false;
            
            const firstPurchaseDate = new Date(createdAt).toISOString().split('T')[0];
            return firstPurchaseDate <= selectedDate;
        });
    }

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

    // 결제일시 계산 (id가 가장 높은 멤버십의 결제일)
    const getPaymentDate = (member: Member): string => {
        if (member.memberships.length === 0) return "-";
        
        // id가 가장 높은 멤버십 찾기
        const latestMembership = member.memberships.reduce((prev, current) => 
            (current.id > prev.id) ? current : prev
        );
        
        // created_at에서 날짜 추출
        const createdAt = (latestMembership as any).created_at;
        if (!createdAt) return "-";
        
        const date = new Date(createdAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}.${month}.${day}`;
    };

    // 이용현황 계산 (id가 가장 높은 멤버십의 이용현황)
    const getUsageStatus = (member: Member): string => {
        if (member.memberships.length === 0) return "-";
        
        const latestMembership = member.memberships.reduce((prev, current) => 
            (current.id > prev.id) ? current : prev
        );
        const total = latestMembership.total_count;
        const remain = latestMembership.remain_count;
        if (total == null || total <= 0) {
            const used = (latestMembership as { used_count?: number }).used_count ?? 0;
            return `${used}잔/무제한`;
        }
        return `${total - remain}/${total}`;
    };

    // 만료일 표시 함수 (id가 가장 높은 멤버십의 만료일)
    const getExpiredDate = (member: Member): string => {
        if (member.memberships.length === 0) return "-";
        
        // id가 가장 높은 멤버십 찾기
        const latestMembership = member.memberships.reduce((prev, current) => 
            (current.id > prev.id) ? current : prev
        );
        
        const expiredAt = (latestMembership as any).expired_at;
        if (!expiredAt) return "-";
        
        const date = new Date(expiredAt);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        
        return `${year}.${month}.${day}`;
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
        if (!selectedMember) {
            alert("회원 정보를 찾을 수 없습니다.");
            return;
        }

        if (!refundCount.trim()) {
            alert("환불 개수를 입력해주세요.");
            return;
        }

        if (!refundReason.trim()) {
            alert("환불 사유를 입력해주세요.");
            return;
        }

        if (!processedBy.trim()) {
            alert("담당자 이름을 입력해주세요.");
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
            const [membersData, refundsData] = await Promise.all([
                membersApi.getMembers(),
                membersApi.getRefunds()
            ]);
            let sortedAllMembers = (membersData.members as Member[]) || [];
            if (storeName) {
                sortedAllMembers = sortedAllMembers.filter(member => member.registrant_store === storeName);
            }
            setAllMembers(sortedAllMembers);
            if (selectedMemberType === "전체 회원") {
                setMembers(sortedAllMembers);
            } else {
                const filteredData = sortedAllMembers.filter(member => getMemberType(member) === selectedMemberType);
                setMembers(filteredData);
            }
            setRefunds(refundsData.refunds);
            alert("환불이 완료되었습니다.");
        } catch (error) {
            console.error('Failed to refund:', error);
            alert("환불 처리에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // 회원 등록 모달 핸들러들
    const handleRegisterClick = () => {
        setIsRegisterModalOpen(true);
        setRegisterForm({
            name: '',
            registrant_name: '',
            gender: '',
            birth: '',
            phone: '',
            plan: ''
        });
    };

    const handleCloseRegisterModal = () => {
        setIsRegisterModalOpen(false);
        setRegisterForm({
            name: '',
            registrant_name: '',
            gender: '',
            birth: '',
            phone: '',
            plan: ''
        });
    };

    const handleAddMembershipClick = (member: Member) => {
        setAddMembershipMember(member);
        setAddMembershipPlan('starter');
        setIsAddMembershipModalOpen(true);
    };

    const handleCloseAddMembershipModal = () => {
        setIsAddMembershipModalOpen(false);
        setAddMembershipMember(null);
        setAddMembershipPlan('starter');
    };

    const handleMembershipListClick = (member: Member) => {
        setMembershipListMember(member);
    };

    const handleCloseMembershipListModal = () => {
        setMembershipListMember(null);
    };

    // 멤버십 1건 이용현황 문자열 (몇 잔 중 몇 잔 / n잔/무제한)
    const getMembershipUsageText = (m: Membership): string => {
        const total = m.total_count;
        const remain = m.remain_count;
        if (total == null || total <= 0) {
            const used = (m as { used_count?: number }).used_count ?? 0;
            return `${used}잔/무제한`;
        }
        const used = total - remain;
        return `${used}/${total}잔`;
    };

    // 멤버십 만료일 포맷
    const formatMembershipExpiredAt = (m: Membership): string => {
        const expiredAt = m.expired_at;
        if (!expiredAt) return "-";
        const date = new Date(expiredAt);
        const y = date.getFullYear();
        const mo = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        return `${y}.${mo}.${d}`;
    };

    // 엑셀 다운로드 핸들러
    const handleExcelDownload = () => {
        exportMembersToExcel(filteredMembers, selectedMemberType);
    };

    const refreshMembersAndRefunds = async () => {
        const [membersData, refundsData] = await Promise.all([
            membersApi.getMembers(),
            membersApi.getRefunds()
        ]);
        let sortedAllMembers = (membersData.members as Member[]) || [];
        if (storeName) {
            sortedAllMembers = sortedAllMembers.filter(member => member.registrant_store === storeName);
        }
        setAllMembers(sortedAllMembers);
        if (selectedMemberType === "전체 회원") {
            setMembers(sortedAllMembers);
        } else {
            const filteredData = sortedAllMembers.filter(member => getMemberType(member) === selectedMemberType);
            setMembers(filteredData);
        }
        setRefunds(refundsData.refunds);
    };

    const handleRegisterSubmit = async () => {
        if (!registerForm.name.trim()) {
            alert("회원명을 입력해주세요.");
            return;
        }
        if (!registerForm.registrant_name.trim()) {
            alert("등록 담당자명을 입력해주세요.");
            return;
        }
        if (!registerForm.gender) {
            alert("성별을 선택해주세요.");
            return;
        }
        if (!registerForm.birth.trim()) {
            alert("생년월일을 입력해주세요.");
            return;
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(registerForm.birth)) {
            alert("생년월일은 YYYY-MM-DD 형식으로 입력해주세요.");
            return;
        }
        if (!registerForm.phone.trim()) {
            alert("전화번호를 입력해주세요.");
            return;
        }
        if (!registerForm.plan) {
            alert("구독권을 선택해주세요.");
            return;
        }

        try {
            setIsRegisterSubmitting(true);
            const genderCode = registerForm.gender === '남성' ? 'M' : 'F';
            const birthForApi = registerForm.birth.replace(/-/g, '.'); // YYYY-MM-DD → YYYY.MM.DD

            const res = await membersApi.registerMemberSubscription({
                phone: registerForm.phone,
                name: registerForm.name,
                plan: registerForm.plan,
                registrant_name: registerForm.registrant_name || undefined,
                member_type: '일반 회원',
                birth: birthForApi,
                gender: genderCode
            });

            handleCloseRegisterModal();
            await refreshMembersAndRefunds();
            const barcode = res?.membership?.barcode ?? '';
            setOrderNumberModalBarcode(barcode);
        } catch (error: any) {
            console.error('Failed to register member:', error);
            const status = error?.response?.status ?? error?.status;
            if (status === 400) {
                alert('이미 존재하는 회원입니다.');
                return;
            }
            alert("회원 등록에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsRegisterSubmitting(false);
        }
    };

    const handleAddMembershipSubmit = async () => {
        if (!addMembershipMember) return;
        try {
            setIsAddMembershipSubmitting(true);
            const res = await membersApi.addMembershipForMember(addMembershipMember.id, addMembershipPlan);
            handleCloseAddMembershipModal();
            await refreshMembersAndRefunds();
            const barcode = res?.membership?.barcode ?? '';
            setOrderNumberModalBarcode(barcode);
        } catch (error: any) {
            console.error('Failed to add membership:', error);
            alert('멤버십 등록에 실패했습니다. 다시 시도해주세요.');
        } finally {
            setIsAddMembershipSubmitting(false);
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
                    {["전체 회원", "일반 회원", "트레이너", "서포터즈", "일일권 협찬", "관리자"].map((memberType) => (
                        <button
                            key={memberType}
                            onClick={() => {
                                setSelectedMemberType(memberType);
                                setCurrentPage(1);
                                
                                // 카테고리별 필터링
                                if (memberType === "전체 회원") {
                                    setMembers(allMembers);
                                } else {
                                    const filteredData = allMembers.filter(member => getMemberType(member) === memberType);
                                    setMembers(filteredData);
                                }
                            }}
                            className={`px-2 sm:px-3 lg:px-4 py-1 sm:py-2 rounded-md text-xs sm:text-sm lg:text-base font-medium transition-colors whitespace-nowrap ${
                                (memberType === "일반 회원" && selectedMemberType === "일반 회원") || 
                                (memberType !== "일반 회원" && selectedMemberType === memberType)
                                    ? 'bg-mainRed text-white shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                            }`}
                        >
                            {memberType}
                        </button>
                    ))}
                </div>
                
                {/* 검색 + 체크박스 + 버튼들 */}
                <div className="flex flex-col sm:flex-row justify-center lg:justify-end gap-2 sm:gap-3 w-full lg:w-auto items-center">
                    <div className="w-full sm:w-64 lg:w-72">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                            placeholder="회원명 검색"
                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                        />
                    </div>
                    
                    {/* 멤버십 구매 회원만 체크박스 - 일반 회원 탭에서만 표시 */}
                    {selectedMemberType === "일반 회원" && (
                        <label className="flex items-center gap-2 cursor-pointer px-3 sm:px-4 py-2 sm:py-3 rounded-lg sm:rounded-xl transition-colors whitespace-nowrap">
                            <input
                                type="checkbox"
                                checked={onlyMembershipMembers}
                                onChange={(e) => { setOnlyMembershipMembers(e.target.checked); setCurrentPage(1); }}
                                className="w-4 h-4 text-mainRed bg-gray-100 border-gray-300 rounded focus:ring-mainRed focus:ring-2"
                            />
                            <span className="text-sm sm:text-base text-gray-700 font-medium">멤버십 구매 회원만</span>
                        </label>
                    )}
                    
                    <button 
                        onClick={handleExcelDownload}
                        className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-transparent text-black rounded-lg border border-gray-800 sm:rounded-xl hover:bg-gray-300 transition-colors text-sm sm:text-base lg:text-lg font-medium shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        엑셀 다운로드
                    </button>
                    <button 
                        onClick={handleRegisterClick}
                        className="px-3 sm:px-4 lg:px-6 py-2 sm:py-3 bg-transparent text-black rounded-lg border border-gray-800 sm:rounded-xl hover:bg-gray-300 transition-colors text-sm sm:text-base lg:text-lg font-medium shadow-sm flex items-center gap-2">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        신규 회원 등록
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
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">성별</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">생년월일</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">전화번호</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원 등록 매장</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">결제일시</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">멤버십 현황</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">만료일</th>
                                <th className="px-2 sm:px-3 lg:px-4 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">환불</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentMembers.map((member) => (
                                <tr
                                    key={member.id}
                                    onClick={() => handleMembershipListClick(member)}
                                    className="hover:bg-gray-50 transition-colors cursor-pointer"
                                >
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900 font-medium">
                                        {member.name}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {getGenderDisplay(member.gender)}
                                    </td>
                                    <td className="px-2 sm:px-2 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {getBirthDisplay(member.birth)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {formatPhoneNumber(member.phone)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {member.registrant_store || "-"}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {getPaymentDate(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                        {getUsageStatus(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-sm text-gray-900">
                                        {getExpiredDate(member)}
                                    </td>
                                    <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-wrap gap-1 sm:gap-2 items-center">
                                            {member.memberships.length > 0 && (
                                                <button
                                                    onClick={() => handleRefundClick(member)}
                                                    className="inline-flex px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-gray-800 text-white border-none hover:bg-gray-700 transition-colors"
                                                >
                                                    환불
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleAddMembershipClick(member)}
                                                className="inline-flex px-2 sm:px-3 py-1 sm:py-2 text-xs sm:text-sm font-semibold rounded-lg bg-mainRed text-white border-none hover:bg-red-800 transition-colors"
                                            >
                                                멤버십 등록
                                            </button>
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

            {/* 환불 로그 섹션 - 전체 관리자만 표시 */}
            {!storeName && (
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
            )}

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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
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
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
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

            {/* 회원 등록 모달 */}
            {isRegisterModalOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">회원 등록</h3>
                            <button
                                onClick={handleCloseRegisterModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                            {/* 왼쪽 컬럼 */}
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">회원명 *</label>
                                    <input
                                        type="text"
                                        value={registerForm.name}
                                        onChange={(e) => setRegisterForm(prev => ({ ...prev, name: e.target.value }))}
                                        placeholder="회원명을 입력하세요"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">등록 담당자명 *</label>
                                    <input
                                        type="text"
                                        value={registerForm.registrant_name}
                                        onChange={(e) => setRegisterForm(prev => ({ ...prev, registrant_name: e.target.value }))}
                                        placeholder="담당자명을 입력하세요"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">성별 *</label>
                                    <select
                                        value={registerForm.gender}
                                        onChange={(e) => setRegisterForm(prev => ({ ...prev, gender: e.target.value }))}
                                        className="w-full pl-3 sm:pl-4 pr-12 sm:pr-16 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    >
                                        <option value="">성별을 선택하세요</option>
                                        <option value="남성">남성</option>
                                        <option value="여성">여성</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">생년월일 * (YYYY-MM-DD)</label>
                                    <input
                                        type="date"
                                        value={registerForm.birth}
                                        onChange={(e) => {
                                            const v = e.target.value;
                                            if (!v || /^\d{4}-\d{2}-\d{2}$/.test(v)) {
                                                setRegisterForm(prev => ({ ...prev, birth: v }));
                                            }
                                        }}
                                        min="1900-01-01"
                                        max="2100-12-31"
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    />
                                </div>
                            </div>

                            {/* 오른쪽 컬럼 */}
                            <div className="space-y-3 sm:space-y-4">
                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">전화번호 *</label>
                                    <input
                                        type="tel"
                                        value={registerForm.phone}
                                        onChange={(e) => {
                                            let value = e.target.value.replace(/[^0-9]/g, ''); // 숫자만 추출
                                            if (value.length >= 10) {
                                                if (value.length === 10) {
                                                    value = value.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
                                                } else if (value.length === 11) {
                                                    value = value.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
                                                }
                                            }
                                            setRegisterForm(prev => ({ ...prev, phone: value }));
                                        }}
                                        placeholder="010-1234-5678"
                                        maxLength={13}
                                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">구독권 선택 *</label>
                                    <select
                                        value={registerForm.plan}
                                        onChange={(e) => setRegisterForm(prev => ({ ...prev, plan: e.target.value as typeof prev.plan }))}
                                        className="w-full pl-3 sm:pl-4 pr-12 sm:pr-16 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                                    >
                                        <option value="">구독권을 선택하세요</option>
                                        {SUBSCRIPTION_PLANS.map((p) => (
                                            <option key={p.value} value={p.value}>{p.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleRegisterSubmit}
                                disabled={isRegisterSubmitting || !registerForm.name.trim() || !registerForm.registrant_name.trim() || !registerForm.plan}
                                className="w-full bg-mainRed text-white py-2 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base lg:text-lg font-medium"
                            >
                                {isRegisterSubmitting ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 기존 회원 멤버십 등록 모달 */}
            {isAddMembershipModalOpen && addMembershipMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-md">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">멤버십 등록</h3>
                            <button
                                onClick={handleCloseAddMembershipModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">
                            <span className="font-medium text-gray-900">{addMembershipMember.name}</span> 회원에게 구독권을 등록합니다.
                        </p>
                        <div className="mb-4">
                            <label className="block text-sm sm:text-base font-medium text-gray-700 mb-1 sm:mb-2">구독권 선택 *</label>
                            <select
                                value={addMembershipPlan}
                                onChange={(e) => setAddMembershipPlan(e.target.value as typeof addMembershipPlan)}
                                className="w-full pl-3 sm:pl-4 pr-12 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-white text-gray-900 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent"
                            >
                                {SUBSCRIPTION_PLANS.map((p) => (
                                    <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={handleCloseAddMembershipModal}
                                className="flex-1 py-2 sm:py-3 px-4 rounded-lg sm:rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm sm:text-base font-medium"
                            >
                                취소
                            </button>
                            <button
                                onClick={handleAddMembershipSubmit}
                                disabled={isAddMembershipSubmitting}
                                className="flex-1 bg-mainRed text-white py-2 sm:py-3 px-4 rounded-lg sm:rounded-xl hover:bg-red-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                            >
                                {isAddMembershipSubmitting ? '등록 중...' : '등록'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 등록 완료 후 주문번호 안내 모달 */}
            {orderNumberModalBarcode !== null && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-6 sm:p-8 w-full max-w-sm text-center">
                        <p className="text-gray-800 text-base sm:text-lg font-medium mb-2">등록이 완료되었습니다.</p>
                        <p className="text-gray-700 text-sm sm:text-base mb-6">
                            주문번호는 <span className="font-semibold text-gray-900">{orderNumberModalBarcode}</span> 입니다.
                        </p>
                        <button
                            onClick={() => setOrderNumberModalBarcode(null)}
                            className="w-full bg-mainRed text-white py-2.5 sm:py-3 px-4 rounded-lg sm:rounded-xl hover:bg-red-800 transition-colors text-sm sm:text-base font-medium"
                        >
                            확인
                        </button>
                    </div>
                </div>
            )}

            {/* 멤버십 리스트 모달 (행 클릭 시) */}
            {membershipListMember && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleCloseMembershipListModal}>
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900">{membershipListMember.name} · 멤버십 목록</h3>
                            <button onClick={handleCloseMembershipListModal} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-y-auto flex-1 min-h-0">
                            {membershipListMember.memberships.length === 0 ? (
                                <p className="text-gray-500 py-4">등록된 멤버십이 없습니다.</p>
                            ) : (
                                <ul className="space-y-3">
                                    {[...membershipListMember.memberships]
                                        .sort((a, b) => b.id - a.id)
                                        .map((m) => (
                                            <li key={m.id} className="border border-gray-200 rounded-lg p-3 sm:p-4 bg-gray-50">
                                                <div className="font-medium text-gray-900 mb-1">
                                                    {m.membership_name ?? m.name ?? `멤버십 #${m.id}`}
                                                </div>
                                                {m.barcode && (
                                                    <div className="text-sm text-gray-500 mb-1">주문번호: {m.barcode}</div>
                                                )}
                                                <div className="text-sm text-gray-600 space-y-0.5">
                                                    <div>이용 현황: {getMembershipUsageText(m)}</div>
                                                    <div>만료일: {formatMembershipExpiredAt(m)}</div>
                                                </div>
                                            </li>
                                        ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomerPage;