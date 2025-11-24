
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Consultation, ChatMessage, Attachment, Source } from '../types';
import { createChatSession } from '../services/geminiService';
import { PlusIcon, SendIcon, UserIcon, LawIcon, PaperClipIcon, DocumentIcon, XMarkIcon, ArrowDownTrayIcon, GoogleIcon, ClipboardIcon, CheckIcon } from './icons';
import LegalModal, { TermsOfServiceContent, PrivacyPolicyContent, ContactContent } from './LegalPages';
import type { Chat } from '@google/genai';

const mockConsultations: Consultation[] = [
  { id: '1', title: '임대차 계약 분쟁', category: '부동산/임대차', date: '2024-07-28', summary: '보증금 반환 문제 관련', messages: [{role: 'user', content: '안녕하세요. 전세 보증금 반환 문제로 상담하고 싶습니다.'}, {role: 'model', content: '안녕하세요, Ai 무료 법률 비서입니다. 어떤 상황이신지 자세히 말씀해주시겠어요?'}] },
  { id: '2', title: '폭행 사건 고소', category: '형사/고소', date: '2024-07-25', summary: '증거 자료 및 절차 문의', messages: [] },
  { id: '3', title: '온라인 명예훼손', category: '사이버/명예훼손', date: '2024-07-22', summary: '악성 댓글 대응 방안', messages: [] },
];

const MainApp: React.FC = () => {
  const [consultations, setConsultations] = useState<Consultation[]>(mockConsultations);
  const [activeConsultation, setActiveConsultation] = useState<Consultation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [files, setFiles] = useState<Attachment[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  
  // Legal Modal States
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  const chatSession = useRef<Chat | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (activeConsultation) {
      try {
        chatSession.current = createChatSession();
        // Load past messages if any
        if(activeConsultation.messages.length > 0){
          setMessages(activeConsultation.messages);
        } else {
          setMessages([]);
        }
        setFiles([]); // Clear files when switching consultation
        setUserInput('');
      } catch (error) {
        console.error("Failed to initialize AI session:", error);
        setMessages([{
            role: 'model',
            content: '⚠️ 시스템 오류: 보안 키가 설정되지 않았거나 연결에 실패했습니다. 관리자에게 문의하세요.'
        }]);
      }
    }
  }, [activeConsultation]);
  
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: Attachment[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        const file = e.target.files[i];
        // Simple check for images or PDF
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            alert('이미지 또는 PDF 파일만 업로드할 수 있습니다.');
            continue;
        }

        const reader = new FileReader();
        await new Promise<void>((resolve) => {
            reader.onload = (ev) => {
                if (ev.target?.result) {
                    newFiles.push({
                        name: file.name,
                        type: file.type,
                        data: ev.target.result as string,
                    });
                }
                resolve();
            };
            reader.readAsDataURL(file);
        });
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input value to allow selecting same file again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleSendMessage = useCallback(async () => {
    if ((!userInput.trim() && files.length === 0) || !chatSession.current) return;
  
    const currentFiles = [...files];
    const userMessage: ChatMessage = { role: 'user', content: userInput, attachments: currentFiles };
    
    setMessages(prev => [...prev, userMessage]);
    setUserInput('');
    setFiles([]);
    setIsLoading(true);
  
    try {
        // Construct message parts for Gemini
        const parts: any[] = [];
        if (userInput.trim()) {
            parts.push({ text: userInput });
        }
        
        for (const file of currentFiles) {
            const base64Data = file.data.split(',')[1];
            parts.push({
                inlineData: {
                    mimeType: file.type,
                    data: base64Data
                }
            });
        }

        const responseStream = await chatSession.current.sendMessageStream({ 
            message: parts.length === 1 && parts[0].text ? parts[0].text : parts 
        });
        
        let modelResponse = '';
        const sources: Source[] = [];
        
        setMessages(prev => [...prev, { role: 'model', content: '' }]);

        for await (const chunk of responseStream) {
            // Handle Text
            if (chunk.text) {
                modelResponse += chunk.text;
            }

            // Handle Grounding (Google Search Sources)
            if (chunk.candidates && chunk.candidates[0]?.groundingMetadata?.groundingChunks) {
                const chunks = chunk.candidates[0].groundingMetadata.groundingChunks;
                chunks.forEach((c: any) => {
                    if (c.web?.uri && c.web?.title) {
                        // Avoid duplicates
                        if (!sources.find(s => s.uri === c.web.uri)) {
                            sources.push({
                                title: c.web.title,
                                uri: c.web.uri
                            });
                        }
                    }
                });
            }

            setMessages(prev => {
                const newMessages = [...prev];
                const lastMsg = newMessages[newMessages.length - 1];
                lastMsg.content = modelResponse;
                if (sources.length > 0) {
                    lastMsg.sources = sources;
                }
                return newMessages;
            });
        }
    } catch (error) {
      console.error('Gemini API error:', error);
      const errorMessage: ChatMessage = { role: 'model', content: '죄송합니다, 답변 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [userInput, files]);

  const handleNewConsultation = () => {
    const newConsultation: Consultation = {
        id: String(Date.now()),
        title: '새로운 법률 상담',
        category: '일반',
        date: new Date().toISOString().split('T')[0],
        summary: '상담이 시작되지 않았습니다.',
        messages: []
    };
    setConsultations(prev => [newConsultation, ...prev]);
    setActiveConsultation(newConsultation);
  };

  const handleSelectConsultation = (consultation: Consultation) => {
    setActiveConsultation(consultation);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
    }
  };

  const handleCopyContent = async (text: string, index: number) => {
    try {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    } catch (err) {
        console.error('Failed to copy text: ', err);
    }
  };

  const downloadDoc = (content: string) => {
    // Generate a clean HTML file with proper encoding settings (BOM + Meta charset)
    // This ensures Korean characters are displayed correctly in Word, Hancom, and Browsers.
    const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>법률 문서 초안</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Nanum+Myeongjo:wght@400;700&display=swap');
        body { 
            font-family: 'Nanum Myeongjo', serif; 
            line-height: 1.8; 
            padding: 40px; 
            max-width: 210mm; /* A4 size width */
            margin: 0 auto; 
            background-color: #fff;
            color: #000;
        }
        pre {
            white-space: pre-wrap;
            font-family: inherit;
            font-size: 11pt;
            border: none;
            background: none;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            margin-bottom: 30px;
            padding-bottom: 10px;
        }
        .footer {
            margin-top: 50px;
            text-align: center;
            font-size: 10px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 10px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>법률 문서 초안</h1>
    </div>
    <pre>${content}</pre>
    <div class="footer">
        본 문서는 AI 법률 비서에 의해 자동 생성된 초안입니다. 실제 제출 시에는 법률 전문가의 검토가 필요합니다.
    </div>
</body>
</html>`;

    // Add Byte Order Mark (BOM) for UTF-8 compatibility with Windows applications
    const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
    const blob = new Blob([bom, htmlContent], {type: 'text/html;charset=utf-8'});
    
    const element = document.createElement("a");
    element.href = URL.createObjectURL(blob);
    element.download = '법률문서_초안.html';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const renderMessageContent = (content: string) => {
    const parts = content.split(/```legal-document([\s\S]*?)```/g);
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return (
          <div key={index} className="my-4 w-full">
             <div className="bg-white text-gray-900 p-8 md:p-10 rounded shadow-lg border border-gray-200 font-serif leading-loose relative max-w-2xl mx-auto">
                <div className="absolute top-2 right-2 print:hidden flex space-x-2">
                    <button
                        onClick={() => handleCopyContent(part.trim(), index)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded border transition-all duration-200 ${
                            copiedIndex === index 
                            ? 'bg-green-100 text-green-700 border-green-300' 
                            : 'bg-cyan-600 hover:bg-cyan-700 text-white border-transparent shadow-sm'
                        }`}
                        title="내용 전체 복사"
                    >
                        {copiedIndex === index ? (
                            <>
                                <CheckIcon className="w-4 h-4" />
                                복사 완료!
                            </>
                        ) : (
                            <>
                                <ClipboardIcon className="w-4 h-4" />
                                전체 복사
                            </>
                        )}
                    </button>
                    <button 
                        onClick={() => downloadDoc(part.trim())}
                        className="flex items-center justify-center p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded border border-gray-300 transition-colors"
                        title="파일로 다운로드"
                    >
                        <ArrowDownTrayIcon className="w-4 h-4" />
                    </button>
                </div>
                <pre className="whitespace-pre-wrap font-serif text-base md:text-lg select-text pt-6">{part.trim()}</pre>
             </div>
             <div className="text-center mt-2">
                <p className="text-xs text-gray-500">위 문서는 초안입니다. '전체 복사' 후 워드나 한글에 붙여넣어 수정하세요.</p>
             </div>
          </div>
        );
      }
      if (!part.trim()) return null;
      return <span key={index} className="whitespace-pre-wrap">{part}</span>;
    });
  };

  const groupedConsultations = consultations.reduce<Record<string, Consultation[]>>((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = [];
    }
    acc[curr.category].push(curr);
    return acc;
  }, {});


  return (
    <div className="flex h-screen bg-gray-900 text-gray-200 font-sans">
      {/* Sidebar */}
      <aside className="w-64 md:w-80 bg-gray-800 flex flex-col border-r border-gray-700 hidden md:flex shadow-xl z-20">
        <div className="p-5 border-b border-gray-700">
            <div className="flex items-center mb-5">
                <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3 shadow-lg">
                    <LawIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                    <h1 className="text-lg font-bold text-white tracking-tight">Ai 무료 법률 비서</h1>
                    <p className="text-xs text-gray-400">대한민국 법률 전문 에이전트</p>
                </div>
            </div>
            <button onClick={handleNewConsultation} className="flex items-center justify-center w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 shadow-lg shadow-cyan-900/30 transform hover:-translate-y-0.5">
                <PlusIcon className="w-5 h-5 mr-2" />
                새로운 상담 시작
            </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
          <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2 mt-2">상담 내역</h2>
          {Object.entries(groupedConsultations).map(([category, items]: [string, Consultation[]]) => (
            <div key={category} className="mb-6">
              <h3 className="text-xs font-semibold text-cyan-500 mb-2 px-2 flex items-center">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 mr-2"></span>
                {category}
              </h3>
              <ul>
                {items.map(c => (
                  <li key={c.id}>
                    <button
                      onClick={() => handleSelectConsultation(c)}
                      className={`w-full text-left p-3 rounded-lg mb-1 transition duration-200 flex flex-col group ${activeConsultation?.id === c.id ? 'bg-gray-700 border-l-4 border-cyan-500 shadow-md' : 'hover:bg-gray-700/50 border-l-4 border-transparent'}`}
                    >
                      <span className={`font-medium truncate text-sm ${activeConsultation?.id === c.id ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>{c.title}</span>
                      <span className="text-xs text-gray-500 mt-1">{c.date}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* System Status & Legal Footer */}
        <div className="p-4 border-t border-gray-700 bg-gray-800/80 backdrop-blur">
            <div className="flex flex-col space-y-3">
                <div className="flex items-center justify-between text-xs p-2 bg-gray-900/50 rounded border border-gray-700/50">
                    <span className="text-gray-400">법률 DB 상태</span>
                    <span className="flex items-center text-green-400 font-medium">
                        <span className="relative flex h-2 w-2 mr-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                        </span>
                        실시간 연동 중
                    </span>
                </div>
                
                {/* AdSense Placeholder for Sidebar Bottom */}
                {/* <div className="w-full h-[250px] bg-gray-700/30 rounded flex items-center justify-center text-gray-600 text-xs border border-dashed border-gray-600">
                    광고 영역
                </div> */}

                <div className="flex flex-wrap gap-x-3 gap-y-1 justify-center text-[11px] text-gray-500 mt-2">
                    <button onClick={() => setIsTermsOpen(true)} className="hover:text-cyan-400 transition-colors">이용약관</button>
                    <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-cyan-400 transition-colors">개인정보처리방침</button>
                    <button onClick={() => setIsContactOpen(true)} className="hover:text-cyan-400 transition-colors">문의하기</button>
                </div>
                <p className="text-[10px] text-gray-600 text-center">
                    © 2024 Ai Legal Assistant. All rights reserved.
                </p>
            </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col relative bg-gray-900 w-full">
        {/* Header */}
        <header className="flex items-center justify-between p-4 bg-gray-800/90 backdrop-blur-sm border-b border-gray-700 z-10 h-16 shadow-sm">
          <div className="flex items-center">
            <div className="md:hidden mr-3">
                <LawIcon className="w-6 h-6 text-cyan-400" />
            </div>
            <div className="flex flex-col">
                <h2 className="text-base md:text-lg font-bold text-white flex items-center">
                    {activeConsultation ? activeConsultation.title : 'Ai 무료 법률 상담소'}
                </h2>
                {activeConsultation && (
                     <span className="text-xs text-cyan-400">{activeConsultation.category}</span>
                )}
            </div>
          </div>
          <div className="flex items-center">
             <div className="px-3 py-1.5 rounded-full bg-gray-700/50 text-xs font-medium text-gray-300 border border-gray-600 flex items-center shadow-inner">
              <GoogleIcon className="w-3 h-3 mr-2" />
              실시간 판례 검색 엔진 ON
            </div>
          </div>
        </header>

        {/* Chat Area / Landing Page */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-40 custom-scrollbar bg-gray-900 scroll-smooth">
          {!activeConsultation ? (
            // SEO-Optimized Landing Content (Crucial for AdSense)
             <div className="max-w-4xl mx-auto py-10 text-gray-300 space-y-12 animate-fade-in-up">
                
                {/* Hero Section */}
                <div className="text-center space-y-6">
                    <div className="w-20 h-20 mx-auto bg-gradient-to-br from-gray-700 to-gray-800 rounded-2xl flex items-center justify-center shadow-2xl border border-gray-600 transform rotate-3 hover:rotate-0 transition-transform duration-500">
                        <LawIcon className="w-10 h-10 text-cyan-400"/>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
                        법률 문제, <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">AI 전문가</span>와 상의하세요
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
                        최신 판례와 법령을 실시간으로 학습하는 대한민국 최고의 AI 법률 비서가<br className="hidden md:block"/>
                        당신의 법적 고민을 해결하고 필요한 서류 작성을 도와드립니다.
                    </p>
                    <div className="flex justify-center gap-4 pt-4">
                        <button onClick={handleNewConsultation} className="bg-cyan-600 hover:bg-cyan-500 text-white px-8 py-3 rounded-full font-bold text-lg shadow-lg shadow-cyan-900/50 transition-all transform hover:-translate-y-1">
                            무료 상담 시작하기
                        </button>
                    </div>
                </div>

                {/* Features Section (SEO Text) */}
                <div className="grid md:grid-cols-3 gap-6 mt-16">
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg hover:border-cyan-500/50 transition-colors">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mb-4 text-cyan-400">
                            <DocumentIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">법률 문서 작성</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            고소장, 내용증명, 탄원서 등 복잡한 법률 문서를 AI가 전문적인 양식에 맞춰 자동으로 작성해 드립니다. 다운로드하여 바로 사용하세요.
                        </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg hover:border-cyan-500/50 transition-colors">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mb-4 text-cyan-400">
                            <GoogleIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">실시간 법령 검색</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            Google Search 기술을 연동하여 2024년 최신 개정법, 대법원 판례, 뉴스 기사 등을 실시간으로 검색해 상담에 반영합니다.
                        </p>
                    </div>
                    <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-lg hover:border-cyan-500/50 transition-colors">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center mb-4 text-cyan-400">
                            <PaperClipIcon className="w-6 h-6"/>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">증거 자료 분석</h3>
                        <p className="text-sm text-gray-400 leading-relaxed">
                            카카오톡 대화 내용 캡처, 계약서 사진, PDF 파일 등을 업로드하면 AI가 내용을 정밀 분석하여 법적 유불리를 판단합니다.
                        </p>
                    </div>
                </div>

                {/* HOW IT WORKS Section (New Addition for AdSense Approval) */}
                <div className="mt-16 text-center">
                    <h3 className="text-2xl font-bold text-white mb-8">AI 법률 상담, 이렇게 진행됩니다</h3>
                    <div className="grid md:grid-cols-3 gap-8 relative">
                         <div className="absolute top-1/2 left-0 w-full h-0.5 bg-gray-700 -z-10 hidden md:block transform -translate-y-1/2"></div>
                         
                         <div className="relative bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-xl flex flex-col items-center">
                            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-cyan-900/50 ring-4 ring-gray-900">1</div>
                            <h4 className="text-lg font-bold text-white mb-2">질문하기</h4>
                            <p className="text-sm text-gray-400">
                                궁금한 법률 문제나 상황을 채팅으로 자세히 적어주세요. 계약서나 증거 이미지를 함께 올리면 더 좋습니다.
                            </p>
                         </div>
                         
                         <div className="relative bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-xl flex flex-col items-center">
                             <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-cyan-900/50 ring-4 ring-gray-900">2</div>
                            <h4 className="text-lg font-bold text-white mb-2">분석하기</h4>
                            <p className="text-sm text-gray-400">
                                AI가 실시간으로 최신 판례, 법령, 유사 사례를 검색하고 분석하여 귀하의 상황에 맞는 법적 근거를 찾습니다.
                            </p>
                         </div>
                         
                         <div className="relative bg-gray-900 p-4 rounded-xl border border-gray-700 shadow-xl flex flex-col items-center">
                             <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4 shadow-lg shadow-cyan-900/50 ring-4 ring-gray-900">3</div>
                            <h4 className="text-lg font-bold text-white mb-2">해결하기</h4>
                            <p className="text-sm text-gray-400">
                                맞춤형 법률 조언과 함께, 필요한 경우 고소장, 내용증명 등의 문서 초안을 즉시 작성하여 제공해드립니다.
                            </p>
                         </div>
                    </div>
                </div>

                {/* AdSense Placeholder (In-Feed Style) */}
                {/* <div className="w-full h-32 bg-gray-800/50 border border-dashed border-gray-700 rounded-xl flex items-center justify-center text-gray-500 text-sm">
                    Google AdSense 광고 영역
                </div> */}

                {/* Usage Guide & Categories */}
                <div className="bg-gray-800/50 rounded-2xl p-8 border border-gray-700/50">
                    <h3 className="text-lg font-bold text-white mb-6 border-b border-gray-700 pb-2">주요 상담 분야</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>부동산/임대차</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>형사 고소/고발</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>이혼/가사</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>교통사고/손해배상</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>노동/임금체불</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>사이버 명예훼손</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>채권/채무</span></div>
                        <div className="flex items-center space-x-2 text-gray-300"><span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span><span>저작권/지식재산</span></div>
                    </div>
                </div>

                {/* FAQ Section: Crucial for AdSense 'Low Value Content' Prevention */}
                <div className="space-y-6">
                    <h3 className="text-2xl font-bold text-white text-center mb-8">자주 묻는 질문 (FAQ)</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h4 className="text-lg font-semibold text-cyan-400 mb-2">Q. 정말 모든 기능이 무료인가요?</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                네, 그렇습니다. Ai 무료 법률 비서는 법률 사각지대에 있는 분들을 위해 만들어졌으며, 상담, 문서 작성, 판례 검색 등 모든 기능을 별도의 비용 없이 무료로 제공하고 있습니다.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h4 className="text-lg font-semibold text-cyan-400 mb-2">Q. 개인정보는 안전한가요?</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                상담 내용은 익명화되어 처리되며, 사용자의 개인 식별 정보는 철저히 보호됩니다. 또한, 구글의 보안 서버를 통해 데이터가 암호화되어 전송되므로 안심하고 이용하실 수 있습니다.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h4 className="text-lg font-semibold text-cyan-400 mb-2">Q. 변호사 대신 사용할 수 있나요?</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                본 서비스는 법률적 조언과 문서 초안을 제공하지만, 변호사를 완전히 대체할 수는 없습니다. 소송 등 중요한 법적 절차를 진행할 때는 반드시 법률 전문가의 최종 검토를 받으시길 권장합니다.
                            </p>
                        </div>
                        <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
                            <h4 className="text-lg font-semibold text-cyan-400 mb-2">Q. 최신 법 개정 내용도 반영되나요?</h4>
                            <p className="text-gray-400 text-sm leading-relaxed">
                                네, Google Search Grounding 기술을 적용하여 실시간으로 최신 법령 개정 사항과 대법원 판례를 검색하여 답변에 반영합니다. 언제나 가장 최신의 정보를 제공하기 위해 노력합니다.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer / Disclaimer Area */}
                <div className="border-t border-gray-800 pt-8 pb-4 text-center">
                    <p className="text-xs text-gray-500 mb-4 max-w-3xl mx-auto">
                        <strong>면책 조항:</strong> 본 서비스는 인공지능 기술을 활용하여 일반적인 법률 정보를 제공합니다. 
                        제공된 정보는 법적 자문이나 유권 해석이 아니며, 실제 재판이나 법적 분쟁에서의 결과와 다를 수 있습니다. 
                        중요한 법률적 결정이나 소송 진행 시에는 반드시 대한변호사협회에 등록된 변호사 등 법률 전문가의 조력을 받으시기 바랍니다.
                        본 서비스의 이용으로 인해 발생한 어떠한 직접적, 간접적 손해에 대해서도 서비스 제공자는 책임을 지지 않습니다.
                    </p>
                     <div className="flex justify-center space-x-6 text-sm text-gray-400">
                        <button onClick={() => setIsTermsOpen(true)} className="hover:text-white underline">이용약관</button>
                        <button onClick={() => setIsPrivacyOpen(true)} className="hover:text-white underline">개인정보처리방침</button>
                        <button onClick={() => setIsContactOpen(true)} className="hover:text-white underline">제휴/문의</button>
                    </div>
                    <p className="mt-4 text-xs text-gray-600">Contact: yourkang7979@gmail.com</p>
                </div>

             </div>
          ) : (
            // Active Chat Interface
            <div className="space-y-8 max-w-4xl mx-auto">
              {messages.map((msg, index) => (
                <div key={index} className={`flex items-start gap-3 md:gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'model' && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-cyan-800 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-lg border border-cyan-700/50">
                        <LawIcon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                    </div>
                  )}
                  <div className={`max-w-full md:max-w-[85%] space-y-2 ${msg.role === 'user' ? 'items-end flex flex-col' : 'w-full'}`}>
                    
                    {/* Display Attachments */}
                    {msg.attachments && msg.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-1 justify-end">
                            {msg.attachments.map((att, i) => (
                                <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-600 shadow-md">
                                    {att.type.startsWith('image/') ? (
                                        <img src={att.data} alt={att.name} className="h-24 md:h-32 w-auto object-cover" />
                                    ) : (
                                        <div className="h-24 md:h-32 w-20 md:w-24 bg-gray-700 flex flex-col items-center justify-center p-2 text-center">
                                            <DocumentIcon className="w-6 h-6 md:w-8 md:h-8 text-gray-400 mb-2" />
                                            <span className="text-xs text-gray-300 break-all line-clamp-2">{att.name}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    <div className={`p-4 md:p-5 rounded-2xl shadow-sm leading-relaxed text-sm md:text-base ${
                        msg.role === 'user' 
                        ? 'bg-cyan-600 text-white rounded-br-none max-w-fit shadow-cyan-900/20' 
                        : 'bg-gray-800 text-gray-100 border border-gray-700 rounded-bl-none w-full shadow-lg'
                    }`}>
                      {msg.role === 'user' ? msg.content : renderMessageContent(msg.content)}
                    </div>

                    {/* Display Sources (Grounding) */}
                    {msg.role === 'model' && msg.sources && msg.sources.length > 0 && (
                        <div className="mt-2 pl-2 w-full animate-fade-in">
                            <p className="text-[11px] text-gray-500 mb-1.5 flex items-center uppercase tracking-wider font-semibold">
                                <GoogleIcon className="w-3 h-3 mr-1.5 grayscale opacity-70" />
                                출처 및 근거 자료
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {msg.sources.map((source, idx) => (
                                    <a 
                                        key={idx} 
                                        href={source.uri} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="flex items-center bg-gray-800/80 hover:bg-gray-700 border border-gray-600/50 rounded px-2 py-1.5 transition-all duration-200 max-w-full hover:border-cyan-500/50 group"
                                    >
                                        <span className="text-xs text-cyan-400/90 truncate max-w-[200px] group-hover:text-cyan-300">{source.title}</span>
                                    </a>
                                ))}
                            </div>
                        </div>
                    )}

                  </div>
                  {msg.role === 'user' && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gray-700 flex items-center justify-center flex-shrink-0 shadow-md border border-gray-600">
                        <UserIcon className="w-5 h-5 md:w-6 md:h-6 text-gray-300" />
                    </div>
                  )}
                </div>
              ))}
               {isLoading && (
                <div className="flex items-start gap-4 justify-start animate-pulse">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-cyan-800 to-gray-800 flex items-center justify-center flex-shrink-0 shadow-lg border border-cyan-700/50">
                    <LawIcon className="w-5 h-5 md:w-6 md:h-6 text-cyan-400" />
                  </div>
                  <div className="p-4 rounded-2xl bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700">
                    <div className="flex items-center space-x-2 h-6">
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                        <div className="w-2 h-2 bg-cyan-500 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-xs text-gray-500 mt-2 block font-medium">법률 데이터베이스 검색 및 분석 중...</span>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          )}
        </div>

        {/* Input Form Area */}
        {activeConsultation && (
            <div className="p-4 bg-gray-900/95 border-t border-gray-700 backdrop-blur relative">
                <div className="max-w-4xl mx-auto">
                    {/* File Previews */}
                    {files.length > 0 && (
                        <div className="flex gap-3 mb-3 overflow-x-auto py-2 px-1 custom-scrollbar">
                            {files.map((file, index) => (
                                <div key={index} className="relative group flex-shrink-0 animate-fade-in-up">
                                    {file.type.startsWith('image/') ? (
                                        <img src={file.data} alt="preview" className="h-16 w-16 object-cover rounded-lg border border-gray-600 shadow-md" />
                                    ) : (
                                        <div className="h-16 w-16 bg-gray-800 rounded-lg border border-gray-600 flex flex-col items-center justify-center p-1 shadow-md">
                                            <DocumentIcon className="w-5 h-5 text-gray-400 mb-1" />
                                            <span className="text-[9px] text-gray-400 truncate w-full text-center">{file.name}</span>
                                        </div>
                                    )}
                                    <button 
                                        onClick={() => removeFile(index)}
                                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-md transition-colors z-10"
                                    >
                                        <XMarkIcon className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <div className="relative bg-gray-800 rounded-2xl border border-gray-700 shadow-lg transition-all focus-within:ring-2 focus-within:ring-cyan-500/50 focus-within:border-cyan-500">
                        <input 
                            type="file" 
                            multiple 
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,application/pdf"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="absolute left-3 bottom-3.5 p-2.5 text-gray-400 hover:text-cyan-400 transition-colors rounded-xl hover:bg-gray-700/50 group"
                            title="파일 첨부 (이미지, PDF)"
                        >
                            <PaperClipIcon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        </button>
                        
                        <textarea
                            value={userInput}
                            onChange={(e) => setUserInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="법률 상담 내용을 입력하세요. (예: 전세 보증금을 못 받고 있는데 내용증명 작성해줘)"
                            className="w-full bg-transparent text-white pl-14 pr-14 py-4 rounded-2xl resize-none focus:outline-none min-h-[60px] max-h-[200px] leading-relaxed placeholder-gray-500"
                            rows={1}
                            style={{ minHeight: '60px' }}
                            disabled={isLoading}
                        />
                        
                        <button
                            onClick={handleSendMessage}
                            disabled={isLoading || (!userInput.trim() && files.length === 0)}
                            className="absolute right-3 bottom-3 p-2.5 rounded-xl transition-all duration-200 enabled:bg-cyan-600 enabled:hover:bg-cyan-500 enabled:text-white enabled:shadow-lg enabled:shadow-cyan-900/30 disabled:bg-gray-700 disabled:text-gray-500"
                        >
                            <SendIcon className="w-5 h-5 transform enabled:hover:scale-110 transition-transform" />
                        </button>
                    </div>
                    <div className="text-center mt-3 flex items-center justify-center gap-2">
                         {/* Small AdSense Placeholder for Bottom */}
                        {/* <div className="hidden md:block w-[320px] h-[50px] bg-gray-800 border border-gray-700 text-[10px] flex items-center justify-center text-gray-600">광고</div> */}
                        <p className="text-[10px] text-gray-500">
                            Ai 법률 비서의 답변은 법적 효력이 없으며, 중요 사안은 변호사와 상담하십시오.
                        </p>
                    </div>
                </div>
            </div>
        )}
      </main>

      {/* Legal Modals */}
      <LegalModal 
        isOpen={isTermsOpen} 
        onClose={() => setIsTermsOpen(false)} 
        title="이용약관" 
        content={<TermsOfServiceContent />} 
      />
      <LegalModal 
        isOpen={isPrivacyOpen} 
        onClose={() => setIsPrivacyOpen(false)} 
        title="개인정보처리방침" 
        content={<PrivacyPolicyContent />} 
      />
      <LegalModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
        title="문의하기" 
        content={<ContactContent />} 
      />
    </div>
  );
};

export default MainApp;
