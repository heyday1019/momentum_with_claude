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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_call_log: {
        Row: {
          completion_tokens: number | null
          created_at: string
          feature: string
          id: number
          model: string
          persona: string | null
          prompt_tokens: number | null
          success: boolean
          total_tokens: number | null
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          feature: string
          id?: never
          model: string
          persona?: string | null
          prompt_tokens?: number | null
          success?: boolean
          total_tokens?: number | null
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          feature?: string
          id?: never
          model?: string
          persona?: string | null
          prompt_tokens?: number | null
          success?: boolean
          total_tokens?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_call_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_log: {
        Row: {
          created_at: string
          error: string | null
          event: string
          id: number
          payload: Json
          user_id: string | null
        }
        Insert: {
          created_at?: string
          error?: string | null
          event: string
          id?: never
          payload?: Json
          user_id?: string | null
        }
        Update: {
          created_at?: string
          error?: string | null
          event?: string
          id?: never
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      credit_ledger: {
        Row: {
          created_at: string
          delta: number
          id: number
          polar_order_id: string | null
          reason: string
          related_id: string | null
          related_kind: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          delta: number
          id?: never
          polar_order_id?: string | null
          reason: string
          related_id?: string | null
          related_kind?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          delta?: number
          id?: never
          polar_order_id?: string | null
          reason?: string
          related_id?: string | null
          related_kind?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_ledger_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_ai_usage: {
        Row: {
          created_at: string
          id: number
          model: string
          persona: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: never
          model: string
          persona: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: never
          model?: string
          persona?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      dream_journal: {
        Row: {
          advice: string
          created_at: string
          dream_content: string
          id: number
          interpretation: string
          model: string
          persona: string
          summary: string
          symbols: Json
          user_id: string
        }
        Insert: {
          advice: string
          created_at?: string
          dream_content: string
          id?: never
          interpretation: string
          model: string
          persona: string
          summary: string
          symbols: Json
          user_id: string
        }
        Update: {
          advice?: string
          created_at?: string
          dream_content?: string
          id?: never
          interpretation?: string
          model?: string
          persona?: string
          summary?: string
          symbols?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dream_journal_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fortune_daily: {
        Row: {
          content: Json
          created_at: string
          date: string
          fortune_type: string
          id: number
          model: string
          user_id: string
        }
        Insert: {
          content: Json
          created_at?: string
          date: string
          fortune_type: string
          id?: never
          model?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          date?: string
          fortune_type?: string
          id?: never
          model?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fortune_daily_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lotto_recommendations: {
        Row: {
          comment: string
          created_at: string
          draw_number: number
          id: number
          numbers: number[]
          user_id: string
        }
        Insert: {
          comment: string
          created_at?: string
          draw_number: number
          id?: never
          numbers: number[]
          user_id: string
        }
        Update: {
          comment?: string
          created_at?: string
          draw_number?: number
          id?: never
          numbers?: number[]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lotto_recommendations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birthdate: string
          created_at: string
          gender: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          birthdate: string
          created_at?: string
          gender: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          birthdate?: string
          created_at?: string
          gender?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_credit_delta: {
        Args: {
          p_delta: number
          p_polar_order_id?: string
          p_reason: string
          p_related_id?: string
          p_related_kind?: string
          p_user_id: string
        }
        Returns: number
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
