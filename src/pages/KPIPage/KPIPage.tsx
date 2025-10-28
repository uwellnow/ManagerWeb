import { useState, useEffect } from "react";
import { ordersApi } from "../../api/orders";
import { membersApi } from "../../api/members";
import {
    exportRetentionKPIToExcel,
    exportBasicKPIToExcel,
    exportKPISummaryToExcel,
    calculateBasicKPI,
    generateCohortRetentionSummary,
    exportMembershipKPIToExcel,
    calculateRepurchaseRate,
    calculateAvgRepurchasePeriod,
    calculateAvgConsumptionPeriodFromOrders,
    calculateLTV,
    exportLTVToExcel,
    calculateCAC,
    exportCACToExcel,
    calculatePaybackPeriod,
    exportPaybackPeriodToExcel,
} from "../../utils/excelExport.kpi";
import type {OrderData} from "../../types/DTO/OrderResponseDto";
import type {Member} from "../../types/DTO/MemberResponseDto";

type KPIType = "리텐션" | "활성드링커" | "평균마진" | "재결제 및 소진기간" | "LTV" | "CAC" | "페이백 기간";

const KPIPage = () => {
    const [orders, setOrders] = useState<OrderData[]>([]);
    const [filteredOrders, setFilteredOrders] = useState<OrderData[]>([]);
    const [selectedKPI, setSelectedKPI] = useState<KPIType>("리텐션");
    const [selectedUser, setSelectedUser] = useState<string>("전체");
    const [dateRange, setDateRange] = useState({
        startDate: "2025-10-01",
        endDate: "2025-10-30",
    });
    const [resultData, setResultData] = useState<any[]>([]);
    const [summaryData, setSummaryData] = useState<any | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [cohortSummary, setCohortSummary] = useState<any[]>([]);
    const [membersData, setMembersData] = useState<Member[]>([]);
    const [ltvData, setLtvData] = useState<any | null>(null);
    const [customRetention, setCustomRetention] = useState<string>("");
    const [calculatedLTV, setCalculatedLTV] = useState<any | null>(null);
    const [cacData, setCacData] = useState<any | null>(null);
    const [customCouponCount, setCustomCouponCount] = useState<string>("");
    const [calculatedCAC, setCalculatedCAC] = useState<any | null>(null);
    const [paybackData, setPaybackData] = useState<any | null>(null);

    // 주문 데이터 불러오기
    useEffect(() => {
        const fetchOrders = async () => {
            try {
                setIsLoading(true);

                // 1️⃣ 회원 데이터 가져오기
                const membersRes = await membersApi.getMembers();
                const members = membersRes.members as Member[];

                const adminPhones = ["01056124767", "01085172296", "01027455601", "01020412103", "01043200842"];
                const specialKeywords = ["트레이너", "서포터즈", "앰버서더", "관리자"];


                // 3️⃣ 일반 회원 필터링
                const generalMembers = members.filter((member) => {
                    if (adminPhones.includes(member.phone)) return false;
                    if (specialKeywords.some((kw) => member.name.includes(kw))) return false;
                    if (member.member_type && member.member_type !== "일반 회원") return false;
                    return true;
                });

                setMembersData(generalMembers);

                const generalMemberNames = new Set(generalMembers.map((m) => m.name));

                // 4️⃣ 주문 데이터 가져오기
                const ordersRes = await ordersApi.getOrders();

                const filteredOrders = ordersRes.filter(
                    (order: OrderData) =>
                        order.store_name !== "테스트용" &&
                        order.user_name &&
                        order.user_name !== "테스트" &&
                        generalMemberNames.has(order.user_name)
                );

                setOrders(filteredOrders);
            } catch (e) {
                console.error("주문 데이터 로드 실패:", e);
            } finally {
                setIsLoading(false);
            }
        };

        fetchOrders();
    }, []);


    // 필터 적용
    useEffect(() => {
        let filtered = orders.filter((o) => {
            const date = new Date(o.order_time).toISOString().split("T")[0];
            return date >= dateRange.startDate && date <= dateRange.endDate;
        });
        if (selectedUser !== "전체") {
            filtered = filtered.filter((o) => o.user_name === selectedUser);
        }
        setFilteredOrders(filtered);
    }, [orders, dateRange, selectedUser]);

    // 사용자 입력에 따른 실시간 LTV 계산
    useEffect(() => {
        if (ltvData && customRetention) {
            const retentionValue = parseFloat(customRetention);
            if (!isNaN(retentionValue) && retentionValue > 0) {
                const newLTV = ltvData.avgMarginPerCup * ltvData.avgCupsPerCustomer * retentionValue;
                setCalculatedLTV({
                    ...ltvData,
                    customRetention: retentionValue,
                    customLTV: Math.round(newLTV)
                });
            } else {
                setCalculatedLTV(null);
            }
        } else {
            setCalculatedLTV(null);
        }
    }, [ltvData, customRetention]);

    // 사용자 입력에 따른 실시간 CAC 계산
    useEffect(() => {
        if (cacData && customCouponCount) {
            const couponCount = parseFloat(customCouponCount);
            if (!isNaN(couponCount) && couponCount > 0) {
                const newCAC = couponCount * 1800 * cacData.newCustomers;
                setCalculatedCAC({
                    ...cacData,
                    customCouponCount: couponCount,
                    customCAC: Math.round(newCAC)
                });
            } else {
                setCalculatedCAC(null);
            }
        } else {
            setCalculatedCAC(null);
        }
    }, [cacData, customCouponCount]);

    // 리텐션용 데이터 가공 ----------------------------
    const groupByUserForRetention = (orders: OrderData[]) => {
        const grouped = new Map<string, Set<string>>();
        orders.forEach((order) => {
            const date = new Date(order.order_time).toISOString().split("T")[0];
            if (!grouped.has(order.user_name)) grouped.set(order.user_name, new Set());
            grouped.get(order.user_name)!.add(date);
        });

        return Array.from(grouped.entries()).map(([user_name, dates]) => {
            const sorted = Array.from(dates).sort();
            return {
                user_name,
                visit_dates: sorted,
                first_visit: sorted[0],
            };
        });
    };

    const makeRetentionRow = (user: any) => {
        const firstDate = new Date(user.first_visit);
        const dayStatus: Record<string, string> = {};


        for (let day = 0; day <= 70; day++) {
            const target = new Date(firstDate);
            target.setDate(firstDate.getDate() + day);
            const dateStr = target.toISOString().split("T")[0];
            dayStatus[`Day${day}`] = user.visit_dates.includes(dateStr)
                ? "이용"
                : "이용하지 않음";
        }

        const totalVisits = user.visit_dates.length;
        const retentionDays = Array.from({ length: 3 }, (_, i) => (i + 1) * 7);
        const retainedCount = retentionDays.filter(
            (d) => dayStatus[`Day${d}`] === "이용"
        ).length;
        const retentionRate = (retainedCount / retentionDays.length).toFixed(2);

        return {
            사용자: user.user_name,
            ...dayStatus,
            이용횟수: totalVisits,
            리텐션: retentionRate,
        };
    };

    const generateRetentionTable = (orders: OrderData[]) => {
        const users = groupByUserForRetention(orders);
        return users.map((u) => makeRetentionRow(u));

    };
    // -----------------------------------------------------

    const handleGenerateKPI = () => {
        if (selectedKPI === "리텐션") {
            const userTable = generateRetentionTable(filteredOrders);
            const cohort = generateCohortRetentionSummary(filteredOrders);

            setResultData(userTable);
            setCohortSummary(cohort);
            setSummaryData(null);
        }
        else {
            // 모든 KPI 요약 데이터 계산
            const basicSummary = calculateBasicKPI(filteredOrders);
            const repurchaseRate = calculateRepurchaseRate(membersData, orders, dateRange);
            const avgRepurchasePeriod = calculateAvgRepurchasePeriod(membersData, orders, dateRange);
            const avgByTicket = calculateAvgConsumptionPeriodFromOrders(membersData, orders, dateRange);
            
            // LTV 계산
            const ltvResult = calculateLTV(filteredOrders);
            setLtvData(ltvResult);
            
            // CAC 계산
            const cacResult = calculateCAC(membersData, dateRange);
            setCacData(cacResult);

            // 페이백 기간 계산
            const paybackResult = calculatePaybackPeriod(filteredOrders, membersData, dateRange);
            setPaybackData(paybackResult);

            // 전체 KPI 요약 테이블
            const allKPISummary = [
                { 항목: "활성 드링커 수", 값: basicSummary.activeUserCount },
                { 항목: "활성 드링커 1인당 평균 이용 컵 수", 값: basicSummary.avgCupsPerActive.toFixed(2) },
                { 항목: "총 판매 컵 수", 값: basicSummary.totalOrders },
                { 항목: "한 잔당 평균 마진(원)", 값: basicSummary.avgMarginPerCup.toFixed(1) },
                { 항목: "재결제 비율(%)", 값: Number(repurchaseRate).toFixed(2) },
                { 항목: "평균 재결제 기간(일)", 값: Math.round(avgRepurchasePeriod.totalAvgDays) },
                ...Object.entries(avgByTicket.ticketAverages).map(([ticket, avg]) => ({
                    항목: `${ticket} 평균 소진기간(일)`,
                    값: Math.round(Number(avg)),
                })),
                // LTV 관련 지표 추가
                { 항목: "평균 구매 컵 수 (잔/고객)", 값: ltvResult.avgCupsPerCustomer.toFixed(2) },
                { 항목: "누적 리텐션", 값: ltvResult.cumulativeRetention.toFixed(2) },
                { 항목: "LTV (원)", 값: ltvResult.ltv.toLocaleString("ko-KR") },
                // CAC 관련 지표 추가
                { 항목: "신규 고객 수", 값: cacResult.newCustomers.toLocaleString("ko-KR") },
                { 항목: "고객 당 평균 순이익 (원)", 값: paybackData ? paybackData.avgNetProfitPerCustomer.toLocaleString("ko-KR") : "0" },
                { 항목: "전체 순이익 (원)", 값: paybackData ? paybackData.netProfit.toLocaleString("ko-KR") : "0" },
            ];

            // 근거 데이터 준비
            const repurchaseDetails = avgRepurchasePeriod.userPeriods.map(u => ({
                회원명: u.name,
                소진날짜: u.consumptionDate,
                재구매날짜: u.repurchaseDate,
                기간: Math.round(u.period),
            }));

            const consumptionDetails = avgByTicket.userDetails.map(u => ({
                회원명: u.name,
                이용권: u.ticket,
                구매날짜: u.purchaseDate,
                소진날짜: u.consumptionDate,
                소진기간: Math.round(u.period),
            }));

            setResultData(allKPISummary);
            setSummaryData({
                activeUsers: basicSummary.activeUsers,
                productTable: basicSummary.productTable,
                repurchase: repurchaseDetails,
                consumption: consumptionDetails,
            });
            setCohortSummary([]);
        }
    };

    const handleExcelDownload = () => {
        if (selectedKPI === "리텐션") {
            exportRetentionKPIToExcel(filteredOrders, dateRange, selectedUser);
        } else if (selectedKPI === "활성드링커" || selectedKPI === "평균마진") {
            exportBasicKPIToExcel(filteredOrders, dateRange, selectedKPI, selectedUser);
        } else if (selectedKPI === "재결제 및 소진기간"){
            exportMembershipKPIToExcel(membersData, orders, dateRange);
        } else if (selectedKPI === "LTV" && ltvData) {
            // 사용자 입력값이 있으면 그것을 사용, 없으면 기본값 사용
            const exportData = calculatedLTV || ltvData;
            exportLTVToExcel(exportData);
        } else if (selectedKPI === "CAC" && cacData) {
            // 사용자 입력값이 있으면 그것을 사용, 없으면 기본값 사용
            const exportData = calculatedCAC || cacData;
            exportCACToExcel(exportData);
        } else if (selectedKPI === "페이백 기간" && paybackData && calculatedCAC) {
            exportPaybackPeriodToExcel(paybackData, calculatedCAC);
        }
        else {
            alert("현재 선택한 KPI는 엑셀 내보내기가 지원되지 않습니다.");
        }
    };

    const handleKPISummaryDownload = () => {
        // 리텐션을 제외한 모든 KPI 요약 데이터 다운로드
        exportKPISummaryToExcel(filteredOrders, dateRange, selectedUser, membersData);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen text-gray-600">
                주문 데이터를 불러오는 중입니다...
            </div>
        );
    }

    const users = ["전체", ...Array.from(new Set(orders.map((o) => o.user_name)))];

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <h1 className="text-2xl font-bold mb-6">KPI 분석</h1>

            {/* 필터 패널 */}
            <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl shadow-sm mb-6">
                <div className="flex items-center gap-2">
                    <label>기간:</label>
                    <input
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) =>
                            setDateRange({ ...dateRange, startDate: e.target.value })
                        }
                        className="border rounded p-1 bg-white"
                    />
                    <span>~</span>
                    <input
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) =>
                            setDateRange({ ...dateRange, endDate: e.target.value })
                        }
                        className="border rounded p-1 bg-white"
                    />
                </div>

                <div>
                    <label className="mr-2">고객:</label>
                    <select
                        value={selectedUser}
                        onChange={(e) => setSelectedUser(e.target.value)}
                        className="border rounded p-1 bg-white"
                    >
                        {users.map((u) => (
                            <option key={u}>{u}</option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="mr-2">KPI:</label>
                    <select
                        value={selectedKPI}
                        onChange={(e) => setSelectedKPI(e.target.value as KPIType)}
                        className="border rounded p-1 bg-white"
                    >
                        <option value="리텐션">리텐션</option>
                        <option value="활성드링커">활성드링커</option>
                        <option value="평균마진">평균마진</option>
                        <option value="재결제 및 소진기간">재결제 및 소진기간</option>
                        <option value="LTV">LTV</option>
                        <option value="CAC">CAC</option>
                        <option value="페이백 기간">페이백 기간</option>
                    </select>
                </div>

                <button
                    onClick={handleGenerateKPI}
                    className="bg-mainRed text-white px-4 py-2 rounded-lg"
                >
                    KPI 생성
                </button>

                <button
                    onClick={handleExcelDownload}
                    className="bg-red-50 border border-mainRed text-red-700 px-4 py-2 rounded-lg"
                >
                    세부 데이터 다운로드
                </button>

                <button
                    onClick={handleKPISummaryDownload}
                    className="bg-blue-50 border border-blue-300 text-blue-700 px-4 py-2 rounded-lg"
                >
                    KPI 요약 다운로드
                </button>
            </div>

            {/* 결과 테이블 */}
            {resultData.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow overflow-x-auto space-y-8">
                    {selectedKPI === "리텐션" ? (
                        <div className="space-y-8">
                            <table className="min-w-full border text-sm text-center">
                                {/* 개인 리텐션 테이블 */}
                                <thead className="bg-gray-100">
                                <tr>
                                    <th className="border px-2 py-1">사용자</th>
                                    {Array.from({ length: 71 }, (_, i) => (
                                        <th key={i} className="border px-2 py-1">{`Day${i}`}</th>
                                    ))}
                                    <th className="border px-2 py-1">이용횟수</th>
                                    <th className="border px-2 py-1">리텐션</th>
                                </tr>
                                </thead>
                                <tbody>
                                {resultData.map((row, idx) => (
                                    <tr key={idx}>
                                        <td className="border px-2 py-1">{row["사용자"]}</td>
                                        {Array.from({ length: 71 }, (_, i) => (
                                            <td
                                                key={i}
                                                className={`border px-2 py-1 ${
                                                    row[`Day${i}`] === "이용"
                                                        ? "bg-red-50 text-red-700"
                                                        : "text-gray-400"
                                                }`}
                                            >
                                                {row[`Day${i}`]}
                                            </td>
                                        ))}
                                        <td className="border px-2 py-1">{row["이용횟수"]}</td>
                                        <td className="border px-2 py-1 font-semibold text-mainRed">
                                            {row["리텐션"]}
                                        </td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>

                            {/* ✅ 전체 리텐션 요약 테이블 */}
                            {cohortSummary.length > 0 && (
                                <div className="mt-8">
                                    <h2 className="text-lg font-semibold mb-3">전체 리텐션 요약</h2>
                                    <table className="min-w-[400px] border text-sm text-center">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border px-3 py-2">Day</th>
                                            <th className="border px-3 py-2">이용자수</th>
                                            <th className="border px-3 py-2">리텐션율</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {cohortSummary.map((row, idx) => (
                                            <tr key={idx}>
                                                <td className="border px-3 py-2">{row.Day}</td>
                                                <td className="border px-3 py-2">{row.이용자수}</td>
                                                <td className="border px-3 py-2 font-semibold text-mainRed">
                                                    {row.리텐션율}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* KPI 요약 표 */}
                            <div>
                                <h2 className="text-lg font-semibold mb-3">KPI 요약</h2>
                                <table className="min-w-[400px] border text-sm text-center mb-6">
                                    <thead className="bg-gray-100">
                                    <tr>
                                        <th className="border px-3 py-2">항목</th>
                                        <th className="border px-3 py-2">값</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {resultData.map((row, idx) => (
                                        <tr key={idx}>
                                            <td className="border px-3 py-2 font-medium text-gray-700">
                                                {row["항목"]}
                                            </td>
                                            <td className="border px-3 py-2 text-gray-900">
                                                {row["값"]}
                                            </td>
                                        </tr>
                                    ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* 근거 데이터 표 */}
                            {selectedKPI === "활성드링커" && summaryData?.activeUsers && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        활성드링커별 이용 데이터
                                    </h2>
                                    <table className="min-w-full border text-sm text-center">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border px-2 py-1">사용자</th>
                                            <th className="border px-2 py-1">이용일수</th>
                                            <th className="border px-2 py-1">총 주문수</th>
                                            <th className="border px-2 py-1">첫 이용일</th>
                                            <th className="border px-2 py-1">마지막 이용일</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {summaryData.activeUsers.map((user: any , idx: number) => (
                                            <tr key={idx}>
                                                <td className="border px-2 py-1">{user.user_name}</td>
                                                <td className="border px-2 py-1">
                                                    {user.visit_dates.length}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {user.total_orders}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {user.first_visit}
                                                </td>
                                                <td className="border px-2 py-1">
                                                    {
                                                        user.visit_dates[user.visit_dates.length - 1]
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {selectedKPI === "평균마진" && summaryData?.productTable && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        제품별 마진 데이터
                                    </h2>
                                    <table className="min-w-full border text-sm text-center">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            {["제품명", "판매수량", "단가", "총매출", "원가", "이익"].map(
                                                (col) => (
                                                    <th key={col} className="border px-2 py-1">
                                                        {col}
                                                    </th>
                                                )
                                            )}
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {summaryData.productTable.map((p: any, idx:number) => (
                                            <tr key={idx}>
                                                <td className="border px-2 py-1">{p.제품명.replace('\\n', ' ')}</td>
                                                <td className="border px-2 py-1">{p.판매수량}</td>
                                                <td className="border px-2 py-1">{p.단가.toLocaleString()}</td>
                                                <td className="border px-2 py-1">{p.총매출.toLocaleString()}</td>
                                                <td className="border px-2 py-1">{p.원가.toLocaleString()}</td>
                                                <td className="border px-2 py-1 font-semibold text-mainRed">
                                                    {p.이익.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 재결제 비율/기간 근거 데이터 */}
                            {selectedKPI === "재결제 및 소진기간" && summaryData?.repurchase && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        재결제 회원별 상세 데이터
                                    </h2>
                                    <table className="min-w-full border text-sm text-center">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border px-2 py-1">회원명</th>
                                            <th className="border px-2 py-1">소진날짜</th>
                                            <th className="border px-2 py-1">재구매날짜</th>
                                            <th className="border px-2 py-1">기간(일)</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {summaryData.repurchase.map((user: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="border px-2 py-1">{user.회원명}</td>
                                                <td className="border px-2 py-1">{user.소진날짜}</td>
                                                <td className="border px-2 py-1">{user.재구매날짜}</td>
                                                <td className="border px-2 py-1 font-semibold text-mainRed">
                                                    {user.기간}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* 이용권별 소진기간 근거 데이터 */}
                            {selectedKPI === "재결제 및 소진기간" && summaryData?.consumption && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        이용권별 소진기간 상세 데이터
                                    </h2>
                                    <table className="min-w-full border text-sm text-center">
                                        <thead className="bg-gray-100">
                                        <tr>
                                            <th className="border px-2 py-1">회원명</th>
                                            <th className="border px-2 py-1">이용권</th>
                                            <th className="border px-2 py-1">구매날짜</th>
                                            <th className="border px-2 py-1">소진날짜</th>
                                            <th className="border px-2 py-1">소진기간(일)</th>
                                        </tr>
                                        </thead>
                                        <tbody>
                                        {summaryData.consumption.map((user: any, idx: number) => (
                                            <tr key={idx}>
                                                <td className="border px-2 py-1">{user.회원명}</td>
                                                <td className="border px-2 py-1">{user.이용권}</td>
                                                <td className="border px-2 py-1">{user.구매날짜}</td>
                                                <td className="border px-2 py-1">{user.소진날짜}</td>
                                                <td className="border px-2 py-1 font-semibold text-mainRed">
                                                    {user.소진기간}
                                                </td>
                                            </tr>
                                        ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}

                            {/* LTV 결과 표시 */}
                            {selectedKPI === "LTV" && ltvData && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        LTV 분석 결과
                                    </h2>
                                    
                                    {/* 사용자 입력 필드 */}
                                    <div className="mb-4 p-4 bg-red-50 rounded-lg">
                                        <h3 className="font-semibold text-red-800 mb-2">사용자 정의 리텐션 입력</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium text-gray-700">누적 리텐션:</label>
                                                <input
                                                    type="number"
                                                    value={customRetention}
                                                    onChange={(e) => setCustomRetention(e.target.value)}
                                                    placeholder="예: 2.5"
                                                    step="0.1"
                                                    min="0"
                                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-gray-100 focus:ring-2 focus:ring-red-400 focus:border-transparent w-32"
                                                />
                                            </div>
                                            {calculatedLTV && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-700">계산된 LTV:</span>
                                                    <span className="font-bold text-lg text-red-600">
                                                        {calculatedLTV.customLTV.toLocaleString("ko-KR")}원
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2">
                                            기본 누적 리텐션: {ltvData.cumulativeRetention.toFixed(2)} | 
                                            기본 LTV: {ltvData.ltv.toLocaleString("ko-KR")}원
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-red-800 mb-2">핵심 지표</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>평균 마진 (원/잔):</span>
                                                    <span className="font-semibold">{ltvData.avgMarginPerCup.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>평균 구매 컵 수 (잔/고객):</span>
                                                    <span className="font-semibold">{ltvData.avgCupsPerCustomer.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>누적 리텐션:</span>
                                                    <span className="font-semibold">{calculatedLTV ? calculatedLTV.customRetention.toFixed(2) : ltvData.cumulativeRetention.toFixed(2)}</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-2">
                                                    <span className="font-bold text-lg">LTV (원):</span>
                                                    <span className="font-bold text-lg text-red-600">
                                                        {calculatedLTV ? calculatedLTV.customLTV.toLocaleString("ko-KR") : ltvData.ltv.toLocaleString("ko-KR")}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-gray-800 mb-2">기본 통계</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>총 주문 수:</span>
                                                    <span className="font-semibold">{ltvData.totalOrders.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>고유 고객 수:</span>
                                                    <span className="font-semibold">{ltvData.uniqueCustomers.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>총 매출 (원):</span>
                                                    <span className="font-semibold">{ltvData.totalRevenue.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>총 원가 (원):</span>
                                                    <span className="font-semibold">{ltvData.totalCost.toLocaleString("ko-KR")}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* CAC 결과 표시 */}
                            {selectedKPI === "CAC" && cacData && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">
                                        CAC 분석 결과
                                    </h2>
                                    
                                    {/* 사용자 입력 필드 */}
                                    <div className="mb-4 p-4 bg-red-50 rounded-lg">
                                        <h3 className="font-semibold text-red-800 mb-2">사용자 정의 쿠폰 수 입력</h3>
                                        <div className="flex items-center gap-4">
                                            <div className="flex items-center gap-2">
                                                <label className="text-sm font-medium text-gray-700">쿠폰 수:</label>
                                                <input
                                                    type="number"
                                                    value={customCouponCount}
                                                    onChange={(e) => setCustomCouponCount(e.target.value)}
                                                    placeholder="예: 100"
                                                    step="1"
                                                    min="0"
                                                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none bg-gray-100 focus:ring-2 focus:ring-red-400 focus:border-transparent w-32"
                                                />
                                            </div>
                                            {calculatedCAC && (
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-medium text-gray-700">계산된 CAC:</span>
                                                    <span className="font-bold text-lg text-red-600">
                                                        {calculatedCAC.customCAC.toLocaleString("ko-KR")}원
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-xs text-gray-600 mt-2">
                                            신규 고객 수: {cacData.newCustomers}명 | 쿠폰 단가: {cacData.couponPrice.toLocaleString("ko-KR")}원
                                        </p>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-red-800 mb-2">핵심 지표</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>신규 고객 수:</span>
                                                    <span className="font-semibold">{cacData.newCustomers.toLocaleString("ko-KR")}명</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>쿠폰 단가 (원):</span>
                                                    <span className="font-semibold">{cacData.couponPrice.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>쿠폰 수:</span>
                                                    <span className="font-semibold">{calculatedCAC ? calculatedCAC.customCouponCount.toLocaleString("ko-KR") : "0"}개</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-2">
                                                    <span className="font-bold text-lg">CAC (원):</span>
                                                    <span className="font-bold text-lg text-red-600">
                                                        {calculatedCAC ? calculatedCAC.customCAC.toLocaleString("ko-KR") : "0"}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-gray-800 mb-2">기본 정보</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>분석 기간:</span>
                                                    <span className="font-semibold">{cacData.dateRange}</span>
                                                </div>
                                                {calculatedCAC && (
                                                    <div className="flex justify-between">
                                                        <span>총 마케팅 비용 (원):</span>
                                                        <span className="font-semibold">{(calculatedCAC.customCouponCount * cacData.couponPrice).toLocaleString("ko-KR")}</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* 페이백 기간 분석 결과 */}
                            {selectedKPI === "페이백 기간" && paybackData && (
                                <div>
                                    <h2 className="text-lg font-semibold mb-3">페이백 기간 분석 결과</h2>
                                    
                                    <div className="grid grid-cols-2 gap-4 mb-4">
                                        <div className="bg-red-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-red-800 mb-2">핵심 지표</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>전체 결제 금액 (원):</span>
                                                    <span className="font-semibold">{paybackData.totalRevenue.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>총 원가 (원):</span>
                                                    <span className="font-semibold">{paybackData.totalCost.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>순이익 (원):</span>
                                                    <span className="font-semibold">{paybackData.netProfit.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>전체 결제 고객 수:</span>
                                                    <span className="font-semibold">{paybackData.uniqueCustomers.toLocaleString("ko-KR")}명</span>
                                                </div>
                                                <div className="flex justify-between border-t pt-2">
                                                    <span className="font-bold text-lg">고객 당 평균 순이익 (원):</span>
                                                    <span className="font-bold text-lg text-red-600">
                                                        {paybackData.avgNetProfitPerCustomer.toLocaleString("ko-KR")}
                                                    </span>
                                                </div>
                                                {calculatedCAC && (
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span className="font-bold text-lg">페이백 기간 (개월):</span>
                                                        <span className="font-bold text-lg text-red-600">
                                                            {((calculatedCAC.customCAC / paybackData.avgNetProfitPerCustomer) / 30).toFixed(2)}개월
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h3 className="font-semibold text-gray-800 mb-2">원가 분석</h3>
                                            <div className="space-y-2">
                                                <div className="flex justify-between">
                                                    <span>가중 평균 원가 (원):</span>
                                                    <span className="font-semibold">{paybackData.weightedCost.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>추가 비용 (원):</span>
                                                    <span className="font-semibold">{paybackData.additionalCost.toLocaleString("ko-KR")}</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>신규 고객 수:</span>
                                                    <span className="font-semibold">{paybackData.newCustomers.toLocaleString("ko-KR")}명</span>
                                                </div>
                                                <div className="flex justify-between">
                                                    <span>분석 기간:</span>
                                                    <span className="font-semibold">{paybackData.dateRange}</span>
                                                </div>
                                                {calculatedCAC && (
                                                    <div className="flex justify-between border-t pt-2">
                                                        <span className="font-bold text-lg">CAC (원):</span>
                                                        <span className="font-bold text-lg text-red-600">
                                                            {calculatedCAC.customCAC.toLocaleString("ko-KR")}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mb-4 p-4 bg-yellow-50 rounded-lg">
                                        <h3 className="font-semibold text-yellow-800 mb-2">페이백 기간 계산 공식</h3>
                                        <div className="text-sm text-gray-700 space-y-1">
                                            <p><strong>페이백 기간 = CAC ÷ 고객 당 평균 순이익</strong></p>
                                            <p><strong>순이익 = 전체 결제 금액 - 원가</strong></p>
                                            <p><strong>원가 = 가중 평균 원가 + 추가 비용 (15,000원)</strong></p>
                                            <p><strong>고객 당 평균 순이익 = 순이익 ÷ 전체 결제 고객 수</strong></p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default KPIPage;
