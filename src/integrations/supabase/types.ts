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
      kafe_admin_access_requests: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          email: string
          id: string
          requested_at: string
          status: string
          user_id: string
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          email: string
          id?: string
          requested_at?: string
          status?: string
          user_id: string
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          email?: string
          id?: string
          requested_at?: string
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      kafe_admin_notification_reads: {
        Row: {
          notification_id: number
          read_at: string
          user_id: string
        }
        Insert: {
          notification_id: number
          read_at?: string
          user_id: string
        }
        Update: {
          notification_id?: number
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kafe_admin_notification_reads_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "kafe_admin_notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      kafe_admin_notifications: {
        Row: {
          access_request_id: string | null
          body: string
          created_at: string
          id: number
          kind: string
          reservation_id: string | null
          title: string
        }
        Insert: {
          access_request_id?: string | null
          body?: string
          created_at?: string
          id?: number
          kind: string
          reservation_id?: string | null
          title: string
        }
        Update: {
          access_request_id?: string | null
          body?: string
          created_at?: string
          id?: number
          kind?: string
          reservation_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "kafe_admin_notifications_access_request_id_fkey"
            columns: ["access_request_id"]
            isOneToOne: false
            referencedRelation: "kafe_admin_access_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kafe_admin_notifications_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "kafe_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      kafe_admin_profiles: {
        Row: {
          created_at: string
          email: string | null
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      kafe_ceramic_objects: {
        Row: {
          id: string
          sort_order: number | null
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          sort_order?: number | null
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          sort_order?: number | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      kafe_content_documents: {
        Row: {
          id: string
          sort_order: number | null
          updated_at: string
          value: Json
        }
        Insert: {
          id: string
          sort_order?: number | null
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          sort_order?: number | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      kafe_payments: {
        Row: {
          amount: number
          checkout_reference: string
          created_at: string
          currency: string
          hosted_checkout_url: string | null
          id: string
          paid_at: string | null
          provider: string
          provider_checkout_id: string | null
          provider_payload: Json
          reservation_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          checkout_reference: string
          created_at?: string
          currency?: string
          hosted_checkout_url?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_payload?: Json
          reservation_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          checkout_reference?: string
          created_at?: string
          currency?: string
          hosted_checkout_url?: string | null
          id?: string
          paid_at?: string | null
          provider?: string
          provider_checkout_id?: string | null
          provider_payload?: Json
          reservation_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "kafe_payments_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "kafe_reservations"
            referencedColumns: ["id"]
          },
        ]
      }
      kafe_push_subscriptions: {
        Row: {
          auth_key: string
          created_at: string
          endpoint: string
          id: string
          last_seen_at: string
          p256dh: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth_key: string
          created_at?: string
          endpoint: string
          id?: string
          last_seen_at?: string
          p256dh: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth_key?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_seen_at?: string
          p256dh?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      kafe_reservations: {
        Row: {
          created_at: string
          date: string
          id: string
          people: number
          seating_unit_id: string | null
          slot: string
          status: string
          updated_at: string
          value: Json
        }
        Insert: {
          created_at?: string
          date: string
          id?: string
          people: number
          seating_unit_id?: string | null
          slot: string
          status: string
          updated_at?: string
          value: Json
        }
        Update: {
          created_at?: string
          date?: string
          id?: string
          people?: number
          seating_unit_id?: string | null
          slot?: string
          status?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      kafe_settings: {
        Row: {
          id: string
          updated_at: string
          value: Json
        }
        Insert: {
          id?: string
          updated_at?: string
          value: Json
        }
        Update: {
          id?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      kafe_waiver_signatures: {
        Row: {
          document_version: string | null
          id: string
          reservation_ref: string | null
          signed_at: string | null
          updated_at: string
          value: Json
        }
        Insert: {
          document_version?: string | null
          id: string
          reservation_ref?: string | null
          signed_at?: string | null
          updated_at?: string
          value: Json
        }
        Update: {
          document_version?: string | null
          id?: string
          reservation_ref?: string | null
          signed_at?: string | null
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      approve_kafe_admin_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      cancel_kafe_reservation_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      create_kafe_reservation: {
        Args: {
          p_date: string
          p_people: number
          p_slot: string
          p_value: Json
        }
        Returns: {
          id: string
          seating_unit_id: string
        }[]
      }
      create_kafe_walk_in: {
        Args: {
          p_date: string
          p_label?: string
          p_people: number
          p_seating_unit_id: string
          p_slot: string
        }
        Returns: {
          id: string
          seating_unit_id: string
        }[]
      }
      decide_kafe_group_reservation: {
        Args: { p_approved: boolean; p_id: string; p_message?: string }
        Returns: Json
      }
      get_current_kafe_admin: {
        Args: never
        Returns: {
          email: string
          role: string
        }[]
      }
      get_kafe_admin_notifications: {
        Args: { p_limit?: number }
        Returns: {
          access_request_id: string
          body: string
          created_at: string
          id: number
          is_read: boolean
          kind: string
          reservation_id: string
          title: string
        }[]
      }
      get_kafe_reservation_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      get_kafe_slot_capacity: {
        Args: { from_date: string; to_date: string }
        Returns: {
          date: string
          reserved_people: number
          slot: string
        }[]
      }
      get_kafe_slot_occupancy: {
        Args: { from_date: string; to_date: string }
        Returns: {
          date: string
          people: number
          reservation_id: string
          seating_unit_id: string
          slot: string
        }[]
      }
      mark_kafe_notification_read: {
        Args: { p_notification_id: number }
        Returns: undefined
      }
      reject_kafe_admin_request: {
        Args: { p_request_id: string }
        Returns: Json
      }
      revoke_kafe_admin_access: { Args: { p_user_id: string }; Returns: Json }
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
