import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { OrderData } from "../types/DTO/OrderResponseDto";
import type {Member} from "../types/DTO/MemberResponseDto.ts";


/* -------------------------------------------
   유저별 방문일 정보 그룹화
------------------------------------------- */
export const groupByUserForRetention = (orders: OrderData[]) => {
    const grouped = new Map<string, Set<string>>();

    orders.forEach((order) => {
        const date = new Date(order.order_time).toISOString().split("T")[0];
        if (!grouped.has(order.user_name)) grouped.set(order.user_name, new Set());
        grouped.get(order.user_name)!.add(date);
    });

    return Array.from(grouped.entries()).map(([user_name, dates]) => {
        const sortedDates = Array.from(dates).sort();
        return {
            user_name,
            visit_dates: sortedDates,
            first_visit: sortedDates[0],
        };
    });
};

/* -------------------------------------------
   개인 단위 리텐션 행 생성
------------------------------------------- */
export const makeRetentionRow = (user: any, dateRange?: { startDate: string; endDate: string }) => {
    const firstDate = new Date(user.first_visit);
    const dayStatus: Record<string, string> = {};

    // 선택한 기간의 일수 계산 (제한 없음)
    let maxDay = 365; // 기본값 (1년)
    if (dateRange) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        maxDay = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Day0 ~ maxDay 이용 여부 계산
    for (let day = 0; day <= maxDay; day++) {
        const target = new Date(firstDate);
        target.setDate(firstDate.getDate() + day);
        const dateStr = target.toISOString().split("T")[0];
        dayStatus[`Day${day}`] = user.visit_dates.includes(dateStr)
            ? "이용"
            : "이용하지 않음";
    }

    // 선택한 기간 내 7의 배수 모두 계산 (제한 없음)
    const maxWeeks = Math.floor(maxDay / 7);
    const retentionDays = Array.from({ length: maxWeeks }, (_, i) => (i + 1) * 7);
    const retainedCount = retentionDays.filter(
        (d) => dayStatus[`Day${d}`] === "이용"
    ).length;
    const retentionRate = retentionDays.length > 0 
        ? (retainedCount / retentionDays.length).toFixed(2)
        : "0.00";

    return {
        사용자: user.user_name,
        ...dayStatus,
        이용횟수: user.visit_dates.length,
        리텐션: retentionRate,
    };
};

/* -------------------------------------------
   개인 리텐션 테이블 생성
------------------------------------------- */
export const generateRetentionTable = (orders: OrderData[], dateRange?: { startDate: string; endDate: string }) => {
    const users = groupByUserForRetention(orders);
    return users.map((u) => makeRetentionRow(u, dateRange));
};

/* -------------------------------------------
   전체 리텐션 요약 계산
------------------------------------------- */
export const generateCohortRetentionSummary = (orders: OrderData[], dateRange?: { startDate: string; endDate: string }) => {
    const users = groupByUserForRetention(orders);
    
    // 선택한 기간의 일수 계산 (제한 없음)
    let maxDay = 365; // 기본값 (1년)
    if (dateRange) {
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);
        maxDay = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    }
    
    const maxWeeks = Math.floor(maxDay / 7);
    const retentionDays = Array.from({ length: maxWeeks }, (_, i) => (i + 1) * 7);
    const totalUsers = users.length;

    const cohortSummary = retentionDays.map((day) => {
        const retainedUsers = users.filter((user) => {
            const firstDate = new Date(user.first_visit);
            const target = new Date(firstDate);
            target.setDate(firstDate.getDate() + day);
            const dateStr = target.toISOString().split("T")[0];
            return user.visit_dates.includes(dateStr);
        }).length;

        const retentionRate = totalUsers > 0 ? (retainedUsers / totalUsers) * 100 : 0;

        return {
            Day: `Day${day}`,
            이용자수: retainedUsers,
            리텐션율: retentionRate.toFixed(1) + "%",
            리텐션율_숫자: retentionRate, // 평균 계산을 위한 숫자 값
        };
    });

    // 각 DAYN 리텐션율의 평균 계산 (퍼센트를 소수점으로 변환)
    const retentionRates = cohortSummary.map(item => item.리텐션율_숫자 / 100); // 퍼센트를 소수점으로 변환
    const averageRetention = retentionRates.length > 0 
        ? retentionRates.reduce((sum, rate) => sum + rate, 0) / retentionRates.length 
        : 0;

    return {
        summary: cohortSummary,
        averageRetention: averageRetention, // 평균 리텐션율 (소수점, 예: 0.0577 = 5.77%)
        averageRetentionPercent: averageRetention * 100, // 평균 리텐션율 (퍼센트)
    };
};

/* -------------------------------------------
   리텐션 KPI CSV 내보내기
------------------------------------------- */
export const exportRetentionKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedUser?: string
) => {
    const userRetention = generateRetentionTable(orders, dateRange);
    const cohortResult = generateCohortRetentionSummary(orders, dateRange);
    const cohortSummary = cohortResult.summary;

    // 개인 리텐션 CSV 변환
    const userRetentionSheet = XLSX.utils.json_to_sheet(userRetention);
    const userRetentionCsv = XLSX.utils.sheet_to_csv(userRetentionSheet);

    // 전체 리텐션 요약 CSV 변환 (리텐션율_숫자 필드 제거)
    const cohortSummaryForExport = cohortSummary.map(({ 리텐션율_숫자, ...rest }) => rest);
    const cohortSummarySheet = XLSX.utils.json_to_sheet(cohortSummaryForExport);
    const cohortSummaryCsv = XLSX.utils.sheet_to_csv(cohortSummarySheet);

    // 두 테이블을 구분선으로 분리하여 결합
    const combinedCsv =
        "=== 개인별 리텐션 ===\n" +
        userRetentionCsv +
        "\n\n=== 전체 리텐션 요약 ===\n" +
        cohortSummaryCsv;

    // UTF-8 BOM 추가 (Excel에서 한글 정상 표시)
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + combinedCsv;

    // 파일명 생성
    const userLabel =
        selectedUser && selectedUser !== "전체" ? selectedUser : "전체";
    const fileName = `${userLabel}_리텐션_${dateRange.startDate}~${dateRange.endDate}.csv`;

    saveAs(
        new Blob([csvWithBOM], {
            type: "text/csv;charset=utf-8;",
        }),
        fileName
    );
};

/* -------------------------------------------
   제품별 원가 설정
------------------------------------------- */
const PRODUCT_COSTS: Record<string, number> = {
    "삼대오백 프리워크아웃 포도맛": 1604,
    "잠백이 에센셜 락토프리\\n웨이프로틴 멜론맛": 1196,
    "삼대오백 BCAA 프로\\n블루머슬에이드맛": 694,
    "얼티밋포텐셜 EAA 사과맛": 1297,
    "잠백이 에센셜 락토프리\\n웨이프로틴 쿠키앤크림": 1196,
    "삼대오백 BCAA 망고맛": 232,
    "칼로바이 부스터 복숭아라임맛": 495,
    
    // 기본값 (제품명을 찾지 못한 경우)
    "default": 600,
};

/* -------------------------------------------
   기본 KPI (활성드링커/평균마진)
------------------------------------------- */
export const calculateBasicKPI = (orders: OrderData[]) => {
    const grouped = new Map<string, { dates: Set<string>; totalOrders: number }>();
    orders.forEach((o) => {
        const date = new Date(o.order_time).toISOString().split("T")[0];
        if (!grouped.has(o.user_name))
            grouped.set(o.user_name, { dates: new Set(), totalOrders: 0 });
        grouped.get(o.user_name)!.dates.add(date);
        grouped.get(o.user_name)!.totalOrders += 1;
    });

    const users = Array.from(grouped.entries()).map(([user_name, data]) => {
        const sortedDates = Array.from(data.dates).sort();
        return {
            user_name,
            visit_dates: sortedDates,
            first_visit: sortedDates[0],
            total_orders: data.totalOrders,
        };
    });

    const activeUsers = users.filter((u) => u.visit_dates.length >= 2);
    const activeUserCount = activeUsers.length;
    const totalCupsActive = activeUsers.reduce(
        (sum, u) => sum + u.total_orders,
        0
    );

    const totalOrders = orders.length;
    const avgPrice = 1800; // 평균 판매 단가
    
    // 제품별 원가 계산
    const productSummary = new Map<string, number>();
    orders.forEach((o) => {
        productSummary.set(
            o.product_name,
            (productSummary.get(o.product_name) || 0) + 1
        );
    });

    // 총 원가 = 각 제품별 (수량 × 원가)의 합
    let totalCost = 0;
    productSummary.forEach((count, productName) => {
        const cost = PRODUCT_COSTS[productName] || PRODUCT_COSTS["default"];
        totalCost += count * cost;
    });

    const totalRevenue = totalOrders * avgPrice;
    const avgMarginPerCup = (totalRevenue - totalCost) / totalOrders;

    const productTable = Array.from(productSummary.entries()).map(
        ([product, count]) => {
            const productCost = PRODUCT_COSTS[product] || PRODUCT_COSTS["default"];
            const revenue = count * avgPrice;
            const totalProductCost = count * productCost;
            const profit = revenue - totalProductCost;
            
            return {
                제품명: product,
                판매수량: count.toLocaleString("ko-KR"),
                단가: avgPrice.toLocaleString("ko-KR"),
                총매출: revenue.toLocaleString("ko-KR"),
                원가: productCost.toLocaleString("ko-KR"),
                이익: profit.toLocaleString("ko-KR"),
            };
        }
    );

    return {
        activeUserCount,
        avgCupsPerActive:
            activeUserCount > 0 ? totalCupsActive / activeUserCount : 0,
        totalOrders,
        avgMarginPerCup,
        activeUsers,
        productTable,
    };
};

/**
 * 재결제 비율 계산
 * - 해당 기간 내에서 이용권을 소진한 고객 중,
 *   이후 새로운 이용권을 재구매한 고객의 비율
 */
export function calculateRepurchaseRate(
    members: Member[],
    orders: OrderData[],
    dateRange?: { startDate: string; endDate: string }
): number {
    // 멤버십별 소진 날짜 찾기
    const membershipConsumptionDate = new Map<number, string>();
    orders.forEach((order) => {
        if (order.remain_count_after_purchase === 0 && !membershipConsumptionDate.has(order.membership_id)) {
            const consumptionDate = new Date(order.order_time).toISOString().split('T')[0];
            membershipConsumptionDate.set(order.membership_id, consumptionDate);
        }
    });

    const consumedInPeriod = new Set<string>(); // 기간 내 소진한 회원
    const repurchasedInPeriod = new Set<string>(); // 기간 내 재구매한 회원

    members.forEach((member) => {
        // id 기준으로 정렬 (시간순)
        const memberships = [...member.memberships]
            .filter(m => m.created_at)
            .sort((a, b) => a.id - b.id);

        if (memberships.length < 1) return;

        // 소진한 멤버십 찾기 (기간 내)
        memberships.forEach((ms, idx) => {
            if (ms.remain_count === 0) {
                const consumptionDate = membershipConsumptionDate.get(ms.id);
                if (!consumptionDate) return;

                // 기간 필터링
                if (dateRange) {
                    if (consumptionDate < dateRange.startDate || consumptionDate > dateRange.endDate) {
                        return;
                    }
                }

                // 기간 내에 소진한 회원으로 기록
                consumedInPeriod.add(member.name);

                // 이후에 새 멤버십을 구매했는지 확인
                if (idx < memberships.length - 1) {
                    const nextMembership = memberships[idx + 1];
                    if (nextMembership && nextMembership.created_at) {
                        const repurchaseDate = new Date(nextMembership.created_at).toISOString().split('T')[0];
                        
                        // 재구매 날짜도 기간 내에 있는지 확인 (선택사항)
                        if (dateRange) {
                            if (repurchaseDate >= dateRange.startDate && repurchaseDate <= dateRange.endDate) {
                                repurchasedInPeriod.add(member.name);
                            }
                        } else {
                            repurchasedInPeriod.add(member.name);
                        }
                    }
                }
            }
        });
    });

    const consumedCount = consumedInPeriod.size;
    const repurchasedCount = repurchasedInPeriod.size;

    return consumedCount === 0
        ? 0
        : (repurchasedCount / consumedCount) * 100;
}

/**
 * 재구매 평균기간 계산
 * - 이전 이용권 소진일 → 다음 이용권 구매일까지의 평균 소요일
 */
export function calculateAvgRepurchasePeriod(
    members: Member[],
    orders: OrderData[],
    dateRange?: { startDate: string; endDate: string }
): {
    userPeriods: { 
        name: string; 
        consumptionDate: string;
        repurchaseDate: string;
        period: number;
    }[];
    totalAvgDays: number;
} {
    const userPeriods: { 
        name: string; 
        consumptionDate: string;
        repurchaseDate: string;
        period: number;
    }[] = [];

    // 멤버십별 실제 소진 날짜 찾기
    const membershipConsumptionDate = new Map<number, string>();
    orders.forEach((order) => {
        if (order.remain_count_after_purchase === 0 && !membershipConsumptionDate.has(order.membership_id)) {
            membershipConsumptionDate.set(order.membership_id, new Date(order.order_time).toISOString().split('T')[0]);
        }
    });

    members.forEach((member) => {
        // id 기준으로 정렬 (시간순)
        const memberships = [...member.memberships]
            .filter(m => m.created_at)
            .sort((a, b) => a.id - b.id);

        // 멤버십이 2개 이상인 경우만 재구매로 간주
        if (memberships.length < 2) return;

        for (let i = 0; i < memberships.length - 1; i++) {
            const cur = memberships[i];
            const next = memberships[i + 1];
            
            // 현재 멤버십이 소진되었고, 다음 멤버십이 있는 경우
            if (cur.remain_count === 0 && next.created_at) {
                const consumptionDate = membershipConsumptionDate.get(cur.id);
                const repurchaseDate = new Date(next.created_at).toISOString().split('T')[0];
                
                if (!consumptionDate) continue;

                // 날짜 필터링: 재구매 날짜가 선택한 기간 내에 있는지 확인
                if (dateRange) {
                    if (repurchaseDate < dateRange.startDate || repurchaseDate > dateRange.endDate) {
                        continue;
                    }
                }
                
                const consumptionTime = new Date(consumptionDate).getTime();
                const repurchaseTime = new Date(repurchaseDate).getTime();
                
                const diff = (repurchaseTime - consumptionTime) / (1000 * 60 * 60 * 24);
                if (diff >= 0) {
                    userPeriods.push({
                        name: member.name,
                        consumptionDate: consumptionDate,
                        repurchaseDate: repurchaseDate,
                        period: diff
                    });
                }
            }
        }
    });

    const totalAvgDays =
        userPeriods.length > 0
            ? userPeriods.reduce((sum, u) => sum + u.period, 0) / userPeriods.length
            : 0;

    return { userPeriods, totalAvgDays };
}

export function calculateAvgConsumptionPeriodFromOrders(
    members: Member[],
    orders: OrderData[],
    dateRange?: { startDate: string; endDate: string }
): {
    ticketAverages: Record<string, number>;
    userDetails: { 
        name: string; 
        ticket: string; 
        purchaseDate: string;
        consumptionDate: string;
        period: number;
    }[];
} {
    const membershipMap = new Map<number, { name: string; created_at: string; userName: string }>();
    const userDetails: { 
        name: string; 
        ticket: string; 
        purchaseDate: string;
        consumptionDate: string;
        period: number;
    }[] = [];
    const membershipBestPeriod = new Map<number, { period: number; consumptionDate: string }>();

    // 멤버십 정보 맵 생성
    members.forEach((m) => {
        m.memberships.forEach((ms) => {
            if (ms.created_at && !isNaN(new Date(ms.created_at).getTime())) {
                membershipMap.set(ms.id, { 
                    name: ms.name, 
                    created_at: ms.created_at,
                    userName: m.name 
                });
            }
        });
    });

    const periodMap: Record<string, number[]> = {};

    // 모든 주문을 순회하며 각 멤버십의 최대 소진 기간 찾기
    orders.forEach((order) => {
        if (order.remain_count_after_purchase === 0) {
            const membership = membershipMap.get(order.membership_id);
            if (!membership) return;

            const start = new Date(membership.created_at);
            const end = new Date(order.order_time);
            if (isNaN(start.getTime()) || isNaN(end.getTime())) return;

            const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
            if (diffDays < 0) return;

            // 날짜 필터링: 소진 날짜가 선택한 기간 내에 있는지 확인
            if (dateRange) {
                const consumptionDateStr = end.toISOString().split('T')[0];
                if (consumptionDateStr < dateRange.startDate || consumptionDateStr > dateRange.endDate) {
                    return;
                }
            }

            // 현재 멤버십의 기존 최대값과 비교하여 더 큰 값만 저장
            const currentBest = membershipBestPeriod.get(order.membership_id);
            if (!currentBest || diffDays > currentBest.period) {
                membershipBestPeriod.set(order.membership_id, {
                    period: diffDays,
                    consumptionDate: end.toISOString().split('T')[0]
                });
            }
        }
    });

    // 최대 소진 기간만 userDetails와 periodMap에 추가
    membershipBestPeriod.forEach((data, membershipId) => {
        const membership = membershipMap.get(membershipId);
        if (!membership) return;

        if (!periodMap[membership.name]) periodMap[membership.name] = [];
        periodMap[membership.name].push(data.period);

        userDetails.push({ 
            name: membership.userName, 
            ticket: membership.name,
            purchaseDate: new Date(membership.created_at).toISOString().split('T')[0],
            consumptionDate: data.consumptionDate,
            period: data.period 
        });
    });

    const ticketAverages: Record<string, number> = {};
    for (const [ticket, list] of Object.entries(periodMap)) {
        if (list.length === 0) continue;
        ticketAverages[ticket] = list.reduce((a, b) => a + b, 0) / list.length;
    }

    return { ticketAverages, userDetails };
}


/* -------------------------------------------
   💾 활성드링커 / 평균마진 CSV 내보내기
------------------------------------------- */
export const exportBasicKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedKPI?: "활성드링커" | "평균마진",
    selectedUser?: string
) => {
    const summary = calculateBasicKPI(orders);

    let detailData;
    if (selectedKPI === "활성드링커") {
        detailData = summary.activeUsers.map((u) => ({
            사용자: u.user_name,
            이용일수: u.visit_dates.length,
            총주문수: u.total_orders,
            첫이용일: "'" + u.first_visit,
            마지막이용일: "'" + u.visit_dates[u.visit_dates.length - 1],
        }));
    } else {
        detailData = summary.productTable;
    }

    const detailSheet = XLSX.utils.json_to_sheet(detailData);
    const detailCsv = XLSX.utils.sheet_to_csv(detailSheet);

    // 상세 데이터만 내보내기
    const sectionTitle = selectedKPI === "활성드링커" ? "활성드링커 상세" : "제품별 마진 상세";
    const combinedCsv = "=== " + sectionTitle + " ===\n" + detailCsv;

    // UTF-8 BOM 추가 (Excel에서 한글 정상 표시)
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + combinedCsv;

    const userLabel =
        selectedUser && selectedUser !== "전체" ? selectedUser : "전체";
    const fileName = `${userLabel}_${selectedKPI || "요약"}_${
        dateRange.startDate
    }~${dateRange.endDate}.csv`;

    saveAs(
        new Blob([csvWithBOM], {
            type: "text/csv;charset=utf-8;",
        }),
        fileName
    );
};

/* -------------------------------------------
   📊 KPI 요약표 CSV 내보내기
------------------------------------------- */
export const exportKPISummaryToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedUser?: string,
    members?: Member[],
) => {
    const summary = calculateBasicKPI(orders);

    const summarySheetData = [
        {
            항목: "활성 드링커 수",
            값: summary.activeUserCount.toLocaleString("ko-KR"),
        },
        {
            항목: "활성 드링커 1인당 평균 이용 컵 수",
            값: summary.avgCupsPerActive.toFixed(2),
        },
        {
            항목: "총 판매 컵 수",
            값: summary.totalOrders.toLocaleString("ko-KR"),
        },
        {
            항목: "한 잔당 평균 마진(원)",
            값: summary.avgMarginPerCup.toFixed(0),
        },
    ];

    if (members && members.length > 0) {
        const repurchaseRate = calculateRepurchaseRate(members, orders, dateRange);
        const avgRepurchasePeriod = calculateAvgRepurchasePeriod(members, orders, dateRange);
        const avgByTicket = calculateAvgConsumptionPeriodFromOrders(members, orders, dateRange);

        summarySheetData.push(
            { 항목: "재결제 비율(%)", 값: Number(repurchaseRate).toFixed(2) },
            { 항목: "평균 재결제 기간(일)", 값: Math.round(avgRepurchasePeriod.totalAvgDays).toString() },
        );
        for (const [ticket, avg] of Object.entries(avgByTicket.ticketAverages)) {
            summarySheetData.push({
                항목: `${ticket} 평균 소진기간(일)`,
                값: Math.round(Number(avg)).toString(),
            });
        }
    }

    const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);
    const summaryCsv = XLSX.utils.sheet_to_csv(summarySheet);

    // UTF-8 BOM 추가 (Excel에서 한글 정상 표시)
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + "=== KPI 요약 ===\n" + summaryCsv;

    const userLabel =
        selectedUser && selectedUser !== "전체" ? selectedUser : "전체";
    const fileName = `${userLabel}_KPI요약_${dateRange.startDate}~${dateRange.endDate}.csv`;

    saveAs(
        new Blob([csvWithBOM], {
            type: "text/csv;charset=utf-8;",
        }),
        fileName
    );
};

export function exportMembershipKPIToExcel(members: Member[], orders: any[], dateRange?: { startDate: string; endDate: string }) {
    const avgRepurchasePeriod = calculateAvgRepurchasePeriod(members, orders, dateRange);
    const avgByTicket = calculateAvgConsumptionPeriodFromOrders(members, orders, dateRange);

    // 1️⃣ 재결제 회원별 상세 데이터
    const repurchaseDetails = avgRepurchasePeriod.userPeriods.map(u => ({
        회원명: u.name,
        소진날짜: u.consumptionDate,
        재구매날짜: u.repurchaseDate,
        기간_일: Math.round(u.period),
    }));

    // 2️⃣ 이용권별 소진기간 상세 데이터
    const consumptionDetails = avgByTicket.userDetails.map(u => ({
        회원명: u.name,
        이용권: u.ticket,
        구매날짜: u.purchaseDate,
        소진날짜: u.consumptionDate,
        소진기간_일: Math.round(u.period),
    }));

    // CSV 변환
    const repurchaseSheet = XLSX.utils.json_to_sheet(repurchaseDetails);
    const repurchaseCsv = XLSX.utils.sheet_to_csv(repurchaseSheet);

    const consumptionSheet = XLSX.utils.json_to_sheet(consumptionDetails);
    const consumptionCsv = XLSX.utils.sheet_to_csv(consumptionSheet);

    // 두 테이블을 구분선으로 분리하여 결합
    const combinedCsv =
        "=== 재결제 회원별 상세 데이터 ===\n" +
        repurchaseCsv +
        "\n\n=== 이용권별 소진기간 상세 데이터 ===\n" +
        consumptionCsv;

    // UTF-8 BOM 추가
    const BOM = '\uFEFF';
    const csvWithBOM = BOM + combinedCsv;

    const dateStr = dateRange ? `${dateRange.startDate}_${dateRange.endDate}` : new Date().toISOString().split("T")[0];
    const fileName = `재결제_및_소진기간_${dateStr}.csv`;

    saveAs(
        new Blob([csvWithBOM], { type: "text/csv;charset=utf-8;" }),
        fileName
    );
}

export function exportMembershipDetailKPIToExcel(members: Member[], orders: any[], dateRange?: { startDate: string; endDate: string }) {
    const avgByTicket = calculateAvgConsumptionPeriodFromOrders(members, orders, dateRange);

    // 📊 근거 데이터 구성
    const repurchaseRows = members.map((m) => {
        const total = m.memberships.length;
        const used = m.memberships.filter(ms => ms.remain_count === 0).length;
        return {
            사용자: m.name,
            총이용권수: total,
            소진이용권수: used,
            재결제여부: total > 1 ? "O" : "X",
        };
    });

    const repurchaseSheet = XLSX.utils.json_to_sheet(repurchaseRows);
    const avgTicketRows = Object.entries(avgByTicket.ticketAverages).map(([ticket, avg]) => ({
        이용권종류: ticket,
        평균소진기간: Math.round(Number(avg)),
    }));
    const avgTicketSheet = XLSX.utils.json_to_sheet(avgTicketRows);

    // 워크북 생성
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, repurchaseSheet, "재결제 데이터");
    XLSX.utils.book_append_sheet(wb, avgTicketSheet, "소진기간 데이터");

    XLSX.writeFile(wb, `재결제_및_소진기간_상세_${new Date().toISOString().split("T")[0]}.xlsx`);
}

/* -------------------------------------------
   LTV (Life Time Value) 계산
------------------------------------------- */
export const calculateLTV = (orders: OrderData[]) => {
    // 1. 평균 마진 계산 (calculateBasicKPI 로직 복사)
    const totalOrders = orders.length;
    const avgPrice = 1800; // 평균 판매 단가
    
    // 제품별 원가 계산
    const productSummary = new Map<string, number>();
    orders.forEach((o) => {
        productSummary.set(
            o.product_name,
            (productSummary.get(o.product_name) || 0) + 1
        );
    });

    // 총 원가 = 각 제품별 (수량 × 원가)의 합
    let totalCost = 0;
    productSummary.forEach((count, productName) => {
        const cost = PRODUCT_COSTS[productName] || PRODUCT_COSTS["default"];
        totalCost += count * cost;
    });

    const totalRevenue = totalOrders * avgPrice;
    const avgMarginPerCup = (totalRevenue - totalCost) / totalOrders;

    // 2. 평균 구매 컵 수 계산
    const uniqueCustomers = new Set(orders.map(o => o.user_name)).size;
    const avgCupsPerCustomer = totalOrders / uniqueCustomers;

    // 3. 고객 평균 리텐션 계산 (누적 리텐션 방식)
    const grouped = new Map<string, { dates: Set<string>; totalOrders: number }>();
    orders.forEach((o) => {
        const date = new Date(o.order_time).toISOString().split("T")[0];
        if (!grouped.has(o.user_name))
            grouped.set(o.user_name, { dates: new Set(), totalOrders: 0 });
        grouped.get(o.user_name)!.dates.add(date);
        grouped.get(o.user_name)!.totalOrders += 1;
    });

    // 주차별 리텐션 계산
    const weeklyRetention: number[] = [];
    const maxWeeks = 12; // 최대 12주까지 계산
    
    for (let week = 1; week <= maxWeeks; week++) {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - (week * 7));
        const weekEnd = new Date();
        weekEnd.setDate(weekEnd.getDate() - ((week - 1) * 7));
        
        const weekStartStr = weekStart.toISOString().split("T")[0];
        const weekEndStr = weekEnd.toISOString().split("T")[0];
        
        // 해당 주에 주문한 고객 수
        const customersInWeek = new Set(
            orders
                .filter(o => {
                    const orderDate = new Date(o.order_time).toISOString().split("T")[0];
                    return orderDate >= weekStartStr && orderDate < weekEndStr;
                })
                .map(o => o.user_name)
        ).size;
        
        // 이전 주에 주문한 고객 수
        const prevWeekStart = new Date();
        prevWeekStart.setDate(prevWeekStart.getDate() - ((week + 1) * 7));
        const prevWeekEnd = new Date();
        prevWeekEnd.setDate(prevWeekEnd.getDate() - (week * 7));
        
        const prevWeekStartStr = prevWeekStart.toISOString().split("T")[0];
        const prevWeekEndStr = prevWeekEnd.toISOString().split("T")[0];
        
        const customersInPrevWeek = new Set(
            orders
                .filter(o => {
                    const orderDate = new Date(o.order_time).toISOString().split("T")[0];
                    return orderDate >= prevWeekStartStr && orderDate < prevWeekEndStr;
                })
                .map(o => o.user_name)
        ).size;
        
        if (customersInPrevWeek > 0) {
            weeklyRetention.push(customersInWeek / customersInPrevWeek);
        } else {
            weeklyRetention.push(0);
        }
    }
    
    // 누적 리텐션 계산
    let cumulativeRetention = 1; // 첫 주는 1로 시작
    for (let i = 0; i < weeklyRetention.length; i++) {
        if (weeklyRetention[i] > 0) {
            let product = 1;
            for (let j = 0; j <= i; j++) {
                product *= weeklyRetention[j];
            }
            cumulativeRetention += product;
        }
    }
    
    const avgRetention = cumulativeRetention;

    // 4. LTV 계산
    const ltv = avgMarginPerCup * avgCupsPerCustomer * avgRetention;

    return {
        avgMarginPerCup: Math.round(avgMarginPerCup),
        avgCupsPerCustomer: Math.round(avgCupsPerCustomer * 100) / 100,
        avgRetention: Math.round(avgRetention * 100) / 100, // 누적 리텐션 값
        ltv: Math.round(ltv),
        totalOrders,
        uniqueCustomers,
        weeklyRetention: weeklyRetention.map(r => Math.round(r * 10000) / 100), // 주차별 리텐션 백분율
        cumulativeRetention: Math.round(avgRetention * 100) / 100,
        totalRevenue: Math.round(totalRevenue),
        totalCost: Math.round(totalCost)
    };
};

// LTV 데이터를 엑셀로 내보내는 함수
export const exportLTVToExcel = (ltvData: any) => {
    const wb = XLSX.utils.book_new();
    
    // LTV 요약 데이터 (사용자 정의 리텐션 반영)
    const summaryData = [
        { 지표: "평균 마진 (원/잔)", 값: ltvData.avgMarginPerCup.toLocaleString("ko-KR") },
        { 지표: "평균 구매 컵 수 (잔/고객)", 값: ltvData.avgCupsPerCustomer.toLocaleString("ko-KR") },
        { 지표: "누적 리텐션", 값: (ltvData.customRetention || ltvData.cumulativeRetention).toLocaleString("ko-KR") },
        { 지표: "LTV (원)", 값: (ltvData.customLTV || ltvData.ltv).toLocaleString("ko-KR") },
        { 지표: "총 주문 수", 값: ltvData.totalOrders.toLocaleString("ko-KR") },
        { 지표: "고유 고객 수", 값: ltvData.uniqueCustomers.toLocaleString("ko-KR") },
        { 지표: "총 매출 (원)", 값: ltvData.totalRevenue.toLocaleString("ko-KR") },
        { 지표: "총 원가 (원)", 값: ltvData.totalCost.toLocaleString("ko-KR") }
    ];
    
    // 사용자 정의 리텐션 사용 여부 표시
    if (ltvData.customRetention) {
        summaryData.push({ 지표: "기본 누적 리텐션", 값: ltvData.cumulativeRetention.toLocaleString("ko-KR") });
        summaryData.push({ 지표: "기본 LTV (원)", 값: ltvData.ltv.toLocaleString("ko-KR") });
    }

    // 주차별 리텐션 데이터
    const weeklyRetentionData = ltvData.weeklyRetention.map((retention: number, index: number) => ({
        주차: `${index + 1}주차`,
        리텐션: `${retention.toFixed(2)}%`
    }));

    const ws = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, "LTV 요약");

    const ws2 = XLSX.utils.json_to_sheet(weeklyRetentionData);
    XLSX.utils.book_append_sheet(wb, ws2, "주차별 리텐션");

    XLSX.writeFile(wb, `LTV_분석_${new Date().toISOString().split("T")[0]}.xlsx`);
};

/* -------------------------------------------
   CAC (Customer Acquisition Cost) 계산
------------------------------------------- */
export const calculateCAC = (members: Member[], dateRange: { startDate: string; endDate: string }) => {
    // 선택한 기간 내에 멤버십 첫 구매를 한 신규 고객 수 계산
    const newCustomers = members.filter(member => {
        if (member.memberships.length === 0) return false;
        
        // id가 가장 낮은 멤버십 찾기 (첫 구매)
        const firstMembership = member.memberships.reduce((prev, current) => 
            (current.id < prev.id) ? current : prev
        );
        
        const createdAt = (firstMembership as any).created_at;
        if (!createdAt) return false;
        
        const firstPurchaseDate = new Date(createdAt).toISOString().split('T')[0];
        return firstPurchaseDate >= dateRange.startDate && firstPurchaseDate <= dateRange.endDate;
    }).length;

    return {
        newCustomers,
        couponPrice: 1800, // 기본 쿠폰 단가
        dateRange: `${dateRange.startDate} ~ ${dateRange.endDate}`
    };
};

// CAC 데이터를 엑셀로 내보내는 함수
export const exportCACToExcel = (cacData: any) => {
    const wb = XLSX.utils.book_new();
    
    // CAC 요약 데이터 (사용자 정의 쿠폰 수 반영)
    const summaryData = [
        { 지표: "신규 고객 수", 값: cacData.newCustomers.toLocaleString("ko-KR") },
        { 지표: "쿠폰 단가 (원)", 값: cacData.couponPrice.toLocaleString("ko-KR") },
        { 지표: "쿠폰 수", 값: (cacData.customCouponCount || 0).toLocaleString("ko-KR") },
        { 지표: "CAC (원)", 값: (cacData.customCAC || 0).toLocaleString("ko-KR") },
        { 지표: "분석 기간", 값: cacData.dateRange }
    ];
    
    // 사용자 정의 쿠폰 수 사용 여부 표시
    if (cacData.customCouponCount) {
        summaryData.push({ 지표: "총 마케팅 비용 (원)", 값: (cacData.customCouponCount * cacData.couponPrice).toLocaleString("ko-KR") });
    }

    const ws = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, "CAC 요약");

    XLSX.writeFile(wb, `CAC_분석_${new Date().toISOString().split("T")[0]}.xlsx`);
};

/* -------------------------------------------
   페이백 기간 (Payback Period) 계산
------------------------------------------- */
export const calculatePaybackPeriod = (orders: OrderData[], members: Member[], dateRange: { startDate: string; endDate: string }) => {
    // 1. 전체 결제 금액 계산
    const totalOrders = orders.length;
    const avgPrice = 1800; // 평균 판매 단가
    const totalRevenue = totalOrders * avgPrice;

    // 2. 원가 계산
    // 제품별 구매 수량 계산
    const productSummary = new Map<string, number>();
    orders.forEach((o) => {
        productSummary.set(
            o.product_name,
            (productSummary.get(o.product_name) || 0) + 1
        );
    });

    // 각 보충제별 원가 × 각 보충제별 구매 잔 수 / 전체 구매 잔 수
    let weightedCost = 0;
    productSummary.forEach((count, productName) => {
        const cost = PRODUCT_COSTS[productName] || PRODUCT_COSTS["default"];
        weightedCost += (cost * count) / totalOrders;
    });

    // 비용 추가 (15,000원)
    const additionalCost = 15000;
    const totalCost = weightedCost + additionalCost;

    // 3. 순이익 계산
    const netProfit = totalRevenue - totalCost;

    // 4. 전체 결제 고객 수 계산
    const uniqueCustomers = new Set(orders.map(o => o.user_name)).size;

    // 5. 고객 당 평균 순이익 계산
    const avgNetProfitPerCustomer = netProfit / uniqueCustomers;

    // 6. 신규 고객 수 계산 (CAC에서 사용)
    const newCustomers = members.filter(member => {
        if (member.memberships.length === 0) return false;
        
        const firstMembership = member.memberships.reduce((prev, current) => 
            (current.id < prev.id) ? current : prev
        );
        
        const createdAt = (firstMembership as any).created_at;
        if (!createdAt) return false;
        
        const firstPurchaseDate = new Date(createdAt).toISOString().split('T')[0];
        return firstPurchaseDate >= dateRange.startDate && firstPurchaseDate <= dateRange.endDate;
    }).length;

    return {
        totalRevenue: Math.round(totalRevenue),
        weightedCost: Math.round(weightedCost),
        additionalCost,
        totalCost: Math.round(totalCost),
        netProfit: Math.round(netProfit),
        uniqueCustomers,
        avgNetProfitPerCustomer: Math.round(avgNetProfitPerCustomer),
        newCustomers,
        dateRange: `${dateRange.startDate} ~ ${dateRange.endDate}`
    };
};

// 페이백 기간 데이터를 엑셀로 내보내는 함수
export const exportPaybackPeriodToExcel = (paybackData: any, cacData: any) => {
    const wb = XLSX.utils.book_new();
    
    // 페이백 기간 계산
    const paybackPeriod = cacData.customCAC ? cacData.customCAC / paybackData.avgNetProfitPerCustomer : 0;
    
    // 페이백 기간 요약 데이터
    const summaryData = [
        { 지표: "전체 결제 금액 (원)", 값: paybackData.totalRevenue.toLocaleString("ko-KR") },
        { 지표: "가중 평균 원가 (원)", 값: paybackData.weightedCost.toLocaleString("ko-KR") },
        { 지표: "추가 비용 (원)", 값: paybackData.additionalCost.toLocaleString("ko-KR") },
        { 지표: "총 원가 (원)", 값: paybackData.totalCost.toLocaleString("ko-KR") },
        { 지표: "순이익 (원)", 값: paybackData.netProfit.toLocaleString("ko-KR") },
        { 지표: "전체 결제 고객 수", 값: paybackData.uniqueCustomers.toLocaleString("ko-KR") },
        { 지표: "고객 당 평균 순이익 (원)", 값: paybackData.avgNetProfitPerCustomer.toLocaleString("ko-KR") },
        { 지표: "신규 고객 수", 값: paybackData.newCustomers.toLocaleString("ko-KR") },
        { 지표: "CAC (원)", 값: (cacData.customCAC || 0).toLocaleString("ko-KR") },
        { 지표: "페이백 기간 (개월)", 값: paybackPeriod > 0 ? (paybackPeriod / 30).toFixed(2) : "0" },
        { 지표: "분석 기간", 값: paybackData.dateRange }
    ];

    const ws = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws, "페이백 기간 요약");

    XLSX.writeFile(wb, `페이백기간_분석_${new Date().toISOString().split("T")[0]}.xlsx`);
};


