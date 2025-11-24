import React from 'react';
import { XMarkIcon } from './icons';

interface LegalModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: React.ReactNode;
}

const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, title, content }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl bg-gray-800 rounded-xl shadow-2xl border border-gray-700 flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h3 className="text-lg font-bold text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <div className="p-6 overflow-y-auto text-gray-300 text-sm leading-relaxed space-y-4">
          {content}
        </div>
        <div className="p-4 border-t border-gray-700 flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 bg-cyan-600 text-white rounded hover:bg-cyan-700 transition-colors font-medium text-sm"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
};

export const TermsOfServiceContent = () => (
  <>
    <h4 className="text-base font-bold text-white mb-2">제1조 (목적)</h4>
    <p>본 약관은 Ai 무료 법률 비서(이하 "서비스")가 제공하는 인공지능 기반 법률 정보 제공 서비스의 이용 조건 및 절차, 이용자와 서비스의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.</p>
    
    <h4 className="text-base font-bold text-white mb-2 mt-4">제2조 (서비스의 성격 및 책임의 한계)</h4>
    <p className="text-red-400 font-semibold">1. 본 서비스는 인공지능(AI) 기술을 활용하여 일반적인 법률 정보와 문서 초안을 제공하는 도구일 뿐이며, 변호사법에 따른 법률 상담이나 법적 대리 행위를 제공하지 않습니다.</p>
    <p>2. 제공되는 모든 정보는 참고용이며, 구체적인 사안에 대한 최종적인 법적 판단이나 해결책이 될 수 없습니다.</p>
    <p>3. 본 서비스의 정보를 활용하여 발생한 법적 분쟁이나 손해에 대해 서비스 제공자는 어떠한 법적 책임도 지지 않습니다. 중요한 법률 문제는 반드시 변호사 등 법률 전문가와 상담하시기 바랍니다.</p>
    
    <h4 className="text-base font-bold text-white mb-2 mt-4">제3조 (저작권 및 이용권)</h4>
    <p>1. 서비스가 생성한 법률 문서 초안의 저작권은 사용자에게 귀속되나, 서비스 개선을 위한 데이터로 활용될 수 있습니다.</p>
  </>
);

export const PrivacyPolicyContent = () => (
  <>
    <h4 className="text-base font-bold text-white mb-2">1. 개인정보 수집 항목</h4>
    <p>본 서비스는 원활한 서비스 제공을 위해 다음과 같은 정보를 수집할 수 있습니다.</p>
    <ul className="list-disc list-inside pl-2 mt-1">
        <li>상담 내용 (법률 질의 및 응답 데이터)</li>
        <li>이용자가 업로드한 문서 및 이미지 파일</li>
        <li>접속 로그, 쿠키, IP 주소 등 기술적 정보</li>
    </ul>

    <h4 className="text-base font-bold text-white mb-2 mt-4">2. 개인정보의 이용 목적</h4>
    <p>수집된 정보는 다음의 목적을 위해 이용됩니다.</p>
    <ul className="list-disc list-inside pl-2 mt-1">
        <li>AI 모델의 학습 및 답변 정확도 개선 (비식별화 처리 후)</li>
        <li>서비스 이용에 따른 본인 확인 및 맞춤형 서비스 제공</li>
        <li>서비스 관련 문의 응대 (이메일: yourkang7979@gmail.com)</li>
    </ul>

    <h4 className="text-base font-bold text-white mb-2 mt-4">3. 개인정보의 제3자 제공</h4>
    <p>서비스는 이용자의 동의 없이 개인정보를 외부에 제공하지 않습니다. 다만, 법령에 의거하거나 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우는 예외로 합니다.</p>
  </>
);

export const ContactContent = () => (
  <div className="text-center py-4">
    <h4 className="text-lg font-bold text-white mb-4">문의하기 / 제휴 제안</h4>
    <p className="mb-6">
      서비스 이용 중 불편한 점이나 제안 사항이 있으시면 아래 이메일로 연락 주시기 바랍니다.<br/>
      법률 관련 직접적인 자문 요청에는 답변드리지 않습니다.
    </p>
    <div className="bg-gray-700/50 p-4 rounded-lg inline-block border border-gray-600">
      <span className="text-gray-400 text-sm block mb-1">대표 이메일</span>
      <span className="text-cyan-400 text-xl font-mono select-all">yourkang7979@gmail.com</span>
    </div>
    <p className="mt-6 text-xs text-gray-500">
      평일 기준 24시간 이내에 답변을 드리기 위해 노력하고 있습니다.
    </p>
  </div>
);

export default LegalModal;
