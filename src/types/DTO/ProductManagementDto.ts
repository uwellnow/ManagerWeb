// GET /api/products/all 응답
export interface ProductAllInfo {
    productId: number;
    productName: string;
    powderSec: number;
    waterAmount: number;
    oneCapacity: number | null;
    storeName: string;
    cartridgeIndex: number;
    productImage?: string | null;
    companyImage?: string | null;
    timing?: string | null;
    description?: string | null;
    descriptionEng?: string | null;
    nutritionInfo?: string | null;
    nutritionInfoEng?: string | null;
}

// POST /api/products/all - 제품 생성 아이템
export interface ProductCreateItem {
    name: string;
    nameEng: string;
    timing?: string | null;
    description?: string | null;
    descriptionEng?: string | null;
    nutritionInfo?: string | null;
    nutritionInfoEng?: string | null;
    companyImagePath?: string | null;
    productImagePath?: string | null;
    oneCapacity?: number | null;
    powderSec: number;
    waterAmount: number;
}

// POST /api/products/all - 제품 정보 수정 아이템
export interface ProductInfoUpdateItem {
    productId: number;
    powderSec: number;
    waterAmount: number;
}

// POST /api/products/all - 카트리지 매핑 아이템
export interface CartridgeMappingItem {
    storeName: string;
    productId: number;
    cartridgeIndex: number;
}

// POST /api/products/all 통합 요청
export type ProductsAllUpdateRequest = 
    | {
        type: "create_product";
        items: ProductCreateItem[];
    }
    | {
        type: "update_product_info";
        items: ProductInfoUpdateItem[];
    }
    | {
        type: "update_cartridge_mapping";
        items: CartridgeMappingItem[];
    };

// 제품 기본 정보 (중복 제거된 제품 목록)
export interface ProductBaseInfo {
    productId: number;
    productName: string;
    productImage: string | null;
    companyImage: string | null;
    oneCapacity: number | null;
    powderSec: number;
    waterAmount: number;
    timing: string | null;
    description: string | null;
    descriptionEng: string | null;
    nutritionInfo: string | null;
    nutritionInfoEng: string | null;
}

