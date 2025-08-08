import {http, HttpResponse} from 'msw';
import {mockSalesGraphResponse, mockSalesResponse} from "../data/sales.ts";


export const salesHandler = [
    http.get(`/api/:date/sales`, () => {
        return HttpResponse.json(mockSalesResponse);
})]

export const salesGraphHandler = [
    http.get(`/api/:date/:storeId/sales/hourly`, () => {
        return HttpResponse.json(mockSalesGraphResponse);
    })
]