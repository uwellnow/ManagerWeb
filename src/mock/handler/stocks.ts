import {http, HttpResponse} from "msw";
import {mockStocksSummaryResponse} from "../data/stocks.ts";


export const stocksSummaryHandler = [
    http.get(`/api/stocks/summary`, () => {
        return HttpResponse.json(mockStocksSummaryResponse)
    })
]