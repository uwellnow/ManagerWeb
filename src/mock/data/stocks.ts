import type {StocksSummaryResponse} from "../../types/DTO/stocksSummaryResponseDto.ts";

export const mockStocksSummaryResponse : StocksSummaryResponse = {
    "멋짐": [
        {
            productName: "정수",
            productStatus: "품절"
        },
        {
            productName: "얼티밋포텐셜 EAA 사과맛",
            productStatus: "위험"
        }
    ],
    "인트로피트니스": [
        {
            productName: "삼대오백 BCAA 망고맛",
            productStatus: "안전"
        }
    ]
}