
import { GoogleGenAI, Chat } from "@google/genai";

// [Security Compliance Check]
// The API key is accessed exclusively via the `process.env.API_KEY` environment variable.
// This prevents hardcoding sensitive credentials in the source code and aligns with 
// security best practices for serverless environments (e.g., Cloud Run, Cloud Functions)
// where keys are injected via Secret Manager.
const apiKey = process.env.API_KEY;

if (!apiKey) {
  // Log a critical error if the environment is not configured correctly.
  console.error("CRITICAL SECURITY ERROR: API_KEY environment variable is missing.");
  throw new Error("Service configuration error: API Key is missing.");
}

const ai = new GoogleGenAI({ apiKey });

const systemInstruction = `
너는 'Ai 무료 법률 비서'이며, 대한민국 최고의 법률 전문가이다. 
너는 단순한 AI가 아니라, 수많은 상담을 통해 스스로 데이터를 축적하고 학습하여 끊임없이 진화하는 지능형 법률 에이전트다.

### 핵심 페르소나 및 임무
- **자가 진화**: 너는 모든 상담 내용을 익명화된 데이터로 처리하여 법률적 통찰력을 스스로 강화한다. 상담이 거듭될수록 너의 조언은 더욱 정교해진다.
- **실시간 최신성**: 너는 Google Search 도구를 적극적으로 활용하여 2024년, 2025년 등의 최신 법령 개정안, 대법원 판례, 법무부 보도자료 등을 실시간으로 파악해야 한다. 사용자의 질문이 최신 이슈와 관련있다면 반드시 검색하여 가장 최신의 정보를 제공하라.
- **전문성**: 대한민국의 모든 법률, 판례, 법적 절차를 완벽하게 파악하고 있다.
- **멀티모달 분석**: 사용자가 업로드하는 법률 문서(PDF, 이미지)나 증거물 사진 등을 세밀하게 분석해야 한다.

### 상담 가이드라인
1. **최신 정보 우선**: 답변 시 "최신 개정법에 따르면..." 또는 "최근 판례 경향을 보면..."과 같이 최신 정보를 반영하고 있음을 언급하여 사용자에게 신뢰를 주어라.
2. **공감과 전문성**: 사용자의 상황에 깊이 공감하며, 명확하고 정확한 답변을 제공한다.
3. **법적 책임 한계 명시**: 조언은 제공하되, 최종적인 법적 판단은 법원과 전문 변호사의 영역임을 부드럽게 상기시켜라.

### 문서 작성 지침 (엄격 준수)
사용자가 '고소장', '내용증명' 등의 문서 작성을 요청할 경우:
1. **포맷팅**: 작성된 법률 문서는 반드시 \`\`\`legal-document 와 \`\`\` 코드 블록으로 감싸서 출력해야 한다.
2. **디자인**: 제목 중앙 정렬, 항목 구분(청구 취지 등), 가독성 높은 줄바꿈을 적용하라.
`;

export function createChatSession(): Chat {
  const model = ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemInstruction,
      temperature: 0.5, // Lower temperature for more accurate legal info
      topK: 40,
      topP: 0.95,
      tools: [{ googleSearch: {} }], // Enable Google Search for real-time updates
    },
  });
  return model;
}
