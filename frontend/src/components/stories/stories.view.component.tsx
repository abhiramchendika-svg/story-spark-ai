import React, { useEffect, useState, useRef, useMemo, Suspense } from "react";
import DOMPurify from "dompurify";
import { getShortenedText, ITopicData, topicsData, getWordCount, SELECTED_TOPIC_CLASSES } from "./stories.utils";
import toast, { Toaster } from "react-hot-toast";
import { useAntiGravityScroll } from "../../hooks/useAntiGravityScroll";
import { useCreatePostMutation, useDeletePostMutation } from "../../redux/apis/post.api";
import { useGetProfileInfoQuery } from "../../redux/apis/user.api";
import {
  fetchImageAsBlob,
  blobToBase64,
  exportStoryToPDF,
  exportStoryToEPUB
} from "../../services/export.service";
import BookmarkButton from "../BookmarkButton";
import logo from "../../assets/logoNew.png";
import StoryGeneratingAnimation from "../loading/story-generating-animation.component";
import AudioPlayer, { type AudioPlayerHandle, type NarrationPlaybackState } from "../AudioPlayer";
import { useLocation, useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setStory } from "../../redux/slices/storySlice";
import ContinueStoryButton from "../story/ContinueStoryButton";
import StoryCoverImage from "./StoryCoverImage";
import StoryVisualizer from "../story-visualizer/StoryVisualizer";

const StoryWorldMap = React.lazy(() => import("../story-map/StoryWorldMap"));
const StoryRemix = React.lazy(() => import("../remix/StoryRemix"));
import { useApiError } from "../../hooks/useApiError";
import {
  useGenerateAlternateEndingsMutation,
  useGenerateFreeAlternateEndingsMutation,
} from "../../redux/apis/ai.model.api";
import { useGenerateStoryVisualsMutation } from "../../redux/apis/story.visualizer.api";
import type { StoryboardScene } from "../../redux/apis/story.visualizer.api";
import ImageFallback from "../ImageFallback";
import ContinueStoryModal from "./ContinueStoryModal";

// --- Custom Error Classes & Helper Types ---
export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return "The AI service is currently busy. Please wait a moment and try again.";
    }
    if ([502, 503, 504].includes(error.status)) {
      return "The server took too long to respond. Please try again shortly.";
    }
    if (error.status >= 500) {
      return "A server error occurred. Please try again later.";
    }
  }
  if (error instanceof TypeError) {
    return "Could not reach the server. Please check your connection and try again.";
  }
  return "An unexpected error occurred. Please try again.";
}

export interface IStories {
  uuid: string;
  title: string;
  content: string;
  tag: string;
  imageURL: string;
  language?: string;
  genre?: string;
  emotions?: string[];
  enhancedPrompt?: string;
}

interface IPost extends IStories {
  topic: ITopicData[];
  isPublished?: boolean;
}

interface StoriesComponentProps {
  stories: IStories[];
  isLogin: boolean;
  setStories: (stories: IStories[]) => void;
  onPublishSuccess?: () => void;
  isLoading?: boolean;
}

interface IRelatedStoriesComponentProps {
  posts: { _id: string; title: string; [key: string]: unknown }[];
  currentPostId: string;
}

type StorySentenceSegment = {
  id: string;
  text: string;
  startWordIndex: number;
  endWordIndex: number;
};

const buildSentenceSegments = (content: string): StorySentenceSegment[] => {
  if (!content.trim()) return [];
  const sentenceMatches = content.match(/[^.!?]+[.!?]*\s*/g) ?? [content];
  const segments: StorySentenceSegment[] = [];
  let wordCursor = 0;

  sentenceMatches.forEach((sentence, index) => {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) return;
    const wordsInSentence = sentence.match(/\S+/g)?.length ?? 0;
    const startWordIndex = wordCursor;
    const endWordIndex = wordsInSentence > 0 ? wordCursor + wordsInSentence - 1 : wordCursor;

    segments.push({
      id: `${index}-${startWordIndex}-${endWordIndex}`,
      text: sentence,
      startWordIndex,
      endWordIndex,
    });
    wordCursor += wordsInSentence;
  });
  return segments;
};

const getSafeFileName = (title: string, extension: "md" | "docx"): string => {
  const safeTitle = (title || "story")
    .trim()
    .replace(/[^a-z0-9]+/gi, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();

  return `${safeTitle || "story"}.${extension}`;
};

const downloadBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();

  URL.revokeObjectURL(url);
};

const StoryRemixModal = StoryRemix as unknown as React.ComponentType<{
  story?: string;
  title?: string;
  selectedStory?: IStories;
  onClose?: () => void;
  onApplyRemix?: (content: string) => void;
}>;

const StoryWorldMapModal = StoryWorldMap as React.ComponentType<{
  story?: string;
  storyContent?: string;
  title?: string;
  onClose: () => void;
}>;

export const RelatedStoriesComponent: React.FC<IRelatedStoriesComponentProps> = ({ posts, currentPostId }) => {
  const navigate = useNavigate();
  const filteredPosts = posts.filter((post) => post._id !== currentPostId);

  return (
    <div className="mt-8">
      <h4 className="text-lg font-bold text-slate-200 mb-4">Related Content</h4>
      {filteredPosts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPosts.map((post) => (
            <div
              key={post._id}
              onClick={() => navigate(`/stories/${post._id}`)}
              className="p-4 bg-slate-700/40 rounded-xl border border-slate-600/30 cursor-pointer hover:bg-slate-700/60 transition-colors"
            >
              <p className="text-sm font-semibold text-white truncate">{post.title}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-slate-500 py-4 border border-dashed border-slate-700 rounded-xl">No related stories found.</p>
      )}
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────
const StoriesViewComponent: React.FC<StoriesComponentProps> = ({
  stories,
  isLogin,
  setStories,
  isLoading,
  onPublishSuccess,
}) => {
  const location = useLocation();
  const dispatch = useDispatch();
  const { setError, clearError } = useApiError();

  const storyScrollContainerRef = useRef<HTMLDivElement>(null);
  const {
    isPlaying: isAntiGravityPlaying,
    setIsPlaying: setIsAntiGravityPlaying,
    targetSpeed: antiGravitySpeed,
    setTargetSpeed: setAntiGravitySpeed,
  } = useAntiGravityScroll(storyScrollContainerRef);

  const audioPlayerRef = useRef<AudioPlayerHandle>(null);

  // States
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export states
  const [exportState, setExportState] = useState<"idle" | "processing" | "compiling" | "success" | "error">("idle");
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState<boolean>(false);
  const dropdownMenuRef = useRef<HTMLDivElement>(null);

  // Standard functional states
  const [selectedStory, setSelectedStory] = useState<IStories | null>(null);
  const [topics, setTopics] = useState<ITopicData[]>(topicsData);
  const [selectTopics, setSelectTopics] = useState<ITopicData[]>([]);
  const [newTopicTitle, setNewTopicTitle] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [showWorldMap, setShowWorldMap] = useState<boolean>(false);
  const [showRemix, setShowRemix] = useState<boolean>(false);
  const [showTranslator, setShowTranslator] = useState<boolean>(false);
  const [showStoryVisualizer, setShowStoryVisualizer] = useState<boolean>(false);
  const [storyboardScenes, setStoryboardScenes] = useState<StoryboardScene[]>([]);
  const [storyboardStyleGuide, setStoryboardStyleGuide] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  // Modals
  const [showContinueModal, setShowContinueModal] = useState<boolean>(false);

  const [createPost] = useCreatePostMutation();
  const [deletePost] = useDeletePostMutation();
  const { data: profile } = useGetProfileInfoQuery(undefined, { skip: !isLogin });
  
  const lastSavedContentRef = useRef<string>("");
  const isSavingRef = useRef<boolean>(false);
  const hasSavedSessionRef = useRef<boolean>(false);
  const savedPostIdRef = useRef<string | null>(null);

  // Endings State
  const [isGeneratingEndings, setIsGeneratingEndings] = useState<boolean>(false);
  const [activeEndingTab, setActiveEndingTab] = useState<string>("Happy Ending");
  const [endingsCache, setEndingsCache] = useState<{
    [uuid: string]: { style: string; ending: string; fullStory: string }[];
  }>({});
  const [originalStoryContent, setOriginalStoryContent] = useState<{
    [uuid: string]: string;
  }>({});

  const [narrationWordIndex, setNarrationWordIndex] = useState<number>(0);
  const [narrationState, setNarrationState] = useState<NarrationPlaybackState>("idle");

  const [generateAlternateEndings] = useGenerateAlternateEndingsMutation();
  const [generateFreeAlternateEndings] = useGenerateFreeAlternateEndingsMutation();
  const [generateStoryVisuals, { isLoading: isGeneratingVisuals }] = useGenerateStoryVisualsMutation();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownMenuRef.current && !dropdownMenuRef.current.contains(event.target as Node)) {
        setIsExportDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleExport = async (format: "pdf" | "epub") => {
    if (!selectedStory) return;
    
    setIsExportDropdownOpen(false);
    setExportState("processing");
    const toastId = toast.loading(`Preparing story for ${format.toUpperCase()} export...`);

    try {
      let imageBlob: Blob | null = null;
      let base64Image: string | null = null;

      if (selectedStory.imageURL) {
        try {
          imageBlob = await fetchImageAsBlob(selectedStory.imageURL);
          base64Image = await blobToBase64(imageBlob);
        } catch (err) {
          console.error("Could not fetch story illustration for export:", err);
          toast.error("Story illustration could not be loaded. Exporting text only.");
        }
      }

      setExportState("compiling");
      toast.loading(`Compiling ${format.toUpperCase()} file...`, { id: toastId });

      if (format === "pdf") {
        await exportStoryToPDF(selectedStory, base64Image);
      } else {
        await exportStoryToEPUB(selectedStory, imageBlob);
      }

      setExportState("success");
      toast.success(`${format.toUpperCase()} downloaded successfully!`, { id: toastId });
      setTimeout(() => setExportState("idle"), 2000);
    } catch (err) {
      console.error(`Failed to export to ${format}:`, err);
      setExportState("error");
      toast.error(`Failed to generate ${format.toUpperCase()}.`, { id: toastId });
      setTimeout(() => setExportState("idle"), 2000);
    }
  };

  const getExportButtonText = () => {
    switch (exportState) {
      case "processing":
        return "Processing Images...";
      case "compiling":
        return "Compiling Book...";
      case "success":
        return "Success!";
      case "error":
        return "Failed";
      default:
        return "📥 Export";
    }
  };

  useEffect(() => {
    if (selectedStory && !originalStoryContent[selectedStory.uuid]) {
      setOriginalStoryContent((prev) => ({
        ...prev,
        [selectedStory.uuid]: selectedStory.content,
      }));
    }
  }, [selectedStory, originalStoryContent]);

  useEffect(() => {
    setSelectTopics(topics.filter((topic) => topic.selected));
  }, [topics]);

  useEffect(() => {
    const player = audioPlayerRef.current;
    return () => {
      player?.stop();
    };
  }, [location.pathname]);

  useEffect(() => {
    setNarrationWordIndex(0);
    setNarrationState("idle");
    setErrorMessage(null);
  }, [selectedStory?.uuid]);

  const sentenceSegments = useMemo(() => {
    return buildSentenceSegments(selectedStory?.content ?? "");
  }, [selectedStory?.content]);

  useEffect(() => {
    if (stories && stories.length > 0) {
      setSelectedStory(stories[0]);
      dispatch(setStory({
        id: stories[0].uuid,
        title: stories[0].title,
        chapters: [{ id: 1, title: "Chapter 1", content: stories[0].content, createdAt: new Date().toISOString() }],
      }));
    } else {
      setSelectedStory(null);
    }
    lastSavedContentRef.current = "";
    hasSavedSessionRef.current = false;
    savedPostIdRef.current = null;
  }, [stories, dispatch]);

  useEffect(() => {
    const autoSaveStory = async () => {
      if (!isLogin || !selectedStory) return;
      if (selectedStory.content === lastSavedContentRef.current) return;
      if (hasSavedSessionRef.current) return;
      if (isSavingRef.current) return;

      isSavingRef.current = true;
      const post: IPost = {
        ...selectedStory,
        topic: selectTopics,
      };

      try {
        const result = await createPost(post).unwrap();
        if (result && result.data && result.data._id) {
          savedPostIdRef.current = result.data._id;
        }
        lastSavedContentRef.current = selectedStory.content;
        hasSavedSessionRef.current = true;
        toast.success("Story auto-saved!");
      } catch (error) {
        console.error("Auto-save failed", error);
      } finally {
        isSavingRef.current = false;
      }
    };

    const timer = setTimeout(() => {
      autoSaveStory();
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedStory, selectedStory?.content, isLogin, selectTopics, createPost]);

  const handelStorySelection = (story: IStories) => {
    setSelectedStory(story);
  };

  const handleTopicClick = (index: number) => {
    setTopics((currentTopics) =>
      currentTopics.map((topic, topicIndex) =>
        topicIndex === index ? { ...topic, selected: !topic.selected } : topic
      )
    );
  };

  const handleAddTopic = () => {
    const title = newTopicTitle.trim();
    if (!title) {
      toast.error("Please enter a topic.");
      return;
    }

    const normalizedTitle = title.startsWith("#") ? title : `#${title}`;
    const topicExists = topics.some(
      (topic) => topic.title.toLowerCase() === normalizedTitle.toLowerCase()
    );

    if (topicExists) {
      toast.error("This topic already exists.");
      return;
    }

    setTopics((currentTopics) => [
      ...currentTopics,
      {
        title: normalizedTitle,
        className: SELECTED_TOPIC_CLASSES,
        color: SELECTED_TOPIC_CLASSES,
        selected: true,
      },
    ]);
    setNewTopicTitle("");
  };

  const handleRemoveTopic = (index: number) => {
    if (topics.length <= 2) {
      toast.error("At least 2 topics are required.");
      return;
    }

    setTopics((currentTopics) =>
      currentTopics.filter((_, topicIndex) => topicIndex !== index)
    );
  };

  const handleCopyStory = async () => {
    if (selectedStory?.content) {
      await navigator.clipboard.writeText(selectedStory.content);
      setIsCopied(true);
      toast.success("Story copied!");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleExportPDF = async () => {
    if (!selectedStory) {
      toast.error("No story available to export.");
      return;
    }

    const toastId = toast.loading("Preparing your premium PDF...");
    try {
      const loadImageWithTimeout = (src: string, timeoutMs: number = 3000): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const timeout = setTimeout(() => {
            img.src = "";
            reject(new Error(`Timeout loading image: ${src}`));
          }, timeoutMs);

          img.onload = () => {
            clearTimeout(timeout);
            resolve(img);
          };
          img.onerror = (e) => {
            clearTimeout(timeout);
            reject(e);
          };
          img.src = src;
        });
      };

      let logoImg: HTMLImageElement | null = null;
      let storyImg: HTMLImageElement | null = null;

      try {
        logoImg = await loadImageWithTimeout(logo);
      } catch (err) {
        console.warn("Failed to load StorySparkAI logo for PDF", err);
      }

      if (selectedStory.imageURL) {
        try {
          storyImg = await loadImageWithTimeout(selectedStory.imageURL);
        } catch (err) {
          console.warn("Failed to load story banner image for PDF", err);
        }
      }

      const { default: jsPDF } = await import("jspdf");
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const title = selectedStory.title || "Untitled Story";
      const content = selectedStory.content || "";
      const tag = (selectedStory.tag || "STORY").toUpperCase();

      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = 20;
      const bottomMargin = 20;
      const printableWidth = 210 - leftMargin - rightMargin;
      const maxY = 297 - bottomMargin - 10;

      let yCursor = topMargin;

      if (logoImg) {
        const logoHeight = 8;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        doc.addImage(logoImg, "PNG", leftMargin, yCursor, logoWidth, logoHeight);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241);
        doc.text("StorySparkAI", leftMargin, yCursor + 6);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("PREMIUM AI GENERATED STORY", 190, yCursor + 5, { align: "right" });

      yCursor += 10;
      doc.setDrawColor(99, 102, 241);
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yCursor, 190, yCursor);

      yCursor += 8;

      if (storyImg) {
        const bannerHeight = 55;
        doc.addImage(storyImg, "JPEG", leftMargin, yCursor, printableWidth, bannerHeight);
        yCursor += bannerHeight + 8;
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59);
      const splitTitle = doc.splitTextToSize(title, printableWidth);
      splitTitle.forEach((line: string) => {
        doc.text(line, leftMargin, yCursor);
        yCursor += 9;
      });

      yCursor += 1;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      const formattedDate = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Generated on ${formattedDate}`, leftMargin, yCursor);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const tagWidth = doc.getTextWidth(tag);
      const chipWidth = tagWidth + 5;
      const chipHeight = 5;
      const chipX = 190 - chipWidth;
      const chipY = yCursor - 3.8;

      doc.setFillColor(99, 102, 241);
      doc.roundedRect(chipX, chipY, chipWidth, chipHeight, 1, 1, "F");

      doc.setTextColor(255, 255, 255);
      doc.text(tag, chipX + 2.5, chipY + 3.5);

      yCursor += 4.5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(leftMargin, yCursor, 190, yCursor);

      yCursor += 10;

      const paragraphs = content.split(/\n+/);
      const lineHeight = 6.5;
      const paragraphSpacing = 4.5;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 41, 59);

      paragraphs.forEach((para: string, pIdx: number) => {
        const cleanPara = para.trim();
        if (!cleanPara) return;

        const lines = doc.splitTextToSize(cleanPara, printableWidth);
        lines.forEach((line: string) => {
          if (yCursor > maxY) {
            doc.addPage();
            yCursor = 30;
          }
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59);
          doc.text(line, leftMargin, yCursor);
          yCursor += lineHeight;
        });

        if (pIdx < paragraphs.length - 1) {
          yCursor += paragraphSpacing;
        }
      });

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.25);
        doc.line(leftMargin, 280, 190, 280);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text("Generated with StorySparkAI", leftMargin, 285);
        doc.text(`Page ${i} of ${totalPages}`, 190, 285, { align: "right" });

        if (i > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(99, 102, 241);
          doc.text("StorySparkAI", leftMargin, 14);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184);
          const headerTitle = title.length > 50 ? title.substring(0, 50) + "..." : title;
          doc.text(headerTitle, 190, 14, { align: "right" });

          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(leftMargin, 17, 190, 17);
        }
      }

      const safeTitle = title.replace(/[^a-z0-9]/gi, "_").toLowerCase();
      doc.save(`${safeTitle}.pdf`);
      toast.dismiss(toastId);
      toast.success("Premium PDF downloaded!");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Failed to export PDF.");
    }
  };

  const handleExportMarkdown = () => {
    if (!selectedStory) {
      toast.error("No story available to export.");
      return;
    }

    try {
      const title = selectedStory.title || "Story";
      const content = selectedStory.content || "";
      const tag = selectedStory.tag || "General";
      const authorName = isLogin && profile?.name ? profile.name : "Anonymous";
      const isoDate = new Date().toISOString().split("T")[0];

      const cleanTitle = title.replace(/"/g, '\\"');
      const cleanTag = tag.replace(/"/g, '\\"');
      const cleanAuthor = authorName.replace(/"/g, '\\"');

      const markdownContent = `---
title: "${cleanTitle}"
tag: "${cleanTag}"
author: "${cleanAuthor}"
date: "${isoDate}"
---

# ${title}

${content}
`;

      const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      const fileName = title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "story";
      link.setAttribute("download", `${fileName}.md`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success("Markdown downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Markdown.");
    }
  };

  const handleExportDOCX = async () => {
    if (!selectedStory) {
      toast.error("No story available to export.");
      return;
    }
    const toastId = toast.loading("Preparing your DOCX file...");
    try {
      const { Document, Packer, Paragraph, TextRun } = await import("docx");
      const title = selectedStory.title || "Story";
      const content = selectedStory.content || "";
      const authorName = isLogin && profile?.name ? profile.name : "Anonymous";
      const isoDate = new Date().toISOString().split("T")[0];

      const doc = new Document({
        sections: [{
          properties: {},
          children: [
            new Paragraph({ children: [new TextRun({ text: title, bold: true, size: 32 })] }),
            new Paragraph({ children: [new TextRun({ text: `Author: ${authorName}`, size: 24 })] }),
            new Paragraph({ children: [new TextRun({ text: `Date: ${isoDate}`, size: 24 })] }),
            new Paragraph({ text: "" }),
            ...content.split(/\n+/).filter(para => para.trim() !== "").map(para => new Paragraph({
              children: [new TextRun({ text: para.trim(), size: 24 })],
              spacing: { after: 200 }
            }))
          ],
        }],
      });

      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "story"}.docx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.dismiss(toastId);
      toast.success("DOCX downloaded!");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Failed to export DOCX.");
    }
  };

  const handelPublishStory = async () => {
    if (!isLogin) {
      toast.error("Please login to publish the story.");
      return;
    }
    if (!selectedStory) {
      toast.error("No story available. Please generate a story first.");
      return;
    }
    if (selectTopics.length < 2) {
      toast.error("Please select at least 2 topics.");
      return;
    }
    const post: IPost = {
      ...selectedStory,
      topic: selectTopics,
      isPublished: true,
    };
    setLoading(true);
    try {
      if (savedPostIdRef.current) {
        try {
          await deletePost(savedPostIdRef.current).unwrap();
        } catch (deleteError) {
          console.warn("Failed to delete auto-saved draft before publishing:", deleteError);
        }
      }
      const result = await createPost(post).unwrap();
      if (result) {
        toast.success("Story published successfully!");
        setStories([]);
        setSelectedStory(null);
        onPublishSuccess?.();
      }
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateStoryVisuals = async () => {
    if (!selectedStory) {
      toast.error("No story available. Please generate a story first.");
      return;
    }

    const toastId = toast.loading("Generating visuals...");
    try {
      const res = await generateStoryVisuals({
        title: selectedStory.title,
        content: selectedStory.content,
        genre: selectedStory.genre,
        language: selectedStory.language,
      }).unwrap();

      if (res?.data?.scenes?.length) {
        setStoryboardScenes(res.data.scenes);
        setStoryboardStyleGuide(res.data.styleGuide);
        setShowStoryVisualizer(true);
        toast.success("Storyboard visuals generated successfully!");
      } else {
        toast.error("No storyboard scenes were returned.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate visuals. Please try again.");
    } finally {
      toast.dismiss(toastId);
    }
  };

  const handleGenerateAlternateEndings = async () => {
    if (!selectedStory) return;

    setErrorMessage(null);
    setIsGeneratingEndings(true);
    const toastId = toast.loading("Generating alternate endings...");

    try {
      const payload = {
        title: selectedStory.title,
        content: originalStoryContent[selectedStory.uuid] || selectedStory.content,
        tag: selectedStory.tag,
        language: selectedStory.language || "English",
      };

      const generationRequest = isLogin
        ? generateAlternateEndings(payload)
        : generateFreeAlternateEndings(payload);

      const res = await generationRequest.unwrap();

      if (!res || !Array.isArray(res.data)) {
        throw new Error("Unexpected response format from the AI service.");
      }

      setEndingsCache((prev) => ({ ...prev, [selectedStory.uuid]: res.data }));
      toast.success("Alternate endings generated successfully!");
    } catch (err: any) {
      console.error("[StoriesView Alternate Ending Flow Failure]:", err);
      const errObj = err as Record<string, any>;
      const errorStatus = errObj?.status || errObj?.data?.status;
      setError(
        errorStatus
          ? getErrorMessage(new ApiError(errorStatus, errObj?.data?.message || ""))
          : getErrorMessage(err)
      );
      toast.error("Failed to generate alternate endings.");
    } {
      toast.dismiss(toastId);
      setIsGeneratingEndings(false);
    }
  };

  const handleApplyEnding = (endingData: { style: string; ending: string; fullStory: string }) => {
    if (!selectedStory) return;
    const updatedStory = { ...selectedStory, content: endingData.fullStory };
    setSelectedStory(updatedStory);
    setStories(stories.map((s) => (s.uuid === selectedStory.uuid ? updatedStory : s)));
    toast.success(`${endingData.style} applied to story!`);
  };

  const handleResetEnding = () => {
    if (!selectedStory) return;
    const originalContent = originalStoryContent[selectedStory.uuid];
    if (!originalContent) return;
    const updatedStory = { ...selectedStory, content: originalContent };
    setSelectedStory(updatedStory);
    setStories(stories.map((s) => (s.uuid === selectedStory.uuid ? updatedStory : s)));
    toast.success("Reverted to original story ending!");
  };

  const calculateReadingTime = (content: string): number => {
    const words = getWordCount(content);
    return Math.max(1, Math.ceil(words / 200));
  };

  const isNarrationActive = narrationState !== "idle";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <StoryGeneratingAnimation />
      </div>
    );
  }

  if (!stories || !stories.length || !selectedStory) {
    return (
      <div className="w-full text-center text-slate-400 dark:text-slate-500 py-16">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-white/[0.02] border border-slate-200 dark:border-white/5 text-sm font-medium">
          No stories generated yet. Start by entering a prompt ✨
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-[#070b12] text-slate-100 transition-colors duration-300 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-8 pb-16 relative overflow-hidden box-border">
      {/* Premium Layered Ambient Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-gradient-to-br from-indigo-600/10 to-transparent rounded-full blur-[140px] pointer-events-none select-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-gradient-to-tl from-purple-600/10 to-transparent rounded-full blur-[140px] pointer-events-none select-none animate-pulse" />

      <Toaster position="top-right" reverseOrder={false} />
      
      {/* Error Banner */}
      {errorMessage && (
        <div className="error-banner mb-6 p-4 bg-amber-500/10 border border-amber-500/30 backdrop-blur-md rounded-xl text-amber-200/90 flex justify-between items-center animate-fadeIn relative z-20 shadow-[0_4px_20px_rgba(245,158,11,0.05)]">
          <div className="flex items-center gap-3">
            <span className="text-amber-400">⚠️</span>
            <p className="text-sm font-medium tracking-wide">{errorMessage}</p>
          </div>
          <button 
            onClick={() => setErrorMessage(null)} 
            className="text-xs uppercase font-bold tracking-wider hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 sm:gap-8 items-start relative z-10 w-full box-border">
        
        {/* ── Left Column: Main Editor Workspace ── */}
        <div className="col-span-1 lg:col-span-8 flex flex-col space-y-6 w-full box-border">
          
          {/* Main Title Row */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5 w-full box-border border-b border-white/5 pb-6">
            <div className="text-left">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400">
                {selectedStory.title}
              </h1>
              <div className="flex flex-wrap gap-2 select-none">
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 text-purple-300 border border-white/10 py-1 px-3 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                  🎭 {selectedStory.tag}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 text-blue-300 border border-white/10 py-1 px-3 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                  🌐 {selectedStory.language || "English"}
                </span>
                {selectedStory.emotions && selectedStory.emotions.length > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/5 text-emerald-300 border border-white/10 py-1 px-3 text-xs font-bold uppercase tracking-wider shadow-sm backdrop-blur-sm">
                    😊 {selectedStory.emotions.join(", ")}
                  </span>
                )}
              </div>
            </div>

            {/* Story Selection Carousels */}
            <div className="flex justify-start sm:justify-end shrink-0 select-none mt-4 sm:mt-0">
              <div className="flex -space-x-3 hover:space-x-1 transition-all duration-300">
                {stories.map((story) => (
                  <button
                    key={story.uuid}
                    className={`relative w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 transition-all duration-300 focus:outline-none overflow-hidden cursor-pointer shadow-lg ${
                      selectedStory?.uuid === story.uuid 
                        ? "border-purple-500 scale-110 z-20 ring-4 ring-purple-500/20" 
                        : "border-[#151c2c] hover:scale-110 hover:z-10"
                    }`}
                    onClick={() => handelStorySelection(story)}
                    title={story.title}
                  >
                    {story.imageURL ? (
                      <ImageFallback src={story.imageURL} alt={story.title} className="w-full h-full object-cover rounded-full" />
                    ) : (
                      <StoryCoverImage title={story.title} tag={story.tag} size="thumb" />
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Core Content Box Panel */}
          <div className="bg-[#0e131f]/90 backdrop-blur-2xl border border-white/5 p-6 sm:p-8 rounded-2xl sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-full box-border text-left relative overflow-hidden group/board">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
            
            {/* Controls Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-5 border-b border-white/5 select-none relative z-10">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Workspace Blueprint</h3>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className="rounded-xl px-3.5 py-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer" onClick={handleCopyStory}>
                  {isCopied ? "✓ Copied" : "📋 Copy"}
                </button>
                
                {/* Modern Export Dropdown */}
                <div className="relative inline-block text-left" ref={dropdownMenuRef}>
                  <button
                    type="button"
                    disabled={exportState !== "idle"}
                    onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                    className="rounded-xl px-3 py-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer flex items-center gap-2"
                  >
                    {getExportButtonText()} <i className="fa-solid fa-chevron-down text-[10px] text-slate-500" />
                  </button>
                  {isExportDropdownOpen && (
                    <div className="absolute left-0 sm:right-0 mt-2 z-50 w-52 rounded-xl bg-[#121826] border border-white/10 shadow-2xl p-1.5 animate-fadeIn backdrop-blur-xl">
                      <button onClick={handleExportPDF} className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors">
                        <span>📄</span> Premium PDF
                      </button>
                      <button onClick={() => handleExport("epub")} className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors">
                        <span>📘</span> Kindle EPUB
                      </button>
                      <button onClick={handleExportMarkdown} className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors">
                        <span>⬇️</span> Markdown
                      </button>
                      <button onClick={handleExportDOCX} className="w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wide text-slate-300 hover:bg-white/5 hover:text-white rounded-lg flex items-center gap-2.5 cursor-pointer transition-colors">
                        <span>📝</span> DOCX
                      </button>
                    </div>
                  )}
                </div>

                <button type="button" className="rounded-xl px-3.5 py-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer" onClick={() => setShowWorldMap(true)}>
                  🗺️ Map
                </button>
                <button type="button" className="rounded-xl px-3.5 py-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer" onClick={() => setShowRemix(true)}>
                  🔀 Remix
                </button>
                <button type="button" className="rounded-xl px-3.5 py-2 bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer" onClick={() => setShowTranslator(true)}>
                  🌍 Translate
                </button>
                <button type="button" className="rounded-xl px-3.5 py-2 bg-gradient-to-r from-purple-600/30 to-indigo-600/30 hover:from-purple-600/50 hover:to-indigo-600/50 text-purple-300 border border-purple-500/20 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer shadow-sm" onClick={() => setShowContinueModal(true)}>
                  ✦ Continue →
                </button>
                <button type="button" className={`rounded-xl px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-purple-600/10 active:scale-[0.97] cursor-pointer disabled:opacity-50 ${loading ? 'opacity-70' : ''}`} onClick={handelPublishStory} disabled={loading}>
                  {loading ? "Publishing..." : "Publish"}
                </button>
              </div>
            </div>

            {/* Enhanced Prompt Display Section */}
            {selectedStory.enhancedPrompt && (
              <div className="mb-6 p-4 bg-purple-500/[0.02] border border-purple-500/10 rounded-xl relative z-10 shadow-inner">
                <h4 className="text-xs font-black uppercase tracking-wider text-purple-400 mb-2.5 flex items-center gap-2 select-none">
                  <i className="fas fa-wand-magic-sparkles"></i> AI Enhanced Prompt
                </h4>
                <p className="text-slate-400 text-xs sm:text-sm italic break-words whitespace-pre-wrap m-0 leading-relaxed font-medium">
                  {selectedStory.enhancedPrompt}
                </p>
              </div>
            )}

            {/* Clean Typography Rendering Block */}
            <div id="story-content" className="w-full text-slate-300 text-sm sm:text-base leading-relaxed tracking-wide relative z-10 font-medium">
              <p className="break-words whitespace-pre-wrap m-0 text-slate-300/90">
                {sentenceSegments.length > 0 ? (
                  sentenceSegments.map((segment: StorySentenceSegment) => {
                    const isActiveSentence = isNarrationActive && narrationWordIndex >= segment.startWordIndex && narrationWordIndex <= segment.endWordIndex;
                    return (
                      <span
                        key={segment.id}
                        className={isActiveSentence ? "rounded bg-purple-500/10 px-1 py-0.5 text-white font-semibold shadow-[0_0_15px_rgba(168,85,247,0.1)] transition-all duration-200" : undefined}
                      >
                        {DOMPurify.sanitize(segment.text)}
                      </span>
                    );
                  })
                ) : (
                  DOMPurify.sanitize(selectedStory.content)
                )}
              </p>
            </div>

            {/* Audio Dock */}
            <div className="mt-8 pt-6 border-t border-white/5 w-full box-border relative z-10">
              <AudioPlayer 
                ref={audioPlayerRef} 
                text={selectedStory.content} 
                title={selectedStory.title} 
                onWordIndexChange={setNarrationWordIndex} 
                onPlaybackStateChange={setNarrationState} 
              />
            </div>
          </div>

          {/* Narrative Path Customization (Alternate Endings Hub) */}
          {selectedStory && (
            <div className="bg-[#0e131f]/90 backdrop-blur-xl border border-white/5 rounded-2xl sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
              
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 select-none">
                <div>
                  <h3 className="text-sm font-black uppercase tracking-[0.15em] text-slate-400">Narrative Path Modifications</h3>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wider mt-1.5">Branch out into unique storytelling variations.</p>
                </div>
                {selectedStory.content !== originalStoryContent[selectedStory.uuid] && (
                  <button
                    type="button"
                    onClick={handleResetEnding}
                    className="rounded-xl px-3.5 py-2 bg-red-500/5 hover:bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer flex items-center gap-1.5"
                  >
                    <i className="fa-solid fa-rotate-left"></i> Revert Original
                  </button>
                )}
              </div>

              {isGeneratingEndings ? (
                <div className="flex flex-col items-center justify-center py-12 select-none">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-white/5 border-t-purple-500 mb-4"></div>
                  <p className="text-xs font-black uppercase tracking-wider text-slate-500 animate-pulse">Running variant projection logic...</p>
                </div>
              ) : endingsCache[selectedStory.uuid]?.length > 0 ? (
                <div className="w-full box-border">
                  <div className="flex border-b border-white/5 mb-5 overflow-x-auto whitespace-nowrap scrollbar-none select-none w-full box-border">
                    {["Happy Ending", "Dark Ending", "Plot Twist Ending", "Open Ending", "Cliffhanger Ending"].map((name) => {
                      const endingData = (endingsCache[selectedStory.uuid] || []).find((e) => e.style === name);
                      const isApplied = endingData && selectedStory.content === endingData.fullStory;
                      
                      return (
                        <button
                          key={name}
                          type="button"
                          onClick={() => setActiveEndingTab(name)}
                          className={`px-4 py-3 font-bold text-xs uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                            activeEndingTab === name
                              ? "border-purple-500 text-purple-400 bg-white/5 rounded-t-xl"
                              : "border-transparent text-slate-500 hover:text-slate-300"
                          }`}
                        >
                          <span>{name}</span>
                          {isApplied && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shadow-[0_0_8px_rgba(16,185,129,0.6)]" />}
                        </button>
                      );
                    })}
                  </div>

                  {(() => {
                    const currentEndingData = (endingsCache[selectedStory.uuid] || []).find((e) => e.style === activeEndingTab);
                    if (!currentEndingData) return null;
                    const isCurrentlyApplied = selectedStory.content === currentEndingData.fullStory;
                    
                    return (
                      <div className="bg-[#121927]/60 rounded-xl p-5 border border-white/5 w-full box-border animate-fadeIn">
                        <div className="flex justify-between items-center mb-4 select-none w-full box-border">
                          <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">{activeEndingTab} Excerpt</h4>
                          <div>
                            {isCurrentlyApplied ? (
                              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                                <i className="fa-solid fa-circle-check" /> Active Node
                              </span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleApplyEnding(currentEndingData)}
                                className="rounded-xl px-4 py-2 bg-purple-600 text-white hover:bg-purple-500 text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.97] cursor-pointer shadow-md"
                              >
                                Apply Branch
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="space-y-4 w-full box-border">
                          <div className="bg-[#0a0d14] p-4 rounded-xl border border-white/5 leading-relaxed text-slate-300 text-xs sm:text-sm italic shadow-inner whitespace-pre-wrap text-left font-medium">
                            <p className="m-0">"{currentEndingData.ending}"</p>
                          </div>
                          
                          <details className="group border border-white/5 rounded-xl overflow-hidden bg-[#0a0d14]/40">
                            <summary className="list-none flex items-center justify-between p-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider hover:text-slate-300 cursor-pointer select-none">
                              <span>Preview Integrated Chronicle</span>
                              <span className="transition-transform duration-200 group-open:rotate-180 text-[8px]">▼</span>
                            </summary>
                            <div className="p-4 border-t border-white/5 text-xs text-slate-400 leading-relaxed max-h-56 overflow-y-auto whitespace-pre-wrap text-left font-medium">
                              {currentEndingData.fullStory}
                            </div>
                          </details>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 bg-white/[0.01] border border-dashed border-white/10 rounded-2xl select-none w-full box-border">
                  <button
                    type="button"
                    onClick={handleGenerateAlternateEndings}
                    className="rounded-xl px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold uppercase tracking-wider shadow-lg shadow-purple-600/10 transition-all hover:scale-105 active:scale-[0.97] flex items-center gap-2 cursor-pointer"
                  >
                    <i className="fa-solid fa-shuffle text-xs" /> Transform Endings
                  </button>
                  <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-3.5 text-center max-w-sm px-4 uppercase tracking-wide">
                    Produces 5 structural deviations including Happy, Dark, Plot Twist, Open, and Cliffhanger resolutions.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Categorization Index Filters Tag Section */}
          <div className="bg-[#0e131f]/90 backdrop-blur-xl border border-white/5 p-5 sm:p-6 rounded-2xl sm:rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.3)] w-full box-border text-left relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />
            <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4 select-none">Categorization Indexes</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-5 select-none w-full box-border">
              <input
                type="text"
                value={newTopicTitle}
                onChange={(event) => setNewTopicTitle(event.target.value)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); handleAddTopic(); } }}
                placeholder="Add contextual keyword index tag..."
                className="flex-1 rounded-xl border border-white/5 bg-[#121826] px-4 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 focus:border-purple-500/30 focus:outline-none transition-colors shadow-inner"
              />
              <button type="button" className="rounded-xl px-4 py-2.5 bg-white text-slate-900 text-xs font-bold uppercase tracking-wider hover:bg-slate-100 transition-colors active:scale-[0.97] cursor-pointer" onClick={handleAddTopic}>
                Add Tag
              </button>
            </div>
            <div className="flex flex-wrap gap-2 w-full box-border">
              {topics.map((topic, index) => (
                <span key={index} className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all border select-none ${
                  topic.selected 
                    ? "bg-purple-500/10 text-purple-300 border-purple-500/20 shadow-[0_0_12px_rgba(168,85,247,0.1)]" 
                    : "bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white"
                }`}>
                  <button type="button" className="cursor-pointer font-bold uppercase flex items-center gap-1.5" onClick={() => handleTopicClick(index)}>
                    {topic.selected ? <i className="fa-solid fa-check text-purple-400" /> : <i className="fa-solid fa-plus text-slate-500" />} {topic.title}
                  </button>
                  <button type="button" className="cursor-pointer border-l border-current/10 pl-2 opacity-40 hover:opacity-100 disabled:cursor-not-allowed" onClick={() => handleRemoveTopic(index)} disabled={topics.length <= 2}>
                    <i className="fa-solid fa-xmark" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Column: Premium Compilation Showcase ── */}
        <div className="col-span-1 lg:col-span-4 lg:sticky lg:top-6 w-full box-border">
          <div className="mb-4 text-left select-none px-0.5">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Compilation Showcase</h2>
          </div>
          
          {/* Glassmorphic Interactive Trading Card Container Layout */}
          <div className="bg-[#0e131f]/90 backdrop-blur-2xl border border-white/5 rounded-2xl sm:rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.4)] overflow-hidden group/card relative w-full box-border text-left transition-all duration-300 hover:border-purple-500/20 hover:-translate-y-1">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-purple-500/30 to-transparent" />
            
            <div className="flex flex-col w-full box-border">
              <div className="relative p-3 overflow-hidden text-white w-full box-border h-48">
                {selectedStory?.imageURL ? (
                  <ImageFallback
                    src={selectedStory.imageURL}
                    alt="card-image"
                    className="w-full h-full object-cover rounded-xl transition-transform duration-500 group-hover/card:scale-105"
                  />
                ) : (
                  <StoryCoverImage title={selectedStory?.title} tag={selectedStory?.tag} size="full" style={{ height: "100%", borderRadius: "1rem" }} />
                )}
                <div className="absolute top-5 right-5 z-20">
                  <BookmarkButton storyId={selectedStory.uuid} />
                </div>
              </div>

              <div className="p-5 sm:p-6 w-full box-border relative">
                <div className="flex justify-between items-center mb-4 w-full box-border select-none">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <div className="inline-flex items-center rounded-lg bg-purple-500/10 border border-purple-500/10 py-1 px-2.5 text-[10px] font-black uppercase tracking-wider text-purple-400">
                      {selectedStory?.tag ?? "GENERAL"}
                    </div>
                    <div className="inline-flex items-center rounded-lg bg-blue-500/10 border border-blue-500/10 py-1 px-2.5 text-[10px] font-black uppercase tracking-wider text-blue-400">
                      🌐 {selectedStory?.language ?? "EN"}
                    </div>
                  </div>
                </div>

                <h3 className="mb-2.5 text-white text-lg font-black tracking-tight leading-snug group-hover/card:text-purple-400 transition-colors">
                  {selectedStory?.title}
                </h3>
                
                {/* Truncated line-clamped summary section layout */}
                <p className="text-slate-400 font-medium break-words text-xs sm:text-sm leading-relaxed m-0 line-clamp-3 min-h-[54px]">
                  {selectedStory ? getShortenedText(selectedStory.content, 140) : ""}
                </p>
                
                <div className="mt-5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[10px] font-black uppercase tracking-[0.15em] text-slate-500 select-none">
                  <span>Limited AI Core</span>
                  <span>StorySpark v1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Modals Deployment Overlays Portal ── */}
      {showWorldMap && selectedStory && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md">Loading Map Engine...</div>}>
          <StoryWorldMapModal story={selectedStory.content} title={selectedStory.title} onClose={() => setShowWorldMap(false)} />
        </Suspense>
      )}

      {showRemix && selectedStory && (
        <Suspense fallback={<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 text-white text-xs font-bold uppercase tracking-widest backdrop-blur-md">Loading Remix Engine...</div>}>
          <StoryRemixModal
            story={selectedStory.content}
            title={selectedStory.title}
            selectedStory={selectedStory}
            onClose={() => setShowRemix(false)}
            onApplyRemix={(content: string) => {
              const updatedStory = { ...selectedStory, content };
              setSelectedStory(updatedStory);
              setStories(stories.map((story) => (story.uuid === selectedStory.uuid ? updatedStory : story)));
              setShowRemix(false);
            }}
          />
        </Suspense>
      )}

      {showStoryVisualizer && storyboardScenes.length > 0 && (
        <StoryVisualizer title={selectedStory?.title ?? ""} scenes={storyboardScenes} styleGuide={storyboardStyleGuide} onClose={() => setShowStoryVisualizer(false)} />
      )}

      {showContinueModal && selectedStory && (
        <ContinueStoryModal
          story={{ title: selectedStory.title, content: selectedStory.content, language: selectedStory.language ?? "English" }}
          onClose={() => setShowContinueModal(false)}
        />
      )}
    </div>
  );
};

export default StoriesViewComponent;