export interface StoreData {
    id: number;
    store_code: string;
    store_name: string;
    created_at: string;
    updated_at: string;
}

export type StoreResponse = StoreData[];
