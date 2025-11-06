import { apiClient } from './client';
import type { StocksSummaryResponse } from '../types/DTO/stocksSummaryResponseDto';
import type { StockResponse, RestockRequest, ProductData, StockLogResponse, StorageStockResponse, StorageRestockRequest } from '../types/DTO/StockResponseDto';

export const stocksApi = {
    async getStocksSummary(): Promise<StocksSummaryResponse> {
        return apiClient.get<StocksSummaryResponse>('/stocks/summary');
    },
    
    async getStocks(): Promise<StockResponse> {
        return apiClient.get<StockResponse>('/stocks');
    },

    async getProducts(): Promise<ProductData[]> {
        return apiClient.get<ProductData[]>('/products');
    },

    async getStockLogs(): Promise<StockLogResponse> {
        return apiClient.get<StockLogResponse>('/logs/stock');
    },

    async restockStock(request: RestockRequest): Promise<void> {
        return apiClient.post<void>('/stocks/restock', request);
    },

    async getStorageStocks(): Promise<StorageStockResponse> {
        return apiClient.get<StorageStockResponse>('/stocks/storage');
    },

    async restockStorageStock(request: StorageRestockRequest): Promise<void> {
        return apiClient.post<void>('/stocks/storage/restock', request);
    }
};
