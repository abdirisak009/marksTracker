"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts"

const data = [
  {
    name: "Class A",
    average: 78.5,
  },
  {
    name: "Class B",
    average: 82.3,
  },
  {
    name: "Class C",
    average: 75.8,
  },
]

export function DashboardChart() {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="average" fill="#8884d8" />
      </BarChart>
    </ResponsiveContainer>
  )
}
