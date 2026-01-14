const API_URL = import.meta.env.PROD
    ? "https://accomodation.api.test.nextkinlife.live"
    : "/api";

// Helper function for API calls
export const apiCall = async (endpoint, method = "GET", data = null, isFormData = false) => {
    // Token is now handled by HTTP-only cookies

    const options = {
        method,
        headers: isFormData ? {} : { "Content-Type": "application/json" },
        credentials: "include",
    }

    if (data) {
        options.body = isFormData ? data : JSON.stringify(data)
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, options)

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.message || `API error: ${response.status}`)
        }

        return await response.json()
    } catch (error) {
        console.error("API call error:", error)
        throw error
    }
}

// Function to compress image
export const compressImage = (file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        img.onload = () => {
            let width = img.width;
            let height = img.height;

            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxHeight) {
                    width = Math.round((width * maxHeight) / height);
                    height = maxHeight;
                }
            }

            canvas.width = width;
            canvas.height = height;

            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(resolve, 'image/jpeg', quality);
        };

        img.src = URL.createObjectURL(file);
    });
};

export const hostEventService = {
    createDraft: async (data) => {
        return apiCall("/events/create-draft", "POST", data)
    },
    updateBasicInfo: async (id, data) => {
        return apiCall(`/events/basic-info/${id}`, "PUT", data)
    },
    updateLocation: async (id, data) => {
        return apiCall(`/events/location/${id}`, "PUT", data)
    },
    updateVenue: async (id, data) => {
        return apiCall(`/events/venue/${id}`, "PUT", data)
    },
    updateSchedule: async (id, schedule) => {
        return apiCall(`/events/schedule/${id}`, "PUT", { schedule })
    },
    updatePricing: async (id, price) => {
        return apiCall(`/events/pricing/${id}`, "PUT", { price })
    },
    submitEvent: async (id) => {
        return apiCall(`/events/submit/${id}`, "PUT")
    },
    uploadMedia: async (id, bannerImage, galleryImages, onProgress) => {
        const mediaFormData = new FormData()

        if (bannerImage) {
            mediaFormData.append("bannerImage", bannerImage)
        }

        if (galleryImages && galleryImages.length > 0) {
            galleryImages.forEach((image) => {
                mediaFormData.append("galleryImages", image)
            })
        }

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.withCredentials = true;

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    onProgress(percentComplete);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    let errorMessage = `Upload failed with status ${xhr.status}`;
                    try {
                        const errorData = JSON.parse(xhr.responseText);
                        errorMessage = errorData.message || errorMessage;
                    } catch (e) {
                        if (xhr.status === 413) errorMessage = "File too large. Please upload smaller images.";
                    }
                    reject(new Error(errorMessage));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });

            xhr.open('PUT', `${API_URL}/events/media/${id}`);
            xhr.send(mediaFormData);
        });
    }
}
