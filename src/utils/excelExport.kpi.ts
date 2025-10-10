import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { OrderData } from "../types/DTO/OrderResponseDto";
import type {Member} from "../types/DTO/MemberResponseDto.ts";


/* -------------------------------------------
   🧩 유저별 방문일 정보 그룹화
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
   🧩 개인 단위 리텐션 행 생성
------------------------------------------- */
export const makeRetentionRow = (user: any) => {
    const firstDate = new Date(user.first_visit);
    const dayStatus: Record<string, string> = {};

    // Day0 ~ Day70 이용 여부 계산
    for (let day = 0; day <= 70; day++) {
        const target = new Date(firstDate);
        target.setDate(firstDate.getDate() + day);
        const dateStr = target.toISOString().split("T")[0];
        dayStatus[`Day${day}`] = user.visit_dates.includes(dateStr)
            ? "이용"
            : "이용하지 않음";
    }

    // 7일 단위 리텐션 계산
    const retentionDays = Array.from({ length: 3 }, (_, i) => (i + 1) * 7); // [7,14,21]
    const retainedCount = retentionDays.filter(
        (d) => dayStatus[`Day${d}`] === "이용"
    ).length;
    const retentionRate = (retainedCount / retentionDays.length).toFixed(2);

    return {
        사용자: user.user_name,
        ...dayStatus,
        이용횟수: user.visit_dates.length,
        리텐션: retentionRate,
    };
};

/* -------------------------------------------
   🧩 개인 리텐션 테이블 생성
------------------------------------------- */
export const generateRetentionTable = (orders: OrderData[]) => {
    const users = groupByUserForRetention(orders);
    return users.map((u) => makeRetentionRow(u));
};

/* -------------------------------------------
   📊 전체 리텐션 요약 계산
------------------------------------------- */
export const generateCohortRetentionSummary = (orders: OrderData[]) => {
    const users = groupByUserForRetention(orders);
    const retentionDays = Array.from({ length: 3 }, (_, i) => (i + 1) * 7); // [7,14,21]
    const totalUsers = users.length;

    const cohortSummary = retentionDays.map((day) => {
        const retainedUsers = users.filter((user) => {
            const firstDate = new Date(user.first_visit);
            const target = new Date(firstDate);
            target.setDate(firstDate.getDate() + day);
            const dateStr = target.toISOString().split("T")[0];
            return user.visit_dates.includes(dateStr);
        }).length;

        return {
            Day: `Day${day}`,
            이용자수: retainedUsers,
            리텐션율: ((retainedUsers / totalUsers) * 100).toFixed(1) + "%",
        };
    });

    return cohortSummary;
};

/* -------------------------------------------
   🧾 리텐션 KPI CSV 내보내기
------------------------------------------- */
export const exportRetentionKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedUser?: string
) => {
    const userRetention = generateRetentionTable(orders);
    const cohortSummary = generateCohortRetentionSummary(orders);

    // 개인 리텐션 CSV 변환
    const userRetentionSheet = XLSX.utils.json_to_sheet(userRetention);
    const userRetentionCsv = XLSX.utils.sheet_to_csv(userRetentionSheet);

    // 전체 리텐션 요약 CSV 변환
    const cohortSummarySheet = XLSX.utils.json_to_sheet(cohortSummary);
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
   💚 기본 KPI (활성드링커/평균마진)
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


