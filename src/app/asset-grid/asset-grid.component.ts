import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface Asset {
  id: string;
  name: string;
  type: string;
  status: string;
  cost: number;
  purchaseDate: string;
}

@Component({
  selector: 'app-asset-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './asset-grid.component.html',
  styleUrl: './asset-grid.component.css'
})
export class AssetGridComponent {
  assets: Asset[] = [
    { id: 'AST-001', name: 'MacBook Pro 16"', type: 'Laptop', status: 'Active', cost: 2499, purchaseDate: '2023-01-15' },
    { id: 'AST-002', name: 'Dell UltraSharp 27"', type: 'Monitor', status: 'Active', cost: 450, purchaseDate: '2023-02-10' },
    { id: 'AST-003', name: 'Herman Miller Aeron', type: 'Furniture', status: 'Active', cost: 1200, purchaseDate: '2022-11-05' },
    { id: 'AST-004', name: 'Lenovo ThinkPad X1', type: 'Laptop', status: 'Maintenance', cost: 1899, purchaseDate: '2021-08-20' },
    { id: 'AST-005', name: 'Cisco Meraki MR46', type: 'Networking', status: 'Active', cost: 899, purchaseDate: '2022-04-12' },
    { id: 'AST-006', name: 'iPhone 14 Pro', type: 'Mobile', status: 'Active', cost: 999, purchaseDate: '2023-05-01' },
    { id: 'AST-007', name: 'HP LaserJet Pro', type: 'Printer', status: 'Retired', cost: 350, purchaseDate: '2019-10-15' },
    { id: 'AST-008', name: 'Logitech MX Master 3', type: 'Peripheral', status: 'Active', cost: 99, purchaseDate: '2023-06-22' },
    { id: 'AST-009', name: 'Standing Desk Pro', type: 'Furniture', status: 'Active', cost: 650, purchaseDate: '2022-12-01' },
    { id: 'AST-010', name: 'Sony A7IV Camera', type: 'AV Equipment', status: 'Reserved', cost: 2498, purchaseDate: '2023-03-18' }
  ];

  sortColumn: keyof Asset | '' = '';
  sortAscending: boolean = true;

  sort(column: keyof Asset) {
    if (this.sortColumn === column) {
      this.sortAscending = !this.sortAscending;
    } else {
      this.sortColumn = column;
      this.sortAscending = true;
    }

    this.assets.sort((a, b) => {
      const valueA = a[column];
      const valueB = b[column];

      if (valueA < valueB) {
        return this.sortAscending ? -1 : 1;
      }
      if (valueA > valueB) {
        return this.sortAscending ? 1 : -1;
      }
      return 0;
    });
  }
}
