export const filtering = `export enum Operand {
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
`
