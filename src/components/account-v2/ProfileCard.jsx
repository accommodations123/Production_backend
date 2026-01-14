import React, { useState, useEffect } from "react";
import { Camera, Check, Upload } from "lucide-react";

export const ProfileCard = ({ user, onUpdate, isLoading }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setPreview(user?.profile_image || null);
    setFile(null);
  }, [user?.profile_image]);

  const handleImageChange = (e) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    if (!selected.type.startsWith("image/")) {
      alert("Only image files are allowed");
      return;
    }

    if (selected.size > 5 * 1024 * 1024) {
      alert("Image must be under 5MB");
      return;
    }

    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select an image");
      return;
    }

    const fd = new FormData();
    fd.append("profile_image", file);
    onUpdate(fd);
  };

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 shadow-xl border border-gray-100">
      {/* Decorative Background Elements */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400/10 to-purple-400/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-pink-400/10 to-orange-400/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2"></div>

      <form onSubmit={handleSubmit} className="relative z-10">
        <div className="mb-6">
          {/* Profile Image Container */}
          <div
            className="relative mx-auto w-40 h-40 mb-6 group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-full blur-md opacity-50 group-hover:opacity-75 transition-opacity duration-300"></div>

            <div className="relative w-full h-full rounded-full overflow-hidden border-4 border-white shadow-lg">
              {preview ? (
                <img
                  src={preview}
                  alt="Profile"
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                  <svg className="w-16 h-16 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                </div>
              )}

              {/* Hover Overlay */}
              <div className={`absolute inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
                <label htmlFor="profile_image" className="cursor-pointer">
                  <Camera className="w-8 h-8 text-white" />
                </label>
              </div>
            </div>

            {/* Change Photo Badge */}
            <label
              htmlFor="profile_image"
              className="absolute bottom-0 right-0 bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2.5 rounded-full cursor-pointer shadow-lg hover:shadow-xl transform hover:scale-110 transition-all duration-200"
            >
              <Camera className="w-4 h-4" />
            </label>
          </div>

          <input
            type="file"
            accept="image/*"
            id="profile_image"
            onChange={handleImageChange}
            className="hidden"
          />

          {/* User Info */}
          <div className="text-center mb-6">
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {user?.full_name || user?.name || "Your Name"}
            </h3>
            <p className="text-sm text-gray-500">Update your profile picture</p>
          </div>

          {/* File Selected Indicator */}
          {file && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-sm text-green-700">
              <Check className="w-4 h-4" />
              <span className="font-medium">New photo selected</span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2">
            <label
              htmlFor="profile_image"
              className="flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 text-sm font-medium text-gray-700 hover:text-blue-600"
            >
              <Upload className="w-4 h-4" />
              Choose New Photo
            </label>

            <button
              type="submit"
              disabled={!file || isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg transform hover:-translate-y-0.5 transition-all duration-200 font-semibold text-sm flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Updating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Update Profile Picture
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
