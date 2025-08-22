export interface OrderData {
    store_name: string;
    product_name: string;
    product_count: number;
    order_time: string;
    user_name: string;
    product_time: "운동 전" | "운동 중" | "운동 후";
    barcode: string;
    membership_id: number;
    user_age: number | null;
    user_gender: string | null;
    remain_count_after_purchase: number;
    total_count_at_purchase: number;
}

export type OrderResponse = OrderData[];
