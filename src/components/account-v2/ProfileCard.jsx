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
          <div className="aspect-square mb-4 rounded-lg overflow-hidden bg-gray-100">
            <img
              src={
                preview ||
                "https://images.unsplash.com/photo-1494790108377-be9c29b29330"
              }
              alt="Profile"
              className="w-full h-full object-cover"
            />
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
