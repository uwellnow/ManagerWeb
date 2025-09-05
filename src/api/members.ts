import { apiClient } from './client';

// 타입을 직접 정의
interface Membership {
  id: number;
  barcode: string;
  name: string;
  remain_count: number;
  total_count: number;
}

interface Member {
  id: number;
  name: string;
  phone: string;
  birth: string | null;
  gender: string | null;
  memberships: Membership[];
}

interface MembersResponseDto {
  members: Member[];
}

export const membersApi = {
  // 회원 목록 조회
  getMembers: async (): Promise<MembersResponseDto> => {
    return apiClient.get<MembersResponseDto>('/members');
  },

  // 회원 환불 처리
  refundMember: async (memberId: number, membershipId: number): Promise<void> => {
    return apiClient.post(`/members/${memberId}/refund`, { membershipId });
  }
};
