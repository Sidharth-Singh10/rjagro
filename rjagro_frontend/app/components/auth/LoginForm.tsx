'use client'
import { useAuth } from "@/app/hooks/useAuth";
import { FormErrors } from "@/app/types/auth";
import api from "@/app/utils/api";
import axios from "axios";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import { Feather } from "lucide-react";
import Button from "@/app/components/ui/button";

export const LoginForm = () => {
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });
    const router = useRouter();


    const [errors, setErrors] = useState<FormErrors>({});
    const [isLoading, setIsLoading] = useState(false);
    const [apiError, setApiError] = useState('');

    const { login } = useAuth();

    const validateForm = () => {


        const newErrors: FormErrors = {};

        if (!formData.email) {
            newErrors.email = 'Email is required';
        } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (!formData.password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        setApiError('');

        if (!validateForm()) {
            return;
        }

        setIsLoading(true);

        try {

            const response = await api.post("/login", formData, {
                headers: { "Content-Type": "application/json" }
            });
            toast.success('Login successful!');

            login(response.data.user, response.data.token);

            // Redirect based on user role
            if (response.data.user.role === 'Admin') {
                router.push('/dashboard/v2');
            } else {
                router.push('/dashboard/user');
            }


        } catch (error) {
            if (axios.isAxiosError(error)) {
                setApiError(error.response?.data?.message || 'Login failed');
            } else {
                setApiError('An unexpected error occurred.');
            }
        } finally {
            setIsLoading(false);
        }
    };


    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        if (errors[name as keyof FormErrors]) {
            setErrors(prev => ({
                ...prev,
                [name]: ''
            }));
        }
    };

    return (
        <div className="min-h-dvh w-screen bg-brand-50 flex items-center justify-center p-4 relative">
            {/* Soft ambient depth on the flat background */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                    background:
                        "radial-gradient(600px circle at 20% 20%, rgba(52, 113, 74, 0.07), transparent 60%), radial-gradient(800px circle at 80% 85%, rgba(52, 113, 74, 0.05), transparent 60%)",
                }}
            />
            <div className="w-full max-w-md relative">
                <div className="bg-white rounded-2xl shadow-xl shadow-green-900/5 border border-gray-200/70 p-8">
                    <div className="text-center mb-8">
                        <div className="w-14 h-14 bg-green-600 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-sm">
                            <Feather className="w-7 h-7 text-white" strokeWidth={1.75} aria-hidden />
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight text-gray-900">Welcome back</h1>
                        <p className="text-gray-500 mt-1.5 text-sm">Sign in to your account</p>
                    </div>

                    {apiError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm" role="alert">
                            {apiError}
                        </div>
                    )}

                    <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Email address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                autoComplete="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:ring-2 focus:ring-green-500/30 focus:border-green-600 focus:outline-none ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                placeholder="you@example.com"
                            />
                            {errors.email && (
                                <p className="text-red-600 text-sm mt-1.5">{errors.email}</p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                autoComplete="current-password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full px-3.5 py-2.5 border rounded-lg text-sm text-gray-900 placeholder:text-gray-400 transition-colors duration-200 focus:ring-2 focus:ring-green-500/30 focus:border-green-600 focus:outline-none ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
                                    }`}
                                placeholder="Enter your password"
                            />
                            {errors.password && (
                                <p className="text-red-600 text-sm mt-1.5">{errors.password}</p>
                            )}
                        </div>

                        <Button type="submit" loading={isLoading} className="w-full py-2.5">
                            {isLoading ? 'Signing in…' : 'Sign in'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
};
