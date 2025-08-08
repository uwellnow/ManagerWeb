

export interface SalesResponseDto {
    storeName: string;
    updatedAt: string;
    totalSales: number;
    daySales: number;
    weekSales: number,
    monthSales: number;
    errorCount: number;
}

export type SalesDetailKind = | "total" | "day" | "week" | "month" | "error";

export type SalesDetailCardType = {
    kind: SalesDetailKind;
    label: string;
    unit: string;
    bg: string;
    iconBg: string;
    icon: string;
    getValue: (d: SalesResponseDto) => number;
}

export interface SalesGraphResponseDto {
    storeName: string;
    updatedAt: string;
    salesCountHour: number[];
    salesCount: number[];
}