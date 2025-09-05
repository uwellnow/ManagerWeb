export interface Membership {
  id: number;
  barcode: string;
  name: string;
  remain_count: number;
  total_count: number;
}

export interface Member {
  id: number;
  name: string;
  phone: string;
  birth: string | null;
  gender: string | null;
  memberships: Membership[];
}

export interface MembersResponseDto {
  members: Member[];
}

export interface RefundLog {
  id: number;
  membership_id: number;
  refund_count: number;
  refund_reason: string;
  processed_by: string;
  refund_status: string;
  before_remain_count: number;
  after_remain_count: number;
  created_at: string;
  updated_at: string;
  member_name: string;
  member_type: string;
  membership_name: string;
}

export interface RefundsResponseDto {
  refunds: RefundLog[];
  total?: number;
  skip?: number;
  limit?: number;
}