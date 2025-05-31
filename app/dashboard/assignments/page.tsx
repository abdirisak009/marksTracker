"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Plus, Calendar, Users, Target, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Assignment, type Class } from "@/lib/supabase"

interface AssignmentWithClass extends Assignment {
  classes: Class
  submittedCount: number
  totalStudents: number
  averageScore: number
}

export default function AssignmentsPage() {
  const { toast } = useToast()
  const [assignments, setAssignments] = useState<AssignmentWithClass[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    classId: "", // This will store the UUID from classes.id
    maxMarks: "",
    dueDate: "",
  })
  const [submitting, setSubmitting] = useState(false)

  // Fetch classes for dropdown
  const fetchClasses = async () => {
    try {
      console.log("Fetching classes for assignments dropdown...")
      const { data, error } = await supabase.from("classes").select("id, class_name, shift").order("class_name")

      if (error) throw error
      console.log("Fetched classes for assignments:", data)
      setClasses(data || [])
    } catch (error) {
      console.error("Error fetching classes:", error)
    }
  }

  // Fetch assignments with class information and statistics
  const fetchAssignments = async () => {
    try {
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("assignments")
        .select(`
          *,
          classes (*)
        `)
        .order("created_at", { ascending: false })

      if (assignmentsError) throw assignmentsError

      // Get statistics for each assignment
      const assignmentsWithStats = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          // Get total students in the class
          const { data: students } = await supabase.from("students").select("id").eq("class_id", assignment.class_id)

          // Get submitted marks for this assignment
          const { data: marks } = await supabase
            .from("marks")
            .select("marks_obtained")
            .eq("assignment_id", assignment.id)

          const totalStudents = students?.length || 0
          const submittedCount = marks?.length || 0

          // Calculate average score
          let averageScore = 0
          if (marks && marks.length > 0) {
            const totalMarks = marks.reduce((sum, mark) => sum + mark.marks_obtained, 0)
            averageScore = (totalMarks / marks.length / assignment.max_marks) * 100
          }

          return {
            ...assignment,
            submittedCount,
            totalStudents,
            averageScore,
          }
        }),
      )

      setAssignments(assignmentsWithStats)
    } catch (error) {
      console.error("Error fetching assignments:", error)
      toast({
        title: "Error",
        description: "Failed to fetch assignments. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
    fetchAssignments()
  }, [])

  const handleAddAssignment = async () => {
    if (!newAssignment.title || !newAssignment.classId || !newAssignment.maxMarks) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setSubmitting(true)
    try {
      console.log("Submitting assignment with data:", {
        title: newAssignment.title.trim(),
        description: newAssignment.description.trim() || null,
        class_id: newAssignment.classId, // UUID from classes.id
        max_marks: Number.parseFloat(newAssignment.maxMarks),
        due_date: newAssignment.dueDate || null,
      })

      const { error } = await supabase.from("assignments").insert([
        {
          title: newAssignment.title.trim(),
          description: newAssignment.description.trim() || null,
          class_id: newAssignment.classId, // UUID from classes.id
          max_marks: Number.parseFloat(newAssignment.maxMarks),
          due_date: newAssignment.dueDate || null,
        },
      ])

      if (error) throw error

      await fetchAssignments()
      setNewAssignment({ title: "", description: "", classId: "", maxMarks: "", dueDate: "" })
      setIsAddDialogOpen(false)
      toast({
        title: "Success",
        description: "Assignment has been created successfully.",
      })
    } catch (error) {
      console.error("Error adding assignment:", error)
      toast({
        title: "Error",
        description: "Failed to create assignment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (submittedCount: number, totalStudents: number) => {
    if (totalStudents === 0) return <Badge variant="secondary">No Students</Badge>

    const percentage = (submittedCount / totalStudents) * 100
    if (percentage === 100) return <Badge className="bg-green-500">Complete</Badge>
    if (percentage >= 50) return <Badge className="bg-yellow-500">In Progress</Badge>
    return <Badge variant="destructive">Pending</Badge>
  }

  // Get the selected class name for display
  const getSelectedClassName = () => {
    if (!newAssignment.classId) return ""
    const selectedClass = classes.find((c) => c.id === newAssignment.classId)
    return selectedClass ? `${selectedClass.class_name} (${selectedClass.shift})` : ""
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading assignments...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assignments Management</h2>
          <p className="text-muted-foreground">Create and manage assignments for different classes</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Assignment
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Assignment</DialogTitle>
              <DialogDescription>Add a new assignment for students to complete.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="title">Assignment Title</Label>
                <Input
                  id="title"
                  value={newAssignment.title}
                  onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                  placeholder="Enter assignment title"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                  placeholder="Enter assignment description"
                  rows={3}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="class">Class</Label>
                <Select
                  value={newAssignment.classId} // This is the UUID
                  onValueChange={(value) => {
                    console.log("Selected class ID for assignment:", value)
                    setNewAssignment({ ...newAssignment, classId: value })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.class_name} ({classItem.shift})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* Debug info */}
                {newAssignment.classId && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {getSelectedClassName()} (ID: {newAssignment.classId})
                  </p>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="maxMarks">Maximum Marks</Label>
                <Input
                  id="maxMarks"
                  type="number"
                  value={newAssignment.maxMarks}
                  onChange={(e) => setNewAssignment({ ...newAssignment, maxMarks: e.target.value })}
                  placeholder="Enter maximum marks"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="dueDate">Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={newAssignment.dueDate}
                  onChange={(e) => setNewAssignment({ ...newAssignment, dueDate: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddAssignment} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Assignment
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assignments</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{assignments.length}</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Completion</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments.length > 0
                ? Math.round(
                    (assignments.reduce(
                      (acc, a) => acc + (a.totalStudents > 0 ? a.submittedCount / a.totalStudents : 0),
                      0,
                    ) /
                      assignments.length) *
                      100,
                  )
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Student submission rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {assignments.length > 0
                ? (assignments.reduce((acc, a) => acc + a.averageScore, 0) / assignments.length).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground">Across all assignments</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment List</CardTitle>
          <CardDescription>View and manage all assignments</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Max Marks</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Submissions</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assignments.map((assignment) => (
                <TableRow key={assignment.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{assignment.title}</div>
                      {assignment.description && (
                        <div className="text-sm text-muted-foreground">{assignment.description}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{assignment.classes.class_name}</Badge>
                  </TableCell>
                  <TableCell>{assignment.max_marks}</TableCell>
                  <TableCell>
                    {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : "No due date"}
                  </TableCell>
                  <TableCell>
                    {assignment.submittedCount}/{assignment.totalStudents}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        assignment.averageScore >= 80
                          ? "default"
                          : assignment.averageScore >= 60
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {assignment.averageScore.toFixed(1)}%
                    </Badge>
                  </TableCell>
                  <TableCell>{getStatusBadge(assignment.submittedCount, assignment.totalStudents)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {assignments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No assignments found. Create your first assignment to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
