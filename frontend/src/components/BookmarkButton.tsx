import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { getUserInfo } from "../services/auth.service";
import { useToggleBookmarkMutation } from "../redux/apis/bookmark.api";

interface BookmarkButtonProps {
  storyId: string;
  bookmarks?: any[];
  className?: string;
}

const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  storyId,
  bookmarks = [],
  className = "",
}) => {
  const navigate = useNavigate();
  const currentUser = getUserInfo();
  const [toggleBookmark] = useToggleBookmarkMutation();
  const [isLoading, setIsLoading] = useState(false);

  // Determine if currently bookmarked by logged in user
  const isCurrentlyBookmarked = bookmarks.some(
    (b: any) => b.email === currentUser?.email
  );

  const handleBookmark = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!currentUser || !currentUser.email) {
      toast.error("You need to login to bookmark stories!");
      navigate("/login");
      return;
    }

    setIsLoading(true);
    try {
      const response = await toggleBookmark(storyId).unwrap();
      if (response.success) {
        toast.success(response.message);
      }
    } catch (error: any) {
      console.error("Failed to toggle bookmark", error);
      toast.error(error?.data?.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleBookmark}
      disabled={isLoading}
      title={isCurrentlyBookmarked ? "Remove bookmark" : "Save story"}
      className={`!rounded-button cursor-pointer transition-all duration-300 border px-3 py-1 flex items-center justify-center hover:scale-105 active:scale-95 ${
        isCurrentlyBookmarked
          ? "text-purple-400 border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 hover:text-purple-300"
          : "hover:text-gray-400 border-gray-600 hover:border-gray-500"
      } ${className}`}
    >
      <i
        className={`${
          isCurrentlyBookmarked ? "fas" : "far"
        } fa-bookmark transition-transform duration-300 ${
          isLoading ? "animate-pulse" : ""
        }`}
      ></i>
    </button>
  );
};

export default BookmarkButton;
