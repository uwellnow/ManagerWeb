

export interface StockProduct {
    productName: string;
    productStatus: "위험" | "주의" | "안전" | "품절";
}

export interface StocksSummaryResponse {
    [storeName: string]: StockProduct[];
}