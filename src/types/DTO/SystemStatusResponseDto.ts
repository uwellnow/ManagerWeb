export interface SystemStatus {
    id: number;
    api_key: string;
    is_active: boolean;
    status_type: string;
    created_at: string;
}

export interface SystemStatusResponse {
    statuses: SystemStatus[];
}

export interface CreateSystemStatusRequest {
    api_key: string;
    is_active: boolean;
    status_type: string;
}

