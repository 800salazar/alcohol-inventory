/**
 * Alias de dominio derivados de la base de datos.
 * Importa SIEMPRE desde aquí en la app (no desde database.types directamente),
 * para que regenerar los tipos no rompa los imports de features.
 */
import type { Tables, TablesInsert, TablesUpdate, Enums } from './database.types'

// Filas
export type Profile = Tables<'profiles'>
export type BottleType = Tables<'bottle_types'>
export type Bottle = Tables<'bottles'>
export type Category = Tables<'categories'>
export type Product = Tables<'products'>
export type Recipe = Tables<'recipes'>
export type RecipeDetail = Tables<'recipe_details'>

// Inserts
export type BottleTypeInsert = TablesInsert<'bottle_types'>
export type BottleInsert = TablesInsert<'bottles'>
export type CategoryInsert = TablesInsert<'categories'>
export type ProductInsert = TablesInsert<'products'>
export type RecipeInsert = TablesInsert<'recipes'>
export type RecipeDetailInsert = TablesInsert<'recipe_details'>

// Updates
export type ProfileUpdate = TablesUpdate<'profiles'>
export type BottleTypeUpdate = TablesUpdate<'bottle_types'>
export type BottleUpdate = TablesUpdate<'bottles'>
export type CategoryUpdate = TablesUpdate<'categories'>
export type ProductUpdate = TablesUpdate<'products'>

// Enums
export type UserRole = Enums<'user_role'>
export type BottleStatus = Enums<'bottle_status'>
export type LocationType = Enums<'location_type'>
export type MovementType = Enums<'movement_type'>

// Vistas compuestas (joins) usadas en la UI
export type BottleWithType = Bottle & { bottle_type: BottleType | null }
export type ProductWithCategory = Product & { category: Category | null }
export type RecipeWithDetails = Recipe & {
  product: Product | null
  recipe_details: (RecipeDetail & { bottle_type: BottleType | null })[]
}

export type {
  Json,
  Database,
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from './database.types'
