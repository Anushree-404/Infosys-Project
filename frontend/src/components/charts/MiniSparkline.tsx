'use client';

/**
 * MiniSparkline - Tiny inline chart for dashboard cards
 */

import React from 'react';
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts';

interface MiniSparklineProps {
  data: number[];
  color?: string;
  height?: number;
}

export const MiniSparkline: React.FC<MiniSparklineProps> = ({
  data,
  color = '#22c55e',
  height = 40,
}) => {
  if (!data || data.length < 2) return null;

  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={2}
          dot={false}
          isAnimationActive={false}
        />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: '2px 6px', borderRadius: 6 }}
          formatter={(v: number) => [v.toFixed(1), '']}
          labelFormatter={() => ''}
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default MiniSparkline;
