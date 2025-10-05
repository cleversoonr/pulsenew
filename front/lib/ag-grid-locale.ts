import type { ITextFilterParams } from "ag-grid-community";

export const agGridPtBrLocale = {
  // Text filter
  filterOoo: "Filtrar...",
  equals: "Igual a",
  notEqual: "Diferente de",
  contains: "Contém",
  notContains: "Não contém",
  startsWith: "Começa com",
  endsWith: "Termina com",
  blank: "Vazio",
  notBlank: "Não vazio",
  andCondition: "E",
  orCondition: "Ou",
  resetFilter: "Limpar",
  clearFilter: "Limpar",
  applyFilter: "Aplicar",
  cancel: "Cancelar",

  // Column menu
  columns: "Colunas",
  filters: "Filtros",
  menuPin: "Fixar coluna",
  menuValue: "Mostrar valores",
  menuAggregate: "Agregações",
  menuColumns: "Colunas",

  // Set filter
  selectAll: "Selecionar todos",
  searchOoo: "Pesquisar...",

  // Others
  loadingOoo: "Carregando...",
  noRowsToShow: "Nenhum registro encontrado",
};

export const agGridDefaultTextFilterParams: ITextFilterParams = {
  caseSensitive: false,
  trimInput: true,
  debounceMs: 200,
  filterOptions: ["contains", "notContains", "equals"],
  defaultOption: "contains",
  suppressAndOrCondition: true,
};
