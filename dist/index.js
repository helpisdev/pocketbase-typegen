#!/usr/bin/env node

// src/cli.ts
import dotenv from "dotenv";

// src/schema.ts
import FormData from "form-data";
import fetch from "cross-fetch";
import { promises as fs } from "fs";
import { open } from "sqlite";
import sqlite3 from "sqlite3";
async function fromDatabase(dbPath) {
  const db = await open({
    driver: sqlite3.Database,
    filename: dbPath
  });
  const result = await db.all("SELECT * FROM _collections");
  return result.map((collection) => ({
    ...collection,
    schema: JSON.parse(collection.schema)
  }));
}
async function fromJSON(path) {
  const schemaStr = await fs.readFile(path, { encoding: "utf8" });
  return JSON.parse(schemaStr);
}
async function fromURL(url, email = "", password = "") {
  const formData = new FormData();
  formData.append("identity", email);
  formData.append("password", password);
  let collections = [];
  try {
    const { token } = await fetch(`${url}/api/admins/auth-with-password`, {
      body: formData,
      method: "post"
    }).then((res) => {
      if (!res.ok)
        throw res;
      return res.json();
    });
    const result = await fetch(`${url}/api/collections?perPage=200`, {
      headers: {
        Authorization: token
      }
    }).then((res) => {
      if (!res.ok)
        throw res;
      return res.json();
    });
    collections = result.items;
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
  return collections;
}

// src/constants.ts
var EXPORT_COMMENT = `/**
* This file was @generated using pocketbase-typegen
*/`;
var IMPORTS = `import type PocketBase from 'pocketbase'
import type { RecordService } from 'pocketbase'`;
var RECORD_TYPE_COMMENT = `// Record types for each collection`;
var TYPED_POCKETBASE_COMMENT = `// Type for usage with type asserted PocketBase instance
// https://github.com/pocketbase/js-sdk#specify-typescript-definitions`;
var EXPAND_GENERIC_NAME = "expand";
var DATE_STRING_TYPE_NAME = `IsoDateString`;
var RECORD_ID_STRING_NAME = `RecordIdString`;
var HTML_STRING_NAME = `HTMLString`;
var ALIAS_TYPE_DEFINITIONS = `// Alias types for improved usability
export type ${DATE_STRING_TYPE_NAME} = string
export type ${RECORD_ID_STRING_NAME} = string
export type ${HTML_STRING_NAME} = string`;
var BASE_SYSTEM_FIELDS_DEFINITION = `// System fields
export interface BaseSystemFields<T = never> {
	id: ${RECORD_ID_STRING_NAME}
	created: ${DATE_STRING_TYPE_NAME}
	updated: ${DATE_STRING_TYPE_NAME}
	collectionId: string
	collectionName: Collections
	expand?: T
}`;
var AUTH_SYSTEM_FIELDS_DEFINITION = `export interface AuthSystemFields<T = never> extends BaseSystemFields<T> {
	email: string
	emailVisibility: boolean
	username: string
	verified: boolean
}`;

// src/utils.ts
import { promises as fs2 } from "fs";
function toPascalCase(str) {
  if (/^[\p{L}\d]+$/iu.test(str)) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
  return str.replace(
    /([\p{L}\d])([\p{L}\d]*)/giu,
    (g0, g1, g2) => g1.toUpperCase() + g2.toLowerCase()
  ).replace(/[^\p{L}\d]/giu, "");
}
function toSnakeCase(w) {
  return w.replace(/\W+/g, " ").split(/ |\B(?=[A-Z])/).map((word) => word.toLowerCase()).join("_");
}
function toScreamingSnakeCase(w) {
  return toSnakeCase(w).toUpperCase();
}
function toTitleCase(str) {
  return toScreamingSnakeCase(str).replace("_", " ").replace(
    /\w\S*/g,
    (text) => text.charAt(0).toUpperCase() + text.substring(1).toLowerCase()
  );
}
function sanitizeFieldName(name) {
  return !isNaN(parseFloat(name.charAt(0))) ? `"${name}"` : name;
}
async function saveFile(outPath, typeString) {
  await fs2.writeFile(outPath, typeString, "utf8");
  console.log(`Created typescript definitions at ${outPath}`);
}
function getSystemFields(type) {
  switch (type) {
    case "auth":
      return "AuthSystemFields";
    default:
      return "BaseSystemFields";
  }
}
function getOptionEnumName(recordName, fieldName) {
  return `${toPascalCase(recordName)}${toPascalCase(fieldName)}Options`;
}
function getOptionValues(field) {
  const values = field.options.values;
  if (!values)
    return [];
  return values.filter((val, i) => values.indexOf(val) === i);
}

// src/collections.ts
function createCollectionEnum(collectionNames) {
  const collections = collectionNames.map((name) => `	${toPascalCase(name)} = "${name}",`).join("\n");
  const typeString = `export enum Collections {
${collections}
}`;
  return typeString;
}
function createCollectionFieldsDetailsFuncMapper(collectionNames) {
  const collections = collectionNames.map(
    (name) => `	[Collections.${toPascalCase(name)}]: ${name}FieldsDetails(),`
  ).join("\n");
  const typeString = `export const COLLECTION_FIELDS_DETAILS_MAP = {
${collections}
}`;
  return typeString;
}
function createCollectionColumns(collectionNames) {
  const collections = collectionNames.map(
    (name) => `	[Collections.${toPascalCase(name)}]: ${toPascalCase(name)}Column,`
  ).join("\n");
  const typeString = `export type CollectionColumns = {
${collections}
}`;
  return typeString;
}
function createCollectionColumnsMap(collectionNames) {
  const collections = collectionNames.map(
    (name) => `	[Collections.${toPascalCase(name)}]: ${toScreamingSnakeCase(
      name
    )}_COLUMNS,`
  ).join("\n");
  const typeString = `export const COLLECTION_COLUMNS_MAP = {
${collections}
}`;
  return typeString;
}
function createCollectionRecords(collectionNames) {
  const nameRecordMap = collectionNames.map(
    (name) => `	[Collections.${toPascalCase(name)}]: ${toPascalCase(name)}Record`
  ).join("\n");
  return `export type CollectionRecords = {
${nameRecordMap}
}`;
}
function createTypedPocketbase(collectionNames) {
  const nameRecordMap = collectionNames.map(
    (name) => `	collection(idOrName: Collections.${toPascalCase(
      name
    )}): RecordService<${toPascalCase(name)}Record>`
  ).join("\n");
  return `export type TypedPocketBase = PocketBase & {
${nameRecordMap}
}`;
}

// src/generics.ts
function fieldNameToGeneric(name) {
  return `T${name}`;
}
function getGenericArgList(schema) {
  const jsonFields = schema.filter((field) => field.type === "json").map((field) => fieldNameToGeneric(field.name)).sort();
  return jsonFields;
}
function getGenericArgStringWithDefault(schema, opts) {
  const argList = getGenericArgList(schema);
  if (opts.includeExpand) {
    argList.push(fieldNameToGeneric(EXPAND_GENERIC_NAME));
  }
  if (argList.length === 0)
    return "";
  return `<${argList.map((name) => `${name} = unknown`).join(", ")}>`;
}

// src/fields.ts
var pbSchemaTypescriptMap = {
  bool: "boolean",
  date: DATE_STRING_TYPE_NAME,
  editor: HTML_STRING_NAME,
  email: "string",
  text: "string",
  url: "string",
  number: "number",
  file: (fieldSchema) => fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1 ? "string[]" : "string",
  json: (fieldSchema) => `null | ${fieldNameToGeneric(fieldSchema.name)}`,
  relation: (fieldSchema) => fieldSchema.options.maxSelect && fieldSchema.options.maxSelect === 1 ? RECORD_ID_STRING_NAME : `${RECORD_ID_STRING_NAME}[]`,
  select: (fieldSchema, collectionName) => {
    const valueType = fieldSchema.options.values ? getOptionEnumName(collectionName, fieldSchema.name) : "string";
    return fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1 ? `${valueType}[]` : valueType;
  },
  user: (fieldSchema) => fieldSchema.options.maxSelect && fieldSchema.options.maxSelect > 1 ? `${RECORD_ID_STRING_NAME}[]` : RECORD_ID_STRING_NAME
};
var fields = `export enum FieldType {
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
  enumValues?: [string, any][];
};`;
function createTypeField(collectionName, fieldSchema) {
  let typeStringOrFunc;
  if (!(fieldSchema.type in pbSchemaTypescriptMap)) {
    console.log(`WARNING: unknown type "${fieldSchema.type}" found in schema`);
    typeStringOrFunc = "unknown";
  } else {
    typeStringOrFunc = pbSchemaTypescriptMap[fieldSchema.type];
  }
  const typeString = typeof typeStringOrFunc === "function" ? typeStringOrFunc(fieldSchema, collectionName) : typeStringOrFunc;
  const fieldName = sanitizeFieldName(fieldSchema.name);
  const required = fieldSchema.required ? "" : "?";
  return `	${fieldName}${required}: ${typeString}`;
}
function createTypeColumn(collectionName, schema, type) {
  const base = "'id' | 'created' | 'updated'";
  const auth = "'email' | 'emailVisibility' | 'username' | 'verified'";
  return `export type ${toPascalCase(collectionName)}Column = ${schema.map((item) => `'${sanitizeFieldName(item.name)}'`).join(" | ")} | ${base}${type === "auth" ? ` | ${auth}` : ""};`;
}
function createRecordFieldsDetails(collectionName, schema, type) {
  const columnsName = `${toPascalCase(collectionName)}Column`;
  const base = ["id", "created", "updated"];
  const baseFields = [
    `id: { id: 'id' as ${columnsName}, label: '${toTitleCase(
      "id"
    )}', type: FieldType.Text }`,
    `created: { id: 'created' as ${columnsName}, label: '${toTitleCase(
      "created"
    )}', type: FieldType.Date }`,
    `updated: { id: 'updated' as ${columnsName}, label: '${toTitleCase(
      "updated"
    )}', type: FieldType.Date }`
  ];
  const auth = ["email", "emailVisibility", "username", "verified"];
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
    )}', type: FieldType.Bool }`
  ];
  const returnType = `(labels: { [K in ${columnsName}]?: string }) => Keys<Collections.${toPascalCase(
    collectionName
  )}>`;
  let fields2 = schema.map((item) => {
    const name = sanitizeFieldName(item.name);
    const isEnum = item.type === "select" /* Select */;
    const enumValues = isEnum ? `, enumValues: Object.entries(${getOptionEnumName(
      collectionName,
      item.name
    )})` : "";
    const details = `{ id: '${name}' as ${columnsName}, label: '${toTitleCase(
      name
    )}', type: FieldType.${toPascalCase(item.type)}${enumValues} }`;
    return `    ${name}: ${details},`;
  }).join("\n");
  baseFields.forEach((baseField) => fields2 += baseField + ",\n");
  if (type === "auth") {
    authFields.forEach((authField) => fields2 += authField + ",\n");
  }
  const funcName = `${collectionName}FieldsDetails`;
  const argType = schema.map((item) => {
    return `${sanitizeFieldName(item.name)}?: string`;
  });
  const labels = schema.map((item) => {
    const name = sanitizeFieldName(item.name);
    const statement = `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`;
    return statement;
  });
  base.forEach((name) => {
    argType.push(`${name}?: string`);
    labels.push(
      `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`
    );
  });
  if (type === "auth") {
    auth.forEach((name) => {
      argType.push(`${name}?: string`);
      labels.push(
        `fields.${name}.label = labels['${name}'] ?? fields.${name}.label;`
      );
    });
  }
  const returnStatement = `
  return (labels: { ${argType.join(", ")} }) => {
    ${labels.join("\n    ")}
    return fields;
  };
`;
  return `export function ${funcName}(): ${returnType} {
  const fields = {
${fields2}
  }
${returnStatement}}`;
}
function createColumnsArray(collectionName, schema, type) {
  const base = "'id', 'created', 'updated'";
  const auth = "'email', 'emailVisibility', 'username', 'verified'";
  return `export const ${toScreamingSnakeCase(
    collectionName
  )}_COLUMNS: ${toPascalCase(collectionName)}Column[] = [${schema.map((item) => `'${sanitizeFieldName(item.name)}'`).join(", ")}, ${base}${type === "auth" ? `, ${auth}` : ""}];`;
}
function createSelectOptions(recordName, schema) {
  const selectFields = schema.filter((field) => field.type === "select");
  const typestring = selectFields.map(
    (field) => `export enum ${getOptionEnumName(recordName, field.name)} {
${getOptionValues(field).map((val) => `	"${getSelectOptionEnumName(val)}" = "${val}",`).join("\n")}
}
`
  ).join("\n");
  return typestring;
}
function getSelectOptionEnumName(val) {
  if (!isNaN(Number(val))) {
    return `E${val}`;
  } else {
    return val;
  }
}

// src/filtering.ts
var filtering = `export enum Operand {
  Equal = '=',
  NotEqual = '!=',
  GreaterThan = '>',
  GreaterThanOrEqual = '>=',
  LessThan = '<',
  LessThanOrEqual = '<=',
  Like = '~',
  NotLike = '!~',
  AnyOfEqual = '?=',
  AnyOfNotEqual = '?!=',
  AnyOfGreaterThan = '?>',
  AnyOfGreaterThanOrEqual = '?>=',
  AnyOfLessThan = '?<',
  AnyOfLessThanOrEqual = '?<=',
  AnyOfLike = '?~',
  AnyOfNotLike = '?!~',
}

export const OPERANDS_BY_FILE_TYPE = {
  [FieldType.Text]: [Operand.Equal, Operand.NotEqual, Operand.Like, Operand.NotLike],
  [FieldType.Email]: [Operand.Equal, Operand.NotEqual, Operand.Like, Operand.NotLike],
  [FieldType.Url]: [Operand.Equal, Operand.NotEqual, Operand.Like, Operand.NotLike],
  [FieldType.Number]: [
    Operand.Equal,
    Operand.NotEqual,
    Operand.GreaterThan,
    Operand.GreaterThanOrEqual,
    Operand.LessThan,
    Operand.LessThanOrEqual,
  ],
  [FieldType.Date]: [
    Operand.Equal,
    Operand.NotEqual,
    Operand.GreaterThan,
    Operand.GreaterThanOrEqual,
    Operand.LessThan,
    Operand.LessThanOrEqual,
  ],
  [FieldType.Bool]: [Operand.Equal, Operand.NotEqual],
  [FieldType.Select]: [Operand.Equal, Operand.NotEqual],
};

export type Operation<T extends Collections> = {
  field: keyof CollectionRecords[T];
  operand: Operand;
  value: any;
};

export type Expression<T extends Collections> = [Filter<T>, Filter<T>, ...Filter<T>[]];

export type AndExpression<T extends Collections> = { and: Expression<T> };

export type OrExpression<T extends Collections> = { or: Expression<T> };

export type GroupExpression<T extends Collections> = { group: Filter<T> };

export type Filter<T extends Collections> = (
  | Operation<T>
  | AndExpression<T>
  | OrExpression<T>
  | GroupExpression<T>
) & { id: string };

function operation<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
  operand: Operand,
): Filter<T> {
  return {
    operand,
    value,
    field,
    id: Math.random().toString(36),
  };
}

export function and<T extends Collections>(...operands: Expression<T>): Filter<T> {
  return { and: operands, id: Math.random().toString(36) };
}

export function or<T extends Collections>(...operands: Expression<T>): Filter<T> {
  return { or: operands, id: Math.random().toString(36) };
}

export function group<T extends Collections>(operands: Filter<T>): Filter<T> {
  return { group: operands, id: Math.random().toString(36) };
}

export function eq<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.Equal);
}

export function neq<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.NotEqual);
}

export function gt<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.GreaterThan);
}

export function gte<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.GreaterThanOrEqual);
}

export function lt<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.LessThan);
}

export function lte<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.LessThanOrEqual);
}

export function like<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.Like);
}

export function notLike<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.NotLike);
}

export function anyOfEq<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfLike);
}

export function anyOfNeq<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfNotLike);
}

export function anyOfGt<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfGreaterThan);
}

export function anyOfGte<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfGreaterThanOrEqual);
}

export function anyOfLt<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfLessThan);
}

export function anyOfLte<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfLessThanOrEqual);
}

export function anyOfLike<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfLike);
}

export function anyOfNotLike<T extends Collections>(
  field: keyof CollectionRecords[T],
  value: any,
): Filter<T> {
  return operation(field, value, Operand.AnyOfNotLike);
}

function pbFilters<T extends Collections>(
  pb: TypedPocketBase,
  filter?: Filter<T>,
): string | undefined {
  if (!filter) {
    return undefined;
  }
  const vars: Record<string, any> = {};

  function generateRandomString(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  function processFilter(f: Filter<T>): string {
    if (Array.isArray(f)) {
      return f
        .map(
          ([expr, op, nextExpr]) =>
            \`\${processExpression(expr)} \${op} \${processExpression(nextExpr)}\`,
        )
        .join(' ');
    }
    return processExpression(f);
  }

  function processExpression(expr: Filter<T>): string {
    if ('and' in expr) {
      return expr.and.map(processFilter).join(' && ');
    }
    if ('or' in expr) {
      return expr.or.map(processFilter).join(' || ');
    }
    if ('group' in expr) {
      return \`(\${processFilter(expr.group)})\`;
    }

    const randomString = generateRandomString();
    const varName = \`\${randomString}-\${String(expr.field)}\`;
    vars[varName] = expr.value;
    return \`\${String(expr.field)} \${expr.operand} {:\${varName}}\`;
  }

  const result = processFilter(filter);
  return pb.filter(result, vars);
}

function mergeFilters<T extends Collections>({
  existingFilter,
  newFilter,
  behavior = 'or',
  groupExistingFilters = false,
}: {
  existingFilter?: Filter<T>;
  newFilter: Filter<T>;
  behavior?: 'or' | 'and';
  groupExistingFilters?: boolean;
}): Filter<T> {
  if (!existingFilter) {
    return newFilter;
  }
  const id = Math.random().toString(36);

  const filter: [Filter<T>, Filter<T>] = [
    newFilter,
    groupExistingFilters ? { group: existingFilter, id } : existingFilter,
  ];
  switch (behavior) {
    case 'and':
      return { and: filter, id };
    case 'or':
      return { or: filter, id };
  }
}

export function isValidFilter<T extends Collections>(value: unknown): value is Filter<T> {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  if (!('id' in value)) {
    return false;
  }

  if ('and' in value && Array.isArray(value.and)) {
    return value.and.every(isValidFilter);
  }

  if ('or' in value && Array.isArray(value.or)) {
    return value.or.every(isValidFilter);
  }

  if ('group' in value) {
    return isValidFilter<T>(value.group);
  }

  if (!('field' in value) || !('operand' in value) || !('value' in value)) {
    return false;
  }

  return (
    typeof value.field === 'string' &&
    typeof value.operand === 'string' &&
    value.value !== undefined
  );
}

export const filtering = {
  pb: pbFilters,
  merge: mergeFilters,
};
`;

// src/sorting.ts
var sorting = `export type SortingState = {
    desc: boolean;
    id: string;
}[];

export type SortParams<
  TCollection extends Collections,
  TColumn extends CollectionColumns[TCollection],
> = Array<\`\${'+' | '-'}\${TColumn}\`>;

export function isValidSortFilter<
  TCollection extends Collections,
  TColumn extends CollectionColumns[TCollection],
>(collection: TCollection, value: unknown): value is SortParams<TCollection, TColumn> {
  if (!Array.isArray(value)) {
    return false;
  }

  if (!value.every((item) => typeof item === 'string' && /^[+-]/.test(item))) {
    return false;
  }

  const uniqueValues = new Set(value.map((item) => item.slice(1)));
  if (uniqueValues.size !== value.length) {
    return false;
  }

  return value.every((item) => {
    const column = item.slice(1) as TColumn;
    return column in COLLECTION_COLUMNS_MAP[collection];
  });
}

function uniqueColumns<
  TCollection extends Collections,
  TColumn extends CollectionColumns[TCollection],
>(columns?: SortParams<TCollection, TColumn>): SortParams<TCollection, TColumn> {
  if (!columns) {
    return [];
  }

  return Array.from(new Set(columns.map((column) => column.slice(1)))).map((c) => {
    const prefix = columns.find((column) => column.slice(1) === c)?.charAt(0) || '+';
    return \`\${prefix}\${c}\`;
  }) as SortParams<TCollection, TColumn>;
}

function pbSorting<TCollection extends Collections, TColumn extends CollectionColumns[TCollection]>(
  columns?: SortParams<TCollection, TColumn>,
): string | undefined {
  if (!columns) {
    return undefined;
  }
  return uniqueColumns(columns).join(',');
}

function editSorting<TCollection extends Collections, TColumn extends CollectionColumns[TCollection]>({
  columns,
  value,
  desc = false,
  behavior = 'add',
}: {
  columns?: SortParams<TCollection, TColumn>;
  value: TColumn;
  desc?: boolean;
  behavior?: 'add' | 'remove';
}): SortParams<TCollection, TColumn> | undefined {
  const filteredParams = uniqueColumns(columns).filter((column) => column.slice(1) !== value);

  if (behavior === 'remove') {
    if (filteredParams.length === 0) {
      return undefined;
    }

    return filteredParams;
  }

  const prefix = desc ? '-' : '+';
  const newParam = \`\${prefix}\${value}\` as \`\${'+' | '-'}\${TColumn}\`;
  return [...filteredParams, newParam];
}

function toSortingState<
  TCollection extends Collections,
  TColumn extends CollectionColumns[TCollection],
>(params: SortParams<TCollection, TColumn> | undefined): SortingState {
  if (!params) {
    return [];
  }
  return params.map((param) => ({
    id: param.slice(1),
    desc: param.startsWith('-'),
  }));
}

function fromSortingState<
  TCollection extends Collections,
  TColumn extends CollectionColumns[TCollection],
>(state: SortingState | undefined): SortParams<TCollection, TColumn> | undefined {
  if (!state || state.length === 0) {
    return undefined;
  }
  return state.map((item) => {
    const prefix = item.desc ? '-' : '+';
    return \`\${prefix}\${item.id}\` as \`\${'+' | '-'}\${TColumn}\`;
  });
}

export const sorting = {
  edit: editSorting,
  pb: pbSorting,
  toSortingState,
  fromSortingState,
};
`;

// src/lib.ts
function generate(results, options2) {
  const collectionNames = [];
  const recordTypes = [];
  const collectionFieldsDetails = [];
  results.sort((a, b) => a.name <= b.name ? -1 : 1).forEach((row) => {
    if (row.name)
      collectionNames.push(row.name);
    if (row.schema) {
      recordTypes.push(createRecordType(row));
      collectionFieldsDetails.push(
        createRecordFieldsDetails(row.name, row.schema, row.type)
      );
    }
  });
  const sortedCollectionNames = collectionNames;
  const fileParts = [
    EXPORT_COMMENT,
    options2.sdk && IMPORTS,
    createCollectionEnum(sortedCollectionNames),
    ALIAS_TYPE_DEFINITIONS,
    BASE_SYSTEM_FIELDS_DEFINITION,
    AUTH_SYSTEM_FIELDS_DEFINITION,
    RECORD_TYPE_COMMENT,
    ...recordTypes,
    createCollectionColumns(sortedCollectionNames),
    createCollectionColumnsMap(sortedCollectionNames),
    createCollectionRecords(sortedCollectionNames),
    options2.sdk && TYPED_POCKETBASE_COMMENT,
    options2.sdk && createTypedPocketbase(sortedCollectionNames),
    fields,
    createCollectionFieldsDetailsFuncMapper(sortedCollectionNames),
    ...collectionFieldsDetails,
    filtering,
    sorting
  ];
  return fileParts.filter(Boolean).join("\n\n") + "\n";
}
function createRecordType(collectionSchemaEntry) {
  const { name, schema, type } = collectionSchemaEntry;
  const systemFields = getSystemFields(type);
  const expandArgString = `<T${EXPAND_GENERIC_NAME}>`;
  const selectOptionEnums = createSelectOptions(name, schema);
  const typeName = toPascalCase(name);
  const genericArgs = getGenericArgStringWithDefault(schema, {
    includeExpand: true
  });
  const fields2 = schema.map((fieldSchema) => createTypeField(name, fieldSchema)).sort().join("\n");
  const columns = createTypeColumn(name, schema, type);
  const columnsArray = createColumnsArray(name, schema, type);
  return `${columns}

${columnsArray}

${selectOptionEnums}export interface ${typeName}Record${genericArgs} extends ${systemFields}${expandArgString} ${fields2 ? `{
${fields2}
}` : "never"}`;
}

// src/cli.ts
async function main(options2) {
  let schema;
  if (options2.db) {
    schema = await fromDatabase(options2.db);
  } else if (options2.json) {
    schema = await fromJSON(options2.json);
  } else if (options2.url) {
    schema = await fromURL(options2.url, options2.email, options2.password);
  } else if (options2.env) {
    const path = typeof options2.env === "string" ? options2.env : ".env";
    dotenv.config({ path });
    if (!process.env.PB_TYPEGEN_URL || !process.env.PB_TYPEGEN_EMAIL || !process.env.PB_TYPEGEN_PASSWORD) {
      return console.error(
        "Missing environment variables. Check options: pocketbase-typegen --help"
      );
    }
    schema = await fromURL(
      process.env.PB_TYPEGEN_URL,
      process.env.PB_TYPEGEN_EMAIL,
      process.env.PB_TYPEGEN_PASSWORD
    );
  } else {
    return console.error(
      "Missing schema path. Check options: pocketbase-typegen --help"
    );
  }
  const typeString = generate(schema, {
    sdk: options2.sdk ?? true
  });
  await saveFile(options2.out, typeString);
  return typeString;
}

// src/index.ts
import { program } from "commander";

// package.json
var version = "1.2.1";

// src/index.ts
program.name("Pocketbase Typegen").version(version).description(
  "CLI to create typescript typings for your pocketbase.io records"
).option("-d, --db <char>", "path to the pocketbase SQLite database").option(
  "-j, --json <char>",
  "path to JSON schema exported from pocketbase admin UI"
).option(
  "-u, --url <char>",
  "URL to your hosted pocketbase instance. When using this options you must also provide email and password options."
).option(
  "-e, --email <char>",
  "email for an admin pocketbase user. Use this with the --url option"
).option(
  "-p, --password <char>",
  "password for an admin pocketbase user. Use this with the --url option"
).option(
  "-o, --out <char>",
  "path to save the typescript output file",
  "pocketbase-types.ts"
).option(
  "--no-sdk",
  "remove the pocketbase package dependency. A typed version of the SDK will not be generated."
).option(
  "-e, --env [path]",
  "flag to use environment variables for configuration. Add PB_TYPEGEN_URL, PB_TYPEGEN_EMAIL, PB_TYPEGEN_PASSWORD to your .env file. Optionally provide a path to your .env file"
);
program.parse(process.argv);
var options = program.opts();
main(options);
