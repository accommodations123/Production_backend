import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useApplyForJobMutation } from '@/store/api/hostApi';
import { toast } from 'sonner';
import { Loader2, Upload, FileText, X, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const ApplicationForm = ({ jobId, jobTitle, onSuccess, onCancel }) => {
    const { register, handleSubmit, formState: { errors }, watch, setValue } = useForm();
    const [applyForJob, { isLoading }] = useApplyForJobMutation();
    const [resumeFile, setResumeFile] = useState(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            // Basic validation
            if (file.size > 5 * 1024 * 1024) { // 5MB limit
                toast.error("File size must be less than 5MB");
                return;
            }
            const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!allowedTypes.includes(file.type)) {
                toast.error("Only PDF and Word documents are allowed");
                return;
            }
            setResumeFile(file);
            setValue('resume', file); // Manually set for react-hook-form validation if needed
        }
    };

    const onSubmit = async (data) => {
        if (!resumeFile) {
            toast.error("Please upload your resume");
            return;
        }

        const formData = new FormData();
        formData.append('jobId', jobId); // Sending Job ID
        formData.append('name', data.name);
        formData.append('email', data.email);
        formData.append('phone', data.phone);
        formData.append('linkedin', data.linkedin || '');
        formData.append('resume', resumeFile);

        try {
            await applyForJob(formData).unwrap();
            toast.success("Application submitted successfully!");
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error("Application failed:", error);
            toast.error(error?.data?.message || "Failed to submit application. Please try again.");
        }
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-blue-50/50 p-4 rounded-xl mb-6 border border-blue-100">
                <h3 className="text-sm font-medium text-blue-800">Applying for</h3>
                <p className="text-lg font-bold text-blue-900">{jobTitle}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Full Name</label>
                    <input
                        {...register('name', { required: "Name is required" })}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        placeholder="John Doe"
                    />
                    {errors.name && <span className="text-xs text-red-500">{errors.name.message}</span>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Email Address</label>
                    <input
                        type="email"
                        {...register('email', {
                            required: "Email is required",
                            pattern: { value: /^\S+@\S+$/i, message: "Invalid email format" }
                        })}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        placeholder="john@example.com"
                    />
                    {errors.email && <span className="text-xs text-red-500">{errors.email.message}</span>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Phone Number</label>
                    <input
                        {...register('phone', { required: "Phone number is required" })}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        placeholder="+91 98765 43210"
                    />
                    {errors.phone && <span className="text-xs text-red-500">{errors.phone.message}</span>}
                </div>

                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">LinkedIn/Portfolio (Optional)</label>
                    <input
                        {...register('linkedin')}
                        className="w-full h-11 px-4 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                        placeholder="https://linkedin.com/in/johndoe"
                    />
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Resume/CV</label>
                <div className={`relative border-2 border-dashed rounded-xl p-8 transition-colors text-center ${resumeFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50'}`}>
                    {resumeFile ? (
                        <div className="flex items-center justify-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                                <FileText className="w-6 h-6 text-green-600" />
                            </div>
                            <div className="text-left">
                                <p className="font-medium text-gray-900 line-clamp-1">{resumeFile.name}</p>
                                <p className="text-xs text-gray-500">{(resumeFile.size / 1024 / 1024).toFixed(2)} MB</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setResumeFile(null)}
                                className="p-2 rounded-full hover:bg-white/50 text-gray-500 hover:text-red-500 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
                                <Upload className="w-6 h-6 text-blue-600" />
                            </div>
                            <p className="text-sm font-medium text-gray-900 mb-1">Click to upload or drag and drop</p>
                            <p className="text-xs text-gray-500">PDF, DOC, DOCX (Max 5MB)</p>
                            <input
                                type="file"
                                accept=".pdf,.doc,.docx"
                                className="hidden"
                                id="resume-upload"
                                onChange={handleFileChange}
                            />
                            <label
                                htmlFor="resume-upload"
                                className="absolute inset-0 cursor-pointer"
                                aria-label="Upload Resume"
                            />
                        </>
                    )}
                </div>
            </div>

            <div className="flex gap-4 pt-4 border-t border-gray-100">
                <Button
                    type="button"
                    variant="outline"
                    className="flex-1 h-12"
                    onClick={onCancel}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    className="flex-1 h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Submitting...
                        </>
                    ) : (
                        "Submit Application"
                    )}
                </Button>
            </div>
        </form>
    );
};
