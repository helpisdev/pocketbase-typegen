export const EXPORT_COMMENT = `/**
* This file was @generated using pocketbase-typegen
*/`
export const IMPORTS = `import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'`
export const RECORD_TYPE_COMMENT = `// Record types for each collection`
export const TYPED_POCKETBASE_COMMENT = `// Type for usage with type asserted PocketBase instance\n// https://github.com/pocketbase/js-sdk#specify-typescript-definitions`
export const EXPAND_GENERIC_NAME = "expand"
export const DATE_STRING_TYPE_NAME = `IsoDateString`
export const RECORD_ID_STRING_NAME = `RecordIdString`
export const HTML_STRING_NAME = `HTMLString`
export const ALIAS_TYPE_DEFINITIONS = `// Alias types for improved usability
export type ${DATE_STRING_TYPE_NAME} = string
export type ${RECORD_ID_STRING_NAME} = string
export type ${HTML_STRING_NAME} = string`

export const BASE_SYSTEM_FIELDS_DEFINITION = `// System fields
export interface BaseSystemFields<T = never> {
\tid: ${RECORD_ID_STRING_NAME}
\tcreated: ${DATE_STRING_TYPE_NAME}
\tupdated: ${DATE_STRING_TYPE_NAME}
\tcollectionId: string
\tcollectionName: Collections
\texpand?: T
}`

export const AUTH_SYSTEM_FIELDS_DEFINITION = `export interface AuthSystemFields<T = never> extends BaseSystemFields<T> {
\temail: string
\temailVisibility: boolean
\tusername: string
\tverified: boolean
}`
