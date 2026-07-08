import { Component } from '@angular/core';
import { AgFilterComponent } from 'ag-grid-angular';
import { IFilterParams } from 'ag-grid-community';

type FilterModel = {
  value: number | null;
} | null;

@Component({
  selector: 'app-original-cost-stepper-filter',
  standalone: true,
  template: `
    <div class="stepper-filter">
      <input
        type="number"
        step="1"
        class="stepper-filter__input"
        [value]="inputValue"
        (input)="onInput($event)"
        placeholder="Filter..."
      />
    </div>
  `,
  styles: [`
    .stepper-filter {
      display: flex;
      align-items: center;
      padding: 6px 0;
    }

    .stepper-filter__input {
      width: 100%;
      min-width: 0;
      padding: 8px 10px;
      border-radius: 10px;
      border: 1px solid rgba(255, 255, 255, 0.14);
      background: rgba(8, 15, 29, 0.92);
      color: #f5f7fb;
      outline: none;
      font-size: 0.9rem;
    }

    .stepper-filter__input:focus {
      border-color: #8fb3ff;
      box-shadow: 0 0 0 2px rgba(143, 179, 255, 0.18);
    }
  `]
})
export class OriginalCostStepperFilterComponent implements AgFilterComponent {
  params!: IFilterParams;
  inputValue: string | null = null;

  agInit(params: IFilterParams): void {
    this.params = params;
    this.inputValue = null;
  }

  afterGuiAttached(): void {
    // Focus the stepper when the filter popup opens.
    queueMicrotask(() => {
      const input = document.querySelector('.stepper-filter__input') as HTMLInputElement | null;
      input?.focus();
      input?.select();
    });
  }

  isFilterActive(): boolean {
    return this.parseValue() !== null;
  }

  doesFilterPass(params: { data: Record<string, unknown> }): boolean {
    const filterValue = this.parseValue();
    if (filterValue === null) {
      return true;
    }

    const cellValue = Number(params.data?.['originalCost']);
    return Number.isFinite(cellValue) && cellValue === filterValue;
  }

  getModel(): FilterModel {
    const filterValue = this.parseValue();
    return filterValue === null ? null : { value: filterValue };
  }

  setModel(model: FilterModel): void {
    this.inputValue = model?.value?.toString() ?? null;
  }

  refresh(): boolean {
    return true;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.inputValue = target.value;
    this.params.filterChangedCallback();
  }

  private parseValue(): number | null {
    if (this.inputValue == null || this.inputValue.trim() === '') {
      return null;
    }

    const value = Number(this.inputValue);
    return Number.isFinite(value) ? value : null;
  }
}
