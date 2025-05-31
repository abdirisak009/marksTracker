"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle, User, BookOpen, Target, Edit } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Student, type Assignment, type Mark } from "@/lib/supabase"

interface StudentWithClass extends Student {
  classes: { class_name: string } // Fixed: use class_name
}

interface AssignmentWithClass extends Assignment {
  classes: { class_name: string } // Fixed: use class_name
}

interface PerformanceEntryFormProps {
  onSubmit: (data: {
    studentId: string
    assignmentId: string
    marksObtained: number
    isEdit?: boolean
    existingMarkId?: string
  }) => void
  onCancel: () => void
}

export function PerformanceEntryForm({ onSubmit, onCancel }: PerformanceEntryFormProps) {
  const { toast } = useToast()
  const [students, setStudents] = useState<StudentWithClass[]>([])
  const [assignments, setAssignments] = useState<AssignmentWithClass[]>([])
  const [existingMarks, setExistingMarks] = useState<Mark[]>([])
  const [selectedStudent, setSelectedStudent] = useState<StudentWithClass | null>(null)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentWithClass | null>(null)
  const [marksObtained, setMarksObtained] = useState("")
  const [studentSearch, setStudentSearch] = useState("")
  const [errors, setErrors] = useState<{
    student?: string
    assignment?: string
    marks?: string
  }>({})
  const [existingMark, setExistingMark] = useState<Mark | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [loading, setLoading] = useState(true)

  // Fetch students with class information
  const fetchStudents = async () => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          *,
          classes (class_name)
        `)
        .order("student_id")

      if (error) throw error
      setStudents(data || [])
    } catch (error) {
      console.error("Error fetching students:", error)
    }
  }

  // Fetch assignments with class information
  const fetchAssignments = async () => {
    try {
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          *,
          classes (class_name)
        `)
        .order("title")

      if (error) throw error
      setAssignments(data || [])
    } catch (error) {
      console.error("Error fetching assignments:", error)
    }
  }

  // Fetch existing marks
  const fetchExistingMarks = async () => {
    try {
      const { data, error } = await supabase.from("marks").select("*")

      if (error) throw error
      setExistingMarks(data || [])
    } catch (error) {
      console.error("Error fetching marks:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
    fetchAssignments()
    fetchExistingMarks()
  }, [])

  // Filter students based on search
  const filteredStudents = students.filter(
    (student) =>
      (student.name || "").toLowerCase().includes(studentSearch.toLowerCase()) ||
      student.student_id.toLowerCase().includes(studentSearch.toLowerCase()),
  )

  // Filter assignments based on selected student's class
  const availableAssignments = selectedStudent
    ? assignments.filter((assignment) => assignment.class_id === selectedStudent.class_id)
    : []

  // Check for existing marks when student and assignment are selected
  useEffect(() => {
    if (selectedStudent && selectedAssignment) {
      const existing = existingMarks.find(
        (mark) => mark.student_id === selectedStudent.id && mark.assignment_id === selectedAssignment.id,
      )
      setExistingMark(existing || null)
      if (existing) {
        setMarksObtained(existing.marks_obtained.toString())
        setIsEditMode(true)
      } else {
        setIsEditMode(false)
        setMarksObtained("")
      }
    } else {
      setExistingMark(null)
      setIsEditMode(false)
    }
  }, [selectedStudent, selectedAssignment, existingMarks])

  const validateForm = () => {
    const newErrors: typeof errors = {}

    if (!selectedStudent) {
      newErrors.student = "Please select a student"
    }

    if (!selectedAssignment) {
      newErrors.assignment = "Please select an assignment"
    }

    if (!marksObtained.trim()) {
      newErrors.marks = "Please enter marks obtained"
    } else {
      const marks = Number.parseFloat(marksObtained)
      if (Number.isNaN(marks) || marks < 0) {
        newErrors.marks = "Please enter a valid positive number"
      } else if (selectedAssignment && marks > selectedAssignment.max_marks) {
        newErrors.marks = `Marks cannot exceed maximum marks (${selectedAssignment.max_marks})`
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = () => {
    if (!validateForm() || !selectedStudent || !selectedAssignment) return

    const marks = Number.parseFloat(marksObtained)

    onSubmit({
      studentId: selectedStudent.id,
      assignmentId: selectedAssignment.id,
      marksObtained: marks,
      isEdit: isEditMode,
      existingMarkId: existingMark?.id,
    })

    // Reset form
    setSelectedStudent(null)
    setSelectedAssignment(null)
    setMarksObtained("")
    setStudentSearch("")
    setErrors({})
    setExistingMark(null)
    setIsEditMode(false)
  }

  const handleStudentSelect = (studentId: string) => {
    const student = students.find((s) => s.id === studentId)
    setSelectedStudent(student || null)
    setSelectedAssignment(null) // Reset assignment when student changes
    setMarksObtained("")
    setStudentSearch(student?.name || student?.student_id || "")
  }

  const handleStudentSearchSelect = (student: StudentWithClass) => {
    setSelectedStudent(student)
    setSelectedAssignment(null)
    setMarksObtained("")
    setStudentSearch(student.name || student.student_id)
  }

  if (loading) {
    return <div className="text-center py-4">Loading form data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Student Selection */}
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Search by Name */}
          <div className="space-y-2">
            <Label htmlFor="studentSearch">Search Student by Name/ID</Label>
            <Input
              id="studentSearch"
              placeholder="Type student name or ID..."
              value={studentSearch}
              onChange={(e) => setStudentSearch(e.target.value)}
            />
            {studentSearch && filteredStudents.length > 0 && (
              <div className="max-h-32 overflow-y-auto border rounded-md">
                {filteredStudents.slice(0, 5).map((student) => (
                  <div
                    key={student.id}
                    className="p-2 hover:bg-muted cursor-pointer border-b last:border-b-0"
                    onClick={() => handleStudentSearchSelect(student)}
                  >
                    <div className="font-medium">{student.name || `Student ${student.student_id}`}</div>
                    <div className="text-sm text-muted-foreground">
                      {student.student_id} • {student.classes.class_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Select by Dropdown */}
          <div className="space-y-2">
            <Label htmlFor="studentSelect">Or Select from Dropdown</Label>
            <Select value={selectedStudent?.id || ""} onValueChange={handleStudentSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select student" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.name || `Student ${student.student_id}`} ({student.student_id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {errors.student && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{errors.student}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Selected Student Info */}
      {selectedStudent && (
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <User className="h-4 w-4" />
              Selected Student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-3">
              <div>
                <Label className="text-xs text-blue-600">Name</Label>
                <div className="font-medium text-blue-900">
                  {selectedStudent.name || `Student ${selectedStudent.student_id}`}
                </div>
              </div>
              <div>
                <Label className="text-xs text-blue-600">Student ID</Label>
                <div className="font-medium text-blue-900">{selectedStudent.student_id}</div>
              </div>
              <div>
                <Label className="text-xs text-blue-600">Class</Label>
                <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                  {selectedStudent.classes.class_name}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Assignment Selection */}
      {selectedStudent && (
        <div className="space-y-2">
          <Label htmlFor="assignmentSelect">Select Assignment</Label>
          <Select
            value={selectedAssignment?.id || ""}
            onValueChange={(value) => {
              const assignment = availableAssignments.find((a) => a.id === value)
              setSelectedAssignment(assignment || null)
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select assignment" />
            </SelectTrigger>
            <SelectContent>
              {availableAssignments.map((assignment) => (
                <SelectItem key={assignment.id} value={assignment.id}>
                  {assignment.title} (Max: {assignment.max_marks} marks)
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.assignment && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errors.assignment}</AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {/* Selected Assignment Info */}
      {selectedAssignment && (
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-green-800">
              <BookOpen className="h-4 w-4" />
              Selected Assignment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid gap-2 md:grid-cols-2">
              <div>
                <Label className="text-xs text-green-600">Assignment Title</Label>
                <div className="font-medium text-green-900">{selectedAssignment.title}</div>
              </div>
              <div>
                <Label className="text-xs text-green-600">Maximum Marks</Label>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                    <Target className="h-3 w-3 mr-1" />
                    {selectedAssignment.max_marks} marks
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Existing Mark Warning */}
      {existingMark && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <Edit className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <strong>Existing Record Found:</strong> This student already has marks for this assignment (
            {existingMark.marks_obtained}/{selectedAssignment?.max_marks}). You can update the marks below.
          </AlertDescription>
        </Alert>
      )}

      {/* Marks Entry */}
      {selectedAssignment && (
        <div className="space-y-2">
          <Label htmlFor="marksObtained">
            Marks Obtained {selectedAssignment && `(out of ${selectedAssignment.max_marks})`}
          </Label>
          <Input
            id="marksObtained"
            type="number"
            min="0"
            max={selectedAssignment.max_marks}
            step="0.5"
            value={marksObtained}
            onChange={(e) => setMarksObtained(e.target.value)}
            placeholder={`Enter marks (0-${selectedAssignment.max_marks})`}
          />
          {errors.marks && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{errors.marks}</AlertDescription>
            </Alert>
          )}

          {/* Live Validation */}
          {marksObtained && selectedAssignment && (
            <div className="text-sm">
              {Number.parseFloat(marksObtained) > selectedAssignment.max_marks ? (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertTriangle className="h-4 w-4" />
                  Marks exceed maximum allowed ({selectedAssignment.max_marks})
                </div>
              ) : (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Valid marks ({((Number.parseFloat(marksObtained) / selectedAssignment.max_marks) * 100).toFixed(1)}%)
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button onClick={handleSubmit} className="flex-1">
          {isEditMode ? "Update Marks" : "Save Marks"}
        </Button>
        <Button variant="outline" onClick={onCancel} className="flex-1">
          Cancel
        </Button>
      </div>
    </div>
  )
}
