import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { OrderData } from '../types/DTO/OrderResponseDto';

// 주문 데이터를 엑셀 형식으로 변환하는 함수
export const exportOrdersToExcel = (orders: OrderData[], selectedStore: string) => {
    // 엑셀에 들어갈 데이터 준비
    const excelData = orders.map((order, index) => ({
        '번호': index + 1,
        '제품명': order.product_name.replace(/\\n/g, ' '),
        '매장명': order.store_name,
        '운동 시점': order.product_time,
        '주문 시간': formatOrderTime(order.order_time),
        '사용자': order.user_name,
        '멤버십 사용': `${order.total_count_at_purchase - order.remain_count_after_purchase}/${order.total_count_at_purchase}`,
        '결제 상태': '완료'
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    const columnWidths = [
        { wch: 5 },   // 번호
        { wch: 30 },  // 제품명
        { wch: 15 },  // 매장명
        { wch: 10 },  // 운동 시점
        { wch: 20 },  // 주문 시간
        { wch: 10 },  // 사용자
        { wch: 12 },  // 멤버십 사용
        { wch: 10 }   // 결제 상태
    ];
    worksheet['!cols'] = columnWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '주문 데이터');

    // 파일명 생성
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `주문데이터_${selectedStore}_${currentDate}.xlsx`;

    // 엑셀 파일 생성 및 다운로드
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
};

// 주문 시간 포맷팅 함수
const formatOrderTime = (orderTime: string) => {
    const date = new Date(orderTime);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? '오후' : '오전';
    const displayHours = hours > 12 ? hours - 12 : hours;
    
    return `${year}.${month}.${day} ${ampm} ${displayHours}시 ${minutes}분`;
};

// 판매 데이터를 엑셀 형식으로 변환하는 함수 (향후 확장용)
export const exportSalesToExcel = (_salesData: any[], _selectedDate: string) => {
    // 판매 데이터 엑셀 변환 로직 (필요시 구현)
    console.log('판매 데이터 엑셀 다운로드 기능은 향후 구현 예정입니다.');
};

// 재고 데이터를 엑셀 형식으로 변환하는 함수 (향후 확장용)
export const exportStocksToExcel = (_stocksData: any[], _selectedStore: string) => {
    // 재고 데이터 엑셀 변환 로직 (필요시 구현)
    console.log('재고 데이터 엑셀 다운로드 기능은 향후 구현 예정입니다.');
};
