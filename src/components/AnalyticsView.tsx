// components/AnalyticsView.tsx
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BarChart as BarChartIcon,
    PieChart as PieChartIcon,
    LineChart as LineChartIcon,
    BarChart2,
    Filter,
    Download,
    Share,
    Info,
    HelpCircle,
    Settings
} from 'lucide-react';
import { 
    Source, 
    ThemeStyles, 
    DocumentStats, 
    ViewOptions
} from '@/types/types';

interface AnalyticsViewProps {
    allSources: Source[];
    themeStyles: ThemeStyles;
    documentStats: DocumentStats | null;
    viewOptions: ViewOptions;
    index: number;
    answer: any;
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({
    allSources,
    themeStyles,
    documentStats,
    viewOptions,
    index,
    answer
}) => {
    const [activeChart, setActiveChart] = useState<'relevance' | 'types' | 'dates'>('relevance');
    const [chartData, setChartData] = useState<any[]>([]);
    
    // Tab animation
    const tabAnimation = {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        exit: { opacity: 0, y: -20 }
    };

    // Generate chart data based on the active chart
    useEffect(() => {
        if (!allSources || allSources.length === 0) {
            setChartData([]);
            return;
        }

        switch (activeChart) {
            case 'relevance':
                // Group sources by relevance score ranges
                const relevanceData = [
                    { name: 'High (90-100%)', value: 0, color: themeStyles.secondaryColor },
                    { name: 'Medium (70-89%)', value: 0, color: `${themeStyles.secondaryColor}99` },
                    { name: 'Low (0-69%)', value: 0, color: `${themeStyles.secondaryColor}66` }
                ];
                
                allSources.forEach(source => {
                    const score = source.score ?? 0;
                    if (score >= 0.9) {
                        relevanceData[0].value++;
                    } else if (score >= 0.7) {
                        relevanceData[1].value++;
                    } else {
                        relevanceData[2].value++;
                    }
                });
                
                setChartData(relevanceData);
                break;
                
            case 'types':
                // Group sources by document type
                const typesMap: Record<string, number> = {};
                allSources.forEach(source => {
                    const type = (source.type || 'Unknown').toLowerCase();
                    typesMap[type] = (typesMap[type] || 0) + 1;
                });
                
                // Convert to array and sort by count
                const typesData = Object.entries(typesMap)
                    .map(([name, value], index) => {
                        // Generate a color based on the secondary color with different opacities
                        const opacity = 1 - (index * 0.15);
                        const color = `${themeStyles.secondaryColor}${Math.max(Math.floor(opacity * 255), 50).toString(16)}`;
                        return { name, value, color };
                    })
                    .sort((a, b) => b.value - a.value)
                    .slice(0, 10); // Limit to top 10 types
                
                setChartData(typesData);
                break;
                
            case 'dates':
                // Group sources by date published (month/year)
                const dateMap: Record<string, number> = {};
                const validDates: Date[] = [];
                
                allSources.forEach(source => {
                    if (source.datePublished) {
                        try {
                            const date = new Date(source.datePublished);
                            if (!isNaN(date.getTime())) {
                                validDates.push(date);
                                const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
                                dateMap[key] = (dateMap[key] || 0) + 1;
                            }
                        } catch (e) {
                            // Invalid date format, skip
                        }
                    }
                });
                
                // Convert to array, format labels, and sort by date
                const dateData = Object.entries(dateMap)
                    .map(([key, value]) => {
                        const [year, month] = key.split('-').map(Number);
                        const date = new Date(year, month - 1, 1);
                        return { 
                            key,
                            name: date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
                            value,
                            date,
                            color: themeStyles.secondaryColor
                        };
                    })
                    .sort((a, b) => a.date.getTime() - b.date.getTime());
                
                setChartData(dateData);
                break;
                
            default:
                setChartData([]);
        }
    }, [activeChart, allSources, themeStyles.secondaryColor]);

    // Calculate summary statistics
    const getSourcesStats = () => {
        if (!allSources || allSources.length === 0) {
            return {
                totalSources: 0,
                avgScore: 0,
                maxScore: 0,
                minScore: 0,
                medianScore: 0,
                avgLength: 0,
                typesCount: 0
            };
        }
        
        const scores = allSources
            .map(source => source.score ?? 0)
            .filter(score => score > 0)
            .sort((a, b) => a - b);
            
        const types = new Set(allSources.map(source => (source.type || 'Unknown').toLowerCase()));
        
        return {
            totalSources: allSources.length,
            avgScore: scores.length ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0,
            maxScore: scores.length ? scores[scores.length - 1] : 0,
            minScore: scores.length ? scores[0] : 0,
            medianScore: scores.length ? scores[Math.floor(scores.length / 2)] : 0,
            avgLength: allSources.reduce((sum, source) => {
                const excerpts = source.excerpts || [];
                const excerptLength = excerpts.reduce((total, excerpt) => total + excerpt.length, 0);
                return sum + excerptLength;
            }, 0) / allSources.length,
            typesCount: types.size
        };
    };
    
    const stats = getSourcesStats();

    // Helper to generate SVG bar chart
    const renderBarChart = (data: any[]) => {
        if (data.length === 0) return <div className="text-center py-6">No data available</div>;
        
        const maxValue = Math.max(...data.map(item => item.value));
        const barHeight = 30;
        const chartHeight = data.length * (barHeight + 10);
        const chartWidth = 300;
        
        return (
            <svg width="100%" height={chartHeight} className="mt-3">
                {data.map((item, index) => {
                    const barWidth = (item.value / maxValue) * chartWidth;
                    const y = index * (barHeight + 10);
                    
                    return (
                        <g key={index}>
                            <rect
                                x={0}
                                y={y}
                                width={barWidth}
                                height={barHeight}
                                fill={item.color || themeStyles.secondaryColor}
                                rx={4}
                                ry={4}
                                opacity={0.8}
                            />
                            <text
                                x={barWidth + 10}
                                y={y + barHeight / 2 + 5}
                                fill={themeStyles.textColor}
                                fontSize={12}
                            >
                                {item.name} ({item.value})
                            </text>
                        </g>
                    );
                })}
            </svg>
        );
    };
    
    // Helper to generate SVG pie chart
    const renderPieChart = (data: any[]) => {
        if (data.length === 0) return <div className="text-center py-6">No data available</div>;
        
        const total = data.reduce((sum, item) => sum + item.value, 0);
        const radius = 100;
        const centerX = 120;
        const centerY = 120;
        
        // Calculate the slices
        let currentAngle = 0;
        const slices = data.map((item, index) => {
            const percentage = item.value / total;
            const angle = percentage * 360;
            const startAngle = currentAngle;
            currentAngle += angle;
            const endAngle = currentAngle;
            
            // Calculate the SVG arc path
            const startRad = (startAngle - 90) * Math.PI / 180;
            const endRad = (endAngle - 90) * Math.PI / 180;
            
            const x1 = centerX + radius * Math.cos(startRad);
            const y1 = centerY + radius * Math.sin(startRad);
            const x2 = centerX + radius * Math.cos(endRad);
            const y2 = centerY + radius * Math.sin(endRad);
            
            const largeArcFlag = angle > 180 ? 1 : 0;
            
            const pathData = [
                `M ${centerX} ${centerY}`,
                `L ${x1} ${y1}`,
                `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
            ].join(' ');
            
            // Calculate position for the label (midpoint of the arc)
            const midAngleRad = (startAngle + angle / 2 - 90) * Math.PI / 180;
            const labelRadius = radius * 0.7;
            const labelX = centerX + labelRadius * Math.cos(midAngleRad);
            const labelY = centerY + labelRadius * Math.sin(midAngleRad);
            
            return {
                path: pathData,
                color: item.color || themeStyles.secondaryColor,
                percentage,
                label: {
                    x: labelX,
                    y: labelY,
                    text: percentage > 0.05 ? `${Math.round(percentage * 100)}%` : ''
                }
            };
        });
        
        return (
            <div className="flex flex-col items-center mt-3">
                <svg width={centerX * 2} height={centerY * 2} viewBox={`0 0 ${centerX * 2} ${centerY * 2}`}>
                    {slices.map((slice, index) => (
                        <path
                            key={index}
                            d={slice.path}
                            fill={slice.color}
                            stroke={themeStyles.cardBackgroundColor}
                            strokeWidth={1}
                        />
                    ))}
                    {slices.map((slice, index) => (
                        slice.label.text && (
                            <text
                                key={`label-${index}`}
                                x={slice.label.x}
                                y={slice.label.y}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fill="white"
                                fontSize={12}
                                fontWeight="bold"
                            >
                                {slice.label.text}
                            </text>
                        )
                    ))}
                </svg>
                
                <div className="grid grid-cols-2 gap-2 mt-4">
                    {data.map((item, index) => (
                        <div key={index} className="flex items-center text-xs">
                            <div 
                                className="w-3 h-3 rounded mr-1" 
                                style={{ backgroundColor: item.color }}
                            />
                            <span className="truncate">{item.name}</span>
                            <span className="ml-1 opacity-70">({item.value})</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    };
    
    // Helper to generate SVG line chart for time series
    const renderLineChart = (data: any[]) => {
        if (data.length < 2) return <div className="text-center py-6">Not enough time data available</div>;
        
        const maxValue = Math.max(...data.map(item => item.value)) * 1.1; // Add 10% padding
        const chartWidth = 400;
        const chartHeight = 200;
        const paddingLeft = 40;
        const paddingBottom = 40;
        const paddingTop = 20;
        const graphWidth = chartWidth - paddingLeft;
        const graphHeight = chartHeight - paddingBottom - paddingTop;
        
        // Generate points for the line
        const points = data.map((item, index) => {
            const x = paddingLeft + (index / (data.length - 1)) * graphWidth;
            const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
            return `${x},${y}`;
        }).join(' ');
        
        return (
            <svg width="100%" height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="mt-3">
                {/* Y-axis */}
                <line 
                    x1={paddingLeft} 
                    y1={paddingTop} 
                    x2={paddingLeft} 
                    y2={chartHeight - paddingBottom} 
                    stroke={`${themeStyles.textColor}50`} 
                    strokeWidth={1} 
                />
                
                {/* X-axis */}
                <line 
                    x1={paddingLeft} 
                    y1={chartHeight - paddingBottom} 
                    x2={chartWidth} 
                    y2={chartHeight - paddingBottom} 
                    stroke={`${themeStyles.textColor}50`} 
                    strokeWidth={1} 
                />
                
                {/* Y-axis labels */}
                {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => {
                    const y = paddingTop + graphHeight - (tick * graphHeight);
                    const value = Math.round(tick * maxValue);
                    return (
                        <g key={`y-${i}`}>
                            <line 
                                x1={paddingLeft - 5} 
                                y1={y} 
                                x2={paddingLeft} 
                                y2={y} 
                                stroke={`${themeStyles.textColor}50`}
                                strokeWidth={1} 
                            />
                            <text 
                                x={paddingLeft - 8} 
                                y={y} 
                                textAnchor="end" 
                                dominantBaseline="middle" 
                                fontSize={10}
                                fill={themeStyles.textColor}
                            >
                                {value}
                            </text>
                        </g>
                    );
                })}
                
                {/* X-axis labels */}
                {data.map((item, i) => {
                    if (i % Math.ceil(data.length / 6) === 0 || i === data.length - 1) {
                        const x = paddingLeft + (i / (data.length - 1)) * graphWidth;
                        return (
                            <g key={`x-${i}`}>
                                <line 
                                    x1={x} 
                                    y1={chartHeight - paddingBottom} 
                                    x2={x} 
                                    y2={chartHeight - paddingBottom + 5} 
                                    stroke={`${themeStyles.textColor}50`}
                                    strokeWidth={1} 
                                />
                                <text 
                                    x={x} 
                                    y={chartHeight - paddingBottom + 15} 
                                    textAnchor="middle" 
                                    fontSize={9}
                                    fill={themeStyles.textColor}
                                >
                                    {item.name}
                                </text>
                            </g>
                        );
                    }
                    return null;
                })}
                
                {/* Draw the line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke={themeStyles.secondaryColor}
                    strokeWidth={2}
                />
                
                {/* Draw data points */}
                {data.map((item, i) => {
                    const x = paddingLeft + (i / (data.length - 1)) * graphWidth;
                    const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
                    return (
                        <circle
                            key={`point-${i}`}
                            cx={x}
                            cy={y}
                            r={4}
                            fill={themeStyles.cardBackgroundColor}
                            stroke={themeStyles.secondaryColor}
                            strokeWidth={2}
                        />
                    );
                })}
                
                {/* Area under the curve */}
                <path
                    d={`
                        M ${paddingLeft},${chartHeight - paddingBottom}
                        ${data.map((item, i) => {
                            const x = paddingLeft + (i / (data.length - 1)) * graphWidth;
                            const y = paddingTop + graphHeight - (item.value / maxValue) * graphHeight;
                            return `L ${x},${y}`;
                        }).join(' ')}
                        L ${paddingLeft + graphWidth},${chartHeight - paddingBottom}
                        Z
                    `}
                    fill={`${themeStyles.secondaryColor}30`}
                    stroke="none"
                />
            </svg>
        );
    };

    return (
        <motion.div
            key="analytics-tab"
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
                        <BarChart2 size={18} className="mr-2" />
                        Document Analytics
                    </h3>
                    
                    <div className="flex gap-2">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1.5 rounded-md border"
                            style={{
                                backgroundColor: themeStyles.cardBackgroundColor,
                                borderColor: themeStyles.borderColor
                            }}
                            title="Download Analytics"
                        >
                            <Download size={16} />
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1.5 rounded-md border"
                            style={{
                                backgroundColor: themeStyles.cardBackgroundColor,
                                borderColor: themeStyles.borderColor
                            }}
                            title="Share Analytics"
                        >
                            <Share size={16} />
                        </motion.button>
                        
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="p-1.5 rounded-md border"
                            style={{
                                backgroundColor: themeStyles.cardBackgroundColor,
                                borderColor: themeStyles.borderColor
                            }}
                            title="Help"
                        >
                            <HelpCircle size={16} />
                        </motion.button>
                    </div>
                </div>
                
                {/* Stats Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <div className="text-xs opacity-70">Total Sources</div>
                        <div className="text-xl font-medium">{stats.totalSources}</div>
                    </div>
                    
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <div className="text-xs opacity-70">Average Relevance</div>
                        <div className="text-xl font-medium">{(stats.avgScore * 100).toFixed(1)}%</div>
                    </div>
                    
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <div className="text-xs opacity-70">Document Types</div>
                        <div className="text-xl font-medium">{stats.typesCount}</div>
                    </div>
                    
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <div className="text-xs opacity-70">Max Score</div>
                        <div className="text-xl font-medium">{(stats.maxScore * 100).toFixed(1)}%</div>
                    </div>
                </div>
                
                {/* Chart Type Selector */}
                <div className="mb-4 flex items-center border-b pb-2" style={{ borderColor: themeStyles.borderColor }}>
                    <button
                        onClick={() => setActiveChart('relevance')}
                        className={`mr-4 py-2 text-sm flex items-center ${activeChart === 'relevance' ? 'font-medium' : 'opacity-70'}`}
                        style={{ 
                            color: activeChart === 'relevance' ? themeStyles.secondaryColor : themeStyles.textColor,
                            borderBottom: activeChart === 'relevance' ? `2px solid ${themeStyles.secondaryColor}` : 'none'
                        }}
                    >
                        <PieChartIcon size={16} className="mr-1" />
                        Relevance Distribution
                    </button>
                    
                    <button
                        onClick={() => setActiveChart('types')}
                        className={`mr-4 py-2 text-sm flex items-center ${activeChart === 'types' ? 'font-medium' : 'opacity-70'}`}
                        style={{ 
                            color: activeChart === 'types' ? themeStyles.secondaryColor : themeStyles.textColor,
                            borderBottom: activeChart === 'types' ? `2px solid ${themeStyles.secondaryColor}` : 'none'
                        }}
                    >
                        <BarChartIcon size={16} className="mr-1" />
                        Document Types
                    </button>
                    
                    <button
                        onClick={() => setActiveChart('dates')}
                        className={`py-2 text-sm flex items-center ${activeChart === 'dates' ? 'font-medium' : 'opacity-70'}`}
                        style={{ 
                            color: activeChart === 'dates' ? themeStyles.secondaryColor : themeStyles.textColor,
                            borderBottom: activeChart === 'dates' ? `2px solid ${themeStyles.secondaryColor}` : 'none'
                        }}
                    >
                        <LineChartIcon size={16} className="mr-1" />
                        Publication Timeline
                    </button>
                </div>
                
                {/* Chart Container */}
                <div 
                    className="p-4 rounded-md border"
                    style={{ 
                        backgroundColor: themeStyles.cardBackgroundColor,
                        borderColor: themeStyles.borderColor,
                        minHeight: '300px'
                    }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium">
                            {activeChart === 'relevance' ? 'Document Relevance Distribution' : 
                             activeChart === 'types' ? 'Document Types Distribution' : 
                             'Publication Timeline'}
                        </h4>
                        
                        <div className="flex items-center">
                            <button
                                className="text-xs flex items-center opacity-70 hover:opacity-100 mr-2"
                                title="Chart Info"
                            >
                                <Info size={14} className="mr-1" />
                                Info
                            </button>
                            
                            <button
                                className="text-xs flex items-center opacity-70 hover:opacity-100"
                                title="Chart Settings"
                            >
                                <Settings size={14} className="mr-1" />
                                Settings
                            </button>
                        </div>
                    </div>
                    
                    {/* Render appropriate chart based on selection */}
                    <div className="overflow-x-auto">
                        {activeChart === 'relevance' && renderPieChart(chartData)}
                        {activeChart === 'types' && renderBarChart(chartData)}
                        {activeChart === 'dates' && renderLineChart(chartData)}
                    </div>
                    
                    {/* Chart insights */}
                    <div 
                        className="mt-4 p-3 rounded-md text-xs"
                        style={{ backgroundColor: `${themeStyles.secondaryColor}10` }}
                    >
                        <div className="font-medium mb-1 flex items-center">
                            <HelpCircle size={12} className="mr-1" />
                            Insights
                        </div>
                        
                        {activeChart === 'relevance' && (
                            <p>
                                {chartData[0]?.value > chartData[1]?.value + chartData[2]?.value
                                    ? "Most documents have high relevance scores, indicating strong confidence in the answer."
                                    : chartData[0]?.value < chartData[2]?.value
                                        ? "More low-relevance documents than high-relevance ones. Consider refining your search or checking additional sources."
                                        : "Documents are distributed across relevance ranges, providing balanced support for the answer."
                                }
                            </p>
                        )}
                        
                        {activeChart === 'types' && (
                            <p>
                                {chartData.length > 0
                                    ? `Your information comes primarily from ${chartData[0]?.name} documents (${Math.round((chartData[0]?.value / stats.totalSources) * 100)}% of total). 
                                      ${chartData.length > 1 
                                        ? `This is followed by ${chartData[1]?.name} (${Math.round((chartData[1]?.value / stats.totalSources) * 100)}%).` 
                                        : ''}`
                                    : "No document type data available."
                                }
                            </p>
                        )}
                        
                        {activeChart === 'dates' && (
                            <p>
                                {chartData.length > 1
                                    ? `Document publication dates span from ${chartData[0]?.name} to ${chartData[chartData.length - 1]?.name}. 
                                      ${chartData.reduce((max, item) => item.value > max.value ? item : max, chartData[0]).name} has the most documents.`
                                    : "Not enough time-based data available for meaningful analysis."
                                }
                            </p>
                        )}
                    </div>
                </div>
                
                {/* Advanced stats */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <h4 className="font-medium text-sm mb-2">Document Score Distribution</h4>
                        
                        <div className="space-y-2">
                            <div className="flex items-center text-xs">
                                <span className="w-24 opacity-70">Minimum:</span>
                                <span className="font-medium">{(stats.minScore * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-24 opacity-70">Maximum:</span>
                                <span className="font-medium">{(stats.maxScore * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-24 opacity-70">Average:</span>
                                <span className="font-medium">{(stats.avgScore * 100).toFixed(1)}%</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-24 opacity-70">Median:</span>
                                <span className="font-medium">{(stats.medianScore * 100).toFixed(1)}%</span>
                            </div>
                        </div>
                    </div>
                    
                    <div 
                        className="p-3 rounded-md border"
                        style={{ 
                            backgroundColor: themeStyles.cardBackgroundColor,
                            borderColor: themeStyles.borderColor
                        }}
                    >
                        <h4 className="font-medium text-sm mb-2">Content Analysis</h4>
                        
                        <div className="space-y-2">
                            <div className="flex items-center text-xs">
                                <span className="w-32 opacity-70">Avg. Excerpt Length:</span>
                                <span className="font-medium">{Math.round(stats.avgLength)} characters</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-32 opacity-70">Document Types:</span>
                                <span className="font-medium">{stats.typesCount} different types</span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-32 opacity-70">Full Text Available:</span>
                                <span className="font-medium">
                                    {allSources.filter(s => s.fullText || s.content).length} of {stats.totalSources} ({
                                        Math.round((allSources.filter(s => s.fullText || s.content).length / stats.totalSources) * 100) || 0
                                    }%)
                                </span>
                            </div>
                            <div className="flex items-center text-xs">
                                <span className="w-32 opacity-70">With Metadata:</span>
                                <span className="font-medium">
                                    {allSources.filter(s => s.author || s.datePublished).length} of {stats.totalSources} ({
                                        Math.round((allSources.filter(s => s.author || s.datePublished).length / stats.totalSources) * 100) || 0
                                    }%)
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default AnalyticsView;