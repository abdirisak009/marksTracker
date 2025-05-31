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
import { Plus, Search, Edit, Trash2, GraduationCap, Clock, Users, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { supabase, type Class } from "@/lib/supabase"

export default function ClassesPage() {
  const { toast } = useToast()
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedShift, setSelectedShift] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingClass, setEditingClass] = useState<Class | null>(null)
  const [newClass, setNewClass] = useState({
    class_name: "",
    shift: "" as "Full-time" | "Part-time" | "",
  })
  const [errors, setErrors] = useState<{ name?: string; shift?: string }>({})
  const [submitting, setSubmitting] = useState(false)

  // Fetch classes from Supabase
  const fetchClasses = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase.from("classes").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("Supabase fetch error:", error)
        throw error
      }

      setClasses(data || [])
    } catch (error) {
      console.error("Error fetching classes:", error)
      toast({
        title: "Error",
        description: "Failed to fetch classes. Please try again.",
        variant: "destructive",
      })
      setClasses([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClasses()
  }, [])

  const filteredClasses = classes.filter((classItem) => {
    if (!classItem || !classItem.class_name) return false
    const matchesSearch = classItem.class_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesShift = selectedShift === "all" || classItem.shift === selectedShift
    return matchesSearch && matchesShift
  })

  const validateForm = async (name: string, shift: string) => {
    const newErrors: { name?: string; shift?: string } = {}

    if (!name.trim()) {
      newErrors.name = "Class name is required"
    } else {
      // Check for duplicate class names
      const { data } = await supabase
        .from("classes")
        .select("id")
        .eq("class_name", name.trim())
        .neq("id", editingClass?.id || "")

      if (data && data.length > 0) {
        newErrors.name = "Class name already exists"
      }
    }

    if (!shift) {
      newErrors.shift = "Shift selection is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddClass = async () => {
    if (!(await validateForm(newClass.class_name, newClass.shift))) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("classes")
        .insert([
          {
            class_name: newClass.class_name.trim(),
            shift: newClass.shift as "Full-time" | "Part-time",
          },
        ])
        .select()

      if (error) {
        console.error("Supabase error:", error)
        throw error
      }

      await fetchClasses()
      setNewClass({ class_name: "", shift: "" })
      setIsAddDialogOpen(false)
      setErrors({})
      toast({
        title: "Success",
        description: "Class has been created successfully.",
      })
    } catch (error) {
      console.error("Error adding class:", error)
      toast({
        title: "Error",
        description: "Failed to create class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleEditClass = async () => {
    if (!editingClass || !(await validateForm(newClass.class_name, newClass.shift))) return
    setSubmitting(true)
    try {
      const { error } = await supabase
        .from("classes")
        .update({
          class_name: newClass.class_name.trim(),
          shift: newClass.shift as "Full-time" | "Part-time",
        })
        .eq("id", editingClass.id)
      if (error) throw error
      await fetchClasses()
      setIsEditDialogOpen(false)
      setEditingClass(null)
      setNewClass({ class_name: "", shift: "" })
      setErrors({})
      toast({
        title: "Success",
        description: "Class has been updated successfully.",
      })
    } catch (error) {
      console.error("Error updating class:", error)
      toast({
        title: "Error",
        description: "Failed to update class. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteClass = async (id: string) => {
    try {
      // Check if class has students
      const { data: students } = await supabase.from("students").select("id").eq("class_id", id)

      if (students && students.length > 0) {
        toast({
          title: "Cannot Delete",
          description: "Cannot delete class with enrolled students. Please transfer students first.",
          variant: "destructive",
        })
        return
      }

      const { error } = await supabase.from("classes").delete().eq("id", id)

      if (error) throw error

      await fetchClasses()
      toast({
        title: "Success",
        description: "Class has been deleted successfully.",
      })
    } catch (error) {
      console.error("Error deleting class:", error)
      toast({
        title: "Error",
        description: "Failed to delete class. Please try again.",
        variant: "destructive",
      })
    }
  }

  const openEditDialog = (classItem: Class) => {
    setEditingClass(classItem)
    setNewClass({ class_name: classItem.class_name, shift: classItem.shift })
    setErrors({})
    setIsEditDialogOpen(true)
  }

  const closeDialogs = () => {
    setIsAddDialogOpen(false)
    setIsEditDialogOpen(false)
    setEditingClass(null)
    setNewClass({ class_name: "", shift: "" })
    setErrors({})
  }

  const getShiftBadge = (shift: string) => {
    return shift === "Full-time" ? (
      <Badge className="bg-blue-500">Full-time</Badge>
    ) : (
      <Badge className="bg-green-500">Part-time</Badge>
    )
  }

  const totalClasses = classes.length
  const fullTimeClasses = classes.filter((c) => c.shift === "Full-time").length
  const partTimeClasses = classes.filter((c) => c.shift === "Part-time").length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading classes...</span>
      </div>
    )
  }

  if (!classes) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load classes</p>
          <Button onClick={fetchClasses} className="mt-2">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Classes Management</h2>
          <p className="text-muted-foreground">Create and manage class records for your institution</p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Class</DialogTitle>
              <DialogDescription>Add a new class to the system with proper details.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="className">Class Name</Label>
                <Input
                  id="className"
                  value={newClass.class_name}
                  onChange={(e) => setNewClass({ ...newClass, class_name: e.target.value })}
                  placeholder="e.g., Grade 11B, Computer Science A"
                />
                {errors.name && (
                  <Alert className="py-2">
                    <AlertDescription className="text-sm">{errors.name}</AlertDescription>
                  </Alert>
                )}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="shift">Shift</Label>
                <Select
                  value={newClass.shift}
                  onValueChange={(value) => setNewClass({ ...newClass, shift: value as "Full-time" | "Part-time" })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select shift type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Full-time">Full-time</SelectItem>
                    <SelectItem value="Part-time">Part-time</SelectItem>
                  </SelectContent>
                </Select>
                {errors.shift && (
                  <Alert className="py-2">
                    <AlertDescription className="text-sm">{errors.shift}</AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialogs} disabled={submitting}>
                Cancel
              </Button>
              <Button onClick={handleAddClass} disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Class
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Classes</CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
            <p className="text-xs text-muted-foreground">Active classes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Full-time Classes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fullTimeClasses}</div>
            <p className="text-xs text-muted-foreground">Regular schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Part-time Classes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{partTimeClasses}</div>
            <p className="text-xs text-muted-foreground">Flexible schedule</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">-</div>
            <p className="text-xs text-muted-foreground">Across all classes</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Class Records</CardTitle>
          <CardDescription>View and manage all class records in the system</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search classes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={selectedShift} onValueChange={setSelectedShift}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by shift" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Shifts</SelectItem>
                <SelectItem value="Full-time">Full-time</SelectItem>
                <SelectItem value="Part-time">Part-time</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class Name</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Students Enrolled</TableHead>
                <TableHead>Created Date</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClasses.map((classItem) => (
                <TableRow key={classItem.id}>
                  <TableCell className="font-medium">{classItem.class_name || "Unnamed Class"}</TableCell>
                  <TableCell>{getShiftBadge(classItem.shift || "Full-time")}</TableCell>
                  <TableCell>
                    <Badge variant="outline">- students</Badge>
                  </TableCell>
                  <TableCell suppressHydrationWarning>
                    {classItem.created_at ? new Date(classItem.created_at).toLocaleDateString() : "N/A"}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => openEditDialog(classItem)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDeleteClass(classItem.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {filteredClasses.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No classes found matching your search criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Class</DialogTitle>
            <DialogDescription>Update the class information.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="editClassName">Class Name</Label>
              <Input
                id="editClassName"
                value={newClass.class_name}
                onChange={(e) => setNewClass({ ...newClass, class_name: e.target.value })}
                placeholder="e.g., Grade 11B, Computer Science A"
              />
              {errors.name && (
                <Alert className="py-2">
                  <AlertDescription className="text-sm">{errors.name}</AlertDescription>
                </Alert>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="editShift">Shift</Label>
              <Select
                value={newClass.shift}
                onValueChange={(value) => setNewClass({ ...newClass, shift: value as "Full-time" | "Part-time" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select shift type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full-time">Full-time</SelectItem>
                  <SelectItem value="Part-time">Part-time</SelectItem>
                </SelectContent>
              </Select>
              {errors.shift && (
                <Alert className="py-2">
                  <AlertDescription className="text-sm">{errors.shift}</AlertDescription>
                </Alert>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialogs} disabled={submitting}>
              Cancel
            </Button>
            <Button onClick={handleEditClass} disabled={submitting}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Update Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
