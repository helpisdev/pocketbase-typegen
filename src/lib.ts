import {
  ALIAS_TYPE_DEFINITIONS,
  TYPED_POCKETBASE_COMMENT,
  AUTH_SYSTEM_FIELDS_DEFINITION,
  BASE_SYSTEM_FIELDS_DEFINITION,
  EXPAND_GENERIC_NAME,
  EXPORT_COMMENT,
  RECORD_TYPE_COMMENT,
  IMPORTS,
} from "./constants"
import { CollectionRecord, FieldSchema } from "./types"
import {
  createCollectionColumns,
  createCollectionColumnsMap,
  createCollectionEnum,
  createCollectionFieldsDetailsFuncMapper,
  createCollectionRecords,
  createTypedPocketbase,
} from "./collections"
import {
  createSelectOptions,
  createTypeField,
  createTypeColumn,
  createColumnsArray,
  fields,
  createRecordFieldsDetails,
} from "./fields"
import { getGenericArgStringWithDefault } from "./generics"
import { getSystemFields, toPascalCase } from "./utils"
import { filtering } from "./filtering"
import { sorting } from "./sorting"

type GenerateOptions = {
  sdk: boolean
}

export function generate(
  results: Array<CollectionRecord>,
  options: GenerateOptions
): string {
  const collectionNames: Array<string> = []
  const recordTypes: Array<string> = []
  const collectionFieldsDetails: Array<string> = []

  results
    .sort((a, b) => (a.name <= b.name ? -1 : 1))
    .forEach((row) => {
      if (row.name) collectionNames.push(row.name)
      if (row.schema) {
        recordTypes.push(createRecordType(row))
        collectionFieldsDetails.push(
          createRecordFieldsDetails(row.name, row.schema, row.type)
        )
      }
    })
  const sortedCollectionNames = collectionNames

  const fileParts = [
    EXPORT_COMMENT,
    options.sdk && IMPORTS,
    createCollectionEnum(sortedCollectionNames),
    ALIAS_TYPE_DEFINITIONS,
    BASE_SYSTEM_FIELDS_DEFINITION,
    AUTH_SYSTEM_FIELDS_DEFINITION,
    RECORD_TYPE_COMMENT,
    ...recordTypes,
    createCollectionColumns(sortedCollectionNames),
    createCollectionColumnsMap(sortedCollectionNames),
    createCollectionRecords(sortedCollectionNames),
    options.sdk && TYPED_POCKETBASE_COMMENT,
    options.sdk && createTypedPocketbase(sortedCollectionNames),
    fields,
    createCollectionFieldsDetailsFuncMapper(sortedCollectionNames),
    ...collectionFieldsDetails,
    filtering,
    sorting,
  ]

  return fileParts.filter(Boolean).join("\n\n") + "\n"
}

export function createRecordType(
  collectionSchemaEntry: CollectionRecord
): string {
  const { name, schema, type } = collectionSchemaEntry
  const systemFields = getSystemFields(type)
  const expandArgString = `<T${EXPAND_GENERIC_NAME}>`
  const selectOptionEnums = createSelectOptions(name, schema)
  const typeName = toPascalCase(name)
  const genericArgs = getGenericArgStringWithDefault(schema, {
    includeExpand: true,
  })
  const fields = schema
    .map((fieldSchema: FieldSchema) => createTypeField(name, fieldSchema))
    .sort()
    .join("\n")

  const columns = createTypeColumn(name, schema, type)
  const columnsArray = createColumnsArray(name, schema, type)

  return `${columns}\n\n${columnsArray}\n\n${selectOptionEnums}export interface ${typeName}Record${genericArgs} extends ${systemFields}${expandArgString} ${
    fields
      ? `{
${fields}
}`
      : "never"
  }`
}
