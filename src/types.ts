export type Options = {
  db?: string
  url?: string
  out: string
  json?: string
  email?: string
  password?: string
  sdk?: boolean
  env?: boolean | string
}

export enum FieldType {
  File = "file",
  Text = "text",
  Number = "number",
  Bool = "bool",
  Email = "email",
  Url = "url",
  Date = "date",
  Select = "select",
  Json = "json",
  Relation = "relation",
  User = "user",
  Editor = "editor",
}

export type FieldSchema = {
  id: string
  name: string
  type: FieldType
  system: boolean
  required: boolean
  unique: boolean
  options: RecordOptions
}

export type CollectionRecord = {
  id: string
  type: "base" | "auth" | "view"
  name: string
  system: boolean
  listRule: string | null
  viewRule: string | null
  createRule: string | null
  updateRule: string | null
  deleteRule: string | null
  schema: Array<FieldSchema>
}

// Every field is optional
export type RecordOptions = {
  maxSelect?: number | null
  min?: number | null
  max?: number | null
  pattern?: string
  values?: string[]
}
