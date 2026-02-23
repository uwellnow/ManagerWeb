import { apiClient } from './client';
import type { SurveyResponseDto } from '../types/DTO/SurveyResponseDto';

export const surveysApi = {
    /** 관리자 설문 조회 - version=2만 조회 */
    async getKioskSurveys(): Promise<SurveyResponseDto> {
        return apiClient.get<SurveyResponseDto>('/survey/kiosk?version=2');
    }
};

