import { instance as axios } from "../helpers/axios/axiosInstance";
import { Chapter } from "../types/story.types";

const BASE_URL = import.meta.env.VITE_BASE_URL;

export const continueStory = async (chapters: Chapter[]) => {
  const previousContent = chapters
    .map((chapter) => chapter.content)
    .join("\n\n");

  try {
    const response = await axios.post(
      `${BASE_URL}/story-continuation/continue`,
      {
        prompt: `
Continue this story naturally.

Rules:
- Maintain character consistency
- Keep emotional tone
- Avoid repetition
- Continue the narrative smoothly

Story:
${previousContent}
        `,
      }
    );

    return response.data.text;
  } catch (error) {
    console.error("Story continuation request failed:", error);
    throw new Error("Failed to continue story.");
  }
  return response.data.data.continuation;
};