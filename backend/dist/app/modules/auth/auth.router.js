"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthRouter = void 0;
const express_1 = __importDefault(require("express"));
const auth_controller_1 = require("./auth.controller");
const validate_request_1 = __importDefault(require("../../middleware/validate.request"));
const user_validation_1 = require("../user/user.validation");
const router = express_1.default.Router();
// Login API route
router.post("/login", (0, validate_request_1.default)(user_validation_1.UserValidator.login), auth_controller_1.AuthController.login);
// Google Login API route
router.post("/google-login", auth_controller_1.AuthController.googleLogin);
// Register API route
router.post("/register", (0, validate_request_1.default)(user_validation_1.UserValidator.register), auth_controller_1.AuthController.register);
// Refresh Token API route
router.post("/refresh-token", auth_controller_1.AuthController.refreshToken);
exports.AuthRouter = router;
