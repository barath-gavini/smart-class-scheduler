export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      classrooms: {
        Row: {
          building: string
          capacity: number
          created_at: string
          has_ac: boolean | null
          has_projector: boolean | null
          id: string
          is_available: boolean | null
          name: string
        }
        Insert: {
          building: string
          capacity?: number
          created_at?: string
          has_ac?: boolean | null
          has_projector?: boolean | null
          id?: string
          is_available?: boolean | null
          name: string
        }
        Update: {
          building?: string
          capacity?: number
          created_at?: string
          has_ac?: boolean | null
          has_projector?: boolean | null
          id?: string
          is_available?: boolean | null
          name?: string
        }
        Relationships: []
      }
      courses: {
        Row: {
          code: string
          created_at: string
          credits: number | null
          department_id: string | null
          duration_hours: number | null
          id: string
          is_lab: boolean | null
          name: string
          semester: number | null
        }
        Insert: {
          code: string
          created_at?: string
          credits?: number | null
          department_id?: string | null
          duration_hours?: number | null
          id?: string
          is_lab?: boolean | null
          name: string
          semester?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          credits?: number | null
          department_id?: string | null
          duration_hours?: number | null
          id?: string
          is_lab?: boolean | null
          name?: string
          semester?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "courses_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      faculty: {
        Row: {
          created_at: string
          department_id: string | null
          designation: string | null
          email: string
          id: string
          is_available: boolean | null
          name: string
          specialization: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email: string
          id?: string
          is_available?: boolean | null
          name: string
          specialization?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          department_id?: string | null
          designation?: string | null
          email?: string
          id?: string
          is_available?: boolean | null
          name?: string
          specialization?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      faculty_absences: {
        Row: {
          absence_date: string
          created_at: string
          faculty_id: string
          id: string
          is_processed: boolean | null
          reason: string | null
          substitute_faculty_id: string | null
        }
        Insert: {
          absence_date: string
          created_at?: string
          faculty_id: string
          id?: string
          is_processed?: boolean | null
          reason?: string | null
          substitute_faculty_id?: string | null
        }
        Update: {
          absence_date?: string
          created_at?: string
          faculty_id?: string
          id?: string
          is_processed?: boolean | null
          reason?: string | null
          substitute_faculty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "faculty_absences_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "faculty_absences_substitute_faculty_id_fkey"
            columns: ["substitute_faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reallocation_logs: {
        Row: {
          created_at: string
          id: string
          new_classroom_id: string | null
          original_classroom_id: string | null
          original_entry_id: string | null
          original_faculty_id: string | null
          reallocation_date: string
          reason: string | null
          substitute_faculty_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          new_classroom_id?: string | null
          original_classroom_id?: string | null
          original_entry_id?: string | null
          original_faculty_id?: string | null
          reallocation_date: string
          reason?: string | null
          substitute_faculty_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          new_classroom_id?: string | null
          original_classroom_id?: string | null
          original_entry_id?: string | null
          original_faculty_id?: string | null
          reallocation_date?: string
          reason?: string | null
          substitute_faculty_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reallocation_logs_new_classroom_id_fkey"
            columns: ["new_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reallocation_logs_original_classroom_id_fkey"
            columns: ["original_classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reallocation_logs_original_entry_id_fkey"
            columns: ["original_entry_id"]
            isOneToOne: false
            referencedRelation: "timetable_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reallocation_logs_original_faculty_id_fkey"
            columns: ["original_faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reallocation_logs_substitute_faculty_id_fkey"
            columns: ["substitute_faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      sections: {
        Row: {
          created_at: string
          department_id: string
          faculty_id: string | null
          id: string
          max_students: number | null
          name: string
          section_letter: string
        }
        Insert: {
          created_at?: string
          department_id: string
          faculty_id?: string | null
          id?: string
          max_students?: number | null
          name: string
          section_letter: string
        }
        Update: {
          created_at?: string
          department_id?: string
          faculty_id?: string | null
          id?: string
          max_students?: number | null
          name?: string
          section_letter?: string
        }
        Relationships: [
          {
            foreignKeyName: "sections_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sections_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
        ]
      }
      time_slots: {
        Row: {
          end_time: string
          id: string
          slot_number: number
          start_time: string
        }
        Insert: {
          end_time: string
          id?: string
          slot_number: number
          start_time: string
        }
        Update: {
          end_time?: string
          id?: string
          slot_number?: number
          start_time?: string
        }
        Relationships: []
      }
      timetable_entries: {
        Row: {
          classroom_id: string | null
          course_id: string | null
          created_at: string
          day_of_week: number
          faculty_id: string | null
          id: string
          is_active: boolean | null
          section_id: string
          time_slot_id: string
          updated_at: string
        }
        Insert: {
          classroom_id?: string | null
          course_id?: string | null
          created_at?: string
          day_of_week: number
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          section_id: string
          time_slot_id: string
          updated_at?: string
        }
        Update: {
          classroom_id?: string | null
          course_id?: string | null
          created_at?: string
          day_of_week?: number
          faculty_id?: string | null
          id?: string
          is_active?: boolean | null
          section_id?: string
          time_slot_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "timetable_entries_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_faculty_id_fkey"
            columns: ["faculty_id"]
            isOneToOne: false
            referencedRelation: "faculty"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "timetable_entries_time_slot_id_fkey"
            columns: ["time_slot_id"]
            isOneToOne: false
            referencedRelation: "time_slots"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "faculty" | "student"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "faculty", "student"],
    },
  },
} as const
