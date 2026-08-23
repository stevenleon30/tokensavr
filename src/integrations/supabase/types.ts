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
      model_pricing: {
        Row: {
          cache_read_cost_per_token: number | null
          cache_write_cost_per_token: number | null
          context_window: number | null
          created_at: string
          display_name: string | null
          fetched_at: string
          id: string
          input_cost_per_token: number | null
          max_output_tokens: number | null
          modalities: string[] | null
          model_id: string
          output_cost_per_token: number | null
          provider: string | null
          raw: Json
          request_cost: number | null
          source: string
          supports_function_calling: boolean | null
          supports_prompt_caching: boolean | null
          supports_vision: boolean | null
          updated_at: string
        }
        Insert: {
          cache_read_cost_per_token?: number | null
          cache_write_cost_per_token?: number | null
          context_window?: number | null
          created_at?: string
          display_name?: string | null
          fetched_at?: string
          id?: string
          input_cost_per_token?: number | null
          max_output_tokens?: number | null
          modalities?: string[] | null
          model_id: string
          output_cost_per_token?: number | null
          provider?: string | null
          raw: Json
          request_cost?: number | null
          source: string
          supports_function_calling?: boolean | null
          supports_prompt_caching?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Update: {
          cache_read_cost_per_token?: number | null
          cache_write_cost_per_token?: number | null
          context_window?: number | null
          created_at?: string
          display_name?: string | null
          fetched_at?: string
          id?: string
          input_cost_per_token?: number | null
          max_output_tokens?: number | null
          modalities?: string[] | null
          model_id?: string
          output_cost_per_token?: number | null
          provider?: string | null
          raw?: Json
          request_cost?: number | null
          source?: string
          supports_function_calling?: boolean | null
          supports_prompt_caching?: boolean | null
          supports_vision?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      pricing_sync_log: {
        Row: {
          created_at: string
          duration_ms: number | null
          error_message: string | null
          id: string
          models_checked: number
          models_updated: number
          run_at: string
          status: string
        }
        Insert: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          models_checked?: number
          models_updated?: number
          run_at?: string
          status: string
        }
        Update: {
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          id?: string
          models_checked?: number
          models_updated?: number
          run_at?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          daily_budget_credits: number | null
          display_name: string | null
          id: string
          preferred_platforms: string[] | null
          theme: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          daily_budget_credits?: number | null
          display_name?: string | null
          id?: string
          preferred_platforms?: string[] | null
          theme?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          daily_budget_credits?: number | null
          display_name?: string | null
          id?: string
          preferred_platforms?: string[] | null
          theme?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      step_progress: {
        Row: {
          actual_cost_credits: number | null
          completed: boolean
          created_at: string
          id: string
          notes: string | null
          step_number: number
          strategy_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cost_credits?: number | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          step_number: number
          strategy_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cost_credits?: number | null
          completed?: boolean
          created_at?: string
          id?: string
          notes?: string | null
          step_number?: number
          strategy_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "step_progress_strategy_id_fkey"
            columns: ["strategy_id"]
            isOneToOne: false
            referencedRelation: "strategies"
            referencedColumns: ["id"]
          },
        ]
      }
      strategies: {
        Row: {
          budget: string
          created_at: string
          estimated_savings: string | null
          id: string
          idea: string
          is_public: boolean
          platforms: string[]
          steps: Json
          time_estimate: string | null
          title: string
          total_estimated_cost: string | null
          user_id: string
        }
        Insert: {
          budget: string
          created_at?: string
          estimated_savings?: string | null
          id?: string
          idea: string
          is_public?: boolean
          platforms?: string[]
          steps?: Json
          time_estimate?: string | null
          title: string
          total_estimated_cost?: string | null
          user_id: string
        }
        Update: {
          budget?: string
          created_at?: string
          estimated_savings?: string | null
          id?: string
          idea?: string
          is_public?: boolean
          platforms?: string[]
          steps?: Json
          time_estimate?: string | null
          title?: string
          total_estimated_cost?: string | null
          user_id?: string
        }
        Relationships: []
      }
      strategy_shares: {
        Row: {
          created_at: string
          id: string
          payload: Json
          title: string
          view_count: number
        }
        Insert: {
          created_at?: string
          id?: string
          payload: Json
          title: string
          view_count?: number
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          title?: string
          view_count?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      model_pricing_per_million: {
        Row: {
          context_window: number | null
          display_name: string | null
          fetched_at: string | null
          id: string | null
          input_cost_per_million: number | null
          max_output_tokens: number | null
          model_id: string | null
          output_cost_per_million: number | null
          provider: string | null
          source: string | null
          supports_function_calling: boolean | null
          supports_prompt_caching: boolean | null
          supports_vision: boolean | null
        }
        Insert: {
          context_window?: number | null
          display_name?: string | null
          fetched_at?: string | null
          id?: string | null
          input_cost_per_million?: never
          max_output_tokens?: number | null
          model_id?: string | null
          output_cost_per_million?: never
          provider?: string | null
          source?: string | null
          supports_function_calling?: boolean | null
          supports_prompt_caching?: boolean | null
          supports_vision?: boolean | null
        }
        Update: {
          context_window?: number | null
          display_name?: string | null
          fetched_at?: string | null
          id?: string | null
          input_cost_per_million?: never
          max_output_tokens?: number | null
          model_id?: string | null
          output_cost_per_million?: never
          provider?: string | null
          source?: string | null
          supports_function_calling?: boolean | null
          supports_prompt_caching?: boolean | null
          supports_vision?: boolean | null
        }
        Relationships: []
      }
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
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
