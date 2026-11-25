"""Builds raven-color.svg and raven-color-app-icon.svg (v5 color raven, perched on a branch)."""
import math, sys, os

OUT = sys.argv[1]
D = '#120E22'

def unit(a, b):
    dx, dy = b[0] - a[0], b[1] - a[1]
    L = math.hypot(dx, dy)
    return dx / L, dy / L

# ---- legs: hip -> ankle (ankle sits on top of the branch) ----
legs = [((496, 395), (552, 523)), ((566, 392), (662, 517))]

def foot(ax, ay):
    """Toes curl over the branch top and down its front face; returns (toe paths, talon paths)."""
    toes = [
        f'M{ax} {ay} C{ax+18} {ay-6} {ax+34} {ay+2} {ax+32} {ay+20}',   # front toe
        f'M{ax} {ay} C{ax+8} {ay-2} {ax+20} {ay+6} {ax+18} {ay+24}',    # middle toe
        f'M{ax} {ay} C{ax-14} {ay-4} {ax-26} {ay+2} {ax-26} {ay+16}',   # back toe
    ]
    ends = [(ax+32, ay+20, -1), (ax+18, ay+24, -1), (ax-26, ay+16, 1)]
    talons = [f'M{x} {y} Q{x+2*-s} {y+10} {x+8*s} {y+14}' for x, y, s in ends]
    return toes, talons

leg_dark, leg_amber, scales, talon_paths = [], [], [], []
for a, b in legs:
    leg_dark.append(f'<path d="M{a[0]} {a[1]} L{b[0]} {b[1]}" stroke-width="26"/>')
    leg_amber.append(f'<path d="M{a[0]} {a[1]} L{b[0]} {b[1]}" stroke-width="15"/>')
    d = unit(a, b); n = (-d[1], d[0])
    for t in (0.45, 0.62, 0.79):
        cx, cy = a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t
        scales.append(f'<path d="M{cx-n[0]*5:.1f} {cy-n[1]*5:.1f} L{cx+n[0]*5:.1f} {cy+n[1]*5:.1f}"/>')

toe_dark, toe_amber = [], []
for _, (ax, ay) in legs:
    toes, talons = foot(ax, ay)
    toe_dark += [f'<path d="{p}" stroke-width="19"/>' for p in toes]
    toe_amber += [f'<path d="{p}" stroke-width="10"/>' for p in toes]
    talon_paths += [f'<path d="{p}"/>' for p in talons]

J = '\n    '.join

svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="60 20 780 590">
  <defs>
    <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#4A3F78"/>
      <stop offset="0.55" stop-color="#2E2650"/>
      <stop offset="1" stop-color="#1C1733"/>
    </linearGradient>
    <linearGradient id="wing" x1="1" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#B6A6FF"/>
      <stop offset="0.45" stop-color="#9B85FF"/>
      <stop offset="1" stop-color="#5E49C9"/>
    </linearGradient>
    <linearGradient id="amber" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#FFC46B"/>
      <stop offset="0.6" stop-color="#F2A33A"/>
      <stop offset="1" stop-color="#D9781F"/>
    </linearGradient>
    <linearGradient id="wood" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#A8743F"/>
      <stop offset="1" stop-color="#5E3B1E"/>
    </linearGradient>
    <linearGradient id="chest" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6E5FB0" stop-opacity="0.9"/>
      <stop offset="1" stop-color="#6E5FB0" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="iris" cx="0.4" cy="0.45" r="0.6">
      <stop offset="0" stop-color="#FFE9A8"/><stop offset="0.6" stop-color="#FFC24D"/><stop offset="1" stop-color="#E08A1E"/>
    </radialGradient>
    <clipPath id="eyeclip"><path d="M568 94 L640 120 Q630 140 606 139 Q580 134 568 94 Z"/></clipPath>
  </defs>

  <!-- legs (behind body) -->
  <g fill="none" stroke="{D}" stroke-linecap="round">
    {J(leg_dark)}
  </g>
  <g fill="none" stroke="url(#amber)" stroke-linecap="round">
    {J(leg_amber)}
  </g>
  <g stroke="#B5601A" stroke-width="3" stroke-linecap="round">
    {J(scales)}
  </g>

  <!-- body, head and tail -->
  <path fill="url(#body)" stroke="{D}" stroke-width="10" stroke-linejoin="round" d="
    M398 136 C430 126 462 124 492 122
    C505 72 560 42 612 48 C640 52 656 66 668 80
    L640 152
    C690 172 712 232 694 290 C676 346 616 380 545 388
    C500 392 462 398 430 410
    C330 450 200 520 92 576
    L250 452 L148 470 L282 384 L186 362
    C270 296 380 210 455 152 Z"/>

  <!-- chest sheen -->
  <path fill="url(#chest)" d="M640 160 C686 180 700 236 684 288 C668 334 620 362 566 372 C620 330 652 260 640 160 Z"/>

  <!-- thigh feathers -->
  <path fill="#2A2348" stroke="{D}" stroke-width="7" stroke-linejoin="round" d="M470 388 C478 412 490 428 504 432 L500 446 L520 436 L524 452 L540 438 L548 452 L562 432 C574 418 576 402 570 386 Z"/>

  <!-- folded wing: covers the back, primary feathers fan out toward the tail -->
  <path fill="url(#wing)" stroke="{D}" stroke-width="8" stroke-linejoin="round" d="
    M470 176 C550 158 622 216 604 298 C590 360 524 392 446 404
    C390 412 320 424 248 442
    L292 414 L208 422 L272 392 L192 390 L262 364 L206 352
    C300 290 400 222 470 176 Z"/>
  <!-- feather rows -->
  <g fill="none" stroke="#5A46C4" stroke-width="5" stroke-linecap="round" opacity="0.9">
    <path d="M592 268 C562 330 470 372 330 400"/>
    <path d="M540 236 C500 296 420 340 296 376"/>
    <path d="M486 212 C440 262 366 308 270 350"/>
  </g>
  <!-- shoulder coverts (scalloped edge) -->
  <path fill="none" stroke="#5A46C4" stroke-width="5" stroke-linecap="round" opacity="0.9"
    d="M500 196 Q512 214 530 206 Q540 226 560 218 Q566 240 586 236"/>
  <!-- wing highlight -->
  <path fill="#FFFFFF" opacity="0.35" d="M486 186 C540 172 584 200 592 238 C566 212 530 200 494 202 Z"/>

  <!-- branch -->
  <path fill="none" stroke="{D}" stroke-width="14" stroke-linecap="round" d="M716 522 Q744 496 768 470"/>
  <path fill="none" stroke="#8A5A2B" stroke-width="7" stroke-linecap="round" d="M716 522 Q744 496 768 470"/>
  <path fill="url(#wing)" stroke="{D}" stroke-width="6" stroke-linejoin="round"
    d="M766 472 C772 436 800 414 830 410 C826 444 800 468 766 472 Z"/>
  <path fill="none" stroke="#5A46C4" stroke-width="3" stroke-linecap="round" d="M772 466 Q796 440 822 418"/>
  <path fill="url(#amber)" stroke="{D}" stroke-width="6" stroke-linejoin="round"
    d="M744 496 C722 480 716 456 724 436 C744 450 752 474 744 496 Z"/>
  <path fill="url(#wood)" stroke="{D}" stroke-width="8" stroke-linejoin="round"
    d="M410 528 L790 514 Q806 514 806 530 Q806 546 790 546 L410 562 Q394 562 394 545 Q394 528 410 528 Z"/>
  <g fill="none" stroke="#4A2E16" stroke-width="3" stroke-linecap="round" opacity="0.8">
    <path d="M430 548 L500 545"/><path d="M620 536 L700 533"/><path d="M740 541 L776 539"/>
  </g>
  <ellipse cx="398" cy="545" rx="5" ry="13" fill="#C99258" stroke="{D}" stroke-width="4"/>

  <!-- toes gripping the branch -->
  <g fill="none" stroke="{D}" stroke-linecap="round">
    {J(toe_dark)}
  </g>
  <g fill="none" stroke="url(#amber)" stroke-linecap="round">
    {J(toe_amber)}
  </g>
  <g fill="none" stroke="{D}" stroke-width="6" stroke-linecap="round">
    {J(talon_paths)}
  </g>

  <!-- beak -->
  <path fill="url(#amber)" stroke="{D}" stroke-width="8" stroke-linejoin="round" d="
    M664 78 C716 82 768 100 798 138 C804 148 802 160 794 168
    C776 148 734 138 694 146 C672 150 654 154 640 152 Z"/>
  <path fill="none" stroke="#B5601A" stroke-width="5" stroke-linecap="round" d="M648 126 C700 116 748 124 782 146"/>
  <path fill="#FFFFFF" opacity="0.45" d="M676 88 C716 92 752 104 774 124 C744 110 712 102 676 100 Z"/>

  <!-- head highlight -->
  <path fill="#FFFFFF" opacity="0.18" d="M520 78 C548 56 592 50 624 60 C590 62 556 72 530 92 Z"/>

  <!-- eye: almond, top edge cut flat by the brow -->
  <path d="M568 94 L640 120 Q630 140 606 139 Q580 134 568 94 Z" fill="url(#iris)"/>
  <g clip-path="url(#eyeclip)"><circle cx="616" cy="124" r="11" fill="{D}"/></g>
  <circle cx="611" cy="119" r="3.8" fill="#FFFFFF"/>
  <path d="M568 94 L640 120 Q630 140 606 139 Q580 134 568 94 Z" fill="none" stroke="{D}" stroke-width="5" stroke-linejoin="round"/>
  <!-- angry brow -->
  <path fill="url(#amber)" stroke="{D}" stroke-width="5" stroke-linejoin="round" d="M544 70 Q602 82 656 114 L646 128 L566 95 Q552 86 544 70 Z"/>
</svg>
'''
open(os.path.join(OUT, 'raven-color.svg'), 'w', encoding='utf-8').write(svg)

inner = svg[svg.index('>') + 1:svg.rindex('</svg>')]
icon = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">'
        '<defs><radialGradient id="bg" cx="0.35" cy="0.3" r="0.9">'
        '<stop offset="0" stop-color="#3A3160"/><stop offset="1" stop-color="#1A1630"/></radialGradient>'
        '<filter id="glow" x="-20%" y="-20%" width="140%" height="140%">'
        '<feMorphology in="SourceAlpha" operator="dilate" radius="6" result="d"/>'
        '<feGaussianBlur in="d" stdDeviation="8" result="b"/>'
        '<feFlood flood-color="#9B85FF" flood-opacity="0.75"/>'
        '<feComposite in2="b" operator="in" result="g"/>'
        '<feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>'
        '<rect width="1024" height="1024" rx="230" fill="url(#bg)"/>'
        '<g filter="url(#glow)"><svg x="80" y="170" width="864" height="654" viewBox="60 20 780 590">'
        + inner + '</svg></g></svg>')
open(os.path.join(OUT, 'raven-color-app-icon.svg'), 'w', encoding='utf-8').write(icon)
print('ok')
