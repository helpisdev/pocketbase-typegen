export const sorting = `export type SortingState = {
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
    return COLLECTION_COLUMNS_MAP[collection].includes(column);
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
`
