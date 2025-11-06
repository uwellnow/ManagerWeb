export interface ProductData {
    id: number;
    name: string;
    name_eng: string;
    timing: string;
    description: string;
    description_eng: string;
    nutrition_info: string;
    nutrition_info_eng: string;
    company_image_path: string;
    product_image_path: string;
    one_capacity: number;
    recipe_slots: (string | null)[][];
}

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
    one_capacity?: number; // 1통당 섭취가능 횟수
}

export type StockResponse = StockData[];

export interface RestockRequest {
    productId: number;
    storeName: string;
    updateCount: number;
    updatedAt: string;
    managerName: string;
}

export interface StockLogData {
    id: number;
    logged_at: string;
    product_id: number;
    store_name: string;
    previous_count: number;
    change_amount: number;
    new_count: number;
    operation_type: string;
    manager: string;
    reason: string;
    product_snapshot: {
        id: number;
        name: string;
        timing: string;
        description: string;
    } | null;
    product_name: string | null;
    product_time: string | null;
}

export type StockLogResponse = StockLogData[];


export interface StorageStockData {
    id: number;
    productId: number;
    productName: string;
    count: number;
    lastRestockedAt: string;
    manager: string;
}

export type StorageStockResponse = StorageStockData[];

export interface StorageRestockRequest {
    productId: number;
    updateCount: number;
    updatedAt: string;
    managerName: string;
}