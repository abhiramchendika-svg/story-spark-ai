"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Post = exports.PostSchema = void 0;
const mongoose_1 = require("mongoose");
exports.PostSchema = new mongoose_1.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    tag: { type: String, required: true },
    imageURL: { type: String, required: true },
    topic: [
        {
            title: { type: String, required: true },
            color: { type: String, required: true },
            selected: { type: Boolean, required: true },
        },
    ],
    author: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    likesCount: { type: Number, default: 0 },
    commentsCount: { type: Number, default: 0 },
    viewsCount: { type: Number, default: 0 },
    isPublished: { type: Boolean, default: true },
    isFeaturedPost: { type: Boolean, default: false },
    publishedAt: { type: Date, default: new Date() },
    updatedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: null },
    attachments: [{ type: String }],
    comments: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Comment" }],
    reactions: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "Reaction" }],
    bookmarks: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User", default: [] }],
}, {
    timestamps: true,
});
exports.Post = (0, mongoose_1.model)("Post", exports.PostSchema);
