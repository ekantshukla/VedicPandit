import { Component, Input } from '@angular/core';

/** PanditJi's face: a friendly little bot with a tilak, a shikha-like antenna and a rudraksha bead. Original artwork. */
@Component({
  selector: 'vp-bot-avatar',
  standalone: true,
  template: `
  <svg [attr.width]="size" [attr.height]="size" viewBox="0 0 64 64" aria-hidden="true" [class.blink]="animate">
    <defs>
      <linearGradient id="vpb-g" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#F0B53A"/><stop offset="1" stop-color="#E0851A"/>
      </linearGradient>
    </defs>
    <circle cx="32" cy="32" r="32" fill="#1D1736"/>
    <!-- antenna (shikha) with a bead -->
    <path d="M32 13 V7" stroke="#E3A21A" stroke-width="2.4" stroke-linecap="round"/>
    <circle cx="32" cy="6" r="3.2" fill="#B3122E"/>
    <!-- ears -->
    <rect x="9" y="27" width="5" height="12" rx="2.5" fill="#E3A21A"/>
    <rect x="50" y="27" width="5" height="12" rx="2.5" fill="#E3A21A"/>
    <!-- head -->
    <rect x="13" y="14" width="38" height="36" rx="14" fill="url(#vpb-g)"/>
    <!-- face screen -->
    <rect x="18" y="24" width="28" height="20" rx="9" fill="#FFF8EC"/>
    <!-- tilak: three lines and a dot -->
    <path d="M25.5 18.2 H38.5 M26.5 20.4 H37.5" stroke="#FFF8EC" stroke-width="1.4" stroke-linecap="round"/>
    <circle cx="32" cy="19.3" r="1.6" fill="#B3122E"/>
    <!-- eyes -->
    <g class="eyes" fill="#1D1736"><ellipse cx="26" cy="32" rx="2.6" ry="3"/><ellipse cx="38" cy="32" rx="2.6" ry="3"/></g>
    <!-- smile -->
    <path d="M27 38.2 Q32 42.2 37 38.2" fill="none" stroke="#B3122E" stroke-width="2" stroke-linecap="round"/>
    <!-- rudraksha mala -->
    <path d="M18 52 Q32 60 46 52" fill="none" stroke="#7A3B12" stroke-width="2.6" stroke-dasharray="0.1 4.2" stroke-linecap="round"/>
  </svg>`,
  styles: [`
    :host { display: inline-grid; line-height: 0; }
    svg { display: block; }
    .blink .eyes { transform-origin: 32px 32px; animation: blink 5s infinite; }
    @keyframes blink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(.1); } }
    @media (prefers-reduced-motion: reduce) { .blink .eyes { animation: none; } }
  `],
})
export class BotAvatarComponent {
  @Input() size = 40;
  @Input() animate = false;
}
