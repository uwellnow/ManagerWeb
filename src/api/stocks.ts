import { apiClient } from './client';
import type { StocksSummaryResponse } from '../types/DTO/stocksSummaryResponseDto';
import type { StockResponse, RestockRequest } from '../types/DTO/StockResponseDto';

export const stocksApi = {
    async getStocksSummary(): Promise<StocksSummaryResponse> {
        return apiClient.get<StocksSummaryResponse>('/stocks/summary');
    },
    
    async getStocks(): Promise<StockResponse> {
        return apiClient.get<StockResponse>('/stocks');
    },

    async restockStock(request: RestockRequest): Promise<void> {
        return apiClient.post<void>('/stocks/restock', request);
    }
};
