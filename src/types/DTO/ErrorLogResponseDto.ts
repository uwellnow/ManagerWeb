export interface ErrorLogItem {
    id: number;
    error_id: number;
    timestamp: string;
    machine_id: number;
    store_name: string;
    error_type: string;
    error_detail: string;
    command_sent: string;
    response: string;
    user_id: string;
    product_id: number[];
    product_name: string[];
    created_at: string;
}

export interface ErrorLogResponse {
    [key: string]: ErrorLogItem;
}
