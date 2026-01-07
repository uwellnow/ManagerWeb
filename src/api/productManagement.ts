import { apiClient } from './client';
import type { ProductAllInfo, ProductsAllUpdateRequest } from '../types/DTO/ProductManagementDto';

export const productManagementApi = {
    async getAllProducts(): Promise<ProductAllInfo[]> {
        return apiClient.get<ProductAllInfo[]>('/products/all');
    },

    async updateProducts(request: ProductsAllUpdateRequest): Promise<void> {
        return apiClient.post<void>('/products/all', request);
    }
};

