import {
  DATE_STRING_TYPE_NAME,
  HTML_STRING_NAME,
  RECORD_ID_STRING_NAME,
} from "./constants"
import {
  getOptionEnumName,
  getOptionValues,
  sanitizeFieldName,
  toPascalCase,
  toScreamingSnakeCase,
  toTitleCase,
} from "./utils"

import { FieldSchema, FieldType } from "./types"
import { fieldNameToGeneric } from "./generics"

/**
 * Convert the pocketbase field type to the equivalent typescript type
 */
export const pbSchemaTypescriptMap = {
  // Basic fields
  bool: "boolean",
  date: DATE_STRING_TYPE_NAME,
  editor: HTML_STRING_NAME,
  email: "string",
  text: "string",
  url: "string",
  number: "number",

  // Dependent on schema
  file: (fieldSchema: FieldSchema) =>
    fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1
      ? "string[]"
      : "string",
  json: (fieldSchema: FieldSchema) =>
    `null | ${fieldNameToGeneric(fieldSchema.name)}`,
  relation: (fieldSchema: FieldSchema) =>
    fieldSchema.options.maxSelect && fieldSchema.options.maxSelect === 1
      ? RECORD_ID_STRING_NAME
      : `${RECORD_ID_STRING_NAME}[]`,
  select: (fieldSchema: FieldSchema, collectionName: string) => {
    // pocketbase v0.8+ values are required
    const valueType = fieldSchema.options.values
      ? getOptionEnumName(collectionName, fieldSchema.name)
      : "string"
    return fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1
      ? `${valueType}[]`
      : valueType
  },

  // DEPRECATED: PocketBase v0.8 does not have a dedicated user relation
  user: (fieldSchema: FieldSchema) =>
    fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1
      ? `${RECORD_ID_STRING_NAME}[]`
      : RECORD_ID_STRING_NAME,
}

export const fields = `export enum FieldType {
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
};

export type Keys<TCollection extends Collections> = {
  [K in CollectionColumns[TCollection]]: FieldsDetails<TCollection>;
};

export interface FieldsDetails<TCollection extends Collections> {
  id: CollectionColumns[TCollection];
  label: string;
  type: FieldType;
  enumValues?: any;
};`

export function createTypeField(
  collectionName: string,
  fieldSchema: FieldSchema
): string {
  let typeStringOrFunc:
    | string
    | ((fieldSchema: FieldSchema, collectionName: string) => string)

  if (!(fieldSchema.type in pbSchemaTypescriptMap)) {
    console.log(`WARNING: unknown type "${fieldSchema.type}" found in schema`)
    typeStringOrFunc = "unknown"
  } else {
    typeStringOrFunc =
      pbSchemaTypescriptMap[
        fieldSchema.type as keyof typeof pbSchemaTypescriptMap
      ]
  }

  const typeString =
    typeof typeStringOrFunc === "function"
      ? typeStringOrFunc(fieldSchema, collectionName)
      : typeStringOrFunc

  const fieldName = sanitizeFieldName(fieldSchema.name)
  const required = fieldSchema.required ? "" : "?"

  return `\t${fieldName}${required}: ${typeString}`
}

export function createTypeColumn(
  collectionName: string,
  schema: FieldSchema[],
  type: "base" | "auth" | "view"
): string {
  const base = "'id' | 'created' | 'updated'"
  const auth = "'email' | 'emailVisibility' | 'username' | 'verified'"
  return `export type ${toPascalCase(collectionName)}Column = ${schema
    .map((item) => `'${sanitizeFieldName(item.name)}'`)
    .join(" | ")} | ${base}${type === "auth" ? ` | ${auth}` : ""};`
}

export function createRecordFieldsDetails(
  collectionName: string,
  schema: FieldSchema[],
  type: "base" | "auth" | "view"
): string {
  const columnsName = `${toPascalCase(collectionName)}Column`
  const base = ["id", "created", "updated"]
  const baseFields = [
    `id: { id: 'id' as ${columnsName}, label: '${toTitleCase(
      "id"
    )}', type: FieldType.Text }`,
    `created: { id: 'created' as ${columnsName}, label: '${toTitleCase(
      "created"
    )}', type: FieldType.Date }`,
    `updated: { id: 'updated' as ${columnsName}, label: '${toTitleCase(
      "updated"
    )}', type: FieldType.Date }`,
  ]
  const auth = ["email", "emailVisibility", "username", "verified"]
  const authFields = [
    `email: { id: 'email' as ${columnsName}, label: '${toTitleCase(
      "email"
    )}', type: FieldType.Text }`,
    `emailVisibility: { id: 'emailVisibility' as ${columnsName}, label: '${toTitleCase(
      "emailVisibility"
    )}', type: FieldType.Bool }`,
    `username: { id: 'username' as ${columnsName}, label: '${toTitleCase(
      "username"
    )}', type: FieldType.Text }`,
    `verified: { id: 'verified' as ${columnsName}, label: '${toTitleCase(
      "verified"
    )}', type: FieldType.Bool }`,
  ]
  const returnType = `(labels: { [K in ${columnsName}]?: string }) => Keys<Collections.${toPascalCase(
    collectionName
  )}>`
  let fields = schema
    .map((item) => {
      const name = sanitizeFieldName(item.name)
      const isEnum = item.type === FieldType.Select
      const enumValues = isEnum
        ? `, enumValues: Object.entries(${getOptionEnumName(
            collectionName,
            item.name
          )})`
        : ""
      const details = `{ id: '${name}' as ${columnsName}, label: '${toTitleCase(
        name
      )}', type: FieldType.${toPascalCase(item.type)}${enumValues} }`
      return `    ${name}: ${details},`
    })
    .join("\n")
  baseFields.forEach((baseField) => (fields += baseField + ",\n"))
  if (type === "auth") {
    authFields.forEach((authField) => (fields += authField + ",\n"))
  }
  const funcName = `${collectionName}FieldsDetails`
  const argType = schema.map((item) => {
    return `${sanitizeFieldName(item.name)}?: string`
  })

  const labels = schema.map((item) => {
    const name = sanitizeFieldName(item.name)
    const statement = `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`
    return statement
  })

  base.forEach((name) => {
    argType.push(`${name}?: string`)
    labels.push(
      `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`
    )
  })
  if (type === "auth") {
    auth.forEach((name) => {
      argType.push(`${name}?: string`)
      labels.push(
        `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`
      )
    })
  }
  const returnStatement = `
  return (labels: { ${argType.join(", ")} }) => {
    ${labels.join("\n    ")}
    return fields;
  };
`
  return (
    `export function ${funcName}(): ${returnType} {\n` +
    `  const fields = {\n${fields}\n  }\n` +
    `${returnStatement}` +
    `}`
  )
}

export function createColumnsArray(
  collectionName: string,
  schema: FieldSchema[],
  type: "base" | "auth" | "view"
): string {
  const base = "'id', 'created', 'updated'"
  const auth = "'email', 'emailVisibility', 'username', 'verified'"
  return `export const ${toScreamingSnakeCase(
    collectionName
  )}_COLUMNS: ${toPascalCase(collectionName)}Column[] = [${schema
    .map((item) => `'${sanitizeFieldName(item.name)}'`)
    .join(", ")}, ${base}${type === "auth" ? `, ${auth}` : ""}];`
}

export function createSelectOptions(
  recordName: string,
  schema: Array<FieldSchema>
): string {
  const selectFields = schema.filter((field) => field.type === "select")
  const typestring = selectFields
    .map(
      (field) => `export enum ${getOptionEnumName(recordName, field.name)} {
${getOptionValues(field)
  .map((val) => `\t"${getSelectOptionEnumName(val)}" = "${val}",`)
  .join("\n")}
}\n`
    )
    .join("\n")
  return typestring
}

export function getSelectOptionEnumName(val: string) {
  if (!isNaN(Number(val))) {
    // The value is a number, which cannot be used as an enum name
    return `E${val}`
  } else {
    return val
  }
}
