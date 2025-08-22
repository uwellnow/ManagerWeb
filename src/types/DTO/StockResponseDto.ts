export interface StockData {
    productId: number;
    productName: string;
    productTime: "운동 전" | "운동 중" | "운동 후" | "재고관리";
    productDescription: string;
    productCount: number;
    updatedAddTime: string;
    manager: string;
    productStatus: "품절" | "위험" | "주의" | "안전";
    storeName: string;
}

export type StockResponse = StockData[];

export interface RestockRequest {
    productId: number;
    storeName: string;
    updateCount: number;
    updatedAt: string;
    managerName: string;
}
