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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      audit_log: {
        Row: {
          action: string
          actor: string | null
          created_at: string
          data: Json
          entity: string
          entity_id: string | null
          id: string
        }
        Insert: {
          action: string
          actor?: string | null
          created_at?: string
          data?: Json
          entity: string
          entity_id?: string | null
          id?: string
        }
        Update: {
          action?: string
          actor?: string | null
          created_at?: string
          data?: Json
          entity?: string
          entity_id?: string | null
          id?: string
        }
        Relationships: []
      }
      commercial_operations: {
        Row: {
          buyer_accepted_at: string | null
          buyer_accepted_by: string | null
          buyer_company_id: string
          code: string
          commission_amount: number
          commission_enabled: boolean
          commission_evidence: string | null
          commission_payer: string
          commission_rate: number
          commission_status: string
          confirmed_at: string | null
          created_at: string
          delivered_kg: number
          dispute_open: boolean
          id: string
          listing_id: string
          opportunity_id: string
          payment_evidence: string | null
          payment_status: string
          released_kg: number
          required_documents: string[]
          reservation_expires_at: string | null
          reserved_kg: number
          seller_accepted_at: string | null
          seller_accepted_by: string | null
          seller_company_id: string
          status: string
          terms: Json
          updated_at: string
          version: number
        }
        Insert: {
          buyer_accepted_at?: string | null
          buyer_accepted_by?: string | null
          buyer_company_id: string
          code: string
          commission_amount?: number
          commission_enabled?: boolean
          commission_evidence?: string | null
          commission_payer?: string
          commission_rate?: number
          commission_status?: string
          confirmed_at?: string | null
          created_at?: string
          delivered_kg?: number
          dispute_open?: boolean
          id?: string
          listing_id: string
          opportunity_id: string
          payment_evidence?: string | null
          payment_status?: string
          released_kg?: number
          required_documents?: string[]
          reservation_expires_at?: string | null
          reserved_kg?: number
          seller_accepted_at?: string | null
          seller_accepted_by?: string | null
          seller_company_id: string
          status?: string
          terms: Json
          updated_at?: string
          version?: number
        }
        Update: {
          buyer_accepted_at?: string | null
          buyer_accepted_by?: string | null
          buyer_company_id?: string
          code?: string
          commission_amount?: number
          commission_enabled?: boolean
          commission_evidence?: string | null
          commission_payer?: string
          commission_rate?: number
          commission_status?: string
          confirmed_at?: string | null
          created_at?: string
          delivered_kg?: number
          dispute_open?: boolean
          id?: string
          listing_id?: string
          opportunity_id?: string
          payment_evidence?: string | null
          payment_status?: string
          released_kg?: number
          required_documents?: string[]
          reservation_expires_at?: string | null
          reserved_kg?: number
          seller_accepted_at?: string | null
          seller_accepted_by?: string | null
          seller_company_id?: string
          status?: string
          terms?: Json
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "commercial_operations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_operations_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_operations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_operations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: true
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_operations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commercial_operations_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_settings: {
        Row: {
          commission_enabled: boolean
          commission_payer: string
          commission_rate: number
          id: boolean
          reservation_days: number
        }
        Insert: {
          commission_enabled?: boolean
          commission_payer?: string
          commission_rate?: number
          id?: boolean
          reservation_days?: number
        }
        Update: {
          commission_enabled?: boolean
          commission_payer?: string
          commission_rate?: number
          id?: boolean
          reservation_days?: number
        }
        Relationships: []
      }
      companies: {
        Row: {
          activity_type: string
          contact_email: string
          contact_phone: string
          created_at: string
          created_by: string | null
          cuit: string
          id: string
          intent: Database["public"]["Enums"]["company_intent"]
          is_demo: boolean
          locality: string
          name: string
          province: string
          updated_at: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          activity_type: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          created_by?: string | null
          cuit: string
          id?: string
          intent?: Database["public"]["Enums"]["company_intent"]
          is_demo?: boolean
          locality: string
          name: string
          province: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          activity_type?: string
          contact_email?: string
          contact_phone?: string
          created_at?: string
          created_by?: string | null
          cuit?: string
          id?: string
          intent?: Database["public"]["Enums"]["company_intent"]
          is_demo?: boolean
          locality?: string
          name?: string
          province?: string
          updated_at?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: []
      }
      company_invitations: {
        Row: {
          accepted_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
        }
        Insert: {
          accepted_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
        }
        Update: {
          accepted_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
        }
        Relationships: [
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      company_members: {
        Row: {
          company_id: string
          created_at: string
          id: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_members_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      demands: {
        Row: {
          code: string | null
          commercial_type: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          delivery_terms: string | null
          description: string | null
          id: string
          is_demo: boolean
          locality: string
          min_quantity_kg: number | null
          needed_by: string | null
          original_quantity: number
          original_unit: string
          presentation: string | null
          price_unit: string
          product_type: Database["public"]["Enums"]["product_type"]
          province: string
          quality_requirements: string | null
          quantity_kg: number
          status: Database["public"]["Enums"]["post_status"]
          subgroup: string | null
          target_price: number | null
          unit_weight_kg: number | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          code?: string | null
          commercial_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_terms?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          locality: string
          min_quantity_kg?: number | null
          needed_by?: string | null
          original_quantity: number
          original_unit: string
          presentation?: string | null
          price_unit?: string
          product_type: Database["public"]["Enums"]["product_type"]
          province: string
          quality_requirements?: string | null
          quantity_kg: number
          status?: Database["public"]["Enums"]["post_status"]
          subgroup?: string | null
          target_price?: number | null
          unit_weight_kg?: number | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          code?: string | null
          commercial_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_terms?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          locality?: string
          min_quantity_kg?: number | null
          needed_by?: string | null
          original_quantity?: number
          original_unit?: string
          presentation?: string | null
          price_unit?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          province?: string
          quality_requirements?: string | null
          quantity_kg?: number
          status?: Database["public"]["Enums"]["post_status"]
          subgroup?: string | null
          target_price?: number | null
          unit_weight_kg?: number | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "demands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "demands_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_documents: {
        Row: {
          bucket: string
          company_id: string
          created_at: string
          created_by: string | null
          file_name: string
          id: string
          kind: string
          listing_id: string
          path: string
        }
        Insert: {
          bucket: string
          company_id: string
          created_at?: string
          created_by?: string | null
          file_name: string
          id?: string
          kind: string
          listing_id: string
          path: string
        }
        Update: {
          bucket?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          file_name?: string
          id?: string
          kind?: string
          listing_id?: string
          path?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_documents_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_documents_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          available_from: string | null
          code: string | null
          commercial_type: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          delivery_terms: string | null
          description: string | null
          id: string
          is_demo: boolean
          locality: string
          min_sale_kg: number | null
          original_quantity: number
          original_unit: string
          partial_allowed: boolean
          presentation: string
          price: number | null
          price_unit: string
          product_type: Database["public"]["Enums"]["product_type"]
          province: string
          quality: Json
          quality_status: Database["public"]["Enums"]["quality_status"]
          quantity_kg: number
          released_kg: number
          reserved_kg: number
          sold_kg: number
          status: Database["public"]["Enums"]["post_status"]
          subgroup: string | null
          unit_count: number | null
          unit_weight_kg: number | null
          updated_at: string
          variety: string | null
        }
        Insert: {
          available_from?: string | null
          code?: string | null
          commercial_type: string
          company_id: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_terms?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          locality: string
          min_sale_kg?: number | null
          original_quantity: number
          original_unit: string
          partial_allowed?: boolean
          presentation?: string
          price?: number | null
          price_unit?: string
          product_type: Database["public"]["Enums"]["product_type"]
          province: string
          quality?: Json
          quality_status?: Database["public"]["Enums"]["quality_status"]
          quantity_kg: number
          released_kg?: number
          reserved_kg?: number
          sold_kg?: number
          status?: Database["public"]["Enums"]["post_status"]
          subgroup?: string | null
          unit_count?: number | null
          unit_weight_kg?: number | null
          updated_at?: string
          variety?: string | null
        }
        Update: {
          available_from?: string | null
          code?: string | null
          commercial_type?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          currency?: string
          delivery_terms?: string | null
          description?: string | null
          id?: string
          is_demo?: boolean
          locality?: string
          min_sale_kg?: number | null
          original_quantity?: number
          original_unit?: string
          partial_allowed?: boolean
          presentation?: string
          price?: number | null
          price_unit?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          province?: string
          quality?: Json
          quality_status?: Database["public"]["Enums"]["quality_status"]
          quantity_kg?: number
          released_kg?: number
          reserved_kg?: number
          sold_kg?: number
          status?: Database["public"]["Enums"]["post_status"]
          subgroup?: string | null
          unit_count?: number | null
          unit_weight_kg?: number | null
          updated_at?: string
          variety?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_deliveries: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          id: string
          note: string
          operation_id: string
          quantity_kg: number
          registered_at: string
          registered_by: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          id: string
          note?: string
          operation_id: string
          quantity_kg: number
          registered_at?: string
          registered_by: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          id?: string
          note?: string
          operation_id?: string
          quantity_kg?: number
          registered_at?: string
          registered_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_deliveries_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "commercial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_document_rules: {
        Row: {
          id: string
          modality: string
          product_type: Database["public"]["Enums"]["product_type"]
          required_kinds: string[]
        }
        Insert: {
          id?: string
          modality: string
          product_type: Database["public"]["Enums"]["product_type"]
          required_kinds?: string[]
        }
        Update: {
          id?: string
          modality?: string
          product_type?: Database["public"]["Enums"]["product_type"]
          required_kinds?: string[]
        }
        Relationships: []
      }
      operation_documents: {
        Row: {
          absence_reason: string | null
          created_at: string
          file_name: string
          id: string
          kind: string
          operation_id: string
          path: string | null
          uploaded_by: string
          waiver_approved_by: string | null
        }
        Insert: {
          absence_reason?: string | null
          created_at?: string
          file_name: string
          id?: string
          kind: string
          operation_id: string
          path?: string | null
          uploaded_by: string
          waiver_approved_by?: string | null
        }
        Update: {
          absence_reason?: string | null
          created_at?: string
          file_name?: string
          id?: string
          kind?: string
          operation_id?: string
          path?: string | null
          uploaded_by?: string
          waiver_approved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_documents_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "commercial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_events: {
        Row: {
          actor: string
          created_at: string
          data: Json
          event: string
          id: string
          operation_id: string
        }
        Insert: {
          actor: string
          created_at?: string
          data?: Json
          event: string
          id?: string
          operation_id: string
        }
        Update: {
          actor?: string
          created_at?: string
          data?: Json
          event?: string
          id?: string
          operation_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "operation_events_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "commercial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_notifications: {
        Row: {
          company_id: string
          created_at: string
          event: string
          id: string
          operation_id: string
          read_at: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          event: string
          id?: string
          operation_id: string
          read_at?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          event?: string
          id?: string
          operation_id?: string
          read_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "operation_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_notifications_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "operation_notifications_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "commercial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      operation_versions: {
        Row: {
          buyer_at: string | null
          buyer_by: string | null
          id: string
          operation_id: string
          seller_at: string
          seller_by: string
          terms: Json
          version: number
        }
        Insert: {
          buyer_at?: string | null
          buyer_by?: string | null
          id?: string
          operation_id: string
          seller_at?: string
          seller_by: string
          terms: Json
          version: number
        }
        Update: {
          buyer_at?: string | null
          buyer_by?: string | null
          id?: string
          operation_id?: string
          seller_at?: string
          seller_by?: string
          terms?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "operation_versions_operation_id_fkey"
            columns: ["operation_id"]
            isOneToOne: false
            referencedRelation: "commercial_operations"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          buyer_company_id: string
          buyer_declared_at: string | null
          code: string
          created_at: string
          demand_id: string | null
          id: string
          initiator_company_id: string
          listing_id: string | null
          next_action: string | null
          quantity_kg: number
          requested_by: string
          seller_company_id: string
          seller_declared_at: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
        }
        Insert: {
          buyer_company_id: string
          buyer_declared_at?: string | null
          code?: string
          created_at?: string
          demand_id?: string | null
          id?: string
          initiator_company_id: string
          listing_id?: string | null
          next_action?: string | null
          quantity_kg: number
          requested_by: string
          seller_company_id: string
          seller_declared_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
        }
        Update: {
          buyer_company_id?: string
          buyer_declared_at?: string | null
          code?: string
          created_at?: string
          demand_id?: string | null
          id?: string
          initiator_company_id?: string
          listing_id?: string | null
          next_action?: string | null
          quantity_kg?: number
          requested_by?: string
          seller_company_id?: string
          seller_declared_at?: string | null
          status?: Database["public"]["Enums"]["opportunity_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_buyer_company_id_fkey"
            columns: ["buyer_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_demand_id_fkey"
            columns: ["demand_id"]
            isOneToOne: false
            referencedRelation: "demands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_initiator_company_id_fkey"
            columns: ["initiator_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_initiator_company_id_fkey"
            columns: ["initiator_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_events: {
        Row: {
          actor: string | null
          actor_company_id: string | null
          created_at: string
          event: string
          from_status: Database["public"]["Enums"]["opportunity_status"] | null
          id: string
          note: string | null
          opportunity_id: string
          to_status: Database["public"]["Enums"]["opportunity_status"] | null
        }
        Insert: {
          actor?: string | null
          actor_company_id?: string | null
          created_at?: string
          event: string
          from_status?: Database["public"]["Enums"]["opportunity_status"] | null
          id?: string
          note?: string | null
          opportunity_id: string
          to_status?: Database["public"]["Enums"]["opportunity_status"] | null
        }
        Update: {
          actor?: string | null
          actor_company_id?: string | null
          created_at?: string
          event?: string
          from_status?: Database["public"]["Enums"]["opportunity_status"] | null
          id?: string
          note?: string | null
          opportunity_id?: string
          to_status?: Database["public"]["Enums"]["opportunity_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_events_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          phone?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          actor: string | null
          created_at: string
          id: string
          kind: string
          listing_id: string
          note: string | null
          quantity_kg: number
        }
        Insert: {
          actor?: string | null
          created_at?: string
          id?: string
          kind: string
          listing_id: string
          note?: string | null
          quantity_kg: number
        }
        Update: {
          actor?: string | null
          created_at?: string
          id?: string
          kind?: string
          listing_id?: string
          note?: string | null
          quantity_kg?: number
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      units_config: {
        Row: {
          code: string
          kg_factor: number | null
          label: string
          needs_weight: boolean
          sort: number
        }
        Insert: {
          code: string
          kg_factor?: number | null
          label: string
          needs_weight?: boolean
          sort?: number
        }
        Update: {
          code?: string
          kg_factor?: number | null
          label?: string
          needs_weight?: boolean
          sort?: number
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      verification_events: {
        Row: {
          actor: string | null
          company_id: string
          created_at: string
          from_status: Database["public"]["Enums"]["verification_status"] | null
          id: string
          note: string | null
          to_status: Database["public"]["Enums"]["verification_status"]
        }
        Insert: {
          actor?: string | null
          company_id: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          id?: string
          note?: string | null
          to_status: Database["public"]["Enums"]["verification_status"]
        }
        Update: {
          actor?: string | null
          company_id?: string
          created_at?: string
          from_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
          id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["verification_status"]
        }
        Relationships: [
          {
            foreignKeyName: "verification_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "verification_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies_public"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      companies_public: {
        Row: {
          activity_type: string | null
          id: string | null
          is_demo: boolean | null
          locality: string | null
          name: string | null
          province: string | null
          verification_status:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Insert: {
          activity_type?: string | null
          id?: string | null
          is_demo?: boolean | null
          locality?: string | null
          name?: string | null
          province?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Update: {
          activity_type?: string | null
          id?: string | null
          is_demo?: boolean | null
          locality?: string | null
          name?: string | null
          province?: string | null
          verification_status?:
            | Database["public"]["Enums"]["verification_status"]
            | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_pending_invitations: { Args: never; Returns: number }
      apply_stock_movement: {
        Args: { _kg: number; _kind: string; _listing: string; _note?: string }
        Returns: {
          available_from: string | null
          code: string | null
          commercial_type: string
          company_id: string
          created_at: string
          created_by: string | null
          currency: string
          delivery_terms: string | null
          description: string | null
          id: string
          is_demo: boolean
          locality: string
          min_sale_kg: number | null
          original_quantity: number
          original_unit: string
          partial_allowed: boolean
          presentation: string
          price: number | null
          price_unit: string
          product_type: Database["public"]["Enums"]["product_type"]
          province: string
          quality: Json
          quality_status: Database["public"]["Enums"]["quality_status"]
          quantity_kg: number
          released_kg: number
          reserved_kg: number
          sold_kg: number
          status: Database["public"]["Enums"]["post_status"]
          subgroup: string | null
          unit_count: number | null
          unit_weight_kg: number | null
          updated_at: string
          variety: string | null
        }
        SetofOptions: {
          from: "*"
          to: "listings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_read_operation: { Args: { _id: string }; Returns: boolean }
      company_is_verified: { Args: { _company: string }; Returns: boolean }
      configure_commercial: { Args: { _data: Json }; Returns: undefined }
      get_company_contact: {
        Args: { _company: string }
        Returns: {
          contact_email: string
          contact_phone: string
          name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_company_member: {
        Args: {
          _company: string
          _min?: Database["public"]["Enums"]["company_role"]
        }
        Returns: boolean
      }
      is_valid_cuit: { Args: { _c: string }; Returns: boolean }
      match_pairs: {
        Args: { _demand?: string; _listing?: string }
        Returns: {
          available_kg: number
          buyer_company_id: string
          demand_id: string
          listing_id: string
          matches: string[]
          pending: string[]
          rank: number
          seller_company_id: string
          wanted_kg: number
        }[]
      }
      operation_action: {
        Args: { _action: string; _data?: Json; _id: string }
        Returns: {
          buyer_accepted_at: string | null
          buyer_accepted_by: string | null
          buyer_company_id: string
          code: string
          commission_amount: number
          commission_enabled: boolean
          commission_evidence: string | null
          commission_payer: string
          commission_rate: number
          commission_status: string
          confirmed_at: string | null
          created_at: string
          delivered_kg: number
          dispute_open: boolean
          id: string
          listing_id: string
          opportunity_id: string
          payment_evidence: string | null
          payment_status: string
          released_kg: number
          required_documents: string[]
          reservation_expires_at: string | null
          reserved_kg: number
          seller_accepted_at: string | null
          seller_accepted_by: string | null
          seller_company_id: string
          status: string
          terms: Json
          updated_at: string
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "commercial_operations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      operation_document_action: {
        Args: { _action: string; _data?: Json; _id: string }
        Returns: undefined
      }
      operation_net_value: {
        Args: { _kg: number; _terms: Json }
        Returns: number
      }
      opportunity_parties: {
        Args: { _id: string }
        Returns: {
          buyer_name: string
          buyer_phone: string
          seller_name: string
          seller_phone: string
        }[]
      }
      propose_operation: {
        Args: {
          _expected_version?: number
          _listing: string
          _opportunity: string
          _terms: Json
        }
        Returns: string
      }
      register_company: {
        Args: {
          _activity: string
          _cuit: string
          _email: string
          _intent: Database["public"]["Enums"]["company_intent"]
          _locality: string
          _name: string
          _phone: string
          _province: string
        }
        Returns: string
      }
      request_quote: {
        Args: {
          _company: string
          _demand: string
          _kg: number
          _listing: string
        }
        Returns: Json
      }
      set_company_verification: {
        Args: {
          _company: string
          _note: string
          _status: Database["public"]["Enums"]["verification_status"]
        }
        Returns: undefined
      }
      set_opportunity_status: {
        Args: {
          _id: string
          _note?: string
          _status: Database["public"]["Enums"]["opportunity_status"]
        }
        Returns: {
          buyer_company_id: string
          buyer_declared_at: string | null
          code: string
          created_at: string
          demand_id: string | null
          id: string
          initiator_company_id: string
          listing_id: string | null
          next_action: string | null
          quantity_kg: number
          requested_by: string
          seller_company_id: string
          seller_declared_at: string | null
          status: Database["public"]["Enums"]["opportunity_status"]
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "opportunities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
      company_intent: "sell" | "buy" | "both"
      company_role: "admin" | "operator" | "viewer"
      opportunity_status:
        | "contact_requested"
        | "negotiating"
        | "agreement_declared"
        | "cancelled"
      post_status: "active" | "paused" | "closed"
      product_type: "cascara" | "elaborado"
      quality_status: "declared" | "documented" | "not_informed"
      verification_status:
        | "started"
        | "pending"
        | "info_requested"
        | "verified"
        | "rejected"
        | "suspended"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "user"],
      company_intent: ["sell", "buy", "both"],
      company_role: ["admin", "operator", "viewer"],
      opportunity_status: [
        "contact_requested",
        "negotiating",
        "agreement_declared",
        "cancelled",
      ],
      post_status: ["active", "paused", "closed"],
      product_type: ["cascara", "elaborado"],
      quality_status: ["declared", "documented", "not_informed"],
      verification_status: [
        "started",
        "pending",
        "info_requested",
        "verified",
        "rejected",
        "suspended",
      ],
    },
  },
} as const
