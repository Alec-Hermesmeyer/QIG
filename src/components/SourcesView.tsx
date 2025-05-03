// components/SourcesView.tsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    Filter,
    Database,
    AlignJustify,
    BookMarked,
    ChevronUp,
    ChevronDown,
    FileQuestion,
    ExternalLink,
    AlertTriangle,
    FileText
} from 'lucide-react';
import { 
    Source, 
    ThemeStyles, 
    DocumentStats, 
    AdvancedFilters, 
    ViewOptions
} from '../types';
import { getSourceExcerpts } from '../utils/dataUtils';
import { generateDocumentRelevanceReason } from '../utils/analysisUtils';
import { getDocumentIcon } from '../utils/iconUtils'; // This would be in a separate file

interface SourcesViewProps {
    allSources: Source[];
    sortOption: 'relevance' | 'date' | 'name';
    sourceViewMode: 'list' | 'grid' | 'detail';
    viewOptions: ViewOptions;
    themeStyles: ThemeStyles;
    currentPage: number;
    sourceFilter: string;
    sourceSearchQuery: string;
    expandedDocs: Set<string>;
    bookmarkedSources: Set<string>;
    documentStats: DocumentStats | null;
    advancedFilters: AdvancedFilters;
    pageSize: number;
    maxSourcesDisplayed: number;
    index: number;
    answer: any;
    setCurrentPage: (page: number) => void;
    setSourceFilter: (filter: string) => void;
    setSourceSearchQuery: (query: string) => void;
    handleSortChange: (option: 'relevance' | 'date' | 'name') => void;
    handleViewModeChange: (mode: 'list' | 'grid' | 'detail') => void;
    toggleViewOption: (option: keyof ViewOptions) => void;
    toggleDocExpansion: (docId: string) => void;
    toggleBookmark: (sourceId: string, event?: React.MouseEvent) => void;
    handleSourceDocumentClick: (source: Source) => void;
    onCitationClicked: (id: string) => void;
    setShowDocExcerpt: (id: string | null) => void;
}

const SourcesView: React.FC<SourcesViewProps> = ({
    allSources,
    sortOption,
    sourceViewMode,
    viewOptions,
    themeStyles,
    currentPage,
    sourceFilter,
    sourceSearchQuery,
    expandedDocs,
    bookmarkedSources,
    documentStats,
    advancedFilters,
    pageSize,
    maxSourcesDisplayed,
    index,
    answer,
    setCurrentPage,
    setSourceFilter,
    setSourceSearchQuery,
    handleSortChange,
    handleViewModeChange,
    toggleViewOption,
    toggleDocExpansion,
    toggleBookmark,
    handleSourceDocumentClick,
    onCitationClicked,
    setShowDocExcerpt
}) => {
    // Tab animation
    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    // Button animations
    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    // Filter and sort sources
    const getSortedSources = (sources: Source[]): Source[] => {
        if (!sources || !Array.isArray(sources)) return [];
        
        // Create a copy to avoid modifying the original
        const sourcesToProcess = [...sources];
        
        // Apply filter if set
        const filteredSources = sourceFilter 
            ? sourcesToProcess.filter(source => {
                const sourceText = `${source.fileName || ''} ${source.title || ''} ${source.author || ''}`.toLowerCase();
                return sourceText.includes(sourceFilter.toLowerCase());
            })
            : sourcesToProcess;
        
        // Apply source search if set
        const searchedSources = sourceSearchQuery
            ? filteredSources.filter(source => {
                const searchableText = [
                    source.fileName || '',
                    source.title || '',
                    source.author || '',
                    ...(getSourceExcerpts(source) || [])
                ].join(' ').toLowerCase();
                
                return searchableText.includes(sourceSearchQuery.toLowerCase());
            })
            : filteredSources;
        
        // Apply advanced filters
        const advancedFilteredSources = searchedSources.filter(source => {
            // Filter by minimum score
            if (advancedFilters.minScore > 0 && 
                (source.score === undefined || source.score < advancedFilters.minScore)) {
                return false;
            }
            
            // Filter by document types
            if (advancedFilters.documentTypes.length > 0) {
                const sourceType = source.type?.toLowerCase() || '';
                if (!advancedFilters.documentTypes.some(type => sourceType.includes(type.toLowerCase()))) {
                    return false;
                }
            }
            
            // Filter by authors
            if (advancedFilters.authors.length > 0) {
                const sourceAuthor = source.author?.toLowerCase() || '';
                if (!advancedFilters.authors.some(author => sourceAuthor.includes(author.toLowerCase()))) {
                    return false;
                }
            }
            
            return true;
        });
        
        // Sort based on selected option
        switch (sortOption) {
            case 'relevance':
                return advancedFilteredSources.sort((a, b) => {
                    const scoreA = a?.score ?? a?.relevanceScore ?? 0;
                    const scoreB = b?.score ?? b?.relevanceScore ?? 0;
                    return scoreB - scoreA;
                });
            case 'date':
                return advancedFilteredSources.sort((a, b) => {
                    const dateA = a?.datePublished ? new Date(a.datePublished).getTime() : 0;
                    const dateB = b?.datePublished ? new Date(b.datePublished).getTime() : 0;
                    return dateB - dateA;
                });
            case 'name':
                return advancedFilteredSources.sort((a, b) => {
                    const nameA = (a?.fileName || a?.name || '').toLowerCase();
                    const nameB = (b?.fileName || b?.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                });
            default:
                return advancedFilteredSources;
        }
    };

    // Paginate sources
    const getPaginatedSources = (sources: Source[]): Source[] => {
        const startIndex = (currentPage - 1) * pageSize;
        return sources.slice(startIndex, startIndex + pageSize);
    };

    // Handle filter change
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSourceFilter(e.target.value);
        setCurrentPage(1); // Reset to first page when filtering
    };

    // Get sorted and paginated sources
    const sortedSources = getSortedSources(allSources);
    const paginatedSources = maxSourcesDisplayed 
        ? getPaginatedSources(sortedSources).slice(0, maxSourcesDisplayed) 
        : getPaginatedSources(sortedSources);
    
    // Calculate total pages
    const totalPages = Math.ceil(sortedSources.length / pageSize);

    return (
        <motion.div
            key="sources-tab"
            variants={tabAnimation}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="py-4"
        >
            <div 
                className="p-4 rounded-lg border"
                style={{ 
                    backgroundColor: `${themeStyles.secondaryColor}10`, 
                    borderColor: `${themeStyles.secondaryColor}30` 
                }}
            >
                <div className="flex items-center justify-between mb-3">
                    <h3 
                        className="text-lg font-medium flex items-center"
                        style={{ color: themeStyles.secondaryColor }}
                    >
                        <Database size={18} className="mr-2" />
                        Referenced Documents
                    </h3>
                    
                    <div className="flex gap-2">
                        <span 
                            className="px-2 py-1 text-xs rounded-full flex items-center"
                            style={{ 
                                backgroundColor: `${themeStyles.secondaryColor}20`, 
                                color: themeStyles.secondaryColor 
                            }}
                        >
                            <FileText size={12} className="mr-1" />
                            {sortedSources.length} Documents
                        </span>
                    </div>
                </div>
                
                {/* Filter and view controls */}
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center">
                        <div 
                            className="relative flex items-center border rounded-md overflow-hidden"
                            style={{
                                backgroundColor: themeStyles.cardBackgroundColor,
                                borderColor: themeStyles.borderColor
                            }}
                        >
                            <Search size={16} className="mx-2 opacity-70" />
                            <input
                                type="text"
                                value={sourceSearchQuery}
                                onChange={(e) => {
                                    setSourceSearchQuery(e.target.value);
                                    setCurrentPage(1);
                                }}
                                placeholder="Search in sources..."
                                className="py-1.5 pr-2 bg-transparent border-none outline-none text-sm w-40 sm:w-auto"
                                style={{ color: themeStyles.textColor }}
                            />
                        </div>
                        
                        <div className="flex ml-2">
                            <button
                                onClick={() => handleSortChange('relevance')}
                                className={`px-2 py-1 text-xs rounded-l-md border-y border-l ${
                                    sortOption === 'relevance' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sortOption === 'relevance' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sortOption === 'relevance' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                Score
                            </button>
                            <button
                                onClick={() => handleSortChange('date')}
                                className={`px-2 py-1 text-xs border ${
                                    sortOption === 'date' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sortOption === 'date' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sortOption === 'date' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                Date
                            </button>
                            <button
                                onClick={() => handleSortChange('name')}
                                className={`px-2 py-1 text-xs rounded-r-md border-y border-r ${
                                    sortOption === 'name' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sortOption === 'name' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sortOption === 'name' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                Name
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center">
                        <div className="flex">
                            <button
                                onClick={() => handleViewModeChange('list')}
                                className={`p-1.5 rounded-l-md border-y border-l ${
                                    sourceViewMode === 'list' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sourceViewMode === 'list' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sourceViewMode === 'list' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                <AlignJustify size={16} />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('grid')}
                                className={`p-1.5 border ${
                                    sourceViewMode === 'grid' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sourceViewMode === 'grid' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sourceViewMode === 'grid' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                <Database size={16} />
                            </button>
                            <button
                                onClick={() => handleViewModeChange('detail')}
                                className={`p-1.5 rounded-r-md border-y border-r ${
                                    sourceViewMode === 'detail' ? 'font-medium' : ''
                                }`}
                                style={{
                                    backgroundColor: sourceViewMode === 'detail' 
                                        ? `${themeStyles.secondaryColor}20` 
                                        : themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor,
                                    color: sourceViewMode === 'detail' 
                                        ? themeStyles.secondaryColor 
                                        : themeStyles.textColor
                                }}
                            >
                                <BookMarked size={16} />
                            </button>
                        </div>
                        
                        <div className="ml-2 relative">
                            <button
                                onClick={() => document.getElementById(`view-options-${index}`)?.classList.toggle('hidden')}
                                className="p-1.5 rounded-md border"
                                style={{
                                    backgroundColor: themeStyles.cardBackgroundColor,
                                    borderColor: themeStyles.borderColor
                                }}
                            >
                                <Filter size={16} />
                            </button>
                            <div 
                                id={`view-options-${index}`} 
                                className="absolute right-0 mt-1 w-48 rounded-md shadow-lg hidden z-10"
                                style={{ backgroundColor: themeStyles.cardBackgroundColor }}
                            >
                                <div className="py-1">
                                    <div 
                                        className="px-4 py-2 text-xs font-medium border-b"
                                        style={{ borderColor: themeStyles.borderColor }}
                                    >
                                        Display Options
                                    </div>
                                    <label className="flex items-center px-4 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={viewOptions.showMetadata}
                                            onChange={() => toggleViewOption('showMetadata')}
                                            className="mr-2"
                                        />
                                        Show Metadata
                                    </label>
                                    <label className="flex items-center px-4 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={viewOptions.showScores}
                                            onChange={() => toggleViewOption('showScores')}
                                            className="mr-2"
                                        />
                                        Show Scores
                                    </label>
                                    <label className="flex items-center px-4 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={viewOptions.showExcerpts}
                                            onChange={() => toggleViewOption('showExcerpts')}
                                            className="mr-2"
                                        />
                                        Show Excerpts
                                    </label>
                                    <label className="flex items-center px-4 py-2 text-sm">
                                        <input
                                            type="checkbox"
                                            checked={viewOptions.showRelevance}
                                            onChange={() => toggleViewOption('showRelevance')}
                                            className="mr-2"
                                        />
                                        Show Relevance
                                    </label>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Source document stats */}
                {documentStats && (
                    <div 
                        className="mb-4 p-3 rounded-md text-xs grid grid-cols-2 md:grid-cols-4 gap-2"
                        style={{ backgroundColor: `${themeStyles.secondaryColor}05` }}
                    >
                        <div className="flex flex-col">
                            <span className="opacity-70">Total Documents</span>
                            <span className="font-medium text-sm">{documentStats.totalSources}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-70">Avg. Relevance</span>
                            <span className="font-medium text-sm">{(documentStats.avgScore * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-70">High Relevance</span>
                            <span className="font-medium text-sm">{documentStats.countByRelevance.high} docs</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="opacity-70">Total Size</span>
                            <span className="font-medium text-sm">{documentStats.totalFileSize} bytes</span>
                        </div>
                    </div>
                )}
                
                {/* Search/filter message if needed */}
                {sortedSources.length === 0 && (
                    <div 
                        className="my-4 p-4 rounded-md flex items-center justify-center text-sm"
                        style={{ 
                            backgroundColor: `${themeStyles.secondaryColor}05`,
                            borderColor: `${themeStyles.secondaryColor}30`,
                            color: themeStyles.textColor
                        }}
                    >
                        <AlertTriangle size={16} className="mr-2" style={{ color: themeStyles.secondaryColor }} />
                        No documents match your filter criteria. Try adjusting your search.
                    </div>
                )}
                
                {/* Different view modes */}
                {sourceViewMode === 'list' && (
                    <SourceListView 
                        paginatedSources={paginatedSources}
                        expandedDocs={expandedDocs}
                        bookmarkedSources={bookmarkedSources}
                        viewOptions={viewOptions}
                        themeStyles={themeStyles}
                        answer={answer}
                        handleSourceDocumentClick={handleSourceDocumentClick}
                        toggleBookmark={toggleBookmark}
                        toggleDocExpansion={toggleDocExpansion}
                        setShowDocExcerpt={setShowDocExcerpt}
                        onCitationClicked={onCitationClicked}
                    />
                )}
                
                {sourceViewMode === 'grid' && (
                    <SourceGridView 
                        paginatedSources={paginatedSources}
                        bookmarkedSources={bookmarkedSources}
                        viewOptions={viewOptions}
                        themeStyles={themeStyles}
                        handleSourceDocumentClick={handleSourceDocumentClick}
                        toggleBookmark={toggleBookmark}
                        onCitationClicked={onCitationClicked}
                    />
                )}
                
                {sourceViewMode === 'detail' && (
                    <SourceDetailView 
                        paginatedSources={paginatedSources}
                        bookmarkedSources={bookmarkedSources}
                        viewOptions={viewOptions}
                        themeStyles={themeStyles}
                        answer={answer}
                        toggleBookmark={toggleBookmark}
                        onCitationClicked={onCitationClicked}
                    />
                )}
                
                {/* Pagination controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-4">
                        <div className="text-sm opacity-70">
                            Showing {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, sortedSources.length)} of {sortedSources.length}
                        </div>
                        <div className="flex items-center space-x-1">
                            <button
                                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                                disabled={currentPage === 1}
                                className="p-1 rounded"
                                style={{ 
                                    opacity: currentPage === 1 ? 0.5 : 1,
                                    color: themeStyles.secondaryColor
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                            
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                // Calculate page numbers to show around current page
                                let pageNum;
                                if (totalPages <= 5) {
                                    pageNum = i + 1;
                                } else if (currentPage <= 3) {
                                    pageNum = i + 1;
                                } else if (currentPage >= totalPages - 2) {
                                    pageNum = totalPages - 4 + i;
                                } else {
                                    pageNum = currentPage - 2 + i;
                                }
                                
                                return (
                                    <button
                                        key={i}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className="w-8 h-8 flex items-center justify-center rounded text-sm"
                                        style={{ 
                                            backgroundColor: currentPage === pageNum 
                                                ? themeStyles.secondaryColor 
                                                : 'transparent',
                                            color: currentPage === pageNum 
                                                ? '#FFFFFF' 
                                                : themeStyles.textColor
                                        }}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                            
                            <button
                                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                                disabled={currentPage === totalPages}
                                className="p-1 rounded"
                                style={{ 
                                    opacity: currentPage === totalPages ? 0.5 : 1,
                                    color: themeStyles.secondaryColor
                                }}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// Sub-components for different view modes
interface SourceListViewProps {
    paginatedSources: Source[];
    expandedDocs: Set<string>;
    bookmarkedSources: Set<string>;
    viewOptions: ViewOptions;
    themeStyles: ThemeStyles;
    answer: any;
    handleSourceDocumentClick: (source: Source) => void;
    toggleBookmark: (sourceId: string, event?: React.MouseEvent) => void;
    toggleDocExpansion: (docId: string) => void;
    setShowDocExcerpt: (id: string | null) => void;
    onCitationClicked: (id: string) => void;
}

const SourceListView: React.FC<SourceListViewProps> = ({
    paginatedSources,
    expandedDocs,
    bookmarkedSources,
    viewOptions,
    themeStyles,
    answer,
    handleSourceDocumentClick,
    toggleBookmark,
    toggleDocExpansion,
    setShowDocExcerpt,
    onCitationClicked
}) => {
    const buttonVariants = {
        initial: { scale: 1 },
        hover: { scale: 1.1 },
        tap: { scale: 0.95 }
    };

    return (
        <div className="mt-2 space-y-2">
            {paginatedSources.map((source, index) => {
                // Skip invalid sources
                if (!source || !source.id) return null;
                
                return (
                    <motion.div
                        key={`${source.id}-${index}`}
                        className="rounded-md border overflow-hidden"
                        initial={{ x: -10, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                : 'none'
                        }}
                    >
                        <div 
                            className="flex items-center justify-between gap-2 text-sm p-3 hover:bg-purple-50 cursor-pointer"
                            onClick={() => handleSourceDocumentClick(source)}
                            style={{ 
                                color: themeStyles.textColor, 
                                hover: { backgroundColor: `${themeStyles.secondaryColor}10` } 
                            }}
                        >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                                {getDocumentIcon(source.fileName, source.type)}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center">
                                        <span className="truncate font-medium" title={source.fileName || source.title || `${source.id}`}>
                                            {source.fileName || source.title || `Document ${source.id}`}
                                        </span>
                                        {bookmarkedSources.has(source.id.toString()) && (
                                            <span 
                                                className="ml-1 text-yellow-500"
                                                title="Bookmarked"
                                            >
                                                ★
                                            </span>
                                        )}
                                    </div>
                                    
                                    {viewOptions.showMetadata && (
                                        <div className="flex items-center text-xs opacity-70 mt-0.5 space-x-2">
                                            {source.author && (
                                                <span className="truncate" title={`Author: ${source.author}`}>
                                                    {source.author}
                                                </span>
                                            )}
                                            {source.datePublished && (
                                                <span title={`Date: ${source.datePublished}`}>
                                                    {source.datePublished}
                                                </span>
                                            )}
                                            {source.type && (
                                                <span title={`Type: ${source.type}`}>
                                                    {source.type}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                {/* Show score if available */}
                                {viewOptions.showScores && source.score !== undefined && (
                                    <span 
                                        className="px-1.5 py-0.5 rounded-full text-xs font-medium"
                                        title={`Relevance score: ${source.score}`}
                                        style={{ 
                                            backgroundColor: `${themeStyles.secondaryColor}20`, 
                                            color: themeStyles.secondaryColor 
                                        }}
                                    >
                                        {(source.score * 100).toFixed(1)}%
                                    </span>
                                )}
                                
                                {/* Bookmark button */}
                                <button
                                    onClick={(e) => toggleBookmark(source.id.toString(), e)}
                                    className="opacity-60 hover:opacity-100"
                                    title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                                >
                                    {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                                </button>
                                
                                {/* Expand/collapse control */}
                                {getSourceExcerpts(source).length > 0 ? (
                                    expandedDocs.has(source.id.toString()) ? (
                                        <ChevronUp size={14} className="opacity-70" />
                                    ) : (
                                        <ChevronDown size={14} className="opacity-70" />
                                    )
                                ) : null}
                            </div>
                        </div>
                        
                        {/* Expanded document preview */}
                        <AnimatePresence>
                            {viewOptions.showExcerpts && expandedDocs.has(source.id.toString()) && getSourceExcerpts(source).length > 0 && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="border-t p-3"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}05`,
                                        borderColor: themeStyles.borderColor
                                    }}
                                >
                                    <div className="space-y-1.5 max-h-60 overflow-y-auto">
                                        {getSourceExcerpts(source).map((excerpt, i) => (
                                            <div 
                                                key={i} 
                                                className="p-2 text-sm rounded border"
                                                style={{ 
                                                    backgroundColor: themeStyles.cardBackgroundColor,
                                                    borderColor: `${themeStyles.secondaryColor}30`
                                                }}
                                            >
                                                <p>{excerpt}</p>
                                                
                                                {viewOptions.showRelevance && (
                                                    <div 
                                                        className="mt-2 p-2 rounded text-xs border"
                                                        style={{ 
                                                            backgroundColor: `${themeStyles.primaryColor}05`,
                                                            borderColor: `${themeStyles.primaryColor}30`
                                                        }}
                                                    >
                                                        <div className="font-medium opacity-70 mb-1">Why this is relevant:</div>
                                                        <p>
                                                            {generateDocumentRelevanceReason(source, typeof answer === 'string' ? answer : (answer?.content || answer?.answer?.content || ''))}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="flex justify-end mt-3 space-x-2">
                                        <motion.button
                                            variants={buttonVariants}
                                            initial="initial"
                                            whileHover="hover"
                                            whileTap="tap"
                                            className="text-xs px-2 py-1 rounded flex items-center"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setShowDocExcerpt(source.id.toString());
                                            }}
                                            style={{ 
                                                backgroundColor: `${themeStyles.secondaryColor}20`,
                                                color: themeStyles.secondaryColor
                                            }}
                                        >
                                            <FileQuestion size={12} className="mr-1" />
                                            View Details
                                        </motion.button>
                                        
                                        <motion.button
                                            variants={buttonVariants}
                                            initial="initial"
                                            whileHover="hover"
                                            whileTap="tap"
                                            className="text-xs text-white px-2 py-1 rounded flex items-center"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onCitationClicked(source.id.toString());
                                            }}
                                            style={{ backgroundColor: themeStyles.secondaryColor }}
                                        >
                                            <ExternalLink size={12} className="mr-1" />
                                            Open Document
                                        </motion.button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
};

// Grid View Component
interface SourceGridViewProps {
    paginatedSources: Source[];
    bookmarkedSources: Set<string>;
    viewOptions: ViewOptions;
    themeStyles: ThemeStyles;
    handleSourceDocumentClick: (source: Source) => void;
    toggleBookmark: (sourceId: string, event?: React.MouseEvent) => void;
    onCitationClicked: (id: string) => void;
}

const SourceGridView: React.FC<SourceGridViewProps> = ({
    paginatedSources,
    bookmarkedSources,
    viewOptions,
    themeStyles,
    handleSourceDocumentClick,
    toggleBookmark,
    onCitationClicked
}) => {
    return (
        <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {paginatedSources.map((source, index) => {
                // Skip invalid sources
                if (!source || !source.id) return null;
                
                return (
                    <motion.div
                        key={`${source.id}-${index}`}
                        className="rounded-md border p-3 flex flex-col"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => handleSourceDocumentClick(source)}
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                : 'none',
                            cursor: 'pointer'
                        }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex items-center">
                                {getDocumentIcon(source.fileName, source.type)}
                                <h4 className="ml-2 font-medium text-sm truncate" 
                                    title={source.fileName || source.title || `Document ${source.id}`}
                                >
                                    {source.fileName || source.title || `Document ${source.id}`}
                                </h4>
                                {bookmarkedSources.has(source.id.toString()) && (
                                    <span 
                                        className="ml-1 text-yellow-500"
                                        title="Bookmarked"
                                    >
                                        ★
                                    </span>
                                )}
                            </div>
                            
                            <button
                                onClick={(e) => toggleBookmark(source.id.toString(), e)}
                                className="opacity-60 hover:opacity-100"
                                title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                            >
                                {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                            </button>
                        </div>
                        
                        {viewOptions.showMetadata && (
                            <div className="grid grid-cols-2 gap-1 mb-2 text-xs opacity-70">
                                {source.type && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-1">Type:</span>
                                        <span className="truncate">{source.type}</span>
                                    </div>
                                )}
                                {source.author && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-1">Author:</span>
                                        <span className="truncate">{source.author}</span>
                                    </div>
                                )}
                                {source.datePublished && (
                                    <div className="flex items-center col-span-2">
                                        <span className="font-medium mr-1">Date:</span>
                                        <span>{source.datePublished}</span>
                                    </div>
                                )}
                                {source.fileSize && (
                                    <div className="flex items-center">
                                        <span className="font-medium mr-1">Size:</span>
                                        <span>{source.fileSize} bytes</span>
                                    </div>
                                )}
                            </div>
                        )}
                        
                        {viewOptions.showExcerpts && getSourceExcerpts(source).length > 0 && (
                            <div className="flex-grow">
                                <div 
                                    className="p-2 rounded text-xs border text-ellipsis overflow-hidden"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}05`,
                                        borderColor: `${themeStyles.secondaryColor}30`,
                                        maxHeight: '4.5rem',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical'
                                    }}
                                >
                                    {getSourceExcerpts(source)[0]}
                                </div>
                            </div>
                        )}
                        
                        <div className="mt-2 flex items-center justify-between">
                            {viewOptions.showScores && source.score !== undefined ? (
                                <span 
                                    className="text-xs px-1.5 py-0.5 rounded-full"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}20`, 
                                        color: themeStyles.secondaryColor 
                                    }}
                                >
                                    Score: {(source.score * 100).toFixed(1)}%
                                </span>
                            ) : (
                                <span></span>
                            )}
                            
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onCitationClicked(source.id.toString());
                                }}
                                className="text-xs p-1 rounded flex items-center opacity-70 hover:opacity-100"
                                style={{ color: themeStyles.secondaryColor }}
                            >
                                <ExternalLink size={12} />
                            </button>
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

// Detailed View Component
interface SourceDetailViewProps {
    paginatedSources: Source[];
    bookmarkedSources: Set<string>;
    viewOptions: ViewOptions;
    themeStyles: ThemeStyles;
    answer: any;
    toggleBookmark: (sourceId: string, event?: React.MouseEvent) => void;
    onCitationClicked: (id: string) => void;
}

const SourceDetailView: React.FC<SourceDetailViewProps> = ({
    paginatedSources,
    bookmarkedSources,
    viewOptions,
    themeStyles,
    answer,
    toggleBookmark,
    onCitationClicked
}) => {
    return (
        <div className="mt-2 space-y-4">
            {paginatedSources.map((source, index) => {
                // Skip invalid sources
                if (!source || !source.id) return null;
                const excerpts = getSourceExcerpts(source);
                
                return (
                    <motion.div
                        key={`${source.id}-${index}`}
                        className="rounded-md border overflow-hidden"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor, 
                            borderColor: themeStyles.borderColor,
                            boxShadow: bookmarkedSources.has(source.id.toString()) 
                                ? `0 0 0 2px ${themeStyles.secondaryColor}50` 
                                : 'none'
                        }}
                    >
                        <div 
                            className="p-3 border-b flex items-center justify-between"
                            style={{ borderColor: themeStyles.borderColor }}
                        >
                            <div className="flex items-center">
                                {getDocumentIcon(source.fileName, source.type)}
                                <h4 className="ml-2 font-medium">
                                    {source.fileName || source.title || `Document ${source.id}`}
                                </h4>
                                {bookmarkedSources.has(source.id.toString()) && (
                                    <span 
                                        className="ml-1 text-yellow-500"
                                        title="Bookmarked"
                                    >
                                        ★
                                    </span>
                                )}
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleBookmark(source.id.toString())}
                                    className="opacity-70 hover:opacity-100"
                                    title={bookmarkedSources.has(source.id.toString()) ? "Remove bookmark" : "Bookmark this source"}
                                >
                                    {bookmarkedSources.has(source.id.toString()) ? "★" : "☆"}
                                </button>
                                
                                <button
                                    onClick={() => onCitationClicked(source.id.toString())}
                                    className="text-xs px-2 py-1 rounded flex items-center"
                                    style={{ 
                                        backgroundColor: `${themeStyles.secondaryColor}20`,
                                        color: themeStyles.secondaryColor
                                    }}
                                >
                                    <ExternalLink size={12} className="mr-1" />
                                    Open
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-3">
                            {/* Metadata */}
                            {viewOptions.showMetadata && (
                                <div 
                                    className="mb-3 grid grid-cols-2 md:grid-cols-4 gap-2 text-xs p-2 rounded"
                                    style={{ backgroundColor: `${themeStyles.secondaryColor}05` }}
                                >
                                    {source.type && (
                                        <div>
                                            <div className="opacity-70">Type</div>
                                            <div className="font-medium">{source.type}</div>
                                        </div>
                                    )}
                                    {source.author && (
                                        <div>
                                            <div className="opacity-70">Author</div>
                                            <div className="font-medium truncate">{source.author}</div>
                                        </div>
                                    )}
                                    {source.datePublished && (
                                        <div>
                                            <div className="opacity-70">Date</div>
                                            <div className="font-medium">{source.datePublished}</div>
                                        </div>
                                    )}
                                    {source.fileSize && (
                                        <div>
                                            <div className="opacity-70">Size</div>
                                            <div className="font-medium">{source.fileSize} bytes</div>
                                        </div>
                                    )}
                                    {viewOptions.showScores && source.score !== undefined && (
                                        <div>
                                            <div className="opacity-70">Relevance</div>
                                            <div 
                                                className="font-medium"
                                                style={{ color: themeStyles.secondaryColor }}
                                            >
                                                {(source.score * 100).toFixed(1)}%
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            
                            {/* Excerpts */}
                            {viewOptions.showExcerpts && excerpts.length > 0 && (
                                <div>
                                    <h5 className="text-sm font-medium mb-2">Excerpts:</h5>
                                    <div className="space-y-2">
                                        {excerpts.map((excerpt, i) => (
                                            <div 
                                                key={i} 
                                                className="p-2 text-sm rounded border"
                                                style={{ 
                                                    backgroundColor: `${themeStyles.secondaryColor}05`, 
                                                    borderColor: `${themeStyles.secondaryColor}30` 
                                                }}
                                            >
                                                <p>{excerpt}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            
                            {/* Relevance */}
                            {viewOptions.showRelevance && (
                                <div className="mt-3">
                                    <h5 className="text-sm font-medium mb-2">Relevance:</h5>
                                    <div 
                                        className="p-2 rounded text-sm border"
                                        style={{ 
                                            backgroundColor: `${themeStyles.primaryColor}05`,
                                            borderColor: `${themeStyles.primaryColor}30`
                                        }}
                                    >
                                        <p>
                                            {generateDocumentRelevanceReason(source, typeof answer === 'string' ? answer : (answer?.content || answer?.answer?.content || ''))}
                                        </p>
                                        
                                        {/* Show confidence bar */}
                                        {source.score !== undefined && (
                                            <div className="mt-2 flex items-center">
                                                <div className="text-xs mr-2">Confidence:</div>
                                                <div 
                                                    className="flex-grow h-2 rounded-full"
                                                    style={{ backgroundColor: `${themeStyles.secondaryColor}20` }}
                                                >
                                                    <div 
                                                        className="h-2 rounded-full"
                                                        style={{ 
                                                            width: `${source.score * 100}%`,
                                                            backgroundColor: themeStyles.secondaryColor
                                                        }}
                                                    />
                                                </div>
                                                <div className="text-xs ml-2">{(source.score * 100).toFixed(1)}%</div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                            
                            {/* URL if available */}
                            {source.url && (
                                <div className="mt-3 text-sm">
                                    <span className="font-medium">Source URL: </span>
                                    <a 
                                        href={source.url} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="break-all flex items-center"
                                        style={{ color: themeStyles.primaryColor }}
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        {source.url}
                                        <ExternalLink size={12} className="ml-1 flex-shrink-0" />
                                    </a>
                                </div>
                            )}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
};

export default SourcesView;