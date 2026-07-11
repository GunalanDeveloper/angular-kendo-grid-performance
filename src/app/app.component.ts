import { Component, OnInit } from '@angular/core';
import { AssetGridComponent } from './asset-grid/asset-grid.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [AssetGridComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'angular-kendo-grid-performance-lab';

  ngOnInit(): void {
  }
}
