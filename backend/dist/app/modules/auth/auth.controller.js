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
exports.AuthController = void 0;
const http_status_1 = __importDefault(require("http-status"));
const auth_service_1 = require("./auth.service");
const config_1 = __importDefault(require("../../../config"));
const send_response_1 = __importDefault(require("../../../shared/send_response"));
const catch_async_1 = __importDefault(require("../../../shared/catch_async"));
const login = (0, catch_async_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const result = yield auth_service_1.AuthService.login(body);
    const { accessToken, refreshToken } = result;
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config_1.default.env === "production",
    });
    (0, send_response_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User login successfully!",
        data: { accessToken },
    });
}));
const register = (0, catch_async_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const result = yield auth_service_1.AuthService.register(body);
    const { accessToken, refreshToken } = result;
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config_1.default.env === "production",
    });
    (0, send_response_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User Register successfully!",
        data: { accessToken },
    });
}));
const refreshToken = (0, catch_async_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const token = req.headers.authorization;
    const result = yield auth_service_1.AuthService.refreshToken(token);
    const { accessToken } = result;
    (0, send_response_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "Got Access Token!",
        data: { accessToken },
    });
}));
const googleLogin = (0, catch_async_1.default)((req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
    const result = yield auth_service_1.AuthService.googleLogin(body);
    const { accessToken, refreshToken } = result;
    res.cookie("refreshToken", refreshToken, {
        httpOnly: true,
        secure: config_1.default.env === "production",
    });
    (0, send_response_1.default)(res, {
        statusCode: http_status_1.default.OK,
        success: true,
        message: "User logged in successfully with Google!",
        data: { accessToken },
    });
}));
exports.AuthController = {
    login,
    register,
    refreshToken,
    googleLogin,
};
