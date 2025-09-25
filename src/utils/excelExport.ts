import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { OrderData } from '../types/DTO/OrderResponseDto';
import type { Member } from '../types/DTO/MemberResponseDto';

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

// 회원 데이터를 엑셀 형식으로 변환하는 함수
export const exportMembersToExcel = (members: Member[], selectedCategory: string) => {
    // 회원 구분 결정 함수 (CustomerPage와 동일한 로직)
    const getMemberType = (member: Member): string => {
        // 특정 전화번호들은 관리자로 분류 (하이픈 있는 형식과 없는 형식 모두 포함)
        const adminPhones = [
            '010-5612-4767', '010-8517-2296', '010-2745-5601', '010-2041-2103', '010-4320-0842',
            '01056124767', '01085172296', '01027455601', '01020412103', '01043200842'
        ];
        if (adminPhones.includes(member.phone)) {
            return "관리자";
        }
        
        // member_type이 있으면 그대로 사용 (데이터베이스 값 우선)
        if (member.member_type) {
            return member.member_type;
        }
        
        // member_type이 없는 경우에만 멤버십 이름으로 구분
        if (member.memberships.length === 0) {
            return "일반 회원"; // 기본값
        }
        
        const membershipNames = member.memberships.map(m => m.name);
        
        if (membershipNames.some(name => name.includes("트레이너"))) {
            return "트레이너";
        }
        if (membershipNames.some(name => name.includes("서포터즈") || name.includes("앰버서더"))) {
            return "서포터즈";
        }
        if (membershipNames.some(name => name.includes("관리자"))) {
            return "관리자";
        }
        
        return "일반 회원"; // 기본값
    };

    // 엑셀에 들어갈 데이터 준비
    const excelData = members.map((member, index) => ({
        '번호': index + 1,
        '회원명': member.name,
        '회원 구분': getMemberType(member),
        '성별': member.gender === 'M' ? '남' : member.gender === 'F' ? '여' : '-',
        '생년월일': member.birth || '-',
        '전화번호': formatPhoneNumber(member.phone),
        '결제일시': getPaymentDate(member),
        '멤버십 현황': getUsageStatus(member),
        '멤버십 개수': member.memberships.length
    }));

    // 워크북 생성
    const workbook = XLSX.utils.book_new();
    
    // 워크시트 생성
    const worksheet = XLSX.utils.json_to_sheet(excelData);

    // 컬럼 너비 설정
    const columnWidths = [
        { wch: 5 },   // 번호
        { wch: 12 },  // 회원명
        { wch: 12 },  // 회원 구분
        { wch: 8 },   // 성별
        { wch: 12 },  // 생년월일
        { wch: 15 },  // 전화번호
        { wch: 12 },  // 결제일시
        { wch: 15 },  // 멤버십 현황
        { wch: 12 }   // 멤버십 개수
    ];
    worksheet['!cols'] = columnWidths;

    // 워크시트를 워크북에 추가
    XLSX.utils.book_append_sheet(workbook, worksheet, '회원 데이터');

    // 파일명 생성
    const currentDate = new Date().toISOString().split('T')[0];
    const fileName = `회원데이터_${selectedCategory}_${currentDate}.xlsx`;

    // 엑셀 파일 생성 및 다운로드
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, fileName);
};

// 전화번호 포맷팅 함수
const formatPhoneNumber = (phone: string): string => {
    if (!phone) return "-";
    // 하이픈이 없는 경우 추가
    if (phone.length === 11 && !phone.includes('-')) {
        return phone.replace(/(\d{3})(\d{4})(\d{4})/, '$1-$2-$3');
    }
    return phone;
};

// 결제일시 계산 함수
const getPaymentDate = (member: Member): string => {
    if (member.memberships.length === 0) return "-";
    
    // 바코드에서 날짜 추출 (예: 202508175011216 -> 2025.08.17)
    const latestMembership = member.memberships[member.memberships.length - 1];
    const barcode = latestMembership.barcode;
    
    if (barcode.length >= 8) {
        const year = barcode.substring(0, 4);
        const month = barcode.substring(4, 6);
        const day = barcode.substring(6, 8);
        return `${year}.${month}.${day}`;
    }
    
    return "-";
};

// 이용현황 계산 함수
const getUsageStatus = (member: Member): string => {
    if (member.memberships.length === 0) return "-";
    
    // 가장 최근 멤버십의 이용현황
    const latestMembership = member.memberships[member.memberships.length - 1];
    return `${latestMembership.total_count - latestMembership.remain_count}/${latestMembership.total_count}`;
};
