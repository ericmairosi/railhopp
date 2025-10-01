// Database types and schemas
// TODO: Add Supabase generated types and custom database types

export interface DatabaseConnection {
  url: string
  apiKey: string
}

export interface TableConfig {
  name: string
  schema: string
}
