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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_subject_templates: {
        Row: {
          branch: string
          default_credits: number
          grading_scheme_id: number | null
          id: number
          semester: number
          subject_name: string
          year: number
        }
        Insert: {
          branch: string
          default_credits: number
          grading_scheme_id?: number | null
          id?: never
          semester: number
          subject_name: string
          year: number
        }
        Update: {
          branch?: string
          default_credits?: number
          grading_scheme_id?: number | null
          id?: never
          semester?: number
          subject_name?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "admin_subject_templates_grading_scheme_id_fkey"
            columns: ["grading_scheme_id"]
            isOneToOne: false
            referencedRelation: "grading_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      grading_schemes: {
        Row: {
          created_at: string | null
          grade_cutoffs: Json
          id: number
          is_default: boolean
          scheme_name: string
        }
        Insert: {
          created_at?: string | null
          grade_cutoffs: Json
          id?: never
          is_default?: boolean
          scheme_name: string
        }
        Update: {
          created_at?: string | null
          grade_cutoffs?: Json
          id?: never
          is_default?: boolean
          scheme_name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          college_name: string | null
          enrollment_no: string | null
          full_name: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          college_name?: string | null
          enrollment_no?: string | null
          full_name?: string | null
          id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          college_name?: string | null
          enrollment_no?: string | null
          full_name?: string | null
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      student_semesters: {
        Row: {
          branch: string
          calculated_sgpa: number | null
          created_at: string | null
          id: number
          semester: number
          semester_title: string
          total_credits: number | null
          user_id: string
          year: number
        }
        Insert: {
          branch: string
          calculated_sgpa?: number | null
          created_at?: string | null
          id?: never
          semester: number
          semester_title: string
          total_credits?: number | null
          user_id: string
          year: number
        }
        Update: {
          branch?: string
          calculated_sgpa?: number | null
          created_at?: string | null
          id?: never
          semester?: number
          semester_title?: string
          total_credits?: number | null
          user_id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "student_semesters_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      student_subject_marks: {
        Row: {
          assumed_marks: Json | null
          credits: number
          cws_mark: number | null
          ete_mark: number | null
          id: number
          is_graded: boolean
          mte_mark: number | null
          overridden_grade: string | null
          overridden_points: number | null
          semester_id: number
          subject_name: string
        }
        Insert: {
          assumed_marks?: Json | null
          credits: number
          cws_mark?: number | null
          ete_mark?: number | null
          id?: never
          is_graded?: boolean
          mte_mark?: number | null
          overridden_grade?: string | null
          overridden_points?: number | null
          semester_id: number
          subject_name: string
        }
        Update: {
          assumed_marks?: Json | null
          credits?: number
          cws_mark?: number | null
          ete_mark?: number | null
          id?: never
          is_graded?: boolean
          mte_mark?: number | null
          overridden_grade?: string | null
          overridden_points?: number | null
          semester_id?: number
          subject_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "student_subject_marks_semester_id_fkey"
            columns: ["semester_id"]
            isOneToOne: false
            referencedRelation: "student_semesters"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
