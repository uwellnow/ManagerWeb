import { apiClient } from './client';
import type { RefundsResponseDto, MembersResponseDto } from '../types/DTO/MemberResponseDto';

export const membersApi = {
  // 회원 목록 조회
  getMembers: async (): Promise<MembersResponseDto> => {
    return apiClient.get<MembersResponseDto>('/members');
  },

  // 회원 환불 처리
  refundMember: async (refundData: {
    membership_id: number;
    refund_count: number;
    refund_reason: string;
    processed_by: string;
  }): Promise<void> => {
    return apiClient.post('/member/refunds', refundData);
  },

  // 환불 로그 조회
  getRefunds: async (): Promise<RefundsResponseDto> => {
    return apiClient.get<RefundsResponseDto>('/member/refunds');
  },

  // 회원 등록
  registerMember: async (memberData: {
    phone: string;
    name: string;
    registrant_name: string;
    member_type: string;
    birth: string;
    gender: string;
    registration_date: string;
    barcode: string;
    membership_name: string;
    total_count: number;
    remain_count: number;
  }): Promise<void> => {
    return apiClient.post('/users/membership', memberData);
  },

  // 회원 동기화
  syncMembers: async (): Promise<void> => {
    return apiClient.post('/members/sync');
  }
};
