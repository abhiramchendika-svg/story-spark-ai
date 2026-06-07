import React, { useState } from "react";
import { useSelector } from "react-redux";
import toast, { Toaster } from "react-hot-toast";
import jsPDF from "jspdf";

import { RootState } from "../../redux/store";
import { getUserInfo } from "../../services/auth.service";
import logo from "../../assets/logoNew.png";

import ChapterSidebar from "./ChapterSidebar";
import StoryViewer from "./StoryViewer";
import ContinueStoryButton from "./ContinueStoryButton";
import CharacterNetwork from "../CharacterNetwork";

import {
  getSafeFileName,
  downloadBlob,
  createWorkspaceDocxBlob,
} from "../../utils/story-export.utils";

const StoryWorkspace = () => {
  const currentStory = useSelector(
    (state: RootState) => state.story.currentStory
  );
  const [workspaceMode, setWorkspaceMode] = useState<"editor" | "network">("editor");

  const handleExportMarkdown = () => {
    if (!currentStory) {
      toast.error("No story available to export.");
      return;
    }
    try {
      const title = currentStory.title || "Story";
      const user = getUserInfo();
      const authorName = user?.name || "Anonymous";
      const isoDate = new Date().toISOString().split("T")[0];

      let chaptersContent = "";
      if (currentStory.chapters && currentStory.chapters.length > 0) {
        currentStory.chapters.forEach((chapter) => {
          chaptersContent += `## ${chapter.title}\n\n${chapter.content}\n\n`;
        });
      } else {
        chaptersContent = "*No chapters in this story.*";
      }

      const markdownContent = `---\ntitle: "${title.replace(/"/g, '\\"')}"\nauthor: "${authorName.replace(/"/g, '\\"')}"\ndate: "${isoDate}"\n---\n\n# ${title}\n\n${chaptersContent}`;
      const blob = new Blob([markdownContent], { type: "text/markdown;charset=utf-8;" });
      downloadBlob(blob, getSafeFileName(title, "md"));
      toast.success("Markdown downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export Markdown.");
    }
  };

  const handleExportPDF = async () => {
    if (!currentStory) {
      toast.error("No story available to export.");
      return;
    }
    const toastId = toast.loading("Preparing your premium PDF...");
    try {
      // Helper to load image assets asynchronously with a safe timeout
      const loadImageWithTimeout = (src: string, timeoutMs: number = 3000): Promise<HTMLImageElement> => {
        return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          const timeout = setTimeout(() => {
            img.src = ""; // stop loading
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
      try {
        logoImg = await loadImageWithTimeout(logo);
      } catch (err) {
        console.warn("Failed to load StorySparkAI logo for PDF", err);
      }

      // Initialize A4 PDF document (210mm x 297mm)
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const title = currentStory.title || "Untitled Story";
      const leftMargin = 20;
      const rightMargin = 20;
      const topMargin = 20;
      const bottomMargin = 20;
      const printableWidth = 210 - leftMargin - rightMargin; // 170 mm
      const maxY = 297 - bottomMargin - 10; // Bottom boundary (267mm) leaving room for footer

      let yCursor = topMargin;

      // 1. Header (Logo & Sub-header)
      if (logoImg) {
        const logoHeight = 8;
        const logoWidth = (logoImg.width / logoImg.height) * logoHeight;
        doc.addImage(logoImg, "PNG", leftMargin, yCursor, logoWidth, logoHeight);
      } else {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(14);
        doc.setTextColor(99, 102, 241); // Brand Indigo
        doc.text("StorySparkAI", leftMargin, yCursor + 6);
      }

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text("PREMIUM GENERATED STORY", 190, yCursor + 5, { align: "right" });

      yCursor += 10;

      // Header Divider Line
      doc.setDrawColor(99, 102, 241); // Brand Indigo
      doc.setLineWidth(0.5);
      doc.line(leftMargin, yCursor, 190, yCursor);

      yCursor += 8;

      // 2. Story Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(30, 41, 59); // Slate 800
      const splitTitle = doc.splitTextToSize(title, printableWidth);
      splitTitle.forEach((line: string) => {
        doc.text(line, leftMargin, yCursor);
        yCursor += 9;
      });

      yCursor += 1;

      // 3. Meta Row (Generated Date & Genre Pill Badge)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139); // Slate 500
      const formattedDate = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Generated on ${formattedDate}`, leftMargin, yCursor);

      // Genre pill badge on the right
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      const tag = "STORY";
      const tagWidth = doc.getTextWidth(tag);
      const chipWidth = tagWidth + 5;
      const chipHeight = 5;
      const chipX = 190 - chipWidth;
      const chipY = yCursor - 3.8;

      doc.setFillColor(99, 102, 241); // Brand Indigo background
      doc.roundedRect(chipX, chipY, chipWidth, chipHeight, 1, 1, "F");

      doc.setTextColor(255, 255, 255); // White text inside pill
      doc.text(tag, chipX + 2.5, chipY + 3.5);

      yCursor += 4.5;

      // Meta row bottom line
      doc.setDrawColor(226, 232, 240); // Slate 200
      doc.setLineWidth(0.2);
      doc.line(leftMargin, yCursor, 190, yCursor);

      yCursor += 10;

      // 4. Chapters Flowing
      if (currentStory.chapters && currentStory.chapters.length > 0) {
        currentStory.chapters.forEach((chapter, index) => {
          if (index > 0) {
            doc.addPage();
            yCursor = 30; // Top padding for subsequent pages
          }

          // Draw Chapter Title
          doc.setFont("helvetica", "bold");
          doc.setFontSize(14);
          doc.setTextColor(30, 41, 59); // Slate 800
          
          const chapterTitle = chapter.title || `Chapter ${index + 1}`;
          const splitChapterTitle = doc.splitTextToSize(chapterTitle, printableWidth);
          
          splitChapterTitle.forEach((line: string) => {
            if (yCursor > maxY) {
              doc.addPage();
              yCursor = 30;
            }
            doc.text(line, leftMargin, yCursor);
            yCursor += 7;
          });

          yCursor += 3; // Space after chapter title

          // Draw Chapter Content
          doc.setFont("helvetica", "normal");
          doc.setFontSize(11);
          doc.setTextColor(30, 41, 59); // Slate 800

          const paragraphs = (chapter.content || "").split(/\n+/);
          const lineHeight = 6.5;
          const paragraphSpacing = 4.5;

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
              doc.setTextColor(30, 41, 59); // Slate 800
              
              doc.text(line, leftMargin, yCursor);
              yCursor += lineHeight;
            });

            if (pIdx < paragraphs.length - 1) {
              if (yCursor > maxY) {
                doc.addPage();
                yCursor = 30;
              } else {
                yCursor += paragraphSpacing;
              }
            }
          });
        });
      } else {
        // No chapters text
        doc.setFont("helvetica", "italic");
        doc.setFontSize(11);
        doc.setTextColor(148, 163, 184);
        doc.text("No chapters in this story.", leftMargin, yCursor);
      }

      // 5. Running Header and Footer generation
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);

        // Footer line
        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.25);
        doc.line(leftMargin, 280, 190, 280);

        // Footer Text
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139); // Slate 500
        doc.text("Generated with StorySparkAI", leftMargin, 285);
        doc.text(`Page ${i} of ${totalPages}`, 190, 285, { align: "right" });

        // Header on pages 2+
        if (i > 1) {
          doc.setFont("helvetica", "bold");
          doc.setFontSize(8);
          doc.setTextColor(99, 102, 241); // Brand Indigo
          doc.text("StorySparkAI", leftMargin, 14);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(8);
          doc.setTextColor(148, 163, 184); // Slate 400
          const headerTitle = title.length > 50 ? title.substring(0, 50) + "..." : title;
          doc.text(headerTitle, 190, 14, { align: "right" });

          doc.setDrawColor(241, 245, 249);
          doc.setLineWidth(0.2);
          doc.line(leftMargin, 17, 190, 17);
        }
      }

      // Save PDF with sanitized name
      const safeTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "story";
      doc.save(`${safeTitle}.pdf`);
      toast.dismiss(toastId);
      toast.success("Premium PDF downloaded!");
    } catch (error) {
      console.error(error);
      toast.dismiss(toastId);
      toast.error("Failed to export PDF.");
    }
  };

  const handleExportDOCX = () => {
    if (!currentStory) {
      toast.error("No story available to export.");
      return;
    }
    try {
      const title = currentStory.title || "Story";
      const user = getUserInfo();
      const authorName = user?.name || "Anonymous";
      const formattedDate = new Date().toLocaleDateString(undefined, {
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      const blob = createWorkspaceDocxBlob({
        title,
        authorName,
        dateStr: formattedDate,
        chapters: currentStory.chapters || [],
      });

      downloadBlob(blob, getSafeFileName(title, "docx"));
      toast.success("DOCX downloaded!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to export DOCX.");
    }
  };

  if (!currentStory) {
    return (
      <div className="text-white p-10">
        No Story Available
      </div>
    );
  }

  return (
    <div className="flex bg-black h-screen">
      <Toaster position="top-right" reverseOrder={false} />
      <ChapterSidebar
        chapters={currentStory.chapters}
      />

      <div className="flex flex-col flex-1">
        <div className="flex justify-between items-center p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-white text-lg font-bold">{currentStory.title}</h2>
          <div className="flex items-center gap-3">
            <div className="flex bg-zinc-950 rounded-lg p-0.5 border border-zinc-800 mr-2">
              <button
                onClick={() => setWorkspaceMode("editor")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  workspaceMode === "editor"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                📖 Read Story
              </button>
              <button
                onClick={() => setWorkspaceMode("network")}
                className={`px-3 py-1.5 rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                  workspaceMode === "network"
                    ? "bg-indigo-600 text-white shadow"
                    : "text-slate-400 hover:text-slate-250"
                }`}
              >
                🕸️ Character Network
              </button>
            </div>
            <button
              onClick={handleExportMarkdown}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded shadow transition flex items-center gap-2 font-semibold cursor-pointer text-sm"
            >
              ⬇️ Markdown
            </button>
            <button
              onClick={handleExportDOCX}
              className="bg-zinc-700 hover:bg-zinc-600 text-white px-4 py-2 rounded shadow transition flex items-center gap-2 font-semibold cursor-pointer text-sm"
            >
              ⬇️ Word (DOCX)
            </button>
            <button
              onClick={handleExportPDF}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded shadow transition flex items-center gap-2 font-semibold cursor-pointer text-sm"
            >
              📄 Export as PDF
            </button>
          </div>
        </div>

        {workspaceMode === "editor" ? (
          <>
            <StoryViewer
              chapters={currentStory.chapters}
              storyId={currentStory.id}
            />

            <div className="p-6 border-t border-zinc-800">
              <ContinueStoryButton />
            </div>
          </>
        ) : (
          <CharacterNetwork storyId={currentStory.id} />
        )}
      </div>
    </div>
  );
};

export default StoryWorkspace;