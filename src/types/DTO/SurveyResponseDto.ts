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
}

export type SurveyResponseDto = SurveyResponse[];

