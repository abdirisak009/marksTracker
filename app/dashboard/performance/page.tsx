"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Plus, Search, TrendingUp, Award, Edit, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { ClassPerformanceChart } from "@/components/class-performance-chart"
import { PerformanceEntryForm } from "@/components/performance-entry-form"
import { supabase, type Mark, type Student, type Assignment, type Class } from "@/lib/supabase"
import { Label } from "@/components/ui/label"

interface MarkWithDetails extends Omit<Mark, "score" | "students" | "assignments"> {
  score: number
  students: any
  assignments: any
}

export default function PerformancePage() {
  const { toast } = useToast()
  const [marks, setMarks] = useState<MarkWithDetails[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [editMark, setEditMark] = useState<MarkWithDetails | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Fetch classes for filtering
  const fetchClasses = async () => {
    try {
      const { data, error } = await supabase.from("classes").select("*").order("class_name")

      if (error) throw error
      setClasses(data || [])
    } catch (error) {
      console.error("Error fetching classes:", error)
    }
  }

  // Fetch marks with student and assignment details
  const fetchMarks = async () => {
    try {
      const { data, error } = await supabase
        .from("marks")
        .select(`
          *,
          students:students!inner(*, full_name, classes(*)),
          assignments:assignments!inner(*, classes(*))
        `)
        .order("created_at", { ascending: false })

      if (error) throw error
      setMarks(data || [])
    } catch (error) {
      console.error("Error fetching marks:", error)
      toast({
        title: "Error",
        description: "Failed to fetch performance data. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
    fetchMarks()
  }, [])

  const filteredMarks = marks.filter((mark) => {
    const studentName = mark.students.full_name || `Student ${mark.students.student_id}`
    const matchesSearch =
      studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mark.students.student_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mark.assignments.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = selectedClass === "all" || mark.students.class_id === selectedClass
    return matchesSearch && matchesClass
  })

  const handleAddMark = async (newMarkData: {
    studentId: string
    assignmentId: string
    marksObtained: number
    isEdit?: boolean
    existingMarkId?: string
  }) => {
    try {
      if (newMarkData.isEdit && newMarkData.existingMarkId) {
        // Update existing mark
        const { error } = await supabase
          .from("marks")
          .update({
            student_id: newMarkData.studentId,
            assignment_id: newMarkData.assignmentId,
            score: newMarkData.marksObtained,
          })
          .eq("id", newMarkData.existingMarkId)

        if (error) throw error

        toast({
          title: "Success",
          description: "Marks updated successfully.",
        })
      } else {
        // Add new mark
        const { error } = await supabase.from("marks").insert([
          {
            student_id: newMarkData.studentId,
            assignment_id: newMarkData.assignmentId,
            score: newMarkData.marksObtained,
          },
        ])

        if (error) throw error

        toast({
          title: "Success",
          description: "Marks added successfully.",
        })
      }

      await fetchMarks()
      setIsAddDialogOpen(false)
    } catch (error) {
      console.error("Error saving marks:", error)
      toast({
        title: "Error",
        description: "Failed to save marks. Please try again.",
        variant: "destructive",
      })
    }
  }

  const handleEditMark = (mark: MarkWithDetails) => {
    setEditMark(mark)
    setIsEditDialogOpen(true)
  }

  const handleUpdateMark = async () => {
    if (!editMark) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("marks")
        .update({
          score: editMark.score,
        })
        .eq("id", editMark.id)
      if (error) throw error
      await fetchMarks()
      setIsEditDialogOpen(false)
      setEditMark(null)
      toast({
        title: "Success",
        description: "Marks updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update marks. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getGradeBadge = (percentage: number) => {
    if (percentage >= 90) return <Badge className="bg-green-500">A+</Badge>
    if (percentage >= 80) return <Badge className="bg-blue-500">A</Badge>
    if (percentage >= 70) return <Badge className="bg-yellow-500">B</Badge>
    if (percentage >= 60) return <Badge className="bg-orange-500">C</Badge>
    return <Badge variant="destructive">F</Badge>
  }

  const averagePerformance =
    marks.length > 0
      ? marks.reduce((acc, mark) => {
          const percentage = (mark.score / mark.assignments.max_marks) * 100
          return acc + percentage
        }, 0) / marks.length
      : 0

  const topPerformers = [...marks]
    .map((mark) => ({
      ...mark,
      percentage: (mark.score / mark.assignments.max_marks) * 100,
    }))
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 3)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading performance data...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Performance Tracking</h2>
          <p className="text-muted-foreground">Enter marks and track student performance across assignments</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Marks
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Enter Student Marks</DialogTitle>
              <DialogDescription>Add or update marks for a student's assignment submission.</DialogDescription>
            </DialogHeader>
            <PerformanceEntryForm onSubmit={handleAddMark} onCancel={() => setIsAddDialogOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Performance Summary */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averagePerformance.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Across all submissions</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{marks.length}</div>
            <p className="text-xs text-muted-foreground">Graded assignments</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Performer</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPerformers.length > 0
                ? topPerformers[0].students.full_name || `Student ${topPerformers[0].students.student_id}`
                : "N/A"}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPerformers.length > 0 ? `${topPerformers[0].percentage.toFixed(1)}%` : "No data"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Class Performance Analysis</CardTitle>
          <CardDescription>Visual representation of performance across classes</CardDescription>
        </CardHeader>
        <CardContent>
          <ClassPerformanceChart />
        </CardContent>
      </Card>

      {/* Marks Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Marks</CardTitle>
          <CardDescription>View and manage all student marks and grades</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students or assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.class_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Assignment</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Marks</TableHead>
                <TableHead>Percentage</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMarks.map((mark) => {
                const percentage = (mark.score / mark.assignments.max_marks) * 100
                return (
                  <TableRow key={mark.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{mark.students.full_name || `Student ${mark.students.student_id}`}</div>
                        <div className="text-sm text-muted-foreground">{mark.students.student_id}</div>
                      </div>
                    </TableCell>
                    <TableCell>{mark.assignments.title}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{mark.students.classes.class_name}</Badge>
                    </TableCell>
                    <TableCell>
                      {mark.score}/{mark.assignments.max_marks}
                    </TableCell>
                    <TableCell>{percentage.toFixed(1)}%</TableCell>
                    <TableCell>{getGradeBadge(percentage)}</TableCell>
                    <TableCell>{mark.submission_date ? new Date(mark.submission_date).toLocaleDateString() : "-"}</TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" onClick={() => handleEditMark(mark)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>

          {filteredMarks.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">No marks found matching your search criteria.</div>
          )}
        </CardContent>
      </Card>

      {/* Edit Mark Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Marks</DialogTitle>
            <DialogDescription>Update the marks for this student and assignment.</DialogDescription>
          </DialogHeader>
          {editMark && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-score">Score</Label>
                <Input
                  id="edit-score"
                  type="number"
                  value={editMark.score}
                  onChange={(e) => setEditMark({ ...editMark, score: Number(e.target.value) })}
                  placeholder="Enter score"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateMark}
              disabled={submitting || !editMark}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
