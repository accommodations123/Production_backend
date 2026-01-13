import React, { useState, useEffect } from "react";

export const ProfileCard = ({ user, onUpdate, isLoading }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);

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

    // ✅ MUST MATCH BACKEND (multer field name)
    fd.append("profile_image", file);

    onUpdate(fd);
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm border">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
            {preview ? (
              <img
                src={preview}
                alt="Profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                <svg className="w-20 h-20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 20.993V24H0v-2.996A14.977 14.977 0 0112.004 15c4.904 0 9.26 2.354 11.996 5.993zM16.002 8.999a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            )}
          </div>

          <input
            type="file"
            accept="image/*"
            id="profile_image"
            onChange={handleImageChange}
            className="hidden"
          />

          <label
            htmlFor="profile_image"
            className="block text-center px-4 py-2 bg-gray-100 rounded cursor-pointer hover:bg-gray-200 text-sm mb-3"
          >
            Choose New Photo
          </label>

          <button
            type="submit"
            disabled={!file || isLoading}
            className="w-full bg-blue-500 text-white py-2 rounded disabled:bg-blue-300"
          >
            {isLoading ? "Updating..." : "Update Profile Picture"}
          </button>
        </div>
      </form>
    </div>
  );
};
