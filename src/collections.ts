import { toPascalCase, toScreamingSnakeCase } from "./utils"

export function createCollectionEnum(collectionNames: Array<string>): string {
  const collections = collectionNames
    .map((name) => `\t${toPascalCase(name)} = "${name}",`)
    .join("\n")
  const typeString = `export enum Collections {
${collections}
}`
  return typeString
}

export function createCollectionFieldsDetailsFuncMapper(
  collectionNames: Array<string>
) {
  const collections = collectionNames
    .map(
      (name) => `\t[Collections.${toPascalCase(name)}]: ${name}FieldsDetails(),`
    )
    .join("\n")
  const typeString = `export const COLLECTION_FIELDS_DETAILS_MAP = {
${collections}
}`
  return typeString
}

export function createCollectionColumns(
  collectionNames: Array<string>
): string {
  const collections = collectionNames
    .map(
      (name) =>
        `\t[Collections.${toPascalCase(name)}]: ${toPascalCase(name)}Column,`
    )
    .join("\n")
  const typeString = `export type CollectionColumns = {
${collections}
}`
  return typeString
}

export function createCollectionColumnsMap(
  collectionNames: Array<string>
): string {
  const collections = collectionNames
    .map(
      (name) =>
        `\t[Collections.${toPascalCase(name)}]: ${toScreamingSnakeCase(
          name
        )}_COLUMNS,`
    )
    .join("\n")
  const typeString = `export const COLLECTION_COLUMNS_MAP = {
${collections}
}`
  return typeString
}

export function createCollectionRecords(
  collectionNames: Array<string>
): string {
  const nameRecordMap = collectionNames
    .map(
      (name) =>
        `\t[Collections.${toPascalCase(name)}]: ${toPascalCase(name)}Record`
    )
    .join("\n")
  return `export type CollectionRecords = {
${nameRecordMap}
}`
}

export function createTypedPocketbase(collectionNames: Array<string>): string {
  const nameRecordMap = collectionNames
    .map(
      (name) =>
        `\tcollection(idOrName: Collections.${toPascalCase(
          name
        )}): RecordService<${toPascalCase(name)}Record>`
    )
    .join("\n")
  return `export type TypedPocketBase = PocketBase & {
${nameRecordMap}
}`
}
