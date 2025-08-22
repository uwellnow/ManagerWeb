import { apiClient } from './client';
import type { StocksSummaryResponse } from '../types/DTO/stocksSummaryResponseDto';

export const stocksApi = {
    async getStocksSummary(): Promise<StocksSummaryResponse> {
        return apiClient.get<StocksSummaryResponse>('/stocks/summary');
    }
};
