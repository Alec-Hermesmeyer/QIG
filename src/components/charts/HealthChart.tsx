'use client';

import React, { useRef, useEffect } from 'react';
import { HealthHistoryPoint } from '@/services/monitoringConfig';

interface HealthChartProps {
  data: HealthHistoryPoint[];
  width?: number;
  height?: number;
  showLabels?: boolean;
  timeRange?: number; // milliseconds
  endpoint?: string;
}

export function HealthChart({ 
  data, 
  width = 400, 
  height = 200, 
  showLabels = true, 
  timeRange = 24 * 60 * 60 * 1000, // 24 hours
  endpoint = 'All Endpoints'
}: HealthChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Filter data by time range
    const now = Date.now();
    const filteredData = data
      .filter(point => (now - new Date(point.timestamp).getTime()) <= timeRange)
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    if (filteredData.length === 0) {
      // Draw "No Data" message
      ctx.fillStyle = '#6B7280';
      ctx.font = '14px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('No data available', width / 2, height / 2);
      return;
    }

    // Calculate dimensions
    const padding = { top: 20, right: 20, bottom: 40, left: 60 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Get time range
    const startTime = now - timeRange;
    const endTime = now;

    // Get response time range
    const responseTimes = filteredData.map(d => d.responseTime);
    const maxResponseTime = Math.max(...responseTimes, 1000); // Minimum 1s scale
    const minResponseTime = 0;

    // Draw grid
    ctx.strokeStyle = '#E5E7EB';
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

    // Draw axes
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 2;
    
    // Y-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top);
    ctx.lineTo(padding.left, padding.top + chartHeight);
    ctx.stroke();

    // X-axis
    ctx.beginPath();
    ctx.moveTo(padding.left, padding.top + chartHeight);
    ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
    ctx.stroke();

    // Draw response time line
    if (filteredData.length > 1) {
      ctx.strokeStyle = '#3B82F6';
      ctx.lineWidth = 2;
      ctx.beginPath();

      filteredData.forEach((point, index) => {
        const x = padding.left + ((new Date(point.timestamp).getTime() - startTime) / (endTime - startTime)) * chartWidth;
        const y = padding.top + chartHeight - ((point.responseTime - minResponseTime) / (maxResponseTime - minResponseTime)) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw status points
    filteredData.forEach(point => {
      const x = padding.left + ((new Date(point.timestamp).getTime() - startTime) / (endTime - startTime)) * chartWidth;
      const y = padding.top + chartHeight - ((point.responseTime - minResponseTime) / (maxResponseTime - minResponseTime)) * chartHeight;

      // Status color
      let color = '#10B981'; // green for healthy
      if (point.status === 'degraded') color = '#F59E0B'; // yellow for degraded
      if (point.status === 'down') color = '#EF4444'; // red for down

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, 2 * Math.PI);
      ctx.fill();

      // White border
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    if (showLabels) {
      // Draw labels
      ctx.fillStyle = '#374151';
      ctx.font = '12px Inter, sans-serif';
      ctx.textAlign = 'center';

      // Time labels
      for (let i = 0; i <= timeSteps; i++) {
        const time = startTime + ((endTime - startTime) * i) / timeSteps;
        const date = new Date(time);
        const label = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const x = padding.left + (chartWidth * i) / timeSteps;
        ctx.fillText(label, x, height - 10);
      }

      // Response time labels
      ctx.textAlign = 'right';
      for (let i = 0; i <= responseSteps; i++) {
        const responseTime = minResponseTime + ((maxResponseTime - minResponseTime) * (responseSteps - i)) / responseSteps;
        const label = responseTime < 1000 ? `${Math.round(responseTime)}ms` : `${(responseTime / 1000).toFixed(1)}s`;
        const y = padding.top + (chartHeight * i) / responseSteps + 4;
        ctx.fillText(label, padding.left - 10, y);
      }

      // Y-axis label
      ctx.save();
      ctx.translate(15, height / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.fillText('Response Time', 0, 0);
      ctx.restore();

      // Chart title
      ctx.textAlign = 'center';
      ctx.font = 'bold 14px Inter, sans-serif';
      ctx.fillText(`${endpoint} - Last ${formatTimeRange(timeRange)}`, width / 2, 15);
    }

    // Draw legend
    const legendY = height - 25;
    const legendItems = [
      { color: '#10B981', label: 'Healthy' },
      { color: '#F59E0B', label: 'Degraded' },
      { color: '#EF4444', label: 'Down' }
    ];

    let legendX = padding.left;
    ctx.font = '11px Inter, sans-serif';
    ctx.textAlign = 'left';

    legendItems.forEach(item => {
      // Draw color box
      ctx.fillStyle = item.color;
      ctx.fillRect(legendX, legendY - 8, 12, 8);
      
      // Draw label
      ctx.fillStyle = '#374151';
      ctx.fillText(item.label, legendX + 16, legendY - 1);
      
      legendX += ctx.measureText(item.label).width + 35;
    });

  }, [data, width, height, showLabels, timeRange, endpoint]);

  return (
    <div className="relative">
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded"
        style={{ display: 'block', maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

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

export default HealthChart; 