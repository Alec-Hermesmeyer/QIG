// utils/iconUtils.ts
import React from 'react';
import {
    FileText,
    FileImage,
    FileCode,
    FileSpreadsheet,
    FileArchive,
    FilePdf,
    FilePpt,
    FileWord,
    FileAudio,
    FileVideo,
    FileJson,
    File,
    Globe,
    Book,
    Mail,
    MessageSquare,
    Database
} from 'lucide-react';

/**
 * Determines the appropriate icon based on file name or type
 * @param fileName Optional file name to determine type from extension
 * @param fileType Optional explicit file type
 * @returns React component with the appropriate icon
 */
export const getDocumentIcon = (
    fileName?: string, 
    fileType?: string
): React.ReactElement => {
    // Extract extension from filename
    const extension = fileName 
        ? fileName.split('.').pop()?.toLowerCase() 
        : '';
    
    // Normalize file type
    const normalizedType = fileType 
        ? fileType.toLowerCase() 
        : '';
    
    // Check for image files
    if (
        extension === 'jpg' || 
        extension === 'jpeg' || 
        extension === 'png' || 
        extension === 'gif' || 
        extension === 'svg' || 
        extension === 'webp' || 
        normalizedType.includes('image')
    ) {
        return React.createElement(FileImage, { size: 16 });
    }
    
    // Check for code files
    if (
        extension === 'js' || 
        extension === 'jsx' || 
        extension === 'ts' || 
        extension === 'tsx' || 
        extension === 'html' || 
        extension === 'css' || 
        extension === 'py' || 
        extension === 'java' || 
        extension === 'cpp' || 
        extension === 'c' || 
        extension === 'php' || 
        extension === 'rb' || 
        extension === 'go' || 
        extension === 'rs' || 
        normalizedType.includes('code')
    ) {
        return React.createElement(FileCode, { size: 16 });
    }
    
    // Check for spreadsheet files
    if (
        extension === 'xls' || 
        extension === 'xlsx' || 
        extension === 'csv' || 
        extension === 'tsv' || 
        normalizedType.includes('spreadsheet') || 
        normalizedType.includes('excel')
    ) {
        return React.createElement(FileSpreadsheet, { size: 16 });
    }
    
    // Check for archive files
    if (
        extension === 'zip' || 
        extension === 'rar' || 
        extension === 'tar' || 
        extension === 'gz' || 
        extension === '7z' || 
        normalizedType.includes('archive') || 
        normalizedType.includes('compressed')
    ) {
        return React.createElement(FileArchive, { size: 16 });
    }
    
    // Check for PDF files
    if (
        extension === 'pdf' || 
        normalizedType.includes('pdf')
    ) {
        return React.createElement(FilePdf, { size: 16 });
    }
    
    // Check for PowerPoint files
    if (
        extension === 'ppt' || 
        extension === 'pptx' || 
        normalizedType.includes('presentation') || 
        normalizedType.includes('powerpoint')
    ) {
        return React.createElement(FilePpt, { size: 16 });
    }
    
    // Check for Word files
    if (
        extension === 'doc' || 
        extension === 'docx' || 
        normalizedType.includes('document') || 
        normalizedType.includes('word')
    ) {
        return React.createElement(FileWord, { size: 16 });
    }
    
    // Check for audio files
    if (
        extension === 'mp3' || 
        extension === 'wav' || 
        extension === 'ogg' || 
        extension === 'flac' || 
        extension === 'm4a' || 
        normalizedType.includes('audio')
    ) {
        return React.createElement(FileAudio, { size: 16 });
    }
    
    // Check for video files
    if (
        extension === 'mp4' || 
        extension === 'avi' || 
        extension === 'mov' || 
        extension === 'wmv' || 
        extension === 'webm' || 
        normalizedType.includes('video')
    ) {
        return React.createElement(FileVideo, { size: 16 });
    }
    
    // Check for JSON files
    if (
        extension === 'json' || 
        normalizedType.includes('json')
    ) {
        return React.createElement(FileJson, { size: 16 });
    }
    
    // Check for web content
    if (
        normalizedType.includes('web') || 
        normalizedType.includes('html') || 
        normalizedType.includes('url') || 
        normalizedType.includes('http')
    ) {
        return React.createElement(Globe, { size: 16 });
    }
    
    // Check for book or literature
    if (
        normalizedType.includes('book') || 
        normalizedType.includes('article') || 
        normalizedType.includes('paper') || 
        normalizedType.includes('publication')
    ) {
        return React.createElement(Book, { size: 16 });
    }
    
    // Check for emails
    if (
        extension === 'eml' || 
        normalizedType.includes('email') || 
        normalizedType.includes('mail')
    ) {
        return React.createElement(Mail, { size: 16 });
    }
    
    // Check for messages
    if (
        normalizedType.includes('message') || 
        normalizedType.includes('chat') || 
        normalizedType.includes('conversation')
    ) {
        return React.createElement(MessageSquare, { size: 16 });
    }
    
    // Check for database
    if (
        extension === 'db' || 
        extension === 'sqlite' || 
        extension === 'sql' || 
        normalizedType.includes('database')
    ) {
        return React.createElement(Database, { size: 16 });
    }
    
    // Default case
    return React.createElement(FileText, { size: 16 });
};

/**
 * Gets the color for a document type
 * @param fileType The document type
 * @param themeColors Optional theme colors object
 * @returns A hex color string
 */
export const getDocumentTypeColor = (
    fileType?: string,
    themeColors?: { 
        primaryColor?: string; 
        secondaryColor?: string; 
    }
): string => {
    if (!fileType) return '#6B7280'; // Default gray
    
    const normalizedType = fileType.toLowerCase();
    
    // Document type color mapping
    const colorMap: Record<string, string> = {
        // Common document types
        'pdf': '#FF5733',
        'word': '#285EA7',
        'excel': '#217346',
        'powerpoint': '#D24726',
        'image': '#7E57C2',
        'audio': '#F9A825',
        'video': '#D32F2F',
        'code': '#2196F3',
        'text': '#607D8B',
        'html': '#E65100',
        'json': '#009688',
        'csv': '#388E3C',
        'xml': '#795548',
        'archive': '#616161',
        
        // Web content types
        'webpage': '#039BE5',
        'article': '#00897B',
        'blog': '#7CB342',
        
        // Communication types
        'email': '#FFB300',
        'message': '#8E24AA',
        'chat': '#5E35B1',
        
        // Data types
        'database': '#0288D1',
        'sheet': '#43A047',
        'report': '#F4511E'
    };
    
    // Try to find a matching type
    for (const [type, color] of Object.entries(colorMap)) {
        if (normalizedType.includes(type)) {
            return color;
        }
    }
    
    // Use theme colors if provided and no match found
    if (themeColors?.secondaryColor) {
        return themeColors.secondaryColor;
    }
    
    // Ultimate fallback
    return '#6B7280';
};

/**
 * Gets document icon with appropriate color based on type
 * @param fileName Optional file name
 * @param fileType Optional file type
 * @param themeColors Optional theme colors
 * @returns JSX element with styled icon
 */
export const getColoredDocumentIcon = (
    fileName?: string,
    fileType?: string,
    themeColors?: { 
        primaryColor?: string; 
        secondaryColor?: string; 
    }
): JSX.Element => {
    const icon = getDocumentIcon(fileName, fileType);
    const color = getDocumentTypeColor(fileType, themeColors);
    
    return React.cloneElement(icon, { color });
};

/**
 * Determines if a file should be treated as binary (non-text)
 * @param fileName File name to check
 * @returns Boolean indicating if the file is likely binary
 */
export const isBinaryFile = (fileName?: string): boolean => {
    if (!fileName) return false;
    
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    const binaryExtensions = [
        // Images
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'tiff', 'webp',
        // Audio
        'mp3', 'wav', 'ogg', 'flac', 'm4a',
        // Video
        'mp4', 'avi', 'mov', 'wmv', 'webm',
        // Archives
        'zip', 'rar', 'tar', 'gz', '7z',
        // Documents
        'pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
        // Executables
        'exe', 'dll', 'so', 'bin',
        // Other binary formats
        'db', 'sqlite'
    ];
    
    return extension ? binaryExtensions.includes(extension) : false;
};

export default {
    getDocumentIcon,
    getDocumentTypeColor,
    getColoredDocumentIcon,
    isBinaryFile
};