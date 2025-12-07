"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export type Language = "en" | "zh";

const translations = {
  en: {
    nav: {
      howItWorks: "How it works",
      theTribunal: "The Tribunal",
      liveMode: "Live Mode",
      dashboard: "Dashboard",
    },
    hero: {
      badge: "SpoonOS + Neo Hackathon",
      title: "AI Tribunal for Research Validation",
      subtitle: "Have a live voice conversation with four AI agents who adversarially debate and critique your research paper. Speak naturally, get instant feedback.",
      startTribunal: "Start Voice Tribunal",
      viewDashboard: "View Dashboard",
      stats: {
        experts: "4 Expert Agents",
        blockchain: "Blockchain Verified",
        instant: "Instant Results",
      },
    },
    tribunal: {
      badge: "The Tribunal",
      title: "Four Expert Perspectives",
      subtitle: "Four specialized agents analyze and debate your paper in real-time",
      agents: {
        skeptic: {
          name: "The Skeptic",
          description: "Questions everything, finds alternative explanations",
        },
        statistician: {
          name: "The Statistician",
          description: "Audits numbers, catches p-hacking and statistical errors",
        },
        methodologist: {
          name: "The Methodologist",
          description: "Evaluates experimental design and methodology",
        },
        ethicist: {
          name: "The Ethicist",
          description: "Identifies bias, conflicts of interest, and ethical issues",
        },
      },
    },
    howItWorks: {
      badge: "Process",
      title: "How It Works",
      subtitle: "A natural voice conversation that delivers rigorous analysis",
      features: {
        voice: {
          title: "Voice Conversation",
          description: "Speak naturally with agents and hear their responses aloud",
        },
        multiAgent: {
          title: "Multi-Agent Analysis",
          description: "Four specialized AI agents analyze your paper from different perspectives",
        },
        blockchain: {
          title: "Blockchain Verified",
          description: "Verdicts stored immutably on Neo blockchain + Mem0 memory",
        },
        instant: {
          title: "Instant Results",
          description: "Get comprehensive analysis in minutes, not weeks",
        },
      },
    },
    problem: {
      broken: "Peer review is broken.",
      issues: [
        "70% of studies fail to replicate",
        "Reviewers miss critical statistical errors",
        "Conflicts of interest go undetected",
      ],
      solution: "Adversarial Science fixes that.",
      fixes: [
        "Have a real conversation with AI reviewers",
        "Ask follow-up questions and get instant answers",
        "Verdicts are stored immutably on blockchain",
      ],
    },
    cta: {
      title: "Start a live tribunal conversation.",
      subtitle: "Upload your paper and speak directly with the AI agents. They'll analyze, debate, and answer your questions.",
      viewPast: "View Past Verdicts",
    },
    footer: {
      builtFor: "Built for SpoonOS + Neo Agentic Hackathon",
    },
    uploader: {
      title: "Start Live Tribunal",
      subtitle: "Upload a paper and have a live voice conversation with the AI agents",
      uploadPdf: "Upload PDF",
      pasteText: "Paste Text",
      titlePlaceholder: "Paper title (optional)",
      contentPlaceholder: "Paste the paper content here... (minimum 100 characters)",
      minChars: "minimum characters",
      startConversation: "Start Live Conversation",
      startingTribunal: "Starting Tribunal...",
      voiceNote: "Agents will speak their analysis aloud. You can respond with your voice.",
      dropzone: "Drag and drop your PDF here, or click to browse",
      maxSize: "Maximum file size: 10MB",
    },
    interactive: {
      title: "Live Tribunal",
      voiceEnabled: "Voice Enabled",
      startVoice: "Start a Voice Tribunal",
      submitDescription: "Submit a paper and have a natural voice conversation with the AI agents. They'll speak their analysis and you can respond with your voice.",
      submitPaper: "Submit Paper",
      uploadDescription: "Upload a PDF or paste text. The agents will analyze it and start speaking.",
      uploadPrimary: "Upload PDF or TXT file",
      clickBrowse: "Click to browse or drag and drop",
      orPasteText: "Or paste text",
      paperTitle: "Paper Title (Optional)",
      enterTitle: "Enter paper title...",
      paperContent: "Paper Content",
      pasteAbstract: "Paste your paper abstract or full text here...",
      characters: "characters (minimum 100 required)",
      voiceFirst: "Voice-first experience:",
      voiceFirstDesc: "Agents will speak their analysis aloud. Tap the microphone to respond with your voice.",
    },
    language: {
      notSupported: "Language Not Supported",
      notSupportedDesc: "This paper appears to be written in a language other than English or Chinese. Currently, we only support English and Chinese papers.",
      tryAgain: "Try Another Paper",
      detected: "Detected language",
    },
    verdict: {
      title: "Tribunal Verdict",
      transcript: "Transcript",
      agents: "Agents",
      participation: "Participation",
      summary: "Summary",
      recommendation: "Recommendation",
      criticalIssues: "Critical Issues",
      fatalFlaws: "Fatal Flaws",
      seriousConcerns: "Serious Concerns",
      minorIssues: "Minor Issues",
      blockchainVerification: "Blockchain Verification",
      neoTransaction: "Neo Transaction",
      aiozStorage: "AIOZ Storage",
      stored: "Stored",
      liveDebate: "Live Debate Transcript",
      noTranscript: "No transcript available.",
      transcriptHint: "The debate transcript will appear here after you interact with the agents.",
      confidence: "Confidence",
      totalCritiques: "Total Critiques Flagged",
      keyConcerns: "Key Concerns",
      userParticipation: "User Participation",
      interactionScore: "Interaction Score",
      yourMessages: "Your Messages",
      noUserMessages: "No user messages recorded",
      critiquesAddressed: "Critiques Addressed",
      outOf: "out of",
      fatalFlawsAddressed: "fatal flaws addressed",
      debateRoundsCompleted: "debate rounds completed",
      concernsIdentified: "concerns identified",
      critical: "critical",
      outOf100: "out of 100",
      poor: "Poor",
      acceptable: "Acceptable",
      good: "Good",
      excellent: "Excellent",
      playDebate: "Play Debate",
      downloadReport: "Download Report",
      strong: "Strong",
      moderate: "Moderate",
      weak: "Weak",
      seriousIssuesLabel: "Serious Issues",
      tribunalReachedVerdict: "THE TRIBUNAL HAS REACHED A VERDICT",
    },
    session: {
      liveTribunalSession: "Live Tribunal Session",
      tribunalInSession: "The tribunal is now in session for",
      agentsDeliberating: "Agents are deliberating...",
      speaking: "Speaking",
      isSpeaking: "is speaking...",
      agentSpeaking: "Agent speaking...",
      recording: "Recording...",
      tapToStop: "tap to stop",
      processing: "Processing...",
      tapMicrophone: "Tap the microphone to speak to the tribunal",
      typeInstead: "Type instead",
      hide: "Hide",
      requestVerdict: "Request Verdict",
      typeQuestion: "Type your question...",
      muteVoices: "Mute voices",
      enableVoices: "Enable voices",
      mem0Stored: "Mem0 Stored",
      neoPending: "Neo Pending",
    },
    agents: {
      theSkeptic: "The Skeptic",
      theStatistician: "The Statistician",
      theMethodologist: "The Methodologist",
      theEthicist: "The Ethicist",
      skeptic: "Skeptic",
      statistician: "Statistician",
      methodologist: "Methodologist",
      ethicist: "Ethicist",
    },
    severity: {
      fatalFlaw: "FATAL FLAW",
      seriousConcern: "SERIOUS CONCERN",
      minorIssue: "MINOR ISSUE",
      acceptable: "ACCEPTABLE",
      unknown: "UNKNOWN",
    },
    dashboard: {
      title: "Verdict Dashboard",
      subtitle: "View all tribunal verdicts stored in Mem0 memory",
      searchPlaceholder: "Search papers...",
      allPapers: "All Papers",
      recentVerdicts: "Recent Verdicts",
      noVerdicts: "No verdicts found",
      startFirst: "Start your first tribunal to see results here",
      startTribunal: "Start Tribunal",
      score: "Score",
      issues: "issues",
      viewDetails: "View Details",
      refresh: "Refresh",
      totalTribunals: "Total Tribunals",
      averageScore: "Average Score",
      highestScore: "Highest Score",
      lowestScore: "Lowest Score",
      papersVersionHistory: "Papers & Version History",
      trackPaperRevisions: "Track paper revisions and improvements across tribunal sessions",
      version: "version",
      versions: "versions",
      best: "Best",
      latest: "Latest",
      addRevision: "Add Revision",
      improvementTrends: "Improvement Trends",
      papersWithRevisions: "Papers with multiple revisions showing score changes",
      failedToLoad: "Failed to load data",
      backendHint: "Make sure the backend is running and Mem0 is configured.",
    },
  },
  zh: {
    nav: {
      howItWorks: "工作原理",
      theTribunal: "审判团",
      liveMode: "实时模式",
      dashboard: "仪表板",
    },
    hero: {
      badge: "SpoonOS + Neo 黑客松",
      title: "研究验证AI审判系统",
      subtitle: "与四位AI评审专家进行实时语音对话，他们会对您的研究论文进行对抗性辩论和批评。自然交流，即时反馈。",
      startTribunal: "开始语音审判",
      viewDashboard: "查看仪表板",
      stats: {
        experts: "4位专家评审",
        blockchain: "区块链验证",
        instant: "即时结果",
      },
    },
    tribunal: {
      badge: "审判团",
      title: "四位专家视角",
      subtitle: "四位专业AI评审实时分析和辩论您的论文",
      agents: {
        skeptic: {
          name: "怀疑论者",
          description: "质疑一切，寻找替代解释",
        },
        statistician: {
          name: "统计学家",
          description: "审核数据，发现p值操纵和统计错误",
        },
        methodologist: {
          name: "方法论专家",
          description: "评估实验设计和方法论",
        },
        ethicist: {
          name: "伦理学家",
          description: "识别偏见、利益冲突和伦理问题",
        },
      },
    },
    howItWorks: {
      badge: "流程",
      title: "工作原理",
      subtitle: "自然的语音对话带来严谨的分析",
      features: {
        voice: {
          title: "语音对话",
          description: "自然地与评审对话，听取他们的口头回应",
        },
        multiAgent: {
          title: "多专家分析",
          description: "四位专业AI评审从不同角度分析您的论文",
        },
        blockchain: {
          title: "区块链验证",
          description: "评判结果永久存储在Neo区块链和Mem0记忆中",
        },
        instant: {
          title: "即时结果",
          description: "几分钟内获得全面分析，而非数周",
        },
      },
    },
    problem: {
      broken: "同行评审已经失效。",
      issues: [
        "70%的研究无法复现",
        "评审员遗漏关键统计错误",
        "利益冲突未被察觉",
      ],
      solution: "对抗性科学解决这个问题。",
      fixes: [
        "与AI评审进行真实对话",
        "即时提问并获得答案",
        "评判结果永久存储在区块链上",
      ],
    },
    cta: {
      title: "开始一场实时审判对话。",
      subtitle: "上传您的论文，直接与AI评审对话。他们会分析、辩论并回答您的问题。",
      viewPast: "查看历史评判",
    },
    footer: {
      builtFor: "为SpoonOS + Neo Agentic黑客松构建",
    },
    uploader: {
      title: "开始实时审判",
      subtitle: "上传论文，与AI评审进行实时语音对话",
      uploadPdf: "上传PDF",
      pasteText: "粘贴文本",
      titlePlaceholder: "论文标题（可选）",
      contentPlaceholder: "在此粘贴论文内容...（至少100个字符）",
      minChars: "最少字符",
      startConversation: "开始实时对话",
      startingTribunal: "正在启动审判...",
      voiceNote: "评审将口头说出分析结果。您可以用语音回应。",
      dropzone: "拖放PDF文件到此处，或点击浏览",
      maxSize: "最大文件大小：10MB",
    },
    interactive: {
      title: "实时审判",
      voiceEnabled: "语音已启用",
      startVoice: "开始语音审判",
      submitDescription: "提交论文，与AI评审进行自然语音对话。他们会口头说出分析结果，您可以用语音回应。",
      submitPaper: "提交论文",
      uploadDescription: "上传PDF或粘贴文本。评审将分析并开始发言。",
      uploadPrimary: "上传PDF或TXT文件",
      clickBrowse: "点击浏览或拖放文件",
      orPasteText: "或粘贴文本",
      paperTitle: "论文标题（可选）",
      enterTitle: "输入论文标题...",
      paperContent: "论文内容",
      pasteAbstract: "在此粘贴论文摘要或全文...",
      characters: "个字符（至少需要100个）",
      voiceFirst: "语音优先体验：",
      voiceFirstDesc: "评审将口头说出分析结果。点击麦克风用语音回应。",
    },
    language: {
      notSupported: "不支持的语言",
      notSupportedDesc: "这篇论文似乎是用英语或中文以外的语言撰写的。目前，我们仅支持英文和中文论文。",
      tryAgain: "尝试另一篇论文",
      detected: "检测到的语言",
    },
    verdict: {
      title: "审判评定",
      transcript: "记录",
      agents: "评审",
      participation: "参与度",
      summary: "摘要",
      recommendation: "建议",
      criticalIssues: "关键问题",
      fatalFlaws: "致命缺陷",
      seriousConcerns: "严重问题",
      minorIssues: "次要问题",
      blockchainVerification: "区块链验证",
      neoTransaction: "Neo交易",
      aiozStorage: "AIOZ存储",
      stored: "已存储",
      liveDebate: "实时辩论记录",
      noTranscript: "暂无记录。",
      transcriptHint: "与评审互动后，辩论记录将显示在此处。",
      confidence: "置信度",
      totalCritiques: "标记的批评总数",
      keyConcerns: "主要关注点",
      userParticipation: "用户参与",
      interactionScore: "互动得分",
      yourMessages: "您的消息",
      noUserMessages: "未记录用户消息",
      critiquesAddressed: "已回应的批评",
      outOf: "共",
      fatalFlawsAddressed: "个致命缺陷已回应",
      debateRoundsCompleted: "轮辩论已完成",
      concernsIdentified: "个问题已识别",
      critical: "严重",
      outOf100: "满分100",
      poor: "差",
      acceptable: "可接受",
      good: "良好",
      excellent: "优秀",
      playDebate: "播放辩论",
      downloadReport: "下载报告",
      strong: "强",
      moderate: "中等",
      weak: "弱",
      seriousIssuesLabel: "严重问题",
      tribunalReachedVerdict: "审判团已作出裁决",
    },
    session: {
      liveTribunalSession: "实时审判会议",
      tribunalInSession: "审判团现在开始审议",
      agentsDeliberating: "评审正在讨论...",
      speaking: "发言中",
      isSpeaking: "正在发言...",
      agentSpeaking: "评审正在发言...",
      recording: "录音中...",
      tapToStop: "点击停止",
      processing: "处理中...",
      tapMicrophone: "点击麦克风与审判团对话",
      typeInstead: "改为输入",
      hide: "隐藏",
      requestVerdict: "请求裁决",
      typeQuestion: "输入您的问题...",
      muteVoices: "静音",
      enableVoices: "启用语音",
      mem0Stored: "Mem0已存储",
      neoPending: "Neo待处理",
    },
    agents: {
      theSkeptic: "怀疑论者",
      theStatistician: "统计学家",
      theMethodologist: "方法论专家",
      theEthicist: "伦理学家",
      skeptic: "怀疑论者",
      statistician: "统计学家",
      methodologist: "方法论专家",
      ethicist: "伦理学家",
    },
    severity: {
      fatalFlaw: "致命缺陷",
      seriousConcern: "严重问题",
      minorIssue: "次要问题",
      acceptable: "可接受",
      unknown: "未知",
    },
    dashboard: {
      title: "评判仪表板",
      subtitle: "查看存储在Mem0记忆中的所有审判评定",
      searchPlaceholder: "搜索论文...",
      allPapers: "所有论文",
      recentVerdicts: "最近的评判",
      noVerdicts: "未找到评判记录",
      startFirst: "开始您的第一次审判以查看结果",
      startTribunal: "开始审判",
      score: "评分",
      issues: "个问题",
      viewDetails: "查看详情",
      refresh: "刷新",
      totalTribunals: "审判总数",
      averageScore: "平均分数",
      highestScore: "最高分数",
      lowestScore: "最低分数",
      papersVersionHistory: "论文与版本历史",
      trackPaperRevisions: "跟踪论文修订和改进",
      version: "版本",
      versions: "版本",
      best: "最佳",
      latest: "最新",
      addRevision: "添加修订",
      improvementTrends: "改进趋势",
      papersWithRevisions: "显示分数变化的多版本论文",
      failedToLoad: "加载数据失败",
      backendHint: "请确保后端正在运行且Mem0已配置。",
    },
  },
};

type Translations = typeof translations.en;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem("language") as Language;
    if (saved && (saved === "en" || saved === "zh")) {
      setLanguageState(saved);
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem("language", lang);
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t: translations[language],
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
