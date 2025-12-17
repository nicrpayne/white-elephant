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
      game_actions: {
        Row: {
          action_type: string
          created_at: string | null
          gift_id: string | null
          id: string
          player_id: string | null
          previous_owner_id: string | null
          session_id: string
        }
        Insert: {
          action_type: string
          created_at?: string | null
          gift_id?: string | null
          id?: string
          player_id?: string | null
          previous_owner_id?: string | null
          session_id: string
        }
        Update: {
          action_type?: string
          created_at?: string | null
          gift_id?: string | null
          id?: string
          player_id?: string | null
          previous_owner_id?: string | null
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_actions_gift_id_fkey"
            columns: ["gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_previous_owner_id_fkey"
            columns: ["previous_owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_actions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      game_sessions: {
        Row: {
          active_player_id: string | null
          allow_immediate_stealback: boolean | null
          created_at: string | null
          first_player_id: string | null
          game_status: string
          id: string
          is_final_round: boolean | null
          max_steals_per_gift: number | null
          randomize_order: boolean | null
          round_index: number | null
          session_code: string
          turn_timer_enabled: boolean | null
          turn_timer_seconds: number | null
          updated_at: string | null
        }
        Insert: {
          active_player_id?: string | null
          allow_immediate_stealback?: boolean | null
          created_at?: string | null
          first_player_id?: string | null
          game_status?: string
          id?: string
          is_final_round?: boolean | null
          max_steals_per_gift?: number | null
          randomize_order?: boolean | null
          round_index?: number | null
          session_code: string
          turn_timer_enabled?: boolean | null
          turn_timer_seconds?: number | null
          updated_at?: string | null
        }
        Update: {
          active_player_id?: string | null
          allow_immediate_stealback?: boolean | null
          created_at?: string | null
          first_player_id?: string | null
          game_status?: string
          id?: string
          is_final_round?: boolean | null
          max_steals_per_gift?: number | null
          randomize_order?: boolean | null
          round_index?: number | null
          session_code?: string
          turn_timer_enabled?: boolean | null
          turn_timer_seconds?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_active_player"
            columns: ["active_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_sessions_first_player_id_fkey"
            columns: ["first_player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      gifts: {
        Row: {
          created_at: string | null
          current_owner_id: string | null
          description: string | null
          id: string
          image_url: string
          link: string | null
          name: string
          position: number | null
          session_id: string
          status: string | null
          steal_count: number | null
        }
        Insert: {
          created_at?: string | null
          current_owner_id?: string | null
          description?: string | null
          id?: string
          image_url: string
          link?: string | null
          name: string
          position?: number | null
          session_id: string
          status?: string | null
          steal_count?: number | null
        }
        Update: {
          created_at?: string | null
          current_owner_id?: string | null
          description?: string | null
          id?: string
          image_url?: string
          link?: string | null
          name?: string
          position?: number | null
          session_id?: string
          status?: string | null
          steal_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "gifts_current_owner_id_fkey"
            columns: ["current_owner_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gifts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar_seed: string | null
          current_gift_id: string | null
          display_name: string
          has_completed_turn: boolean | null
          id: string
          is_admin: boolean | null
          joined_at: string | null
          order_index: number
          session_id: string
        }
        Insert: {
          avatar_seed?: string | null
          current_gift_id?: string | null
          display_name: string
          has_completed_turn?: boolean | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          order_index: number
          session_id: string
        }
        Update: {
          avatar_seed?: string | null
          current_gift_id?: string | null
          display_name?: string
          has_completed_turn?: boolean | null
          id?: string
          is_admin?: boolean | null
          joined_at?: string | null
          order_index?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_current_gift"
            columns: ["current_gift_id"]
            isOneToOne: false
            referencedRelation: "gifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "players_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "game_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
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
