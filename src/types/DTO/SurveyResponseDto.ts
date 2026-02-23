export interface SurveyAnswer {
    question: number;
    answer: string;
}

export interface SurveyMember {
    name: string;
    gender: "M" | "F" | null;
    birth: string | null; // "1990.01.01" 형식
    registrantStore: string | null;
}

export interface SurveyResponse {
    userCode: string | null;
    answers: SurveyAnswer[];
    member: SurveyMember | null;
    /** 설문 응답 일시 (ISO 8601). API가 created_at 또는 createdAt 으로 내려줄 수 있음 */
    created_at?: string | null;
    createdAt?: string | null;
}

export type SurveyResponseDto = SurveyResponse[];

