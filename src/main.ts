import { bootstrapApplication } from '@angular/platform-browser';
import {
  ClientSideRowModelModule,
  DateFilterModule,
  ModuleRegistry,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  TextFilterModule
} from 'ag-grid-community';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  DateFilterModule,
  NumberFilterModule,
  PaginationModule,
  RowSelectionModule,
  TextFilterModule
]);

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
