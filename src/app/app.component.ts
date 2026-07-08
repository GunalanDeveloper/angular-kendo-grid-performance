import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { NgFor, NgIf } from '@angular/common';
import { AgGridAngular } from 'ag-grid-angular';
import {
  ClientSideRowModelApiModule,
  ClientSideRowModelModule,
  ColDef,
  GridApi,
  GridOptions,
  GridReadyEvent,
  ModuleRegistry,
  DateEditorModule,
  NumberEditorModule,
  TextEditorModule,
  ICellRendererParams
} from 'ag-grid-community';
import type { CellValueChangedEvent } from 'ag-grid-community';
import type { SortChangedEvent, SortDirection } from 'ag-grid-community';
import { map, Observable, switchMap, throwError } from 'rxjs';
import { AssetLogoCellRendererComponent } from './asset-logo-cell-renderer.component';
import { OriginalCostStepperFilterComponent } from './original-cost-stepper-filter.component';

type AssetRow = Record<string, unknown>;

interface AssetApiResponse {
  data?: AssetRow[];
  content?: AssetRow[];
  items?: AssetRow[];
  result?: AssetRow[];
  list?: AssetRow[];
  records?: AssetRow[];
  assetList?: AssetRow[];
  [key: string]: unknown;
}

interface WriteOffMap {
  yesValues?: string[];
}

type AssetField =
  | 'assetLogoPath'
  | 'assetCd'
  | 'assetName'
  | 'originalCost'
  | 'installationDt'
  | 'writeOffFlg'
  | 'locationCd'
  | 'assetBranchName';

ModuleRegistry.registerModules([
  NumberEditorModule,
  DateEditorModule,
  TextEditorModule,
  ClientSideRowModelApiModule,
  ClientSideRowModelModule
]);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AgGridAngular, NgIf, NgFor],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  private readonly http = inject(HttpClient);
  private gridApi?: GridApi<AssetRow>;
  private editableGridApi?: GridApi<AssetRow>;
  private readonly writeOffYesValues = new Set<string>();
  private readonly editableRowSnapshots = new Map<string, AssetRow>();
  private readonly editableValidationErrors = new Map<string, string>();
  gridMode: 'normal' | 'editable' | 'documentation' | null = 'documentation';
  documentationView: 'grid' | 'inputs' | 'dialog' | 'tabstrip' | 'buttons' | 'menu' | 'accordion' | 'qrbarcode' | 'tooltip' = 'grid';
  showEditableGrid = false;
  readonly pageSizeOptions = [5, 10, 20, 50, 100];
  readonly kendoGridSnippet = `<kendo-grid
  [data]="rowData"
  [pageable]="true"
  [sortable]="true"
  [filterable]="true"
  [height]="600"
>
  <kendo-grid-column field="assetCd" title="Asset Code"></kendo-grid-column>
  <kendo-grid-column field="assetName" title="Asset Name"></kendo-grid-column>
  <kendo-grid-column field="originalCost" title="Original Cost"></kendo-grid-column>
  <kendo-grid-column field="installationDt" title="Installation Date"></kendo-grid-column>
  <kendo-grid-column field="writeOffFlg" title="Write Off"></kendo-grid-column>
</kendo-grid>`;
  readonly agGridSnippet = `<ag-grid-angular
  class="ag-theme-quartz grid"
  [columnDefs]="columnDefs"
  [rowData]="rowData"
  [defaultColDef]="defaultColDef"
  [gridOptions]="gridOptions"
  [pagination]="true"
  [paginationPageSize]="10"
  [paginationPageSizeSelector]="pageSizeOptions"
  (gridReady)="onGridReady($event)"
  [overlayNoRowsTemplate]="gridMode ? 'No data returned from the API.' : 'Click Normal or Editable to load data.'"
  [overlayLoadingTemplate]="loadingTemplate"
></ag-grid-angular>`;
  readonly dataBindingTitle = 'Data Binding';
  readonly dataBindingDescription =
    'Kendo Grid typically binds data through the data input, while AG Grid uses rowData. This section shows the main grid binding used in the preview.';
  readonly kendoDataBindingSnippet = `data: AssetRow[] = [];`;
  readonly agGridDataBindingSnippet = `<ag-grid-angular
  [rowData]="rowData"
  [columnDefs]="columnDefs"
  [defaultColDef]="defaultColDef"
  [gridOptions]="gridOptions"
></ag-grid-angular>

rowData: AssetRow[] = [];`;
  readonly sortingTitle = 'Sorting';
  readonly sortingDescription =
    'Single sort applies one column at a time. Multi sort lets the user combine multiple columns. Kendo supports both behaviors through its sortable configuration, and AG Grid supports them through sortable columns and the multi-sort key.';
  readonly kendoSortingSnippet = `kendoSortMode: 'single' | 'multiple' = 'single';

onKendoSortChange(sort: { field?: string; dir?: 'asc' | 'desc' | null }): void {
  console.log('[Kendo sort change]', sort);
}`;
  readonly agGridSortingSnippet = `readonly gridOptions: GridOptions = {
  suppressCellFocus: false,
  onSortChanged: (event) => this.onAgGridSortChange(event)
};

onAgGridSortChange(event: SortChangedEvent<AssetRow>): void {
  const activeSorts = event.api
    .getColumnState()
    .filter((column) => column.sort)
    .map((column) => ({
      colId: column.colId,
      sort: column.sort as SortDirection
    }));

  console.log('[AG Grid sort change]', activeSorts);
}`;
  readonly inputsTitle = 'Inputs';
  readonly inputsDescription =
    'This section compares textbox controls first, then numeric inputs, across Kendo, PrimeNG, and Angular Material using live component values.';
  readonly dialogTitle = 'Dialog';
  readonly dialogDescription =
    'This section compares a basic confirmation dialog implementation across Kendo, PrimeNG, and Angular Material.';
  readonly tabstripTitle = 'Kendo TabStrip';
  readonly tabstripDescription =
    'This section compares a basic tabstrip layout across Kendo, PrimeNG, and Angular Material.';
  readonly buttonsTitle = 'Buttons';
  readonly buttonsDescription =
    'This section compares a basic button set across Kendo, PrimeNG, and Angular Material.';
  readonly menuTitle = 'Menu';
  readonly menuDescription =
    'This section compares a basic menu pattern across Kendo, PrimeNG, and Angular Material.';
  readonly accordionTitle = 'Accordion';
  readonly accordionDescription =
    'This section compares a basic accordion layout across Kendo, PrimeNG, and Angular Material.';
  readonly qrBarcodeTitle = 'QR Code / Barcode';
  readonly qrBarcodeDescription =
    'This section compares QR code and barcode rendering across Kendo, PrimeNG, and Angular Material.';
  readonly tooltipTitle = 'Tooltip';
  readonly tooltipDescription =
    'This section compares tooltip usage across Kendo, PrimeNG, and Angular Material.';
  readonly kendoTextboxSnippet = `<kendo-textbox
  [value]="searchText"
  (valueChange)="searchText = $event"
></kendo-textbox>`;
  readonly primeNgTextboxSnippet = `<input
  pInputText
  type="text"
  [ngModel]="searchText"
  (ngModelChange)="searchText = $event"
  placeholder="Search..."
/>`;
  readonly materialTextboxSnippet = `<mat-form-field appearance="outline">
  <mat-label>Search</mat-label>
  <input
    matInput
    type="text"
    [value]="searchText"
    (input)="searchText = $any($event.target).value"
    placeholder="Search..."
  />
</mat-form-field>`;
  readonly kendoNumberSnippet = `<kendo-numerictextbox
  [value]="amount"
  [min]="0"
  [max]="100000"
  [step]="1"
  (valueChange)="amount = $event ?? 0"
></kendo-numerictextbox>`;
  readonly primeNgNumberSnippet = `<input
  pInputText
  type="number"
  [ngModel]="amount"
  (ngModelChange)="amount = $event ?? 0"
  placeholder="Enter amount"
/>`;
  readonly materialNumberSnippet = `<mat-form-field appearance="outline">
  <mat-label>Amount</mat-label>
  <input
    matInput
    type="number"
    [value]="amount"
    (input)="amount = $any($event.target).valueAsNumber || 0"
    placeholder="Enter amount"
  />
</mat-form-field>`;
  readonly kendoDatepickerSnippet = `<kendo-datepicker
  [value]="selectedDate"
  (valueChange)="selectedDate = $event ?? selectedDate"
></kendo-datepicker>`;
  readonly primeNgDatepickerSnippet = `<p-calendar
  [ngModel]="selectedDate"
  (ngModelChange)="selectedDate = $event ?? selectedDate"
  dateFormat="yy-mm-dd"
></p-calendar>`;
  readonly materialDatepickerSnippet = `<mat-form-field appearance="outline">
  <mat-label>Selected date</mat-label>
  <input
    matInput
    [matDatepicker]="picker"
    [value]="selectedDate"
    (dateChange)="selectedDate = $event.value ?? selectedDate"
  />
  <mat-datepicker #picker></mat-datepicker>
</mat-form-field>`;
  readonly kendoComboboxSnippet = `<kendo-combobox
  [data]="comboOptions"
  [value]="selectedOption"
  (valueChange)="selectedOption = $event ?? selectedOption"
></kendo-combobox>`;
  readonly primeNgComboboxSnippet = `<p-dropdown
  [options]="comboOptions"
  [ngModel]="selectedOption"
  (ngModelChange)="selectedOption = $event ?? selectedOption"
  placeholder="Select option"
></p-dropdown>`;
  readonly materialComboboxSnippet = `<mat-form-field appearance="outline">
  <mat-label>Option</mat-label>
  <mat-select [value]="selectedOption" (valueChange)="selectedOption = $event">
    <mat-option *ngFor="let option of comboOptions" [value]="option">
      {{ option }}
    </mat-option>
  </mat-select>
</mat-form-field>`;
  readonly kendoMultiSelectSnippet = `<kendo-multiselect
  [data]="multiOptions"
  [value]="selectedMultiOptions"
  (valueChange)="selectedMultiOptions = $event ?? selectedMultiOptions"
></kendo-multiselect>`;
  readonly primeNgMultiSelectSnippet = `<p-multiSelect
  [options]="multiOptions"
  [ngModel]="selectedMultiOptions"
  (ngModelChange)="selectedMultiOptions = $event ?? selectedMultiOptions"
  placeholder="Select values"
></p-multiSelect>`;
  readonly materialMultiSelectSnippet = `<mat-form-field appearance="outline">
  <mat-label>Options</mat-label>
  <mat-select [value]="selectedMultiOptions" multiple (valueChange)="selectedMultiOptions = $event">
    <mat-option *ngFor="let option of multiOptions" [value]="option">
      {{ option }}
    </mat-option>
  </mat-select>
</mat-form-field>`;
  readonly kendoDropdownListSnippet = `<kendo-dropdownlist
  [data]="comboOptions"
  [value]="selectedOption"
  (valueChange)="selectedOption = $event ?? selectedOption"
></kendo-dropdownlist>`;
  readonly primeNgDropdownListSnippet = `<p-dropdown
  [options]="comboOptions"
  [ngModel]="selectedOption"
  (ngModelChange)="selectedOption = $event ?? selectedOption"
  placeholder="Select option"
></p-dropdown>`;
  readonly materialDropdownListSnippet = `<mat-form-field appearance="outline">
  <mat-label>Option</mat-label>
  <mat-select [value]="selectedOption" (valueChange)="selectedOption = $event">
    <mat-option *ngFor="let option of comboOptions" [value]="option">
      {{ option }}
    </mat-option>
  </mat-select>
</mat-form-field>`;
  readonly kendoDialogSnippet = `<button kendoButton (click)="dialogOpened = true">
  Open dialog
</button>

<kendo-dialog *ngIf="dialogOpened" title="Confirm action" (close)="dialogOpened = false">
  <p>Are you sure you want to continue?</p>
  <kendo-dialog-actions>
    <button kendoButton (click)="dialogOpened = false">Cancel</button>
    <button kendoButton themeColor="primary" (click)="dialogOpened = false">Confirm</button>
  </kendo-dialog-actions>
</kendo-dialog>`;
  readonly primeNgDialogSnippet = `<button pButton type="button" label="Open dialog" (click)="dialogOpened = true"></button>

<p-dialog
  header="Confirm action"
  [(visible)]="dialogOpened"
  [modal]="true"
  [closable]="true"
>
  <p>Are you sure you want to continue?</p>
  <ng-template pTemplate="footer">
    <button pButton type="button" label="Cancel" (click)="dialogOpened = false"></button>
    <button pButton type="button" label="Confirm" (click)="dialogOpened = false"></button>
  </ng-template>
</p-dialog>`;
  readonly materialDialogSnippet = `<button mat-raised-button color="primary" (click)="dialogOpened = true">
  Open dialog
</button>

<mat-dialog-content>Are you sure you want to continue?</mat-dialog-content>
<mat-dialog-actions align="end">
  <button mat-button>Cancel</button>
  <button mat-flat-button color="primary">Confirm</button>
</mat-dialog-actions>`;
  readonly kendoTabstripSnippet = `<kendo-tabstrip>
  <kendo-tabstrip-tab title="Overview" [selected]="true">
    <ng-template kendoTabContent>
      <p>Overview content goes here.</p>
    </ng-template>
  </kendo-tabstrip-tab>
  <kendo-tabstrip-tab title="Details">
    <ng-template kendoTabContent>
      <p>Details content goes here.</p>
    </ng-template>
  </kendo-tabstrip-tab>
</kendo-tabstrip>`;
  readonly primeNgTabstripSnippet = `<p-tabView>
  <p-tabPanel header="Overview">
    <p>Overview content goes here.</p>
  </p-tabPanel>
  <p-tabPanel header="Details">
    <p>Details content goes here.</p>
  </p-tabPanel>
</p-tabView>`;
  readonly materialTabstripSnippet = `<mat-tab-group>
  <mat-tab label="Overview">
    <p>Overview content goes here.</p>
  </mat-tab>
  <mat-tab label="Details">
    <p>Details content goes here.</p>
  </mat-tab>
</mat-tab-group>`;
  readonly kendoButtonSnippet = `<button kendoButton themeColor="primary">Primary</button>
<button kendoButton themeColor="base">Secondary</button>
<button kendoButton [disabled]="true">Disabled</button>
<button kendoButton themeColor="primary" class="is-active">Active</button>`;
  readonly primeNgButtonSnippet = `<button pButton type="button" label="Primary"></button>
<button pButton type="button" label="Secondary" class="p-button-secondary"></button>
<button pButton type="button" label="Disabled" [disabled]="true"></button>
<button pButton type="button" label="Active" class="is-active"></button>`;
  readonly materialButtonSnippet = `<button mat-raised-button color="primary">Primary</button>
<button mat-stroked-button>Secondary</button>
<button mat-button disabled>Disabled</button>
<button mat-flat-button color="primary" class="is-active">Active</button>`;
  readonly kendoMenuSnippet = `<kendo-menu [items]="menuItems"></kendo-menu>`;
  readonly primeNgMenuSnippet = `<p-tieredMenu [model]="menuItems"></p-tieredMenu>`;
  readonly materialMenuSnippet = `<mat-nav-list>
  <a mat-list-item *ngFor="let item of menuItems">{{ item.label }}</a>
</mat-nav-list>`;
  readonly kendoAccordionSnippet = `<kendo-accordion>
  <kendo-accordion-item title="Section 1">
    <ng-template kendoAccordionContent>
      <p>Accordion content goes here.</p>
    </ng-template>
  </kendo-accordion-item>
  <kendo-accordion-item title="Section 2">
    <ng-template kendoAccordionContent>
      <p>Accordion content goes here.</p>
    </ng-template>
  </kendo-accordion-item>
</kendo-accordion>`;
  readonly primeNgAccordionSnippet = `<p-accordion>
  <p-accordionTab header="Section 1">
    <p>Accordion content goes here.</p>
  </p-accordionTab>
  <p-accordionTab header="Section 2">
    <p>Accordion content goes here.</p>
  </p-accordionTab>
</p-accordion>`;
  readonly materialAccordionSnippet = `<mat-accordion>
  <mat-expansion-panel>
    <mat-expansion-panel-header>Section 1</mat-expansion-panel-header>
    <p>Accordion content goes here.</p>
  </mat-expansion-panel>
  <mat-expansion-panel>
    <mat-expansion-panel-header>Section 2</mat-expansion-panel-header>
    <p>Accordion content goes here.</p>
  </mat-expansion-panel>
</mat-accordion>`;
  readonly kendoQrBarcodeSnippet = `<kendo-qrcode [value]="qrValue"></kendo-qrcode>
<kendo-barcode [value]="barcodeValue"></kendo-barcode>`;
  readonly primeNgQrBarcodeSnippet = `<div class="qr-preview">
  <p>QR code placeholder for {{ qrValue }}</p>
  <p>Barcode placeholder for {{ barcodeValue }}</p>
</div>`;
  readonly materialQrBarcodeSnippet = `<div class="qr-preview">
  <p>QR code placeholder for {{ qrValue }}</p>
  <p>Barcode placeholder for {{ barcodeValue }}</p>
</div>`;
  readonly kendoTooltipSnippet = `<button kendoButton [title]="tooltipText">Hover me</button>`;
  readonly primeNgTooltipSnippet = `<button pButton type="button" label="Hover me" pTooltip="Helpful tooltip"></button>`;
  readonly materialTooltipSnippet = `<button mat-raised-button matTooltip="Helpful tooltip">Hover me</button>`;
  readonly qrValue = 'https://example.com';
  readonly barcodeValue = '123456789012';
  readonly tooltipText = 'Helpful tooltip';
  readonly menuItems = [
    { label: 'Dashboard' },
    { label: 'Reports' },
    { label: 'Settings' }
  ];
  readonly kendoCheckboxSnippet = `<kendo-checkbox
  [checked]="isChecked"
  (checkedChange)="isChecked = $event"
></kendo-checkbox>`;
  readonly primeNgCheckboxSnippet = `<p-checkbox
  [binary]="true"
  [(ngModel)]="isChecked"
></p-checkbox>`;
  readonly materialCheckboxSnippet = `<mat-checkbox [(ngModel)]="isChecked">
  Accept
</mat-checkbox>`;
  readonly kendoRadioSnippet = `<kendo-radiogroup
  [data]="radioOptions"
  [value]="selectedRadio"
  (valueChange)="selectedRadio = $event"
></kendo-radiogroup>`;
  readonly primeNgRadioSnippet = `<div class="p-field-radiobutton">
  <p-radioButton
    *ngFor="let option of radioOptions"
    name="group"
    [value]="option"
    [(ngModel)]="selectedRadio"
  ></p-radioButton>
</div>`;
  readonly materialRadioSnippet = `<mat-radio-group [(ngModel)]="selectedRadio">
  <mat-radio-button *ngFor="let option of radioOptions" [value]="option">
    {{ option }}
  </mat-radio-button>
</mat-radio-group>`;
  readonly kendoSwitchSnippet = `<kendo-switch
  [checked]="isEnabled"
  (checkedChange)="isEnabled = $event"
></kendo-switch>`;
  readonly primeNgSwitchSnippet = `<p-inputSwitch [(ngModel)]="isEnabled"></p-inputSwitch>`;
  readonly materialSwitchSnippet = `<mat-slide-toggle [(ngModel)]="isEnabled">
  Enabled
</mat-slide-toggle>`;
  searchText = 'Asset search';
  amount = 100;
  selectedDate = new Date();
  readonly comboOptions = ['Alpha', 'Beta', 'Gamma'];
  selectedOption = 'Alpha';
  readonly multiOptions = ['Alpha', 'Beta', 'Gamma', 'Delta'];
  selectedMultiOptions = ['Alpha', 'Gamma'];
  isChecked = true;
  readonly radioOptions = ['Option 1', 'Option 2', 'Option 3'];
  selectedRadio = 'Option 1';
  isEnabled = true;
  dialogOpened = false;
  private authToken =
    'Bearer eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJoZW1hbnRoQGxldmFudGFyZS5jby5pbiIsIm9yaWdpbiI6IndlYiIsImtleSI6IkNTQSIsImlhdCI6MTc3NTg0MjU2NiwiZXhwIjoxNzc1ODQ0MzY2fQ.tJVkzKAavibtKbkqRMLQobkxpbIuCs2A3LEHOSZ7dmJ-AZfW8lXyBQpjfxpL6HlUih-wAmqbcGeXcqqXVw_K0oTdXcUNipE63Af39pndBmNMTExOrcCgLYagR7ublCOPfaBUwplJ8SfLbX81Q4sskqwB-bRYpXy2o5HeQ0z61glc4dWLAYeNEb1KE8SY6Z1kzUk8veT2RtQHWf2Ny37PAmkzGxm0qkxPoDH7JJIuBA0K8y5Zs0omnt8boM3VgSCrV9xYGFY-U1-czDxDGJNFSixPJ-raM4UTqija4nd1XWlAFjBkH_lg0FS7uSdd1KYUPmd9ymAZbUzMJgKxWMlYOQ';

  readonly title = 'angular-kendo-grid-performance-lab';
  readonly apiUrl = '/api/criteria/v1/getassetlistbycriteriacustom?page=0&size=10000';
  readonly refreshTokenUrl = '/api/sec/v1/refreshtoken';
  readonly requestBody = {
    assetCriteria: {
      compCd: 'TCL',
      branchCd: 'BLR',
      amgroupCd: ['ADM'],
      atypeCd: [],
      deptCd: [],
      locationCd: [],
      manfCd: [],
      vendorCd: [],
      custodianCd: [],
      orgCostSymbol: 1,
      orgCost: null,
      fOrgcost: null,
      tOrgcost: null,
      instDateSymbol: 1,
      instDt: null,
      fInstdt: null,
      tInstdt: null,
      efeprDtSymbol: 1,
      effDeprDt: null,
      fEfeprdt: null,
      tEfeprdt: null,
      dispose: false,
      transfer: false,
      checkAmgroupCd: 1,
      assetClassifyFlg: ['M', 'W', 'C'],
      assetStatusModel: {
        liveAssets: true,
        scrappedAssets: true,
        disposedAssets: true,
        assetUnderTransaction: true
      },
      switch: false
    },
    assetCustomCriteria: [],
    screenCd: 'fafam001'
  };
  readonly tenantId =
    'eyJhbGciOiJIUzI1NiJ9.eyJjb21wIjoiQ29tMSIsImNvblVSTCI6ImpkYmM6cG9zdGdyZXNxbDovL2RldmRiLnNtYXJ0YXNzZXRzcHJvLmNvbS9jc2FzbWFsbDAxP2N1cnJlbnRzY2hlbWE9YzAwMDQwMiIsImNyZWF0ZWQiOjAsImNzYWthZGF2dWt1IjoiYVAkNk5AaTEiLCJlZGl0aW9uIjoibGl0ZSIsImNzYXB5YW5hbGlrdSI6ImMwMDA0MDIifQ.qFh5vjHzRDNkT02nqvN2C2Ug-zSZSJK92_tppXGOm6Q';

  readonly columnDefs: ColDef<AssetRow>[] = [
    {
      field: 'assetLogoPath',
      headerName: '',
      width: 72,
      pinned: 'left',
      suppressMovable: true,
      sortable: false,
      filter: false,
      resizable: false,
      cellRenderer: AssetLogoCellRendererComponent
    },
    {
      field: 'assetCd',
      headerName: 'Asset Code',
      minWidth: 140,
      pinned: 'left',
      suppressMovable: true
    },
    {
      field: 'assetName',
      headerName: 'Asset Name',
      minWidth: 180,
      flex: 1,
      pinned: 'left',
      suppressMovable: true
    },
    {
      field: 'originalCost',
      headerName: 'Original Cost',
      type: 'numericColumn',
      minWidth: 140,
      filter: OriginalCostStepperFilterComponent,
      floatingFilter: false,
      cellClass: 'ag-right-aligned-cell',
      headerClass: 'ag-right-aligned-header',
      valueFormatter: (params) => this.formatCurrencyValue(params.value)
    },
    {
      field: 'installationDt',
      headerName: 'Installation Date',
      minWidth: 170,
      filter: 'agDateColumnFilter',
      filterParams: {
        comparator: this.compareDateFilter
      },
      cellRenderer: (params: ICellRendererParams<AssetRow>) => this.renderDateCell(params.value, params.data),
      valueFormatter: (params) => this.formatDateValue(params.value)
    },
    {
      field: 'writeOffFlg',
      headerName: 'writeoffFlg',
      minWidth: 120,
      valueFormatter: (params) => this.formatWriteOffValue(params.value)
    },
    { field: 'locationCd', headerName: 'Location', minWidth: 140 },
    { field: 'assetBranchName', headerName: 'Branch Name', minWidth: 160, flex: 1 }
    ];
  readonly editableColumnDefs: ColDef<AssetRow>[] = this.columnDefs.map((column) => ({
    ...column,
    editable:
      column.field === 'assetCd' ||
      column.field === 'assetName' ||
      column.field === 'originalCost' ||
      column.field === 'installationDt',
    cellEditor:
      column.field === 'originalCost'
        ? 'agNumberCellEditor'
        : column.field === 'installationDt'
          ? 'agDateStringCellEditor'
          : column.field === 'assetCd' || column.field === 'assetName'
            ? 'agTextCellEditor'
            : undefined,
    filter: false,
    floatingFilter: false,
    sortable: false,
    resizable: false,
    autoHeight: column.field === 'installationDt',
    wrapText: column.field === 'installationDt',
    cellClassRules: {
      'editable-cell': (params) =>
        params.colDef.field === 'assetCd' ||
        params.colDef.field === 'assetName' ||
        params.colDef.field === 'originalCost' ||
        params.colDef.field === 'installationDt',
      'future-date-cell': (params) =>
        params.colDef.field === 'installationDt' && this.isFutureDate(params.value),
      'invalid-date-cell': (params) =>
        params.colDef.field === 'installationDt' &&
        this.getEditableValidationError(params.data, 'installationDt') !== ''
    }
  }));
  rowData: AssetRow[] = [];
  editableRowData: AssetRow[] = [];
  loading = true;
  errorMessage = '';

  readonly defaultColDef: ColDef = {
    resizable: true,
    sortable: true,
    filter: true,
    floatingFilter: true
  };

  readonly gridOptions: GridOptions = {
    suppressCellFocus: false,
    onSortChanged: (event) => this.onAgGridSortChange(event)
  };

  readonly editableColDef: ColDef = {
    editable: true,
    cellEditor: 'agTextCellEditor',
    resizable: false,
    sortable: false,
    filter: false,
    floatingFilter: false
  };

  readonly editableGridOptions: GridOptions = {
    suppressCellFocus: false,
    singleClickEdit: true,
    stopEditingWhenCellsLoseFocus: true,
    suppressMovableColumns: true,
    suppressDragLeaveHidesColumns: true,
    suppressRowClickSelection: true,
    rowSelection: 'single',
    domLayout: 'normal'
  };
  readonly loadingTemplate = `
    <span class="grid-loading">
      <span class="grid-spinner" aria-hidden="true"></span>
      <span>Loading asset data...</span>
    </span>
  `;

  ngOnInit(): void {
    this.logRuntimeBundleSize();
  }

  onGridReady(event: GridReadyEvent<AssetRow>): void {
    if (this.showEditableGrid) {
      this.editableGridApi = event.api;
      return;
    }

    this.gridApi = event.api;
    this.syncGridLoadingState();
  }

  onEditableCellValueChanged(event: CellValueChangedEvent<AssetRow>): void {
    if (event.colDef.field !== 'installationDt') {
      return;
    }

    if (!this.isFutureDate(event.newValue)) {
      this.clearEditableValidationError(event.data, 'installationDt');
      event.api.refreshCells({
        rowNodes: [event.node],
        columns: ['installationDt'],
        force: true
      });
      return;
    }

    this.setEditableValidationError(event.data, 'installationDt', 'Should not allow future date');
    event.api.refreshCells({
      rowNodes: [event.node],
      columns: ['installationDt'],
      force: true
    });
  }

  onKendoSortChange(sort: { field?: string; dir?: 'asc' | 'desc' | null }): void {
    console.log('[Kendo sort change]', sort);
  }

  onAgGridSortChange(event: SortChangedEvent<AssetRow>): void {
    const activeSorts = event.api
      .getColumnState()
      .filter((column) => column.sort)
      .map((column) => ({
        colId: column.colId,
        sort: column.sort
      }));

    console.log('[AG Grid sort change]', activeSorts);
  }

  loadNormalGrid(): void {
    this.gridMode = 'normal';
    this.showEditableGrid = false;
    this.loadWriteOffMap();
  }

  loadEditableGrid(): void {
    this.gridMode = 'editable';
    this.showEditableGrid = true;
    this.loadWriteOffMap();
  }

  loadDocumentation(): void {
    this.gridMode = 'documentation';
    this.showEditableGrid = false;
    this.documentationView = 'grid';
  }

  setDocumentationView(view: 'grid' | 'inputs' | 'dialog' | 'tabstrip' | 'buttons' | 'menu' | 'accordion' | 'qrbarcode' | 'tooltip'): void {
    this.documentationView = view;
  }

  saveEditableGrid(): void {
    const updatedRows = this.editableRowData.map((row) => ({ ...row }));
    console.log('[Editable grid save]', updatedRows);
  }

  private loadAssetsWithRetry(): void {
    this.loading = true;
    this.errorMessage = '';

    this.http
      .post<AssetApiResponse | AssetRow[]>(this.apiUrl, this.requestBody, {
        headers: this.buildHeaders()
      })
      .subscribe({
      next: (response) => {
          const normalizedRows = this.normalizeRows(this.extractRows(response));
          this.rowData = normalizedRows;
          this.editableRowData = normalizedRows.map((row) => this.prepareEditableRow(row));
          this.captureEditableSnapshots(this.editableRowData);
          console.log(this.rowData[0]);
          this.loading = false;
          this.syncGridLoadingState();
        },
        error: (error) => {
          if (error?.status === 401) {
            this.refreshAuthToken().subscribe({
              next: (token) => {
                this.authToken = token;
                this.http
                  .post<AssetApiResponse | AssetRow[]>(this.apiUrl, this.requestBody, {
                    headers: this.buildHeaders()
                  })
                  .subscribe({
                    next: (response) => {
                      const normalizedRows = this.normalizeRows(this.extractRows(response));
                      this.rowData = normalizedRows;
                      this.editableRowData = normalizedRows.map((row) => this.prepareEditableRow(row));
                      this.captureEditableSnapshots(this.editableRowData);
                      console.log(this.rowData[0]);
                      this.loading = false;
                      this.syncGridLoadingState();
                    },
                    error: (retryError) => {
                      this.loading = false;
                      this.syncGridLoadingState();
                      this.errorMessage = retryError?.message ?? 'Failed to load grid data.';
                    }
                  });
                return;
              },
              error: (refreshError) => {
                this.loading = false;
                this.syncGridLoadingState();
                this.errorMessage = refreshError?.message ?? 'Token refresh failed.';
              }
            });
            return;
          }

          this.loading = false;
          this.syncGridLoadingState();
          this.errorMessage = error?.message ?? 'Failed to load grid data.';
        }
      });
  }

  private refreshAuthToken(): Observable<string> {
    const body = {
      userCd: 'ADMIN',
      loginEmail: 'gunalan@levantare.co.in'
    };

    return this.http
      .post<{ authtoken?: string }>(this.refreshTokenUrl, body, {
        headers: new HttpHeaders({
          'content-type': 'application/json',
          usercd: 'ADMIN',
          'x-authroziation': this.authToken,
          'x-tenantid': this.tenantId
        })
      })
      .pipe(
        map((response) => {
          const token = response?.authtoken?.trim();
          if (!token) {
            throw new Error('Token refresh did not return an auth token.');
          }

          return token;
        })
      );
  }

  private buildHeaders(): HttpHeaders {
    return new HttpHeaders({
      usercd: 'ADMIN',
      'x-authorization': this.authToken,
      'x-authroziation': this.authToken,
      'x-tenantid': this.tenantId
    });
  }

  private loadWriteOffMap(): void {
    this.http.get<WriteOffMap>('assets/writeoff-map.json').subscribe({
      next: (map) => {
        for (const value of map.yesValues ?? ['T']) {
          this.writeOffYesValues.add(value);
        }

        this.loadAssetsWithRetry();
      },
      error: () => {
        this.writeOffYesValues.add('T');
        this.loadAssetsWithRetry();
      }
    });
  }

  private syncGridLoadingState(): void {
    if (!this.gridApi) {
      return;
    }

    if (this.loading) {
      this.gridApi.showLoadingOverlay();
      return;
    }

    if (this.errorMessage) {
      this.gridApi.showNoRowsOverlay();
      return;
    }

    if (this.rowData.length === 0) {
      this.gridApi.showNoRowsOverlay();
      return;
    }

    this.gridApi.hideOverlay();
  }

  private extractRows(response: AssetApiResponse | AssetRow[]): AssetRow[] {
    if (Array.isArray(response)) {
      return response;
    }

    const candidates = [
      response?.data,
      response?.content,
      response?.items,
      response?.result,
      response?.list,
      response?.records,
      response?.assetList
    ];

    const match = candidates.find((value) => Array.isArray(value));
    return Array.isArray(match) ? match : [];
  }

  private normalizeRows(rows: AssetRow[]): AssetRow[] {
    const fields: AssetField[] = [
      'assetLogoPath',
      'assetCd',
      'assetName',
      'originalCost',
      'installationDt',
      'writeOffFlg',
      'locationCd',
      'assetBranchName'
    ];

    return rows.map((row) =>
      fields.reduce<AssetRow>((normalized, field) => {
        if (field === 'writeOffFlg') {
          normalized[field] = this.formatWriteOffValue(row[field]);
          return normalized;
        }

        if (field === 'assetLogoPath') {
          normalized[field] = row[field] ?? '';
          return normalized;
        }

        normalized[field] = row[field] ?? null;
        return normalized;
      }, {})
    );
  }

  private formatWriteOffValue(value: unknown): string {
    if (value == null) {
      return 'No';
    }

    const normalized = String(value).trim();
    if (normalized === '') {
      return 'No';
    }

    return this.writeOffYesValues.has(normalized) || normalized.length > 0 ? 'Yes' : 'No';
  }

  private compareDateFilter(filterLocalDateAtMidnight: Date, cellValue: unknown): number {
    if (!cellValue) {
      return -1;
    }

    const parsed = new Date(String(cellValue));
    if (Number.isNaN(parsed.getTime())) {
      return -1;
    }

    const cellDate = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());

    if (cellDate < filterLocalDateAtMidnight) {
      return -1;
    }
    if (cellDate > filterLocalDateAtMidnight) {
      return 1;
    }
    return 0;
  }

  private formatDateValue(value: unknown): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return String(value);
    }

    return parsed.toLocaleDateString();
  }

  private prepareEditableRow(row: AssetRow): AssetRow {
    return {
      ...row,
      installationDt: this.formatDateForEditor(row['installationDt'])
    };
  }

  private captureEditableSnapshots(rows: AssetRow[]): void {
    this.editableRowSnapshots.clear();
    for (const row of rows) {
      this.editableRowSnapshots.set(this.getRowKey(row), { ...row });
    }
  }

  private setEditableValidationError(row: AssetRow | undefined, field: string, message: string): void {
    const key = this.getValidationKey(row, field);
    this.editableValidationErrors.set(key, message);
  }

  private clearEditableValidationError(row: AssetRow | undefined, field: string): void {
    const key = this.getValidationKey(row, field);
    this.editableValidationErrors.delete(key);
  }

  private getEditableValidationError(row: AssetRow | undefined, field: string): string {
    return this.editableValidationErrors.get(this.getValidationKey(row, field)) ?? '';
  }

  private getValidationKey(row: AssetRow | undefined, field: string): string {
    return `${this.getRowKey(row)}::${field}`;
  }

  private getRowKey(row: AssetRow | undefined): string {
    if (!row) {
      return '';
    }

    return `${String(row['assetCd'] ?? '')}::${String(row['assetName'] ?? '')}`;
  }

  private isFutureDate(value: unknown): boolean {
    if (!value) {
      return false;
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return false;
    }

    const today = new Date();
    const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const normalizedValue = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    return normalizedValue > normalizedToday;
  }

  private formatDateForEditor(value: unknown): string {
    if (!value) {
      return '';
    }

    const parsed = new Date(String(value));
    if (Number.isNaN(parsed.getTime())) {
      return '';
    }

    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private renderDateCell(value: unknown, row: AssetRow | undefined): string {
    const displayValue = this.isFutureDate(value)
      ? String(value ?? '')
      : this.formatDateValue(value);
    const errorMessage = this.getEditableValidationError(row, 'installationDt');

    return `
      <div class="date-cell-stack">
        <div class="date-cell-value">${displayValue}</div>
        ${errorMessage ? `<div class="date-cell-error">${errorMessage}</div>` : ''}
      </div>
    `;
  }

  private formatCurrencyValue(value: unknown): string {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) {
      return value == null ? '' : String(value);
    }

    return numberValue.toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  private logRuntimeBundleSize(): void {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    const relevant = resources.filter((entry) => {
      const name = entry.name.toLowerCase();
      return name.includes('.js') || name.includes('.css');
    });

    const totalTransferSize = relevant.reduce((sum, entry) => sum + (entry.transferSize || 0), 0);
    const totalEncodedBodySize = relevant.reduce((sum, entry) => sum + (entry.encodedBodySize || 0), 0);

    console.log('[Angular bundle size]', {
      resourceCount: relevant.length,
      transferSize: this.formatBytes(totalTransferSize),
      encodedBodySize: this.formatBytes(totalEncodedBodySize)
    });
  }

  private formatBytes(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let unitIndex = 0;

    while (value >= 1024 && unitIndex < units.length - 1) {
      value /= 1024;
      unitIndex += 1;
    }

    return `${value.toFixed(2)} ${units[unitIndex]}`;
  }

  formatDateInput(value: Date): string {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
