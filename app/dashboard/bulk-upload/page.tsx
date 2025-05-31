"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Upload, Download, CheckCircle, XCircle, FileText, Target, Clock } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface Assignment {
  id: string
  title: string
  class: string
  maxMarks: number
}

interface Student {
  id: string
  name: string
  studentId: string
  class: string
}

interface UploadResult {
  studentId: string
  studentName: string
  marks: number
  status: "added" | "updated" | "error"
  message?: string
}

interface AuditLog {
  id: string
  timestamp: string
  instructor: string
  assignment: string
  action: string
  recordsProcessed: number
}

export default function BulkUploadPage() {
  const { toast } = useToast()

  // Mock data
  const [assignments] = useState<Assignment[]>([
    { id: "1", title: "Mathematics Quiz 1", class: "Grade 11A", maxMarks: 100 },
    { id: "2", title: "Science Project", class: "Computer Science A", maxMarks: 150 },
    { id: "3", title: "English Essay", class: "Grade 11B", maxMarks: 80 },
    { id: "4", title: "Physics Lab Report", class: "Grade 11A", maxMarks: 50 },
    { id: "5", title: "Programming Assignment", class: "Computer Science A", maxMarks: 120 },
  ])

  const [students] = useState<Student[]>([
    { id: "1", name: "John Doe", studentId: "ST001", class: "Grade 11A" },
    { id: "2", name: "Jane Smith", studentId: "ST002", class: "Grade 11B" },
    { id: "3", name: "Mike Johnson", studentId: "ST003", class: "Computer Science A" },
    { id: "4", name: "", studentId: "ST004", class: "Grade 11A" },
    { id: "5", name: "Sarah Wilson", studentId: "ST005", class: "Grade 11A" },
  ])

  const [existingMarks] = useState([
    { studentId: "ST001", assignmentId: "1", marks: 85 },
    { studentId: "ST002", assignmentId: "3", marks: 72 },
  ])

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([
    {
      id: "1",
      timestamp: "2024-02-15 10:30:00",
      instructor: "Admin User",
      assignment: "Mathematics Quiz 1",
      action: "Bulk Upload",
      recordsProcessed: 25,
    },
  ])

  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [csvData, setCsvData] = useState("")
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [showResults, setShowResults] = useState(false)

  const handleAssignmentSelect = (assignmentId: string) => {
    const assignment = assignments.find((a) => a.id === assignmentId)
    setSelectedAssignment(assignment || null)
    setUploadResults([])
    setShowResults(false)
  }

  const generateCSVTemplate = () => {
    if (!selectedAssignment) return

    const template = `Student ID,Marks
ST001,85
ST002,92
ST003,78`

    const blob = new Blob([template], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${selectedAssignment.title.replace(/\s+/g, "_")}_template.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: "Template Downloaded",
      description: "CSV template has been downloaded successfully.",
    })
  }

  const parseCSVData = (data: string): { studentId: string; marks: number }[] => {
    const lines = data.trim().split("\n")
    const results: { studentId: string; marks: number }[] = []

    // Skip header row
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const [studentId, marksStr] = line.split(",").map((s) => s.trim())
      const marks = Number.parseFloat(marksStr)

      if (studentId && !isNaN(marks)) {
        results.push({ studentId, marks })
      }
    }

    return results
  }

  const processUpload = () => {
    if (!selectedAssignment || !csvData.trim()) {
      toast({
        title: "Error",
        description: "Please select an assignment and provide CSV data.",
        variant: "destructive",
      })
      return
    }

    setIsProcessing(true)

    // Simulate processing delay
    setTimeout(() => {
      const parsedData = parseCSVData(csvData)
      const results: UploadResult[] = []

      parsedData.forEach(({ studentId, marks }) => {
        // Find student
        const student = students.find((s) => s.studentId === studentId)
        if (!student) {
          results.push({
            studentId,
            studentName: "Unknown",
            marks,
            status: "error",
            message: "Student not found",
          })
          return
        }

        // Check if student belongs to assignment's class
        if (student.class !== selectedAssignment.class) {
          results.push({
            studentId,
            studentName: student.name || `Student ${studentId}`,
            marks,
            status: "error",
            message: `Student not in ${selectedAssignment.class}`,
          })
          return
        }

        // Validate marks
        if (marks < 0 || marks > selectedAssignment.maxMarks) {
          results.push({
            studentId,
            studentName: student.name || `Student ${studentId}`,
            marks,
            status: "error",
            message: `Invalid marks (0-${selectedAssignment.maxMarks} allowed)`,
          })
          return
        }

        // Check if marks already exist
        const existingMark = existingMarks.find(
          (m) => m.studentId === studentId && m.assignmentId === selectedAssignment.id,
        )

        results.push({
          studentId,
          studentName: student.name || `Student ${studentId}`,
          marks,
          status: existingMark ? "updated" : "added",
        })
      })

      setUploadResults(results)
      setShowResults(true)
      setIsProcessing(false)

      // Add to audit log
      const newLog: AuditLog = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        instructor: "Admin User",
        assignment: selectedAssignment.title,
        action: "Bulk Upload",
        recordsProcessed: results.length,
      }
      setAuditLogs([newLog, ...auditLogs])

      const successCount = results.filter((r) => r.status !== "error").length
      const errorCount = results.filter((r) => r.status === "error").length

      toast({
        title: "Upload Complete",
        description: `${successCount} records processed successfully, ${errorCount} errors.`,
      })
    }, 2000)
  }

  const getStatusBadge = (status: UploadResult["status"]) => {
    switch (status) {
      case "added":
        return (
          <Badge className="bg-green-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Added
          </Badge>
        )
      case "updated":
        return (
          <Badge className="bg-blue-500">
            <CheckCircle className="h-3 w-3 mr-1" />
            Updated
          </Badge>
        )
      case "error":
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        )
    }
  }

  const addedCount = uploadResults.filter((r) => r.status === "added").length
  const updatedCount = uploadResults.filter((r) => r.status === "updated").length
  const errorCount = uploadResults.filter((r) => r.status === "error").length

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Bulk Marks Upload</h2>
        <p className="text-muted-foreground">Upload marks for multiple students at once using CSV data</p>
      </div>

      <Tabs defaultValue="upload" className="space-y-6">
        <TabsList>
          <TabsTrigger value="upload">Upload Marks</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-6">
          {/* Assignment Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Select Assignment
              </CardTitle>
              <CardDescription>Choose the assignment for which you want to upload marks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="assignment">Assignment</Label>
                  <Select onValueChange={handleAssignmentSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an assignment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assignments.map((assignment) => (
                        <SelectItem key={assignment.id} value={assignment.id}>
                          {assignment.title} - {assignment.class} (Max: {assignment.maxMarks})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {selectedAssignment && (
                  <Alert className="border-blue-200 bg-blue-50">
                    <Target className="h-4 w-4 text-blue-600" />
                    <AlertDescription className="text-blue-800">
                      <strong>Selected:</strong> {selectedAssignment.title} for {selectedAssignment.class}
                      (Maximum marks: {selectedAssignment.maxMarks})
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* CSV Upload */}
          {selectedAssignment && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Upload CSV Data
                </CardTitle>
                <CardDescription>Paste your CSV data or download the template to get started</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button variant="outline" onClick={generateCSVTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                </div>

                <div>
                  <Label htmlFor="csvData">CSV Data</Label>
                  <Textarea
                    id="csvData"
                    placeholder={`Student ID,Marks
ST001,85
ST002,92
ST003,78`}
                    value={csvData}
                    onChange={(e) => setCsvData(e.target.value)}
                    rows={8}
                    className="font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Format: Student ID, Marks (one per line, comma-separated)
                  </p>
                </div>

                <Button onClick={processUpload} disabled={isProcessing || !csvData.trim()} className="w-full">
                  {isProcessing ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Process Upload
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Upload Results
                </CardTitle>
                <CardDescription>Summary of the upload process</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Summary */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <div className="text-2xl font-bold text-green-800">{addedCount}</div>
                          <div className="text-sm text-green-600">Records Added</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="text-2xl font-bold text-blue-800">{updatedCount}</div>
                          <div className="text-sm text-blue-600">Records Updated</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <div className="text-2xl font-bold text-red-800">{errorCount}</div>
                          <div className="text-sm text-red-600">Errors</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Detailed Results */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student ID</TableHead>
                      <TableHead>Student Name</TableHead>
                      <TableHead>Marks</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uploadResults.map((result, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{result.studentId}</TableCell>
                        <TableCell>{result.studentName}</TableCell>
                        <TableCell>{result.marks}</TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{result.message || "Success"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Upload History
              </CardTitle>
              <CardDescription>Track all bulk upload activities</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Instructor</TableHead>
                    <TableHead>Assignment</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Records</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-medium">{log.timestamp}</TableCell>
                      <TableCell>{log.instructor}</TableCell>
                      <TableCell>{log.assignment}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{log.action}</Badge>
                      </TableCell>
                      <TableCell>{log.recordsProcessed}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
