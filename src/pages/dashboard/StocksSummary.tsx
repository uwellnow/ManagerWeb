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
        <div className="h-64 lg:h-72 flex flex-col p-3 lg:p-6 bg-white rounded-xl lg:rounded-2xl">
            <div className="flex-col items-center mb-2 lg:mb-3">
                <h2 className="text-base lg:text-lg mb-1 text-grayBlue font-semibold">{storeName} 재고 요약</h2>
                <div className="text-sm lg:text-base text-textGray p-1 lg:p-2" >제품명</div>
            </div>

            <div className="flex flex-col gap-1 lg:gap-1.5 px-2 overflow-y-auto flex-1">
                {products.map((product, idx) => (
                    <div
                        key={idx}
                        className="py-1.5 lg:py-2 flex justify-between items-center text-xs lg:text-sm text-gray-700 border-t border-gray-100 pb-1">
                        <span className="flex-1 pr-2">{product.productName.replace(/\\n/g, ' ')}</span>
                        <span className={`px-2 lg:px-3 py-0.5 lg:py-1 rounded-lg text-xs lg:text-sm font-medium border whitespace-nowrap ${statusColor[product.productStatus]}`}>
                            {product.productStatus}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

export default StocksSummary;