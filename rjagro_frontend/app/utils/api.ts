// src/utils/api.ts
import axios, {
    AxiosInstance,
    InternalAxiosRequestConfig,
    AxiosRequestHeaders,
} from "axios";
import Cookies from "js-cookie";

const api: AxiosInstance = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL ?? "https://your-backend.com",
    withCredentials: true,
});

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    const token = Cookies.get("token");
    if (!token) return config;
    // console.log("token is:: ", token);


    const prevHeaders = config.headers as unknown;

    if (prevHeaders && typeof (prevHeaders as any).set === "function") {
        // in production, add Bearer prefix
        (prevHeaders as any).set("Authorization", `${token}`);
        config.headers = prevHeaders as AxiosRequestHeaders;
        // console.log("Headers after setting token:", config.headers);
    } else {
        const plain = (prevHeaders as Record<string, string> | undefined) ?? {};
        config.headers = {
            ...plain,
            Authorization: `${token}`,
        } as AxiosRequestHeaders;
    }
    return config;
}, (error) => Promise.reject(error));

export default api;
