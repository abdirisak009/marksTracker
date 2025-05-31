"use client"

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend } from "recharts"

const data = [
  {
    class: "Class A",
    mathematics: 85,
    science: 78,
    english: 82,
  },
  {
    class: "Class B",
    mathematics: 78,
    science: 85,
    english: 79,
  },
  {
    class: "Class C",
    mathematics: 82,
    science: 80,
    english: 85,
  },
]

export function ClassPerformanceChart() {
  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={data}>
        <XAxis dataKey="class" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="mathematics" fill="#8884d8" name="Mathematics" />
        <Bar dataKey="science" fill="#82ca9d" name="Science" />
        <Bar dataKey="english" fill="#ffc658" name="English" />
      </BarChart>
    </ResponsiveContainer>
  )
}
