export const attachCloudFrontUrl = (imagePath) => {
    if (!imagePath || typeof imagePath !== 'string') return imagePath;

    const baseUrl = process.env.CLOUDFRONT_URL || 'https://d3dqp3l6ug81j3.cloudfront.net';

    const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

    // If it's already a CloudFront URL, return as-is
    if (imagePath.startsWith(cleanBase)) return imagePath;

    // If it's an S3 URL, extract the key and rewrite to CloudFront
    // Handles: https://bucket-name.s3.region.amazonaws.com/key
    //          https://s3.region.amazonaws.com/bucket-name/key
    if (imagePath.includes('.amazonaws.com/')) {
        // Extract everything after the bucket/region path
        const s3Key = imagePath.replace(/^https?:\/\/[^/]+\//, '');
        return `${cleanBase}/${s3Key}`;
    }

    // Already a non-S3, non-CloudFront URL (e.g. external image) — use as-is
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // S3 key (e.g. "properties/abc.jpg") — prepend CloudFront base
    const cleanPath = imagePath.startsWith('/') ? imagePath.slice(1) : imagePath;
    return `${cleanBase}/${cleanPath}`;
};

export const processHostImages = (obj) => {
    if (!obj) return obj;

    const processed = { ...obj };

    // Handle nested Host.User.profile_image (property objects)
    if (processed.Host) {
        processed.Host = { ...processed.Host };
        if (processed.Host.User) {
            processed.Host.User = { ...processed.Host.User };
            if (processed.Host.User.profile_image) {
                processed.Host.User.profile_image = attachCloudFrontUrl(processed.Host.User.profile_image);
            }
        }
        if (processed.Host.profile_image) {
            processed.Host.profile_image = attachCloudFrontUrl(processed.Host.profile_image);
        }
    }

    // Handle flat User.profile_image (host objects)
    if (processed.User && processed.User.profile_image) {
        processed.User = { ...processed.User };
        processed.User.profile_image = attachCloudFrontUrl(processed.User.profile_image);
    }

    // Handle top-level profile_image
    if (processed.profile_image) {
        processed.profile_image = attachCloudFrontUrl(processed.profile_image);
    }

    return processed;
};
