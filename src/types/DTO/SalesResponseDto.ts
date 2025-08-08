

export interface SalesResponseDto {
    storeName: string;
    updatedAt: string;
    totalSales: number;
    daySales: number;
    weekSales: number,
    monthSales: number;
    errorCount: number;
}

export interface SalesGraphResponseDto {
    storeName: string;
    updatedAt: string;
    salesCountHour: number[];
    salesCount: number[];
}