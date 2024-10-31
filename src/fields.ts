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

export type CollectionInfo<TCollection extends Collections, TFieldMeta = any, TCollectionMeta = any> = {
  fields: {
    [K in CollectionColumns[TCollection]]: FieldDetails<TCollection, TFieldMeta>;
  };
  meta?: TCollectionMeta;
};

export interface FieldDetails<TCollection extends Collections, TFieldMeta = any> {
  id: CollectionColumns[TCollection];
  label: string;
  type: FieldType;
  enumValues?: [string, any][];
  meta?: TFieldMeta;
}`

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
  const collection = toPascalCase(collectionName)
  const columnsName = `${collection}Column`
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
  const columnAccessor = `[K in ${columnsName}]?`
  const enumLabels = `{
    enumLabels?: {
    ${schema
      .filter((item) => item.type === FieldType.Select)
      .map(
        (item) =>
          `  ${sanitizeFieldName(item.name)}: {
        ${getOptionValues(item)
          .map((e) => `${getSelectOptionEnumName(e)}: string`)
          .join("\n        ")}
      }`
      )
      .join("\n    ")}
    }
  }`
  const hasEnums =
    schema.find((item) => item.type === FieldType.Select) !== undefined
  const returnType = `<TFieldMeta = any, TCollectionMeta = any>({
  labels,
  fieldMeta,
  collectionMeta,
}: {
  labels?: { ${columnAccessor}: string }${hasEnums ? ` & ${enumLabels}` : ""};
  fieldMeta?: { ${columnAccessor}: TFieldMeta };
  collectionMeta?: TCollectionMeta;
}) => CollectionInfo<Collections.${collection}, TFieldMeta, TCollectionMeta>`
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
      return `      ${name}: ${details}`
    })
    .join(",\n")
  baseFields.forEach((baseField) => (fields += ",\n      " + baseField))
  if (type === "auth") {
    authFields.forEach((authField) => (fields += ",\n      " + authField))
  }
  const funcName = `${collectionName}Info`
  const labelParams = schema.map((item) => {
    return `${sanitizeFieldName(item.name)}?: string`
  })

  const enumLabelsParams = `
        enumLabels?: {
          ${schema
            .filter((item) => item.type === FieldType.Select)
            .map(
              (item) =>
                `${sanitizeFieldName(item.name)}?: {
        ${getOptionValues(item)
          .map((e) => `    ${getSelectOptionEnumName(e)}?: string`)
          .join("\n        ")}
          }`
            )
            .join("\n          ")}
        }
`
  const metaParams = schema.map((item) => {
    return `${sanitizeFieldName(item.name)}?: TFieldMeta`
  })

  const fieldStatement = (item: FieldSchema | string) => {
    const isString = typeof item === "string"
    const name = isString ? item : sanitizeFieldName(item.name)
    const fields = [
      `fields.fields.${name}.label = labels['${name}'] ?? fields.fields.${name}.label;`,
      `fields.fields.${name}.meta = fieldMeta.${name};`,
    ]
    if (!isString && item.type === FieldType.Select) {
      fields.push(
        `fields.fields.${name}.enumValues = fields.fields.${name}.enumValues?.map(([key, value]) => {
      const type = labels?.enumLabels?.${name}
      if (type) {
        return [key, type[key as keyof typeof type]]
      }
      return [key, value]
    })`
      )
    }

    return fields
  }

  const fieldItems = schema.map((item) => {
    return fieldStatement(item)
  })

  base.forEach((name) => {
    labelParams.push(`${name}?: string`)
    metaParams.push(`${name}?: TFieldMeta`)
    fieldItems.push(fieldStatement(name))
  })
  if (type === "auth") {
    auth.forEach((name) => {
      labelParams.push(`${name}?: string`)
      metaParams.push(`${name}?: TFieldMeta`)
      fieldItems.push(fieldStatement(name))
    })
  }
  const returnStatement = `
  return <TFieldMeta = any, TCollectionMeta = any>(
    {
      labels = {},
      fieldMeta = {},
      collectionMeta,
    }: {
      labels?: {
        ${labelParams.join("\n        ")}${
    hasEnums ? `${enumLabelsParams}` : ""
  }
      };
      fieldMeta?: {
        ${metaParams.join("\n        ")}
      };
      collectionMeta?: TCollectionMeta;
    }
  ) => {
    ${fieldItems.flat().join("\n    ")}
    fields.meta = collectionMeta;
    return fields;
  };
`
  return (
    `export function ${funcName}(): ${returnType} {\n` +
    `  const fields: CollectionInfo<Collections.${collection}> = {` +
    `\n    fields: {\n${fields}\n    },\n  }\n` +
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
