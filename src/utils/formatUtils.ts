// utils/formatUtils.ts

// Format a file size in bytes to human-readable format
export const formatFileSize = (bytes?: number): string => {
    if (bytes === undefined) return 'Unknown size';
    
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Format a date to a user-friendly string
export const formatDate = (dateStr?: string): string => {
    if (!dateStr) return 'Unknown date';
    
    try {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return dateStr; // Return original if parsing fails
    }
};

// Normalize document ID by removing prefixes and handling special characters
export const normalizeDocId = (id: string): string => {
    if (!id) return '';
    
    // Remove common prefixes
    let normalizedId = id.replace(/^(groundx:|azure:|gx:|bing:|file:|web:|blob:|http[s]?:\/\/)/i, '');
    
    // Handle plus signs in IDs (common in GroundX)
    normalizedId = normalizedId.replace(/\+/g, ' ');
    
    // Handle URL-encoded characters
    try {
        if (normalizedId.includes('%')) {
            normalizedId = decodeURIComponent(normalizedId);
        }
    } catch (e) {
        // If decoding fails, use the original
        console.error("Error decoding URL-encoded ID:", e);
    }
    
    return normalizedId;
};

// Extract filename from path
export const extractFileName = (path: string): string => {
    if (!path) return 'Unknown';
    
    // Handle both URL paths and file paths
    if (path.includes('://')) {
        try {
            const url = new URL(path);
            return url.pathname.split('/').pop() || url.hostname;
        } catch (e) {
            return path.split('/').pop() || path;
        }
    }
    
    // Handle plus signs in filenames (common in GroundX)
    const fileName = path.split('/').pop() || path;
    return fileName.replace(/\+/g, ' ');
};

// Helper to extract keywords from answer
export const extractKeywordsFromAnswer = (text: string): string[] => {
    if (!text) return [];
    
    const commonWords = new Set([
        'the', 'is', 'and', 'of', 'to', 'a', 'in', 'for', 'that', 'with', 
        'by', 'this', 'be', 'or', 'are', 'from', 'an', 'as', 'at', 'your',
        'all', 'have', 'new', 'more', 'has', 'some', 'them', 'other', 'not',
        'can', 'would', 'should', 'could', 'may', 'might', 'will', 'than'
    ]);
    
    const words = text.toLowerCase()
        .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, " ")
        .split(/\s+/)
        .filter(word => word.length > 3 && !commonWords.has(word));
        
    const wordCounts: Record<string, number> = {};
    for (const word of words) {
        wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    return Object.entries(wordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([word]) => word);
};