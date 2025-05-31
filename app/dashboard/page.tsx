"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, BookOpen, TrendingUp } from "lucide-react"
import { DashboardChart } from "@/components/dashboard-chart"
import { PerformanceChart } from "@/components/performance-chart"
import { useEffect, useState } from "react"
import { testDatabaseConnection } from "@/lib/db-test"
import { supabase } from "@/lib/supabase"

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalAssignments: 0,
    totalClasses: 0,
    averagePerformance: 0,
  })
  const [loading, setLoading] = useState(true)
  const [connectionStatus, setConnectionStatus] = useState<string>("")

  useEffect(() => {
    // Test database connection and fetch real stats
    const fetchStats = async () => {
      try {
        // Test connection first
        const connectionTest = await testDatabaseConnection()
        setConnectionStatus(connectionTest.message)
        console.log("Database connection test:", connectionTest)

        if (!connectionTest.success) {
          console.error("Database connection failed, using default values")
          setLoading(false)
          return
        }

        // Fetch real statistics with error handling for each query
        const [classesResult, studentsResult, assignmentsResult, marksResult] = await Promise.allSettled([
          supabase.from("classes").select("id"),
          supabase.from("students").select("id"),
          supabase.from("assignments").select("id"),
          supabase.from("marks").select("marks_obtained, assignments!inner(max_marks)"),
        ])

        const totalClasses = classesResult.status === "fulfilled" ? classesResult.value.data?.length || 0 : 0
        const totalStudents = studentsResult.status === "fulfilled" ? studentsResult.value.data?.length || 0 : 0
        const totalAssignments =
          assignmentsResult.status === "fulfilled" ? assignmentsResult.value.data?.length || 0 : 0

        // Calculate average performance
        let averagePerformance = 0
        if (marksResult.status === "fulfilled" && marksResult.value.data && marksResult.value.data.length > 0) {
          const totalPercentage = marksResult.value.data.reduce((sum, mark) => {
            const percentage = (mark.marks_obtained / (mark.assignments as any).max_marks) * 100
            return sum + percentage
          }, 0)
          averagePerformance = totalPercentage / marksResult.value.data.length
        }

        setStats({
          totalStudents,
          totalAssignments,
          totalClasses,
          averagePerformance,
        })
      } catch (error) {
        console.error("Error fetching dashboard stats:", error)
        setConnectionStatus("Error fetching stats")
        // Keep default values on error
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Dashboard Overview</h2>
        <p className="text-muted-foreground">Welcome to FontEng student activity tracking system</p>
        {connectionStatus && <p className="text-xs text-muted-foreground mt-1">Status: {connectionStatus}</p>}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalStudents}</div>
            <p className="text-xs text-muted-foreground">Registered students</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalClasses}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : stats.totalAssignments}</div>
            <p className="text-xs text-muted-foreground">Created assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? "..." : `${stats.averagePerformance.toFixed(1)}%`}</div>
            <p className="text-xs text-muted-foreground">Overall student performance</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Class Performance Overview</CardTitle>
            <CardDescription>Average performance by class</CardDescription>
          </CardHeader>
          <CardContent>
            <DashboardChart />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Performance Trends</CardTitle>
            <CardDescription>Student performance over time</CardDescription>
          </CardHeader>
          <CardContent>
            <PerformanceChart />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
