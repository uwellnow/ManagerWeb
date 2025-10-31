import { apiClient } from './client';
import type { SystemStatus, SystemStatusResponse, CreateSystemStatusRequest } from '../types/DTO/SystemStatusResponseDto';

export const systemStatusApi = {
    // 시스템 상태 목록 조회 (배열 또는 객체 응답 모두 처리)
    getSystemStatuses: async (): Promise<SystemStatusResponse | SystemStatus[]> => {
        return apiClient.get<SystemStatusResponse | SystemStatus[]>('/system-status');
    },

    // 시스템 상태 업데이트 (PUT /system-status/{status_id})
    updateSystemStatus: async (statusId: number, statusData: CreateSystemStatusRequest): Promise<void> => {
        return apiClient.put(`/system-status/${statusId}`, statusData);
    },
};

