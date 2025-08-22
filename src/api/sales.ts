import { apiClient } from './client';
import type { SalesResponse } from '../types/DTO/SalesResponseDto.ts';

export const salesApi = {
    async getSales(): Promise<SalesResponse> {
        return apiClient.get<SalesResponse>('/sales');
    }
};
