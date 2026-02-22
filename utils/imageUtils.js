export const attachCloudFrontUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') return imagePath;
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath;

    const baseUrl = process.env.CLOUDFRONT_URL;
    if (!baseUrl) return imagePath;

    // Remove leading slash from imagePath if present to avoid double slashes
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    // Remove trailing slash from baseUrl if present
    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    return `${cleanBase}/${cleanPath}`;
};

export const processHostImages = (host) => {
    if (!host) return host;

    const processedHost = { ...host };

    if (processedHost.User && processedHost.User.profile_image) {
        processedHost.User.profile_image = attachCloudFrontUrl(processedHost.User.profile_image);
    }

    // Handle case where User is returned as a plain object at the top level
    if (processedHost.profile_image) {
        processedHost.profile_image = attachCloudFrontUrl(processedHost.profile_image);
    }

    return processedHost;
};
