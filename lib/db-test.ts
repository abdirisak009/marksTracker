import { supabase } from "./supabase"

export async function testDatabaseConnection() {
  try {
    // Test connection with the correct column name
    const { data, error } = await supabase.from("classes").select("id, class_name").limit(1)

    if (error) {
      console.error("Database connection test failed:", error)
      return {
        success: false,
        message: `Connection failed: ${error.message}`,
        error,
      }
    }

    return {
      success: true,
      message: `Database connection successful. Found ${data?.length || 0} classes.`,
      data,
    }
  } catch (err) {
    console.error("Database connection test exception:", err)
    return {
      success: false,
      message: `Connection exception: ${err instanceof Error ? err.message : String(err)}`,
      error: err,
    }
  }
}
