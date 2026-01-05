import { apiClient } from './client';
import type { SurveyResponseDto } from '../types/DTO/SurveyResponseDto';

export const surveysApi = {
    async getKioskSurveys(): Promise<SurveyResponseDto> {
        return apiClient.get<SurveyResponseDto>('/survey/kiosk');
    }
};

