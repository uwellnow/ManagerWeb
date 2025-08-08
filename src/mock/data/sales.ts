import type {SalesGraphResponseDto, SalesResponseDto} from "../../types/DTO/SalesResponseDto.ts";


export const mockSalesResponse: SalesResponseDto[] = [
    {
        "storeName": "멋짐",
        "updatedAt": "2025-08-08T20:35:00",
        "totalSales": 4020,
        "daySales": 403,
        "weekSales": 800,
        "monthSales": 1200,
        "errorCount": 3,
    },
    {
        "storeName": "인트로피트니스",
        "updatedAt": "2025-08-04T20:35:00",
        "totalSales": 4020,
        "daySales": 403,
        "weekSales": 800,
        "monthSales": 1200,
        "errorCount": 3,
    },
]

export const mockSalesGraphResponse: SalesGraphResponseDto[] = [
    {
        "storeName": "멋짐",
        "updatedAt": "2025-08-04T20:48:00",
        "salesCountHour": [8,9,10,11,12,13,14,15],
        "salesCount":[15,30,23,15,10,5,25,45]
    },
    {
        "storeName": "인트로피트니스",
        "updatedAt": "2025-08-04T20:48:00",
        "salesCountHour": [8,9,10,11,12,13,14,15],
        "salesCount":[15,30,23,15,10,5,25,45]
    },
]