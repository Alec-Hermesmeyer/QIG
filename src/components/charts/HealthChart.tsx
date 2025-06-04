'use client';

import React, { useRef, useEffect, useState } from 'react';
import { HealthHistoryPoint } from '@/services/monitoringConfig';

interface HealthChartProps {
  data: HealthHistoryPoint[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  timeRange?: number; // milliseconds
  endpoint?: string;
  chartType?: 'line' | 'area' | 'bar';
  showTooltip?: boolean;
  showGrid?: boolean;
  showLegend?: boolean;
}

interface TooltipData {
  x: number;
  y: number;
  point: HealthHistoryPoint;
  visible: boolean;
}

export function HealthChart({ 
  data, 
  width = 400, 
  height = 200, 
  showLabels = true, 
  timeRange = 24 * 60 * 60 * 1000, // 24 hours
  endpoint = 'All Endpoints',
  chartType = 'area',
  showTooltip = true,
  showGrid = true,
  showLegend = true
}: HealthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [tooltip, setTooltip] = useState<TooltipData>({
    x: 0, y: 0, point: {} as HealthHistoryPoint, visible: false
  });
  const [hoveredPoint, setHoveredPoint] = useState<number>(-1);

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!showTooltip) return;
    
    const canvas = canvasRef.current;
    if (!canvas || filteredData.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate chart dimensions
    const padding = { top: 20, right: 20, bottom: showLabels ? 40 : 20, left: showLabels ? 60 : 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Check if mouse is over a data point
    const now = Date.now();
    const startTime = now - timeRange;
    const endTime = now;
    
    const responseTimes = filteredData.map(d => d.responseTime);
    const maxResponseTime = Math.max(...responseTimes, 1000);
    const minResponseTime = 0;

    let closestPointIndex = -1;
    let minDistance = Infinity;

    filteredData.forEach((point, index) => {
      const x = padding.left + ((new Date(point.timestamp).getTime() - startTime) / (endTime - startTime)) * chartWidth;
      const y = padding.top + chartHeight - ((point.responseTime - minResponseTime) / (maxResponseTime - minResponseTime)) * chartHeight;
      
      const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));
      if (distance < 20 && distance < minDistance) { // 20px tolerance
        minDistance = distance;
        closestPointIndex = index;
      }
    });

    if (closestPointIndex >= 0) {
      const point = filteredData[closestPointIndex];
      const x = padding.left + ((new Date(point.timestamp).getTime() - startTime) / (endTime - startTime)) * chartWidth;
      const y = padding.top + chartHeight - ((point.responseTime - minResponseTime) / (maxResponseTime - minResponseTime)) * chartHeight;
      
      setTooltip({
        x: event.clientX,
        y: event.clientY,
        point,
        visible: true
      });
      setHoveredPoint(closestPointIndex);
    } else {
      setTooltip(prev => ({ ...prev, visible: false }));
      setHoveredPoint(-1);
    }
  };

  const handleMouseLeave = () => {
    setTooltip(prev => ({ ...prev, visible: false }));
    setHoveredPoint(-1);
  };

  // Filter data by time range
  const now = Date.now();
  const filteredData = data
    .filter(point => (now - new Date(point.timestamp).getTime()) <= timeRange)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set up high DPI rendering
    const devicePixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(devicePixelRatio, devicePixelRatio);

    // Clear canvas with gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#fafafa');
    bgGradient.addColorStop(1, '#ffffff');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    if (filteredData.length === 0) {
      // Enhanced "No Data" message
      const centerX = width / 2;
      const centerY = height / 2;
      
      // Draw circle background
      ctx.beginPath();
      ctx.arc(centerX, centerY, 60, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(107, 114, 128, 0.1)';
      ctx.fill();
      
      // Draw icon
      ctx.strokeStyle = '#9CA3AF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(centerX - 20, centerY - 10);
      ctx.lineTo(centerX + 20, centerY - 10);
      ctx.moveTo(centerX - 15, centerY);
      ctx.lineTo(centerX + 15, centerY);
      ctx.moveTo(centerX - 10, centerY + 10);
      ctx.lineTo(centerX + 10, centerY + 10);
      ctx.stroke();
      
      // Text
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No Data Available', centerX, centerY + 40);
      
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#9CA3AF';
      ctx.fillText('Start monitoring to see charts', centerX, centerY + 58);
      return;
    }

    // Calculate dimensions
    const padding = { top: 20, right: 20, bottom: showLabels ? 40 : 20, left: showLabels ? 60 : 20 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get time and response time ranges
    const startTime = now - timeRange;
    const endTime = now;
    const responseTimes = filteredData.map(d => d.responseTime);
    const maxResponseTime = Math.max(...responseTimes, 1000);
    const minResponseTime = 0;

    // Draw grid with subtle styling
    if (showGrid) {
      ctx.strokeStyle = 'rgba(229, 231, 235, 0.8)';
      ctx.lineWidth = 1;

      // Vertical grid lines (time)
      const timeSteps = 6;
      for (let i = 0; i <= timeSteps; i++) {
        const x = padding.left + (chartWidth * i) / timeSteps;
        ctx.beginPath();
        ctx.moveTo(x, padding.top);
        ctx.lineTo(x, padding.top + chartHeight);
        ctx.stroke();
      }

      // Horizontal grid lines (response time)
      const responseSteps = 5;
      for (let i = 0; i <= responseSteps; i++) {
        const y = padding.top + (chartHeight * i) / responseSteps;
        ctx.beginPath();
        ctx.moveTo(padding.left, y);
        ctx.lineTo(padding.left + chartWidth, y);
        ctx.stroke();
      }
    }

    // Draw chart border
    ctx.strokeStyle = '#E5E7EB';
    ctx.lineWidth = 2;
    ctx.strokeRect(padding.left, padding.top, chartWidth, chartHeight);

    // Prepare chart data points
    const chartPoints = filteredData.map(point => ({
      x: padding.left + ((new Date(point.timestamp).getTime() - startTime) / (endTime - startTime)) * chartWidth,
      y: padding.top + chartHeight - ((point.responseTime - minResponseTime) / (maxResponseTime - minResponseTime)) * chartHeight,
      point
    }));

    // Draw area fill if area chart
    if (chartType === 'area' && chartPoints.length > 1) {
      // Create gradient fill
      const gradient = ctx.createLinearGradient(0, padding.top, 0, padding.top + chartHeight);
      gradient.addColorStop(0, 'rgba(59, 130, 246, 0.3)');
      gradient.addColorStop(0.5, 'rgba(59, 130, 246, 0.1)');
      gradient.addColorStop(1, 'rgba(59, 130, 246, 0.05)');
      
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(chartPoints[0].x, padding.top + chartHeight);
      
      chartPoints.forEach(({ x, y }) => {
        ctx.lineTo(x, y);
      });
      
      ctx.lineTo(chartPoints[chartPoints.length - 1].x, padding.top + chartHeight);
      ctx.closePath();
      ctx.fill();
    }

    // Draw main line
    if (chartType !== 'bar' && chartPoints.length > 1) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      // Add subtle shadow
      ctx.shadowColor = 'rgba(59, 130, 246, 0.3)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      
      ctx.beginPath();
      chartPoints.forEach(({ x, y }, index) => {
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
      
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
    }

    // Draw bars if bar chart
    if (chartType === 'bar') {
      const barWidth = chartWidth / chartPoints.length * 0.8;
      
      chartPoints.forEach(({ x, y, point }) => {
        let color = '#10B981'; // green for healthy
        if (point.status === 'degraded') color = '#F59E0B'; // yellow
        if (point.status === 'down') color = '#EF4444'; // red
        
        ctx.fillStyle = color;
        ctx.fillRect(x - barWidth/2, y, barWidth, padding.top + chartHeight - y);
        
        // Add bar border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x - barWidth/2, y, barWidth, padding.top + chartHeight - y);
      });
    }

    // Draw status points with enhanced styling
    chartPoints.forEach(({ x, y, point }, index) => {
      // Status color
      let color = '#10B981'; // green for healthy
      let shadowColor = 'rgba(16, 185, 129, 0.4)';
      if (point.status === 'degraded') {
        color = '#F59E0B'; // yellow
        shadowColor = 'rgba(245, 158, 11, 0.4)';
      }
      if (point.status === 'down') {
        color = '#EF4444'; // red
        shadowColor = 'rgba(239, 68, 68, 0.4)';
      }

      // Enhanced point styling
      const radius = hoveredPoint === index ? 8 : 6;
      const outerRadius = hoveredPoint === index ? 12 : 8;
      
      // Outer glow
      ctx.beginPath();
      ctx.arc(x, y, outerRadius, 0, 2 * Math.PI);
      ctx.fillStyle = shadowColor;
      ctx.fill();
      
      // Main point
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();
      
      // White center highlight
      ctx.beginPath();
      ctx.arc(x, y, radius * 0.3, 0, 2 * Math.PI);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
      ctx.fill();
      
      // Border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    });

    // Enhanced labels
    if (showLabels) {
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';

      // Time labels with better formatting
      const timeSteps = 6;
      for (let i = 0; i <= timeSteps; i++) {
        const time = startTime + ((endTime - startTime) * i) / timeSteps;
        const date = new Date(time);
        const label = formatTimeLabel(date, timeRange);
        const x = padding.left + (chartWidth * i) / timeSteps;
        
        // Label background
        const labelWidth = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(x - labelWidth/2, height - 25, labelWidth, 16);
        
        // Label text
        ctx.fillStyle = '#6B7280';
        ctx.fillText(label, x, height - 12);
      }

      // Response time labels
      ctx.textAlign = 'right';
      const responseSteps = 5;
      for (let i = 0; i <= responseSteps; i++) {
        const responseTime = minResponseTime + ((maxResponseTime - minResponseTime) * (responseSteps - i)) / responseSteps;
        const label = formatResponseTime(responseTime);
        const y = padding.top + (chartHeight * i) / responseSteps + 4;
        
        // Label background
        const labelWidth = ctx.measureText(label).width + 8;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(padding.left - labelWidth - 5, y - 8, labelWidth, 16);
        
        // Label text
        ctx.fillStyle = '#6B7280';
        ctx.fillText(label, padding.left - 10, y);
      }

      // Y-axis label with rotation
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#6B7280';
      ctx.font = 'bold 12px Inter, system-ui, sans-serif';
      ctx.fillText('Response Time', 0, 0);
      ctx.restore();

      // Enhanced chart title
      ctx.textAlign = 'center';
      ctx.font = 'bold 16px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#111827';
      ctx.fillText(endpoint, width / 2, 16);
      
      // Subtitle
      ctx.font = '12px Inter, system-ui, sans-serif';
      ctx.fillStyle = '#6B7280';
      ctx.fillText(`Last ${formatTimeRange(timeRange)} • ${filteredData.length} data points`, width / 2, 32);
    }

    // Enhanced legend
    if (showLegend) {
      const legendY = height - (showLabels ? 40 : 10);
      const legendItems = [
        { color: '#10B981', label: 'Healthy', count: filteredData.filter(p => p.status === 'healthy').length },
        { color: '#F59E0B', label: 'Degraded', count: filteredData.filter(p => p.status === 'degraded').length },
        { color: '#EF4444', label: 'Down', count: filteredData.filter(p => p.status === 'down').length }
      ];

      let legendX = padding.left;
      ctx.font = '11px Inter, system-ui, sans-serif';
      ctx.textAlign = 'left';

      legendItems.forEach(item => {
        // Skip if no data for this status
        if (item.count === 0) return;
        
        // Legend item background
        const itemWidth = ctx.measureText(`${item.label} (${item.count})`).width + 25;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(legendX - 2, legendY - 10, itemWidth, 16);
        
        // Color indicator
        ctx.fillStyle = item.color;
        ctx.fillRect(legendX, legendY - 6, 12, 8);
        
        // Border around color
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(legendX, legendY - 6, 12, 8);
        
        // Label with count
        ctx.fillStyle = '#374151';
        ctx.fillText(`${item.label} (${item.count})`, legendX + 16, legendY + 1);
        
        legendX += itemWidth + 10;
      });
    }

  }, [data, width, height, showLabels, timeRange, endpoint, chartType, showGrid, showLegend, hoveredPoint, filteredData]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="border border-gray-200 rounded-lg shadow-sm cursor-crosshair"
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
      
      {/* Enhanced Tooltip */}
      {showTooltip && tooltip.visible && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-3 pointer-events-none"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 80,
            transform: 'translateX(-50%)'
          }}
        >
          <div className="text-sm font-medium text-gray-900 mb-1">
            {new Date(tooltip.point.timestamp).toLocaleString()}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                tooltip.point.status === 'healthy' ? 'bg-green-500' :
                tooltip.point.status === 'degraded' ? 'bg-yellow-500' : 'bg-red-500'
              }`}></div>
              <span className="text-sm text-gray-600">
                Status: <span className="font-medium">{tooltip.point.status}</span>
              </span>
            </div>
            <div className="text-sm text-gray-600">
              Response Time: <span className="font-medium">{Math.round(tooltip.point.responseTime)}ms</span>
            </div>
            {tooltip.point.error && (
              <div className="text-sm text-red-600 max-w-48">
                Error: {tooltip.point.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function formatTimeRange(ms: number): string {
  const hours = ms / (1000 * 60 * 60);
  if (hours < 1) {
    const minutes = ms / (1000 * 60);
    return `${Math.round(minutes)}min`;
  } else if (hours < 24) {
    return `${Math.round(hours)}h`;
  } else {
    const days = hours / 24;
    return `${Math.round(days)}d`;
  }
}

function formatTimeLabel(date: Date, timeRange: number): string {
  if (timeRange <= 6 * 60 * 60 * 1000) { // 6 hours or less, show hour:minute
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (timeRange <= 7 * 24 * 60 * 60 * 1000) { // 7 days or less, show day and hour
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else { // Longer periods, show date
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
}

function formatResponseTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else {
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

export default HealthChart; 