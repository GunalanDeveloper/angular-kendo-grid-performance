import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { ICellRendererAngularComp } from 'ag-grid-angular';
import { ICellRendererParams } from 'ag-grid-community';

type AssetRow = Record<string, unknown>;

@Component({
  selector: 'app-asset-logo-cell-renderer',
  standalone: true,
  imports: [NgIf],
  template: `
    <div class="asset-logo" [style.backgroundColor]="backgroundColor" [style.color]="'#111'">
      <ng-container *ngIf="logoUrl; else initials">
        <img class="asset-logo__img" [src]="logoUrl" [alt]="assetName + ' logo'" />
      </ng-container>
      <ng-template #initials>
        <span class="asset-logo__fallback">{{ fallbackLetter }}</span>
      </ng-template>
    </div>
  `,
  styles: [`
    .asset-logo {
      width: 32px;
      height: 32px;
      border-radius: 999px;
      overflow: hidden;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: rgba(255, 255, 255, 0.08);
      border: 1px solid rgba(255, 255, 255, 0.12);
      color: #f5f7fb;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }

    .asset-logo__img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .asset-logo__fallback {
      line-height: 1;
    }
  `]
})
export class AssetLogoCellRendererComponent implements ICellRendererAngularComp {
  logoUrl = '';
  assetName = '';
  fallbackLetter = '--';
  backgroundColor = '#f5f7fb';

  agInit(params: ICellRendererParams<AssetRow>): void {
    this.assetName = String(params.data?.['assetName'] ?? '');
    this.logoUrl = this.resolveLogoUrl(params.data?.['assetLogoPath']);
    this.fallbackLetter = this.getFallbackLetter(this.assetName);
    this.backgroundColor = this.getPastelColor(this.assetName || this.logoUrl);
  }

  refresh(params: ICellRendererParams<AssetRow>): boolean {
    this.agInit(params);
    return true;
  }

  private resolveLogoUrl(path: unknown): string {
    const value = String(path ?? '').trim();
    return value ? `https://dev.smartassetspro.com/${value.replace(/^\/+/, '')}` : '';
  }

  private getFallbackLetter(name: string): string {
    const letter = name
      .replace(/[^a-zA-Z0-9 ]/g, ' ')
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .find((value) => value.length > 0);

    return letter || '--';
  }

  private getPastelColor(seed: string): string {
    const palette = [
      '#FDE2E4',
      '#E2F0CB',
      '#CDE7F0',
      '#FDEBD0',
      '#E8DFF5',
      '#D9F0D2',
      '#FAD7C8',
      '#D8E2DC'
    ];

    let hash = 0;
    for (let index = 0; index < seed.length; index += 1) {
      hash = (hash << 5) - hash + seed.charCodeAt(index);
      hash |= 0;
    }

    return palette[Math.abs(hash) % palette.length];
  }
}
