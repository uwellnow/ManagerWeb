import type {StocksSummaryResponseDto} from "../../types/DTO/stocksSummaryResponseDto.ts";

export const mockStocksSummaryResponse : StocksSummaryResponseDto[] = [
    {
        "storeName": "멋짐",
        "productName": ["정수", "얼티밋포텐셜 EAA 사과맛"],
        "productStatus":  ["품절", "위험"]
    },
    {
        "storeName": "인트로피트니스",
        "productName": ["삼대오백 BCAA 망고맛"],
        "productStatus": ["안전"]
    },
]