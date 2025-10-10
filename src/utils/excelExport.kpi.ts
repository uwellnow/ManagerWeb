import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { OrderData } from "../types/DTO/OrderResponseDto";

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
    const avgPrice = 2000;
    const totalRevenue = totalOrders * avgPrice;
    const totalCost = 20000;
    const avgMarginPerCup = (totalRevenue - totalCost) / totalOrders;

    const productSummary = new Map<string, number>();
    orders.forEach((o) => {
        productSummary.set(
            o.product_name,
            (productSummary.get(o.product_name) || 0) + 1
        );
    });

    const productTable = Array.from(productSummary.entries()).map(
        ([product, count]) => {
            const revenue = count * avgPrice;
            const costShare = totalCost * (count / totalOrders);
            return {
                제품명: product,
                판매수량: count.toLocaleString("ko-KR"),
                단가: avgPrice.toLocaleString("ko-KR"),
                총매출: revenue.toLocaleString("ko-KR"),
                원가: Math.round(costShare).toLocaleString("ko-KR"),
                이익: Math.round(revenue - costShare).toLocaleString("ko-KR"),
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
    selectedUser?: string
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
