import type { SalesDetailCardType, SalesDetailKind, SalesData } from "../../types/DTO/SalesResponseDto.ts";
import total from '../../assets/dashboard/totalSales.svg';
import day from '../../assets/dashboard/daySales.svg';
import week from '../../assets/dashboard/weekSales.svg';
import month from '../../assets/dashboard/monthSales.svg';
import error from '../../assets/dashboard/error.svg';

export const SalesDetailCardTypes: Record<SalesDetailKind, SalesDetailCardType<SalesData>> = {
    total: {
        kind: "total",
        label: "누적 판매량",
        unit: "잔",
        bg: '#FFEAEC',
        iconBg: '#FA5A7D',
        icon: total,
        getValue: d => d.totalSales,
    },
    day: {
        kind: "day",
        label: "일일 판매량",
        unit: "잔",
        bg: '#FFF4DA',
        iconBg: '#FF947A',
        icon: day,
        getValue: d => d.daySales,
    },
    week: {
        kind: "week",
        label: "주간 판매량",
        unit: "잔",
        bg: '#DCFCE7',
        iconBg: '#3CD856',
        icon: week,
        getValue: d => d.weekSales,
    },
    month: {
        kind: "month",
        label: "월간 판매량",
        unit: "잔",
        bg: '#F3E8FF',
        iconBg: '#BF83FF',
        icon: month,
        getValue: d => d.monthSales,
    },
    error: {
        kind: "error",
        label: "발생한 오류",
        unit: "건",
        bg: '#E0F4FB',
        iconBg: '#069FDC',
        icon: error,
        getValue: d => d.errorCount,
    }
}