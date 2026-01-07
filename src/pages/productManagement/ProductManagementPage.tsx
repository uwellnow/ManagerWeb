import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { productManagementApi } from "../../api/productManagement";
import type { ProductAllInfo, ProductBaseInfo, ProductInfoUpdateItem } from "../../types/DTO/ProductManagementDto";

const ProductManagementPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [products, setProducts] = useState<ProductAllInfo[]>([]);
    const [baseProducts, setBaseProducts] = useState<ProductBaseInfo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isError, setIsError] = useState(false);
    const [activeTab, setActiveTab] = useState<"products" | "cartridge">("products");
    
    // 제품 상세 모달
    const [selectedProduct, setSelectedProduct] = useState<ProductBaseInfo | null>(null);
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    
    // 매장별 카트리지 관리
    const [selectedStore, setSelectedStore] = useState<string>("");
    const [cartridgeProducts, setCartridgeProducts] = useState<(ProductAllInfo | null)[]>(new Array(7).fill(null));
    const [draggedProduct, setDraggedProduct] = useState<ProductAllInfo | null>(null);
    const [draggedIndex, setDraggedIndex] = useState<number>(-1);
    
    // 검색
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    useEffect(() => {
        const fetchProducts = async () => {
            if (!isAuthenticated) return;
            
            try {
                setIsLoading(true);
                setIsError(false);
                const data = await productManagementApi.getAllProducts();
                setProducts(data);
                
                // 중복 제거하여 기본 제품 정보 생성
                const uniqueProducts = new Map<number, ProductBaseInfo>();
                data.forEach(product => {
                    if (!uniqueProducts.has(product.productId)) {
                        // 첫 번째 매장의 정보를 기본으로 사용
                        uniqueProducts.set(product.productId, {
                            productId: product.productId,
                            productName: product.productName,
                            productImage: product.productImage || null,
                            companyImage: product.companyImage || null,
                            oneCapacity: product.oneCapacity,
                            powderSec: product.powderSec,
                            waterAmount: product.waterAmount,
                            timing: product.timing || null,
                            description: product.description || null,
                            descriptionEng: product.descriptionEng || null,
                            nutritionInfo: product.nutritionInfo || null,
                            nutritionInfoEng: product.nutritionInfoEng || null
                        });
                    }
                });
                setBaseProducts(Array.from(uniqueProducts.values()));
            } catch (error) {
                console.error('Failed to fetch products:', error);
                setIsError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchProducts();
    }, [isAuthenticated]);

    // 매장 목록 추출
    const storeList = Array.from(new Set(products.map(p => p.storeName))).sort();

    // 매장 선택 시 카트리지 상태 업데이트
    useEffect(() => {
        if (selectedStore) {
            const storeProducts = products.filter(p => p.storeName === selectedStore);
            const newCartridgeProducts: (ProductAllInfo | null)[] = new Array(7).fill(null);
            storeProducts.forEach(product => {
                if (product.cartridgeIndex >= 0 && product.cartridgeIndex < 7) {
                    newCartridgeProducts[product.cartridgeIndex] = product;
                }
            });
            setCartridgeProducts(newCartridgeProducts);
        }
    }, [selectedStore, products]);

    // 제품명 포맷팅 함수 (\\n을 실제 줄바꿈으로 변환)
    const formatProductName = (name: string): string => {
        return name.replace(/\\n/g, '\n');
    };

    // 필터링된 제품 목록
    const filteredProducts = baseProducts.filter(product =>
        product.productName.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // 제품 클릭 핸들러
    const handleProductClick = (product: ProductBaseInfo) => {
        setSelectedProduct(product);
        setIsProductModalOpen(true);
        setIsEditMode(false);
    };

    // 제품 수정 저장
    const handleProductUpdate = async (updatedProduct: ProductBaseInfo) => {
        if (!selectedProduct) return;

        try {
            const updateItem: ProductInfoUpdateItem = {
                productId: updatedProduct.productId,
                powderSec: updatedProduct.powderSec,
                waterAmount: updatedProduct.waterAmount
            };

            await productManagementApi.updateProducts({
                type: "update_product_info",
                items: [updateItem]
            });

            // 로컬 상태 업데이트
            setBaseProducts(prev => prev.map(p => 
                p.productId === updatedProduct.productId ? updatedProduct : p
            ));
            setProducts(prev => prev.map(p => 
                p.productId === updatedProduct.productId 
                    ? { ...p, powderSec: updatedProduct.powderSec, waterAmount: updatedProduct.waterAmount }
                    : p
            ));

            setIsEditMode(false);
            alert("제품 정보가 수정되었습니다.");
        } catch (error) {
            console.error('Failed to update product:', error);
            alert("제품 정보 수정에 실패했습니다.");
        }
    };

    // 드래그 시작
    const handleDragStart = (product: ProductAllInfo | ProductBaseInfo, index: number) => {
        // ProductBaseInfo인 경우 ProductAllInfo로 변환
        if ('storeName' in product) {
            setDraggedProduct(product as ProductAllInfo);
        } else {
            // baseProduct인 경우 해당 매장의 제품 정보 찾기
            const storeProduct = products.find(
                p => p.productId === product.productId && p.storeName === selectedStore
            );
            if (storeProduct) {
                setDraggedProduct(storeProduct);
            } else {
                // 매장에 없는 제품이면 새로 생성
                setDraggedProduct({
                    productId: product.productId,
                    productName: product.productName,
                    powderSec: product.powderSec,
                    waterAmount: product.waterAmount,
                    oneCapacity: product.oneCapacity,
                    storeName: selectedStore,
                    cartridgeIndex: -1
                } as ProductAllInfo);
            }
        }
        setDraggedIndex(index);
    };

    // 드롭
    const handleDrop = async (targetIndex: number) => {
        if (!draggedProduct || !selectedStore) return;

        // 같은 위치면 무시
        if (draggedIndex === targetIndex) {
            setDraggedProduct(null);
            setDraggedIndex(-1);
            return;
        }

        // 타겟 인덱스에 이미 제품이 있는지 확인
        const existingProduct = cartridgeProducts[targetIndex];
        
        // 기존 제품이 있으면 교체 확인
        if (existingProduct && existingProduct.productId !== draggedProduct.productId) {
            const confirmReplace = window.confirm(
                `인덱스 ${targetIndex}에 이미 다른 제품이 있습니다. 교체하시겠습니까?`
            );
            if (!confirmReplace) {
                setDraggedProduct(null);
                setDraggedIndex(-1);
                return;
            }
        }

        try {
            // 카트리지 매핑 업데이트
            // 로컬 상태를 먼저 업데이트하여 최종 상태 계산
            const newCartridgeProducts = [...cartridgeProducts];
            
            // 기존 제품이 있고 다른 제품이면 교환
            if (existingProduct && existingProduct.productId !== draggedProduct.productId) {
                // 원래 위치에 기존 제품 배치
                if (draggedIndex >= 0 && draggedIndex < 7) {
                    newCartridgeProducts[draggedIndex] = existingProduct;
                }
                // 타겟 위치에 드래그한 제품 배치
                newCartridgeProducts[targetIndex] = draggedProduct;
            } else {
                // 기존 제품이 없거나 같은 제품이면 단순 이동
                if (draggedIndex >= 0 && draggedIndex < 7) {
                    newCartridgeProducts[draggedIndex] = null;
                }
                newCartridgeProducts[targetIndex] = draggedProduct;
            }

            // 모든 인덱스에 대한 매핑 정보 생성 (0~6번 인덱스)
            const mappingItems = newCartridgeProducts
                .map((product, index) => {
                    if (product) {
                        return {
                            storeName: selectedStore,
                            productId: product.productId,
                            cartridgeIndex: index
                        };
                    }
                    return null;
                })
                .filter((item): item is { storeName: string; productId: number; cartridgeIndex: number } => item !== null);

            // 한 번의 API 호출로 모든 인덱스 매핑 업데이트
            await productManagementApi.updateProducts({
                type: "update_cartridge_mapping",
                items: mappingItems
            });

            // 로컬 상태 업데이트
            setCartridgeProducts(newCartridgeProducts);

            // products 상태도 업데이트
            setProducts(prev => {
                // 드래그한 제품과 기존 제품 제거
                const filtered = prev.filter(p => 
                    !(p.productId === draggedProduct.productId && p.storeName === selectedStore) &&
                    !(existingProduct && p.productId === existingProduct.productId && p.storeName === selectedStore)
                );
                
                // 드래그한 제품을 새 위치에 추가
                filtered.push({
                    ...draggedProduct,
                    cartridgeIndex: targetIndex
                });
                
                // 기존 제품이 있고 다른 제품이면 원래 위치에 추가
                if (existingProduct && existingProduct.productId !== draggedProduct.productId) {
                    filtered.push({
                        ...existingProduct,
                        cartridgeIndex: draggedIndex >= 0 && draggedIndex < 7 ? draggedIndex : -1
                    });
                }
                
                return filtered;
            });
            
            // 데이터 다시 불러오기
            const refreshedData = await productManagementApi.getAllProducts();
            setProducts(refreshedData);
            
            // baseProducts도 업데이트
            const uniqueProducts = new Map<number, ProductBaseInfo>();
            refreshedData.forEach(product => {
                if (!uniqueProducts.has(product.productId)) {
                    uniqueProducts.set(product.productId, {
                        productId: product.productId,
                        productName: product.productName,
                        productImage: product.productImage || null,
                        companyImage: product.companyImage || null,
                        oneCapacity: product.oneCapacity,
                        powderSec: product.powderSec,
                        waterAmount: product.waterAmount,
                        timing: product.timing || null,
                        description: product.description || null,
                        descriptionEng: product.descriptionEng || null,
                        nutritionInfo: product.nutritionInfo || null,
                        nutritionInfoEng: product.nutritionInfoEng || null
                    });
                }
            });
            setBaseProducts(Array.from(uniqueProducts.values()));

            alert("카트리지 매핑이 업데이트되었습니다.");
        } catch (error) {
            console.error('Failed to update cartridge mapping:', error);
            alert("카트리지 매핑 업데이트에 실패했습니다.");
        } finally {
            setDraggedProduct(null);
            setDraggedIndex(-1);
        }
    };

    // 드래그 오버
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    if (!isAuthenticated) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="w-8 h-8 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 border-4 border-mainRed border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm sm:text-base lg:text-lg text-gray-600">제품 데이터를 불러오는 중...</span>
                </div>
            </div>
        );
    }

    if (isError) {
        return (
            <div className="flex items-center justify-center min-h-screen p-4">
                <div className="text-center max-w-md">
                    <div className="text-red-500 text-lg sm:text-xl lg:text-2xl font-semibold mb-3">데이터 로드 실패</div>
                    <div className="text-gray-600 text-sm sm:text-base lg:text-lg">제품 데이터를 불러오지 못했습니다. 다시 시도해주세요.</div>
                </div>
            </div>
        );
    }

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 헤더 */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-4">
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">제품 관리</h2>
                <button
                    onClick={() => navigate('/product-management/register')}
                    className="px-4 py-2 bg-mainRed text-white rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                >
                    제품 등록
                </button>
            </div>

            {/* 탭 */}
            <div className="flex gap-2 mb-4 sm:mb-6 bg-white rounded-lg sm:rounded-xl p-1 shadow-sm">
                <button
                    onClick={() => setActiveTab("products")}
                    className={`flex-1 px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
                        activeTab === "products"
                            ? 'bg-mainRed text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    제품 정보 관리
                </button>
                <button
                    onClick={() => setActiveTab("cartridge")}
                    className={`flex-1 px-4 py-2 rounded-md text-sm sm:text-base font-medium transition-colors ${
                        activeTab === "cartridge"
                            ? 'bg-mainRed text-white'
                            : 'text-gray-600 hover:bg-gray-100'
                    }`}
                >
                    매장별 카트리지 관리
                </button>
            </div>

            {/* 제품 정보 관리 섹션 */}
            {activeTab === "products" && (
                <div>
                    {/* 검색 */}
                    <div className="mb-4 sm:mb-6">
                        <input
                            type="text"
                            placeholder="제품명으로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                        />
                    </div>

                    {/* 제품 그리드 */}
                    <div className="grid grid-cols-7 gap-3 sm:gap-4">
                        {filteredProducts.map((product) => (
                            <div
                                key={product.productId}
                                onClick={() => handleProductClick(product)}
                                className="bg-white rounded-lg shadow-sm p-3 cursor-pointer hover:shadow-md transition-shadow"
                            >
                                <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                    {product.productImage ? (
                                        <img
                                            src={product.productImage}
                                            alt={product.productName}
                                            className="w-full h-full object-contain"
                                            loading="lazy"
                                            decoding="async"
                                            key={product.productImage}
                                        />
                                    ) : (
                                        <span className="text-gray-400 text-xs">이미지 없음</span>
                                    )}
                                </div>
                                <div className="text-xs sm:text-sm font-medium text-gray-900 text-center whitespace-pre-line">
                                    {formatProductName(product.productName)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 매장별 카트리지 관리 섹션 */}
            {activeTab === "cartridge" && (
                <div>
                    {/* 매장 선택 */}
                    <div className="mb-4 sm:mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">매장 선택</label>
                        <select
                            value={selectedStore}
                            onChange={(e) => setSelectedStore(e.target.value)}
                            className="w-full sm:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base bg-gray-100"
                        >
                            <option value="">매장을 선택하세요</option>
                            {storeList.map(store => (
                                <option key={store} value={store}>{store}</option>
                            ))}
                        </select>
                    </div>

                    {selectedStore && (
                        <>
                            {/* 카트리지 그리드 */}
                            <div className="grid grid-cols-7 gap-3 sm:gap-4 mb-6">
                                {cartridgeProducts.map((product, index) => (
                                    <div
                                        key={index}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            handleDrop(index);
                                        }}
                                        onDragOver={handleDragOver}
                                        className={`bg-white rounded-lg shadow-sm p-3 min-h-[120px] flex flex-col items-center justify-center ${
                                            product ? 'cursor-move' : 'border-2 border-dashed border-gray-300'
                                        }`}
                                    >
                                        <div className="text-xs text-gray-500 mb-2">인덱스 {index}</div>
                                        {product ? (() => {
                                            const baseProduct = baseProducts.find(p => p.productId === product.productId);
                                            return (
                                                <div
                                                    draggable
                                                    onDragStart={() => handleDragStart(product, index)}
                                                    className="w-full"
                                                >
                                                    <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                                        {baseProduct?.productImage ? (
                                                            <img
                                                                src={baseProduct.productImage}
                                                                alt={product.productName}
                                                                className="w-full h-full object-contain"
                                                                loading="lazy"
                                                                decoding="async"
                                                                key={baseProduct.productImage}
                                                            />
                                                        ) : (
                                                            <span className="text-gray-400 text-xs">이미지 없음</span>
                                                        )}
                                                    </div>
                                                    <div className="text-xs font-medium text-gray-900 text-center whitespace-pre-line">
                                                        {formatProductName(product.productName)}
                                                    </div>
                                                </div>
                                            );
                                        })() : (
                                            <span className="text-gray-400 text-xs">비어있음</span>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* 등록되지 않은 제품 목록 */}
                            <div>
                                <h3 className="text-sm sm:text-base font-medium text-gray-700 mb-3">등록되지 않은 제품</h3>
                                <div className="grid grid-cols-7 gap-3 sm:gap-4">
                                    {baseProducts
                                        .filter(product => {
                                            const storeProduct = products.find(
                                                p => p.productId === product.productId && p.storeName === selectedStore
                                            );
                                            return !storeProduct || storeProduct.cartridgeIndex < 0 || storeProduct.cartridgeIndex >= 7;
                                        })
                                        .map((product) => (
                                            <div
                                                key={product.productId}
                                                draggable
                                                onDragStart={() => handleDragStart(product, -1)}
                                                className="bg-white rounded-lg shadow-sm p-3 cursor-move hover:shadow-md transition-shadow"
                                            >
                                                <div className="aspect-square bg-gray-100 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
                                                    {product.productImage ? (
                                                        <img
                                                            src={product.productImage}
                                                            alt={product.productName}
                                                            className="w-full h-full object-contain"
                                                            loading="lazy"
                                                            decoding="async"
                                                            key={product.productImage}
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">이미지 없음</span>
                                                    )}
                                                </div>
                                                <div className="text-xs font-medium text-gray-900 text-center whitespace-pre-line">
                                                    {formatProductName(product.productName)}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* 제품 상세 모달 */}
            {isProductModalOpen && selectedProduct && (
                <ProductDetailModal
                    product={selectedProduct}
                    isEditMode={isEditMode}
                    onClose={() => {
                        setIsProductModalOpen(false);
                        setSelectedProduct(null);
                        setIsEditMode(false);
                    }}
                    onEdit={() => setIsEditMode(true)}
                    onSave={handleProductUpdate}
                />
            )}
        </div>
    );
};

// 제품 상세 모달 컴포넌트
interface ProductDetailModalProps {
    product: ProductBaseInfo;
    isEditMode: boolean;
    onClose: () => void;
    onEdit: () => void;
    onSave: (product: ProductBaseInfo) => void;
}

const ProductDetailModal = ({ product, isEditMode, onClose, onEdit, onSave }: ProductDetailModalProps) => {
    const [editedProduct, setEditedProduct] = useState<ProductBaseInfo>(product);

    // 제품명 포맷팅 함수 (\\n을 실제 줄바꿈으로 변환)
    const formatProductName = (name: string): string => {
        return name.replace(/\\n/g, '\n');
    };

    useEffect(() => {
        setEditedProduct(product);
    }, [product]);

    const handleSave = () => {
        onSave(editedProduct);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 sm:mb-6">
                    <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">제품 상세 정보</h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="overflow-y-auto flex-1 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* 이미지 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">제품 이미지</label>
                            <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                                {editedProduct.productImage ? (
                                    <img
                                        src={editedProduct.productImage}
                                        alt={editedProduct.productName}
                                        className="w-full h-full object-contain"
                                        loading="eager"
                                        decoding="async"
                                        key={editedProduct.productImage}
                                    />
                                ) : (
                                    <span className="text-gray-400">이미지 없음</span>
                                )}
                            </div>
                        </div>

                        {/* 제품 정보 */}
                        <div className="space-y-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제품명</label>
                                <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm whitespace-pre-line">
                                    {formatProductName(editedProduct.productName)}
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Powder Sec</label>
                                <input
                                    type="number"
                                    value={editedProduct.powderSec}
                                    onChange={(e) => setEditedProduct({ ...editedProduct, powderSec: parseInt(e.target.value) || 0 })}
                                    disabled={!isEditMode}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Water Amount</label>
                                <input
                                    type="number"
                                    value={editedProduct.waterAmount}
                                    onChange={(e) => setEditedProduct({ ...editedProduct, waterAmount: parseInt(e.target.value) || 0 })}
                                    disabled={!isEditMode}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 text-sm disabled:bg-gray-50"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">One Capacity</label>
                                <input
                                    type="number"
                                    value={editedProduct.oneCapacity || ""}
                                    disabled
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 text-sm"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-4 sm:mt-6 flex gap-2">
                    {isEditMode ? (
                        <>
                            <button
                                onClick={handleSave}
                                className="flex-1 bg-mainRed text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                            >
                                저장
                            </button>
                            <button
                                onClick={() => {
                                    setEditedProduct(product);
                                    onClose();
                                }}
                                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
                            >
                                취소
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={onEdit}
                                className="flex-1 bg-mainRed text-white py-2 px-4 rounded-lg hover:bg-red-700 transition-colors text-sm sm:text-base font-medium"
                            >
                                수정
                            </button>
                            <button
                                onClick={onClose}
                                className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
                            >
                                닫기
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProductManagementPage;

