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

  // 수동 회원 등록 (신규 회원 + 멤버십 1개)
  registerMemberSubscription: async (data: {
    phone: string;
    name: string;
    plan: '1잔권' | '5잔권' | '무제한 구독권';
    registrant_name?: string;
    member_type?: string;
    birth?: string;
    gender?: string;
  }): Promise<{ member: unknown; membership: { barcode: string; [key: string]: unknown } }> => {
    return apiClient.post('/users/membership/subscription', data);
  },

  // 기존 회원에게 멤버십 추가
  addMembershipForMember: async (
    memberId: number,
    plan: '1잔권' | '5잔권' | '무제한 구독권'
  ): Promise<{ member: unknown; membership: { barcode: string; [key: string]: unknown } }> => {
    return apiClient.post(`/users/${memberId}/memberships`, { plan });
  }
};
