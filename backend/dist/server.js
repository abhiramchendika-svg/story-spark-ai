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
exports.default = handler;
const mongoose_1 = __importDefault(require("mongoose"));
const config_1 = __importDefault(require("./config"));
const app_1 = __importDefault(require("./app"));
const dns_1 = __importDefault(require("dns"));
const http_1 = __importDefault(require("http"));
const socket_io_1 = require("socket.io");
const jwt_helper_1 = require("./utils/jwt.helper");
const notification_socket_1 = require("./socket/notification.socket");
dns_1.default.setServers(["1.1.1.1", "8.8.8.8"]);
function connectDB() {
    return __awaiter(this, void 0, void 0, function* () {
        if (mongoose_1.default.connection.readyState === 1)
            return;
        yield mongoose_1.default.connect(config_1.default.database_url);
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        try {
            console.log(config_1.default.database_url);
            yield connectDB();
            const httpServer = http_1.default.createServer(app_1.default);
            const io = new socket_io_1.Server(httpServer, {
                cors: {
                    origin: ((_a = config_1.default.cors_origins) === null || _a === void 0 ? void 0 : _a.length)
                        ? config_1.default.cors_origins
                        : ["http://localhost:4001", "https://storysparkai.vercel.app"],
                    credentials: true,
                },
            });
            (0, notification_socket_1.setNotificationSocket)(io);
            io.use((socket, next) => {
                var _a;
                try {
                    const token = (_a = socket.handshake.auth) === null || _a === void 0 ? void 0 : _a.token;
                    if (!token) {
                        return next(new Error("Unauthorized"));
                    }
                    const verifiedUser = jwt_helper_1.JwtHalers.verifyToken(token, config_1.default.jwt.secret);
                    const userId = verifiedUser.userId || verifiedUser.sub || verifiedUser.id;
                    if (!userId) {
                        return next(new Error("Unauthorized"));
                    }
                    socket.data.userId = userId.toString();
                    next();
                }
                catch (error) {
                    next(new Error("Unauthorized"));
                }
            });
            io.on("connection", (socket) => {
                const userId = socket.data.userId;
                if (userId) {
                    socket.join(`user:${userId}`);
                }
            });
            httpServer.listen(config_1.default.port, () => {
                console.log(`Story-Spark-AI app listening on port ${config_1.default.port}`);
            });
        }
        catch (error) {
            console.error("Error connecting to the database:", error);
        }
    });
}
/**
 * Vercel (@vercel/node) invokes the default export; Express alone must not call listen().
 */
function handler(req, res) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield connectDB();
        }
        catch (error) {
            console.error("Error connecting to the database:", error);
            res.status(500).json({
                success: false,
                message: "Database unavailable",
            });
            return;
        }
        app_1.default(req, res);
    });
}
if (process.env.VERCEL !== "1") {
    void main();
}
