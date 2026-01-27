import { apiClient } from './client';
import type { StoreResponse } from '../types/DTO/StoreResponseDto';

export const storesApi = {
    async getStores(): Promise<StoreResponse> {
        return apiClient.get<StoreResponse>('/stores');
    }
};
