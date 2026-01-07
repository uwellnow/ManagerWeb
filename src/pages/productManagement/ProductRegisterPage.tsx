import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { productManagementApi } from "../../api/productManagement";
import type { ProductCreateItem } from "../../types/DTO/ProductManagementDto";

const ProductRegisterPage = () => {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [formData, setFormData] = useState<ProductCreateItem>({
        name: "",
        nameEng: "",
        timing: null,
        description: null,
        descriptionEng: null,
        nutritionInfo: null,
        nutritionInfoEng: null,
        companyImagePath: null,
        productImagePath: null,
        oneCapacity: null,
        powderSec: 0,
        waterAmount: 0
    });

    const [companyImagePreview, setCompanyImagePreview] = useState<string | null>(null);
    const [productImagePreview, setProductImagePreview] = useState<string | null>(null);

    if (!isAuthenticated) {
        navigate('/');
        return null;
    }

    const handleInputChange = (field: keyof ProductCreateItem, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleImageChange = (type: "company" | "product", file: File | null) => {
        if (file) {
            // 미리보기 생성
            const reader = new FileReader();
            reader.onloadend = () => {
                if (type === "company") {
                    setCompanyImagePreview(reader.result as string);
                    // 실제로는 백엔드에 업로드하고 경로를 받아야 함
                    // 여기서는 임시로 base64를 사용하거나 별도 업로드 API 호출 필요
                } else {
                    setProductImagePreview(reader.result as string);
                }
            };
            reader.readAsDataURL(file);
        } else {
            if (type === "company") {
                setCompanyImagePreview(null);
                handleInputChange("companyImagePath", null);
            } else {
                setProductImagePreview(null);
                handleInputChange("productImagePath", null);
            }
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!formData.name || !formData.nameEng) {
            alert("제품명(한글/영문)을 입력해주세요.");
            return;
        }

        if (formData.powderSec < 0 || formData.waterAmount < 0) {
            alert("Powder Sec와 Water Amount는 0 이상이어야 합니다.");
            return;
        }

        try {
            setIsSubmitting(true);
            
            // 이미지 업로드가 필요한 경우 여기서 처리
            // 현재는 경로만 전송하는 것으로 가정
            // 실제로는 FormData로 이미지를 먼저 업로드하고 경로를 받아야 함
            
            await productManagementApi.updateProducts({
                type: "create_product",
                items: [formData]
            });

            alert("제품이 등록되었습니다.");
            navigate('/product-management');
        } catch (error) {
            console.error('Failed to register product:', error);
            alert("제품 등록에 실패했습니다. 다시 시도해주세요.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex-1 p-3 sm:p-4 lg:p-6">
            {/* 헤더 */}
            <div className="flex items-center gap-4 mb-4 sm:mb-6">
                <button
                    onClick={() => navigate('/product-management')}
                    className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-gray-900">제품 등록</h2>
            </div>

            <form onSubmit={handleSubmit} className="bg-white rounded-lg sm:rounded-xl p-4 sm:p-6 shadow-sm max-w-3xl">
                <div className="space-y-6">
                    {/* 기본 정보 */}
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">기본 정보</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    제품명 (한글) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => handleInputChange("name", e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    제품명 (영문) <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={formData.nameEng}
                                    onChange={(e) => handleInputChange("nameEng", e.target.value)}
                                    required
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">타이밍</label>
                                <select
                                    value={formData.timing || ""}
                                    onChange={(e) => handleInputChange("timing", e.target.value || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base bg-gray-100"
                                >
                                    <option value="">선택 안함</option>
                                    <option value="before">운동 전</option>
                                    <option value="during">운동 중</option>
                                    <option value="after">운동 후</option>
                                    <option value="재고관리">재고관리</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 설명 */}
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">설명</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">설명 (한글)</label>
                                <textarea
                                    value={formData.description || ""}
                                    onChange={(e) => handleInputChange("description", e.target.value || null)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">설명 (영문)</label>
                                <textarea
                                    value={formData.descriptionEng || ""}
                                    onChange={(e) => handleInputChange("descriptionEng", e.target.value || null)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 영양 정보 */}
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">영양 정보</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">영양 정보 (한글)</label>
                                <textarea
                                    value={formData.nutritionInfo || ""}
                                    onChange={(e) => handleInputChange("nutritionInfo", e.target.value || null)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">영양 정보 (영문)</label>
                                <textarea
                                    value={formData.nutritionInfoEng || ""}
                                    onChange={(e) => handleInputChange("nutritionInfoEng", e.target.value || null)}
                                    rows={3}
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base resize-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* 이미지 */}
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">이미지</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">회사 이미지</label>
                                <p className="text-xs text-gray-500 mb-2">피그마에서 '4x'로 export 해주세요</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange("company", e.target.files?.[0] || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                                {companyImagePreview && (
                                    <div className="mt-2">
                                        <img
                                            src={companyImagePreview}
                                            alt="회사 이미지 미리보기"
                                            className="max-w-xs h-auto rounded-lg"
                                        />
                                    </div>
                                )}
                                <p className="text-xs text-gray-500 mt-2">
                                    이미지 업로드 방법: 백엔드 서버에 이미지를 먼저 업로드하고 반환된 경로를 입력하거나, 
                                    별도의 이미지 업로드 API를 사용하세요. (FormData를 사용하여 multipart/form-data로 전송)
                                </p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">제품 이미지</label>
                                <p className="text-xs text-gray-500 mb-2">피그마에서 '4x'로 export 해주세요</p>
                                <input
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => handleImageChange("product", e.target.files?.[0] || null)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                                {productImagePreview && (
                                    <div className="mt-2">
                                        <img
                                            src={productImagePreview}
                                            alt="제품 이미지 미리보기"
                                            className="max-w-xs h-auto rounded-lg"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 제품 설정 */}
                    <div>
                        <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-4">제품 설정</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">One Capacity</label>
                                <input
                                    type="number"
                                    value={formData.oneCapacity || ""}
                                    onChange={(e) => handleInputChange("oneCapacity", e.target.value ? parseInt(e.target.value) : null)}
                                    min="0"
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Powder Sec <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.powderSec}
                                    onChange={(e) => handleInputChange("powderSec", parseInt(e.target.value) || 0)}
                                    min="0"
                                    required
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Water Amount <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="number"
                                    value={formData.waterAmount}
                                    onChange={(e) => handleInputChange("waterAmount", parseInt(e.target.value) || 0)}
                                    min="0"
                                    required
                                    className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-mainRed focus:border-transparent text-sm sm:text-base"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-6 flex gap-3">
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 bg-mainRed text-white py-2 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm sm:text-base font-medium"
                    >
                        {isSubmitting ? '등록 중...' : '등록'}
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate('/product-management')}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors text-sm sm:text-base font-medium"
                    >
                        취소
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProductRegisterPage;

