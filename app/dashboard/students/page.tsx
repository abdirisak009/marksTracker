"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Plus, Search, Edit, Trash2, Loader2, AlertCircle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Student, type Class } from "@/lib/supabase"

interface StudentWithClass extends Omit<Student, "name"> {
  full_name: string | null
  classes: Class
  totalAssignments: number
  completedAssignments: number
  averageScore: number
}

export default function StudentsPage() {
  const { toast } = useToast()
  const [students, setStudents] = useState<StudentWithClass[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [classesLoading, setClassesLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedClass, setSelectedClass] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newStudent, setNewStudent] = useState({
    full_name: "",
    studentId: "",
    classId: "", // This will store the UUID from classes.id
  })
  const [errors, setErrors] = useState<{ studentId?: string; classId?: string }>({})
  const [submitting, setSubmitting] = useState(false)
  const [editStudent, setEditStudent] = useState<StudentWithClass | null>(null)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

  // Fetch classes for dropdown
  const fetchClasses = async () => {
    try {
      setClassesLoading(true)
      console.log("Fetching classes for dropdown...")
      // Fetch all columns to match Class type
      const { data, error } = await supabase.from("classes").select("*").order("class_name")

      if (error) {
        console.error("Error fetching classes:", error)
        throw error
      }

      console.log("Fetched classes:", data)
      setClasses(data || [])
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({
        title: "Error",
        description: "Failed to fetch classes for dropdown.",
        variant: "destructive",
      })
    } finally {
      setClassesLoading(false)
    }
  }

  // Fetch students with class information and performance stats
  const fetchStudents = async () => {
    try {
      const { data: studentsData, error: studentsError } = await supabase
        .from("students")
        .select(`
          *,
          full_name,
          classes (*)
        `)
        .order("created_at", { ascending: false })

      if (studentsError) throw studentsError

      // Get assignment counts and marks for each student
      const studentsWithStats = await Promise.all(
        (studentsData || []).map(async (student) => {
          // Get total assignments for student's class
          const { data: assignments } = await supabase.from("assignments").select("id").eq("class_id", student.class_id)

          // Get completed assignments (marks) for student
          const { data: marks } = await supabase
            .from("marks")
            .select("marks_obtained, assignments!inner(max_marks)")
            .eq("student_id", student.id)

          const totalAssignments = assignments?.length || 0
          const completedAssignments = marks?.length || 0

          // Calculate average score
          let averageScore = 0
          if (marks && marks.length > 0) {
            const totalPercentage = marks.reduce((sum, mark) => {
              const percentage = (mark.marks_obtained / (mark.assignments as any).max_marks) * 100
              return sum + percentage
            }, 0)
            averageScore = totalPercentage / marks.length
          }

          return {
            ...student,
            full_name: student.full_name ?? "",
            totalAssignments,
            completedAssignments,
            averageScore,
          }
        }),
      )

      setStudents(studentsWithStats)
    } catch (error) {
      console.error("Error fetching students:", error)
      toast({
        title: "Error",
        description: "Failed to fetch students. Please try again.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
    fetchStudents()
  }, [])

  // Refresh classes when dialog opens to ensure latest data
  const handleDialogOpen = (open: boolean) => {
    setIsAddDialogOpen(open)
    if (open) {
      fetchClasses() // Refresh classes when opening dialog
    }
  }

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      (student.full_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.student_id?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesClass = selectedClass === "all" || student.class_id === selectedClass
    return matchesSearch && matchesClass
  })

  const validateForm = async () => {
    const newErrors: { studentId?: string; classId?: string } = {}

    if (!newStudent.studentId.trim()) {
      newErrors.studentId = "Student ID is required"
    } else {
      // Check for duplicate student IDs
      const { data } = await supabase.from("students").select("id").eq("student_id", newStudent.studentId.trim())

      if (data && data.length > 0) {
        newErrors.studentId = "Student ID already exists"
      }
    }

    if (!newStudent.classId) {
      newErrors.classId = "Class selection is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddStudent = async () => {
    if (!(await validateForm())) return

    setSubmitting(true)
    try {
      console.log("Submitting student with data:", {
        student_id: newStudent.studentId.trim(),
        full_name: newStudent.full_name.trim() || null,
        class_id: newStudent.classId, // This should be the UUID
      })

      const { data, error } = await supabase
        .from("students")
        .insert([
          {
            student_id: newStudent.studentId.trim(),
            full_name: newStudent.full_name.trim() || null,
            class_id: newStudent.classId, // UUID from classes.id
          },
        ])
        .select()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      console.log("Student created successfully:", data)
      await fetchStudents()
      setNewStudent({ full_name: "", studentId: "", classId: "" })
      setIsAddDialogOpen(false)
      setErrors({})
      toast({
        title: "Success",
        description: "Student has been registered successfully.",
      })
    } catch (error) {
      console.error("Error adding student:", error)
      toast({
        title: "Error",
        description: "Failed to register student. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteStudent = async (id: string) => {
    try {
      const { error } = await supabase.from("students").delete().eq("id", id)

      if (error) throw error

      await fetchStudents()
      toast({
        title: "Success",
        description: "Student has been removed successfully.",
      })
    } catch (error) {
      console.error("Error deleting student:", error)
      toast({
        title: "Error",
        description: "Failed to remove student. Please try again.",
        variant: "destructive",
      })
    }
  }

  const closeDialog = () => {
    setIsAddDialogOpen(false)
    setNewStudent({ full_name: "", studentId: "", classId: "" })
    setErrors({})
  }

  const displayStudentName = (student: StudentWithClass) => {
    return student.full_name?.trim() || `Student ${student.student_id}`
  }

  // Get the selected class name for display
  const getSelectedClassName = () => {
    if (!newStudent.classId) return ""
    const selectedClass = classes.find((c) => c.id === newStudent.classId)
    return selectedClass ? `${selectedClass.class_name} (${selectedClass.shift})` : ""
  }

  const handleEditStudent = (student: StudentWithClass) => {
    setEditStudent(student)
    setIsEditDialogOpen(true)
  }

  const handleUpdateStudent = async () => {
    if (!editStudent) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("students")
        .update({
          full_name: editStudent.full_name,
          student_id: editStudent.student_id,
          class_id: editStudent.class_id,
        })
        .eq("id", editStudent.id)
      if (error) throw error
      await fetchStudents()
      setIsEditDialogOpen(false)
      setEditStudent(null)
      toast({
        title: "Success",
        description: "Student updated successfully.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update student. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading students...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Students Management</h2>
          <p className="text-muted-foreground">Manage student registrations and view their performance</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={handleDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
              <DialogDescription>
                Register a new student in the system. Only Student ID and Class are required.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Full Name (Optional)</Label>
                <Input
                  id="name"
                  value={newStudent.full_name}
                  onChange={(e) => setNewStudent({ ...newStudent, full_name: e.target.value })}
                  placeholder="Enter student's full name (optional)"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank if name is not available. Student will be identified by ID.
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="studentId">Student ID *</Label>
                <Input
                  id="studentId"
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                  placeholder="Enter unique student ID"
                />
                {errors.studentId && (
                  <Alert className="py-2">
                    <AlertDescription className="text-sm text-red-600">{errors.studentId}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="class">Class *</Label>
                {classesLoading ? (
                  <div className="flex items-center gap-2 p-2 border rounded">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Loading classes...</span>
                  </div>
                ) : classes.length === 0 ? (
                  <Alert className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      No classes available. Please create a class first.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Select
                    value={newStudent.classId} // This is the UUID
                    onValueChange={(value) => {
                      console.log("Selected class ID:", value)
                      setNewStudent({ ...newStudent, classId: value })
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
                )}
                {errors.classId && (
                  <Alert className="py-2">
                    <AlertDescription className="text-sm text-red-600">{errors.classId}</AlertDescription>
                  </Alert>
                )}
                {/* Debug info */}
                {newStudent.classId && (
                  <p className="text-xs text-muted-foreground">
                    Selected: {getSelectedClassName()} (ID: {newStudent.classId})
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddStudent} disabled={submitting || classes.length === 0}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Add Student
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Student List</CardTitle>
          <CardDescription>View and manage all registered students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
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
                <TableHead>Name</TableHead>
                <TableHead>Student ID</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Assignments</TableHead>
                <TableHead>Average Score</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    {displayStudentName(student)}
                    {!student.full_name?.trim() && (
                      <Badge variant="outline" className="ml-2 text-xs">
                        No Name
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{student.student_id}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{student.classes?.class_name || "-"}</Badge>
                  </TableCell>
                  <TableCell>
                    {student.completedAssignments}/{student.totalAssignments}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        typeof student.averageScore === "number" && !isNaN(student.averageScore)
                          ? student.averageScore >= 80
                            ? "default"
                            : student.averageScore >= 60
                              ? "secondary"
                              : "destructive"
                          : "secondary"
                      }
                    >
                      {typeof student.averageScore === "number" && !isNaN(student.averageScore)
                        ? student.averageScore.toFixed(1)
                        : "-"}%
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleEditStudent(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteStudent(student.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredStudents.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No students found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Student Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student details below.</DialogDescription>
          </DialogHeader>
          {editStudent && (
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-full-name">Full Name</Label>
                <Input
                  id="edit-full-name"
                  value={editStudent.full_name || ""}
                  onChange={(e) => setEditStudent({ ...editStudent, full_name: e.target.value })}
                  placeholder="Enter student's full name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-student-id">Student ID</Label>
                <Input
                  id="edit-student-id"
                  value={editStudent.student_id}
                  onChange={(e) => setEditStudent({ ...editStudent, student_id: e.target.value })}
                  placeholder="Enter student ID"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="edit-class">Class</Label>
                <Select
                  value={editStudent.class_id}
                  onValueChange={(value) => setEditStudent({ ...editStudent, class_id: value })}
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
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateStudent} disabled={submitting || !editStudent}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
