/**
 * Tipos de la base de datos.
 *
 * En un proyecto conectado, regenera este archivo con:
 *   pnpm gen:types        (usa el stack local)
 *   # o contra la nube:
 *   supabase gen types typescript --project-id <ref> > src/types/database.types.ts
 *
 * Esta versión inicial está escrita a mano para reflejar las migraciones de
 * `supabase/migrations` y permitir desarrollar con tipado fuerte desde el día 1.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: Database['public']['Enums']['user_role']
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: Database['public']['Enums']['user_role']
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          full_name?: string | null
          role?: Database['public']['Enums']['user_role']
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bottle_types: {
        Row: {
          id: string
          name: string
          barcode: string | null
          full_ounces: number
          empty_weight_oz: number | null
          image_url: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          barcode?: string | null
          full_ounces: number
          empty_weight_oz?: number | null
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          barcode?: string | null
          full_ounces?: number
          empty_weight_oz?: number | null
          image_url?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      bottles: {
        Row: {
          id: string
          unique_code: string
          bottle_type_id: string
          status: Database['public']['Enums']['bottle_status']
          current_ounces: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          unique_code: string
          bottle_type_id: string
          status?: Database['public']['Enums']['bottle_status']
          current_ounces?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          unique_code?: string
          bottle_type_id?: string
          status?: Database['public']['Enums']['bottle_status']
          current_ounces?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'bottles_bottle_type_id_fkey'
            columns: ['bottle_type_id']
            referencedRelation: 'bottle_types'
            referencedColumns: ['id']
          },
        ]
      }
      categories: {
        Row: {
          id: string
          name: string
          active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          id: string
          category_id: string
          name: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          category_id: string
          name: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          category_id?: string
          name?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'products_category_id_fkey'
            columns: ['category_id']
            referencedRelation: 'categories'
            referencedColumns: ['id']
          },
        ]
      }
      recipes: {
        Row: {
          id: string
          product_id: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          product_id: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          product_id?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipes_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      recipe_details: {
        Row: {
          id: string
          recipe_id: string
          bottle_type_id: string
          ounces: number
          created_at: string
        }
        Insert: {
          id?: string
          recipe_id: string
          bottle_type_id: string
          ounces: number
          created_at?: string
        }
        Update: {
          id?: string
          recipe_id?: string
          bottle_type_id?: string
          ounces?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'recipe_details_recipe_id_fkey'
            columns: ['recipe_id']
            referencedRelation: 'recipes'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'recipe_details_bottle_type_id_fkey'
            columns: ['bottle_type_id']
            referencedRelation: 'bottle_types'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_snapshots: {
        Row: {
          id: string
          snapshot_date: string
          created_by: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          snapshot_date?: string
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          snapshot_date?: string
          created_by?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      inventory_snapshot_details: {
        Row: {
          id: string
          snapshot_id: string
          bottle_id: string
          current_ounces: number
        }
        Insert: {
          id?: string
          snapshot_id: string
          bottle_id: string
          current_ounces: number
        }
        Update: {
          id?: string
          snapshot_id?: string
          bottle_id?: string
          current_ounces?: number
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_snapshot_details_snapshot_id_fkey'
            columns: ['snapshot_id']
            referencedRelation: 'inventory_snapshots'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'inventory_snapshot_details_bottle_id_fkey'
            columns: ['bottle_id']
            referencedRelation: 'bottles'
            referencedColumns: ['id']
          },
        ]
      }
      inventory_movements: {
        Row: {
          id: string
          bottle_id: string
          movement_type: Database['public']['Enums']['movement_type']
          from_location: Database['public']['Enums']['location_type'] | null
          to_location: Database['public']['Enums']['location_type'] | null
          ounces: number | null
          notes: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          bottle_id: string
          movement_type: Database['public']['Enums']['movement_type']
          from_location?: Database['public']['Enums']['location_type'] | null
          to_location?: Database['public']['Enums']['location_type'] | null
          ounces?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          bottle_id?: string
          movement_type?: Database['public']['Enums']['movement_type']
          from_location?: Database['public']['Enums']['location_type'] | null
          to_location?: Database['public']['Enums']['location_type'] | null
          ounces?: number | null
          notes?: string | null
          created_by?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: 'inventory_movements_bottle_id_fkey'
            columns: ['bottle_id']
            referencedRelation: 'bottles'
            referencedColumns: ['id']
          },
        ]
      }
      sales_periods: {
        Row: {
          id: string
          start_date: string
          end_date: string
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          start_date: string
          end_date: string
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          start_date?: string
          end_date?: string
          created_by?: string | null
          created_at?: string
        }
        Relationships: []
      }
      sales_details: {
        Row: {
          id: string
          sales_period_id: string
          product_id: string
          quantity: number
        }
        Insert: {
          id?: string
          sales_period_id: string
          product_id: string
          quantity: number
        }
        Update: {
          id?: string
          sales_period_id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: 'sales_details_sales_period_id_fkey'
            columns: ['sales_period_id']
            referencedRelation: 'sales_periods'
            referencedColumns: ['id']
          },
          {
            foreignKeyName: 'sales_details_product_id_fkey'
            columns: ['product_id']
            referencedRelation: 'products'
            referencedColumns: ['id']
          },
        ]
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          entity_name: string
          entity_id: string | null
          action: string
          old_values: Json | null
          new_values: Json | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          entity_name: string
          entity_id?: string | null
          action: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          entity_name?: string
          entity_id?: string | null
          action?: string
          old_values?: Json | null
          new_values?: Json | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      current_user_role: {
        Args: Record<PropertyKey, never>
        Returns: Database['public']['Enums']['user_role']
      }
      is_admin: {
        Args: Record<PropertyKey, never>
        Returns: boolean
      }
      receive_bottles: {
        Args: {
          p_bottle_type_id: string
          p_count: number
          p_status?: Database['public']['Enums']['bottle_status']
        }
        Returns: Database['public']['Tables']['bottles']['Row'][]
      }
      capture_initial_inventory: {
        Args: {
          p_notes: string
          p_lines: Json
        }
        Returns: string
      }
    }
    Enums: {
      user_role: 'ADMIN' | 'OPERATOR'
      bottle_status:
        | 'IN_WAREHOUSE'
        | 'IN_BAR'
        | 'SOLD'
        | 'EMPTY'
        | 'RETURNED'
        | 'LOST'
      location_type: 'WAREHOUSE' | 'BAR' | 'CUSTOMER' | 'EXTERNAL'
      movement_type:
        | 'WAREHOUSE_TO_BAR'
        | 'BAR_TO_WAREHOUSE'
        | 'CUSTOMER_SALE'
        | 'WASTE'
        | 'ADJUSTMENT'
    }
    CompositeTypes: Record<never, never>
  }
}

// -----------------------------------------------------------------------------
// Helpers de acceso (mismo estilo que genera supabase-js)
// -----------------------------------------------------------------------------
type PublicSchema = Database['public']

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row']

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert']

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update']

export type Enums<T extends keyof PublicSchema['Enums']> =
  PublicSchema['Enums'][T]
