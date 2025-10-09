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

    // Day0 ~ Day22 이용 여부 계산
    for (let day = 0; day <= 22; day++) {
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
   🧾 리텐션 KPI 엑셀 내보내기
------------------------------------------- */
export const exportRetentionKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedUser?: string
) => {
    const userRetention = generateRetentionTable(orders);
    const cohortSummary = generateCohortRetentionSummary(orders);

    const workbook = XLSX.utils.book_new();

    // 시트 1️⃣ 개인 리텐션
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(userRetention),
        "개인별 리텐션"
    );

    // 시트 2️⃣ 전체 리텐션 요약
    XLSX.utils.book_append_sheet(
        workbook,
        XLSX.utils.json_to_sheet(cohortSummary),
        "전체 리텐션 요약"
    );

    // 파일명 생성
    const userLabel =
        selectedUser && selectedUser !== "전체" ? selectedUser : "전체";
    const fileName = `${userLabel}_리텐션_${dateRange.startDate}~${dateRange.endDate}.xlsx`;

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
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
   💾 활성드링커 / 평균마진 엑셀 내보내기
------------------------------------------- */
export const exportBasicKPIToExcel = (
    orders: OrderData[],
    dateRange: { startDate: string; endDate: string },
    selectedKPI?: "활성드링커" | "평균마진",
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
            값: summary.avgMarginPerCup.toLocaleString("ko-KR"),
        },
    ];
    const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);

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

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, summarySheet, "KPI 요약");
    XLSX.utils.book_append_sheet(
        workbook,
        detailSheet,
        selectedKPI === "활성드링커" ? "활성드링커 상세" : "제품별 마진 상세"
    );

    const userLabel =
        selectedUser && selectedUser !== "전체" ? selectedUser : "전체";
    const fileName = `${userLabel}_${selectedKPI || "요약"}_${
        dateRange.startDate
    }~${dateRange.endDate}.xlsx`;

    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    saveAs(
        new Blob([buffer], {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
        fileName
    );
};
