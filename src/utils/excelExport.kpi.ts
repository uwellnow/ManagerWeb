import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import type { OrderData } from "../types/DTO/OrderResponseDto";

type UserSummary = {
    user_name: string;
    visit_dates: string[];
    first_visit: string;
    total_orders: number;
};

const groupByUser = (orders: OrderData[]): UserSummary[] => {
    const grouped = new Map<string, Set<string>>();
    const orderCount = new Map<string, number>();

    orders.forEach(order => {
        const date = new Date(order.order_time).toISOString().split("T")[0];
        if (!grouped.has(order.user_name)) grouped.set(order.user_name, new Set());
        grouped.get(order.user_name)!.add(date);

        orderCount.set(order.user_name, (orderCount.get(order.user_name) || 0) + 1);
    });

    return Array.from(grouped.entries()).map(([user_name, dates]) => {
        const sorted = Array.from(dates).sort();
        return {
            user_name,
            visit_dates: sorted,
            first_visit: sorted[0],
            total_orders: orderCount.get(user_name) || 0,
        };
    });
};


const makeRetentionRow = (user: UserSummary) => {
    const firstDate = new Date(user.first_visit);
    const dayStatus: Record<string, string> = {};
    for (let day = 0; day <= 22; day++) {
        const targetDate = new Date(firstDate);
        targetDate.setDate(firstDate.getDate() + day);
        const dateStr = targetDate.toISOString().split("T")[0];
        dayStatus[`Day${day}`] = user.visit_dates.includes(dateStr)
            ? "이용"
            : "이용하지 않음";
    }

    const totalVisits = user.visit_dates.length;
    const retentionFlags = [7, 14, 21].map(day =>
        dayStatus[`Day${day}`] === "이용" ? 1 : 0
    );
    const retentionRate = (
        retentionFlags.reduce((a: number, b: number) => a + b, 0) /
        retentionFlags.length
    ).toFixed(2);

    return {
        사용자: user.user_name,
        ...dayStatus,
        이용횟수: totalVisits,
        리텐션: retentionRate,
    };
};

export const calculateBasicKPI = (orders: OrderData[]) => {
    const users = groupByUser(orders);

    const activeUsers = users.filter(u => u.visit_dates.length >= 2);
    const activeUserCount = activeUsers.length;
    const totalCupsActive = activeUsers.reduce((sum, u) => sum + u.total_orders, 0);

    // ----- 평균 마진 계산 -----
    const totalOrders = orders.length;
    const avgPrice = 2000;
    const totalRevenue = totalOrders * avgPrice;
    const totalCost = 20000;
    const avgMarginPerCup = (totalRevenue - totalCost) / totalOrders;

    // 제품별 매출 구조
    const productSummary = new Map<string, number>();
    orders.forEach(o => {
        productSummary.set(o.product_name, (productSummary.get(o.product_name) || 0) + 1);
    });

    const productTable = Array.from(productSummary.entries()).map(([product, count]) => {
        const revenue = count * avgPrice;
        const costShare = (totalCost * (count / totalOrders));
        return {
            제품명: product,
            판매수량: count,
            단가: avgPrice,
            총매출: revenue,
            원가: costShare.toFixed(0),
            이익: (revenue - costShare).toFixed(0),
        };
    });

    return {
        activeUserCount,
        avgCupsPerActive: activeUserCount > 0 ? totalCupsActive / activeUserCount : 0,
        totalOrders,
        avgMarginPerCup,
        activeUsers,
        productTable,
    };
};



// ===== 메인 Export =====
export const exportRetentionKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string }
) => {
    const users = groupByUser(orders);
    const retentionData = users.map(u => makeRetentionRow(u));

    const worksheet = XLSX.utils.json_to_sheet(retentionData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "리텐션 데이터");

    const fileName = `KPI_리텐션_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
    );
};

export const exportBasicKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedKPI?: "활성드링커" | "평균마진"
) => {
    const summary = calculateBasicKPI(orders);

    // ---- 시트 1️⃣: KPI 요약표 ----
    const summarySheetData = [
        { 항목: "활성 드링커 수", 값: summary.activeUserCount },
        { 항목: "활성 드링커 1인당 평균 이용 컵 수", 값: summary.avgCupsPerActive.toFixed(2) },
        { 항목: "총 판매 컵 수", 값: summary.totalOrders },
        { 항목: "한 잔당 평균 마진(원)", 값: summary.avgMarginPerCup.toFixed(1) },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);

    // ---- 시트 2️⃣: 근거 데이터 ----
    let detailSheet;
    if (selectedKPI === "활성드링커") {
        const detailData = summary.activeUsers.map((u) => ({
            사용자: u.user_name,
            이용일수: u.visit_dates.length,
            총주문수: u.total_orders,
            첫이용일: u.first_visit,
            마지막이용일: u.visit_dates[u.visit_dates.length - 1],
        }));
        detailSheet = XLSX.utils.json_to_sheet(detailData);
    } else {
        detailSheet = XLSX.utils.json_to_sheet(summary.productTable);
    }

    // ---- 워크북 구성 ----
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "KPI 요약");
    XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        selectedKPI === "활성드링커" ? "활성드링커 상세" : "제품별 마진 상세"
    );

    const fileName = `KPI_${selectedKPI || "요약"}_${dateRange.startDate}_${dateRange.endDate}.xlsx`;
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
    );
};

