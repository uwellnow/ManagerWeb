import { apiClient } from './client';
import type { OrderResponse } from '../types/DTO/OrderResponseDto';

export const ordersApi = {
    async getOrders(): Promise<OrderResponse> {
        return apiClient.get<OrderResponse>('/orders');
    }
};
