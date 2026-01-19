'use client'
import { useAuth } from "@/app/hooks/useAuth";
import { FormErrors } from "@/app/types/auth";
import api from "@/app/utils/api";
import axios from "axios";
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';



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
            console.log('Submitting login form with data:', formData);

            const response = await api.post("/login", formData, {
                headers: { "Content-Type": "application/json" }
            });
            toast.success('Login successful!');

            login(response.data.user, response.data.token);
            console.log('Login successful:', response.data);
            router.push('/dashboard/v2');


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
        <div className="min-h-screen w-screen bg-gradient-to-br from-orange-50 via-orange-100 to-orange-200 flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <div className="text-center mb-8">
                        <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-gray-800">Welcome Back</h2>
                        <p className="text-gray-600 mt-2">Sign in to your account</p>
                    </div>

                    {apiError && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                            <div className="flex items-center">
                                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                {apiError}
                            </div>
                        </div>
                    )}

                    <div className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-black transition-colors ${errors.email ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                                placeholder="Enter your email"
                            />
                            {errors.email && (
                                <p className="text-red-600 text-sm mt-1 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                id="password"
                                name="password"
                                value={formData.password}
                                onChange={handleChange}
                                className={`w-full px-4 py-3 text-black border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors ${errors.password ? 'border-red-300 bg-red-50' : 'border-gray-300'
                                    }`}
                                placeholder="Enter your password"
                            />
                            {errors.password && (
                                <p className="text-red-600 text-sm mt-1 flex items-center">
                                    <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                    </svg>
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={isLoading}
                            className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Signing in...
                                </>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <p className="text-sm text-gray-600">
                            Don&apos;t have an account?{' '}
                            <a href="#" className="text-orange-500 hover:text-orange-600 font-medium">
                                Sign up
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};