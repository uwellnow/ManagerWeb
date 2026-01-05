import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { surveysApi } from "../../api/surveys";
import type { SurveyResponse, SurveyResponseDto } from "../../types/DTO/SurveyResponseDto";

const SurveyPage = () => {
    const { isAuthenticated, storeName } = useAuth();
    const navigate = useNavigate();
    const [surveys, setSurveys] = useState<SurveyResponseDto>([]);
    const [filteredSurveys, setFilteredSurveys] = useState<SurveyResponseDto>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedSurvey, setSelectedSurvey] = useState<SurveyResponse | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    
    // 필터 상태
    const [selectedStore, setSelectedStore] = useState<string>("전체");
    const [selectedGender, setSelectedGender] = useState<string>("전체");
    
    const itemsPerPage = 10;

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchSurveys = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await surveysApi.getKioskSurveys();
                setSurveys(data);
            } catch (error) {
                console.error('Failed to fetch surveys:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSurveys();
    }, [isAuthenticated]);

    // 매장 목록 추출
    const storeList = Array.from(new Set(
        surveys
            .map(survey => survey.member?.registrantStore)
            .filter((store): store is string => store !== null && store !== undefined)
    )).sort();

    // 필터링 로직
    useEffect(() => {
        let filtered = [...surveys];

        // 매장 필터
        if (selectedStore !== "전체") {
            filtered = filtered.filter(survey => 
                survey.member?.registrantStore === selectedStore
            );
        }

        // 매장 관리자인 경우 해당 매장만 표시
        if (storeName) {
            filtered = filtered.filter(survey => 
                survey.member?.registrantStore === storeName
            );
        }

        // 성별 필터
        if (selectedGender !== "전체") {
            filtered = filtered.filter(survey => {
                if (selectedGender === "남성") {
                    return survey.member?.gender === "M";
                } else if (selectedGender === "여성") {
                    return survey.member?.gender === "F";
                }
                return true;
            });
        }

        setFilteredSurveys(filtered);
        setCurrentPage(1); // 필터 변경 시 첫 페이지로
    }, [surveys, selectedStore, selectedGender, storeName]);

    // 질문 텍스트 매핑
    const getQuestionText = (questionNumber: number): string => {
        switch (questionNumber) {
            case 1:
                return "당신의 직업은 무엇인가요?";
            case 2:
                return "운동을 하는 목표는 무엇인가요?";
            case 3:
                return "유웰나우를 주변 분께 추천할 의향이 있으신가요?";
            default:
                return `질문 ${questionNumber}`;
        }
    };

    // 질문 3 답변 포맷팅 (1-5점)
    const formatRecommendationAnswer = (answer: string): string => {
        const score = parseInt(answer);
        if (!isNaN(score) && score >= 1 && score <= 5) {
            return `${score}점`;
        }
        return answer;
    };

    // 페이지네이션
    const totalPages = Math.ceil(filteredSurveys.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const currentSurveys = filteredSurveys.slice(startIndex, endIndex);

    // 통계 계산
    const totalCount = filteredSurveys.length;
    const memberCount = filteredSurveys.filter(s => s.member !== null).length;
    const nonMemberCount = totalCount - memberCount;
    
    // 평균 추천 점수 계산
    const recommendationScores = filteredSurveys
        .map(survey => {
            const answer = survey.answers.find(a => a.question === 3);
            if (answer) {
                const score = parseInt(answer.answer);
                return !isNaN(score) && score >= 1 && score <= 5 ? score : null;
            }
            return null;
        })
        .filter((score): score is number => score !== null);
    
    const avgRecommendationScore = recommendationScores.length > 0
        ? (recommendationScores.reduce((sum, score) => sum + score, 0) / recommendationScores.length).toFixed(1)
        : "0.0";

    // 모달 열기
    const handleRowClick = (survey: SurveyResponse) => {
        setSelectedSurvey(survey);
        setIsModalOpen(true);
    };

    // 모달 닫기
    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedSurvey(null);
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
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">설문 응답 데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">설문 응답 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 헤더 */}
            <div className="mb-4 sm:mb-6">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">
                    설문 응답 ({filteredSurveys.length})
                </h2>
            </div>

            {/* 통계 카드 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="bg-white rounded-lg sm:rounded-xl p-4 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">전체 응답 수</div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{totalCount}</div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-4 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">회원 / 비회원</div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{memberCount} / {nonMemberCount}</div>
                </div>
                <div className="bg-white rounded-lg sm:rounded-xl p-4 shadow-sm">
                    <div className="text-xs sm:text-sm text-gray-500 mb-1">평균 추천 점수</div>
                    <div className="text-xl sm:text-2xl font-bold text-gray-900">{avgRecommendationScore}점</div>
                </div>
            </div>

            {/* 필터 섹션 */}
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm mb-4 sm:mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* 매장 필터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">등록 매장</label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm bg-gray-100"
                            disabled={!!storeName}
                        >
                            <option value="전체">전체</option>
                            {storeList.map(store => (
                                <option key={store} value={store}>{store}</option>
                            ))}
                        </select>
                    </div>

                    {/* 성별 필터 */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">성별</label>
                        <select
                            value={selectedGender}
                            onChange={(e) => setSelectedGender(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm bg-gray-100"
                        >
                            <option value="전체">전체</option>
                            <option value="남성">남성</option>
                            <option value="여성">여성</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 설문 응답 테이블 */}
            <div className="bg-white rounded-lg sm:rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">멤버십 코드</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">회원명</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">등록 매장</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">직업</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">운동 목표</th>
                                <th className="px-2 sm:px-3 lg:px-6 py-2 sm:py-3 text-left text-xs sm:text-sm font-medium text-gray-500 uppercase tracking-wider">추천 의향</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {currentSurveys.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                                        설문 응답이 없습니다.
                                    </td>
                                </tr>
                            ) : (
                                currentSurveys.map((survey, index) => {
                                    const question1 = survey.answers.find(a => a.question === 1);
                                    const question2 = survey.answers.find(a => a.question === 2);
                                    const question3 = survey.answers.find(a => a.question === 3);
                                    
                                    return (
                                        <tr
                                            key={index}
                                            onClick={() => handleRowClick(survey)}
                                            className="hover:bg-gray-50 transition-colors cursor-pointer"
                                        >
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {survey.userCode || "비회원"}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {survey.member?.name || "-"}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {survey.member?.registrantStore || "-"}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {question1?.answer || "-"}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {question2?.answer || "-"}
                                            </td>
                                            <td className="px-2 sm:px-3 lg:px-6 py-3 sm:py-4 text-xs sm:text-sm lg:text-base text-gray-900">
                                                {question3 ? formatRecommendationAnswer(question3.answer) : "-"}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
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

            {/* 상세 모달 */}
            {isModalOpen && selectedSurvey && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-sm sm:max-w-md lg:max-w-lg max-h-[90vh] flex flex-col">
                        <div className="flex justify-between items-center mb-4 sm:mb-6">
                            <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">설문 응답 상세</h3>
                            <button
                                onClick={handleCloseModal}
                                className="text-gray-400 hover:text-gray-600 transition-colors"
                            >
                                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="overflow-y-auto flex-1 space-y-3 sm:space-y-4 scrollbar-hide">
                            {/* 사용자 정보 섹션 */}
                            <div className="border-b pb-3 sm:pb-4">
                                <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">사용자 정보</h4>
                                <div className="space-y-2">
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">멤버십 코드</label>
                                        <input
                                            type="text"
                                            value={selectedSurvey.userCode || "비회원"}
                                            disabled
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">회원명</label>
                                        <input
                                            type="text"
                                            value={selectedSurvey.member?.name || "-"}
                                            disabled
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">성별</label>
                                        <input
                                            type="text"
                                            value={
                                                selectedSurvey.member?.gender === "M" ? "남성" :
                                                selectedSurvey.member?.gender === "F" ? "여성" : "-"
                                            }
                                            disabled
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">생년월일</label>
                                        <input
                                            type="text"
                                            value={selectedSurvey.member?.birth || "-"}
                                            disabled
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">등록 매장</label>
                                        <input
                                            type="text"
                                            value={selectedSurvey.member?.registrantStore || "-"}
                                            disabled
                                            className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 설문 응답 섹션 */}
                            <div>
                                <h4 className="text-sm sm:text-base font-semibold text-gray-700 mb-3">설문 응답</h4>
                                <div className="space-y-3 sm:space-y-4">
                                    {selectedSurvey.answers.map((answer, index) => (
                                        <div key={index}>
                                            <label className="block text-xs sm:text-sm font-medium text-gray-500 mb-1">
                                                {getQuestionText(answer.question)}
                                            </label>
                                            <input
                                                type="text"
                                                value={
                                                    answer.question === 3
                                                        ? formatRecommendationAnswer(answer.answer)
                                                        : answer.answer
                                                }
                                                disabled
                                                className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg sm:rounded-xl bg-gray-50 text-gray-900 text-sm sm:text-base"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 sm:mt-6">
                            <button
                                onClick={handleCloseModal}
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

export default SurveyPage;

