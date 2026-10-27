import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent), title: 'Vedic Pandit' },
  { path: 'panchang', loadComponent: () => import('./features/panchang/panchang.component').then(m => m.PanchangPageComponent), title: 'Panchang — Vedic Pandit' },
  { path: 'muhurat', loadComponent: () => import('./features/muhurat/muhurat.component').then(m => m.MuhuratPageComponent), title: 'Muhurat — Vedic Pandit' },
  { path: 'mantra', loadComponent: () => import('./features/mantra/mantra.component').then(m => m.MantraPageComponent), title: 'Mantra — Vedic Pandit' },
  { path: 'mantra/:slug', loadComponent: () => import('./features/mantra/mantra.component').then(m => m.MantraPageComponent), title: 'Mantra — Vedic Pandit' },
  { path: 'granth', loadComponent: () => import('./features/granth/granth-home.component').then(m => m.GranthHomeComponent), title: 'Granth library — Vedic Pandit' },
  { path: 'granth/t/:code', loadComponent: () => import('./features/granth/granth.component').then(m => m.GranthPageComponent), title: 'Gita & Upanishads — Vedic Pandit' },
  { path: 'granth/:code', loadComponent: () => import('./features/granth/granth-reader.component').then(m => m.GranthReaderComponent), title: 'Granth — Vedic Pandit' },
  { path: 'learn/:deity', loadComponent: () => import('./features/learn/deity.component').then(m => m.DeityComponent), title: 'Mantra, Stotra, Chalisa, Aarti — Vedic Pandit' },
  { path: 'learn', loadComponent: () => import('./features/learn/learn.component').then(m => m.LearnComponent), title: 'Learn mantras — Vedic Pandit' },
  { path: 'samagri', loadComponent: () => import('./features/samagri/samagri.component').then(m => m.SamagriComponent), title: 'Puja samagri — Vedic Pandit' },
  { path: 'rashifal', loadComponent: () => import('./features/rashifal/rashifal.component').then(m => m.RashifalComponent), title: 'Rashifal — Vedic Pandit' },
  { path: 'ask', loadComponent: () => import('./features/chat/chat.component').then(m => m.ChatPageComponent), title: 'Ask AI PanditJi — Vedic Pandit' },
  { path: 'dakshina', loadComponent: () => import('./features/dakshina/dakshina.component').then(m => m.DakshinaComponent), title: 'Dakshina — Vedic Pandit' },
  { path: '**', redirectTo: '' },
];
