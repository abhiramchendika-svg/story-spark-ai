"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommentService = void 0;
const api_error_1 = __importDefault(require("../../../errors/api_error"));
const user_model_1 = require("../user/user.model");
const http_status_1 = __importDefault(require("http-status"));
const comment_model_1 = require("./comment.model");
const mongoose_1 = require("mongoose");
const post_model_1 = require("../post/post.model");
const createComment = (payload, token) => __awaiter(void 0, void 0, void 0, function* () {
    const { _id, email } = token;
    const user = _id ? yield user_model_1.User.findById(_id) : yield user_model_1.User.findOne({ email });
    if (!user) {
        throw new api_error_1.default(http_status_1.default.BAD_REQUEST, "User not found!");
    }
    const post = yield post_model_1.Post.findOne({ _id: payload.postId });
    if (!post) {
        throw new api_error_1.default(http_status_1.default.BAD_REQUEST, "Post not found!");
    }
    post.commentsCount = post.commentsCount + 1;
    yield post.save();
    const commentData = {
        postId: new mongoose_1.Types.ObjectId(payload.postId),
        userId: user._id,
        comment: payload.comment,
    };
    if (payload.parentCommentId) {
        commentData.parentCommentId = new mongoose_1.Types.ObjectId(payload.parentCommentId);
    }
    const res = yield comment_model_1.Comment.create(commentData);
    return res;
});
const getCommentsByPostId = (postId) => __awaiter(void 0, void 0, void 0, function* () {
    const comments = yield comment_model_1.Comment.find({ postId, parentCommentId: null })
        .populate("userId", "name email")
        .populate({
        path: "likes",
    })
        .sort({ createdAt: -1 });
    const commentsWithReplies = yield Promise.all(comments.map((comment) => __awaiter(void 0, void 0, void 0, function* () {
        const replies = yield comment_model_1.Comment.find({ parentCommentId: comment._id })
            .populate("userId", "name email")
            .populate({ path: "likes" })
            .sort({ createdAt: 1 });
        return Object.assign(Object.assign({}, comment.toObject()), { replies });
    })));
    const totalComments = yield comment_model_1.Comment.countDocuments({ postId });
    return { comments: commentsWithReplies, totalComments };
});
const toggleCommentLike = (commentId, token) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const { _id, email } = token;
    const user = _id ? yield user_model_1.User.findById(_id) : yield user_model_1.User.findOne({ email });
    if (!user) {
        throw new api_error_1.default(http_status_1.default.BAD_REQUEST, "User not found!");
    }
    const comment = yield comment_model_1.Comment.findById(commentId);
    if (!comment) {
        throw new api_error_1.default(http_status_1.default.BAD_REQUEST, "Comment not found!");
    }
    const hasLiked = (_a = comment.likes) === null || _a === void 0 ? void 0 : _a.includes(user._id);
    if (hasLiked) {
        comment.likes = (_b = comment.likes) === null || _b === void 0 ? void 0 : _b.filter((id) => id.toString() !== user._id.toString());
    }
    else {
        (_c = comment.likes) === null || _c === void 0 ? void 0 : _c.push(user._id);
    }
    yield comment.save();
    return comment;
});
exports.CommentService = {
    createComment,
    getCommentsByPostId,
    toggleCommentLike,
};
