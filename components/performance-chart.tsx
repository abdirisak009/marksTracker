"use client"

import { Line, LineChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    month: "Jan",
    performance: 75,
  },
  {
    month: "Feb",
    performance: 78,
  },
  {
    month: "Mar",
    performance: 82,
  },
  {
    month: "Apr",
    performance: 79,
  },
  {
    month: "May",
    performance: 85,
  },
]

export function PerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <XAxis dataKey="month" />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="performance" stroke="#8884d8" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  )
}
