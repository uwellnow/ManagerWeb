import type { StockProduct } from "../../types/DTO/stocksSummaryResponseDto.ts";

interface StocksSummaryProps {
    storeName: string;
    products: StockProduct[];
}

const statusColor: Record<string, string> = {
    품절: "bg-gray-200 text-gray-600 border-gray-600",
    위험: "bg-red-100 text-red-500 border-red-500",
    주의: "bg-orange-100 text-orange-500 border-orange-500",
    안전: "bg-green-100 text-green-500 border-green-500",
}

const StocksSummary = ({storeName, products}: StocksSummaryProps) => {
    return(
        <div className="h-[338px] flex flex-col p-8 bg-white rounded-2xl">
            <div className="flex-col items-center mb-3">
                <h2 className="text-xl mb-1 text-grayBlue font-semibold">{storeName} 재고 요약</h2>
                <div className="text-base text-textGray p-2" >제품명</div>
            </div>

            <div className="flex flex-col gap-2 px-2 overflow-y-auto">
                {products.map((product, idx) => (
                    <div
                        key={idx}
                        className="py-4 flex justify-between items-center text-sm text-gray-700 border-t border-gray-100 pb-1">
                        <span className="flex-1 pr-2">{product.productName.replace(/\\n/g, ' ')}</span>
                        <span className={`px-3 py-1 rounded-lg text-sm font-medium border whitespace-nowrap ${statusColor[product.productStatus]}`}>
                            {product.productStatus}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default StocksSummary;