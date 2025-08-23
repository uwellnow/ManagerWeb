import { apiClient } from './client';
import type { ErrorLogResponse } from '../types/DTO/ErrorLogResponseDto';

export const errorLogsApi = {
    getErrorLogs: (): Promise<ErrorLogResponse> => {
        return apiClient.get<ErrorLogResponse>('/log/kiosk?error_type=ERROR&limit=100');
    }
};
