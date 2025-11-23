import { GoogleGenAI } from "@google/genai";
import { JobType } from "../types";

// Check if API key is available
const isApiKeyAvailable = !!process.env.API_KEY;

export const generateWorkerIntro = async (
  name: string, 
  jobs: JobType[], 
  location: string
): Promise<string> => {
  
  if (!isApiKeyAvailable) {
    return "API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const jobList = jobs.join(", ");
    const prompt = `
      당신은 인력사무소의 전문 상담원입니다.
      구직자의 이름은 ${name}이고, 희망하는 직종은 [${jobList}] 입니다.
      거주 또는 희망 근무지는 ${location} 입니다.
      
      이 정보를 바탕으로, 고용주에게 어필할 수 있는 2문장 이내의 
      신뢰감 있고 패기 넘치는 '젊은 일꾼' 컨셉의 자기소개를 작성해주세요.
      이모지를 1개 포함하여 긍정적인 느낌을 주세요.
      존댓말을 사용하세요.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "자기소개 생성에 실패했습니다.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "자기소개 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }
};