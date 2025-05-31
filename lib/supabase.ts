import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://otmqnkieckehwxuvtbhd.supabase.co"
const supabaseKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im90bXFua2llY2tlaHd4dXZ0YmhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg2MzYxNzcsImV4cCI6MjA2NDIxMjE3N30.zdbR-7bXpV1KYQ0QramaHRqkmp-jMFnNA75Jl9A4Pmc"

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseKey)

// Database types - using class_name consistently
export interface Class {
  id: string
  class_name: string // Correct column name
  shift: "Full-time" | "Part-time"
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  student_id: string
  name: string | null
  class_id: string
  created_at: string
  updated_at: string
  classes?: Class
}

export interface Assignment {
  id: string
  title: string
  description: string | null
  class_id: string
  max_marks: number
  due_date: string | null
  created_at: string
  updated_at: string
  classes?: Class
}

export interface Mark {
  id: string
  student_id: string
  assignment_id: string
  marks_obtained: number
  submission_date: string
  created_at: string
  updated_at: string
  students?: Student
  assignments?: Assignment
}

export interface AuditLog {
  id: string
  action: string
  entity_type: string
  entity_id: string | null
  details: any
  performed_by: string | null
  created_at: string
}
