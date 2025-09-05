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
