<?php

namespace App\Support;

/**
 * Generates clearly-fictional, studio-style SVG renders for demo products,
 * so the catalogue looks consistent until real product photography exists.
 * Canvas for product images is 1200×1500 (4:5).
 */
class DemoArt
{
    private static int $uid = 0;

    // ---------------------------------------------------------------- public

    /** @param array{color:string, pattern?:string, accent?:string, camera?:string, monogram?:string, view?:string, bg?:string} $o */
    public static function caseImage(array $o): string
    {
        $view = $o['view'] ?? 'front';
        $bg = $o['bg'] ?? 'ivory';
        $id = self::id();
        [$defs, $body] = self::caseGroup($o, $id);
        $transform = match ($view) {
            'angle' => 'translate(40 30) rotate(-11 600 750) scale(.92)',
            'detail' => 'translate(600 760) scale(2.1) translate(-600 -380)',
            default => 'translate(600 750) scale(1.08) translate(-600 -750)',
        };
        $shadow = $view === 'detail' ? '' : self::shadow(600, 1372, 310, $id);

        return self::svg(1200, 1500, self::background(1200, 1500, $bg, $id).$defs, $shadow."<g transform=\"{$transform}\">{$body}</g>");
    }

    public static function powerBankImage(array $o): string
    {
        $id = self::id();
        [$defs, $body] = self::powerBankGroup($o, $id);
        $transform = ($o['view'] ?? 'front') === 'angle' ? 'translate(30 20) rotate(9 600 750) scale(.94)' : '';

        return self::svg(1200, 1500, self::background(1200, 1500, $o['bg'] ?? 'ivory', $id).$defs,
            self::shadow(600, 1240, 270, $id)."<g transform=\"{$transform}\">{$body}</g>");
    }

    /** A case and its matching power bank, composed together. */
    public static function bundleImage(array $case, array $bank, string $bg = 'sand'): string
    {
        $id = self::id();
        [$cd, $cb] = self::caseGroup($case, $id.'c');
        [$pd, $pb] = self::powerBankGroup($bank, $id.'p');

        return self::svg(1200, 1500, self::background(1200, 1500, $bg, $id).$cd.$pd,
            self::shadow(430, 1268, 205, $id).self::shadow(860, 1246, 160, $id)
            ."<g transform=\"translate(-180 40) rotate(-6 600 750) scale(.82)\">{$cb}</g>"
            ."<g transform=\"translate(250 220) rotate(5 600 750) scale(.68)\">{$pb}</g>");
    }

    /**
     * Wide editorial composition (hero / banners). Items are placed by centre x/y, scale and rotation.
     *
     * @param  array<int, array{kind:string, opts:array, x:float, y:float, s:float, r:float}>  $items
     */
    public static function scene(int $w, int $h, string $bg, array $items): string
    {
        $id = self::id();
        $defs = self::background($w, $h, $bg, $id);
        $body = '';
        foreach ($items as $i => $it) {
            [$d, $g] = $it['kind'] === 'bank' ? self::powerBankGroup($it['opts'], "{$id}i{$i}") : self::caseGroup($it['opts'], "{$id}i{$i}");
            $defs .= $d;
            $sh = self::shadow($it["x"] + 10, $it["y"] + ($it["kind"] === "bank" ? 470 : 600) * $it["s"], ($it["kind"] === "bank" ? 250 : 280) * $it["s"], $id);
            $body .= $sh."<g transform=\"translate({$it['x']} {$it['y']}) rotate({$it['r']}) scale({$it['s']}) translate(-600 -750)\">{$g}</g>";
        }

        return self::svg($w, $h, $defs, $body);
    }

    // ------------------------------------------------------------- builders

    /** @return array{0:string,1:string} [defs, body] */
    private static function caseGroup(array $o, string $id): array
    {
        $c = $o['color'];
        $accent = $o['accent'] ?? self::shade($c, -30);
        $pattern = $o['pattern'] ?? 'smooth';
        $pro = ($o['camera'] ?? 'pro') === 'pro';
        $clear = $pattern === 'clear';

        $x = 330; $y = 150; $w = 540; $h = 1160; $r = 96;
        $defs = "<clipPath id=\"{$id}clip\"><rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\"/></clipPath>"
            ."<linearGradient id=\"{$id}sheen\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\">"
            .'<stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".45" stop-color="#fff" stop-opacity="0"/>'
            .'<stop offset="1" stop-color="#000" stop-opacity=".16"/></linearGradient>'
            .self::lensDefs($id);

        $body = '';
        if ($clear) {
            // Phone back visible through a frosted shell.
            $body .= "<rect x=\"".($x + 14).'" y="'.($y + 14).'" width="'.($w - 28).'" height="'.($h - 28).'" rx="84" fill="#C9C6C0"/>';
            $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"#ffffff\" fill-opacity=\".38\" stroke=\"#ffffff\" stroke-opacity=\".9\" stroke-width=\"6\"/>";
        } else {
            $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"{$c}\"/>";
        }

        [$pd, $pb] = self::pattern($pattern, $id, $c, $accent, $o, $x, $y, $w, $h);
        $defs .= $pd;
        $body .= "<g clip-path=\"url(#{$id}clip)\">{$pb}</g>";

        if (! in_array($pattern, ['clear', 'initials', 'floral', 'pearl', 'brush', 'botanical', 'beads', 'dots'], true)) {
            // Subtle magnetic ring, embossed.
            $body .= '<circle cx="600" cy="790" r="150" fill="none" stroke="'.self::shade($c, -14).'" stroke-opacity=".45" stroke-width="3"/>';
        }

        $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"url(#{$id}sheen)\"/>";
        $body .= '<rect x="'.($x + 9).'" y="'.($y + 9).'" width="'.($w - 18).'" height="'.($h - 18).'" rx="88" fill="none" stroke="#fff" stroke-opacity=".18" stroke-width="2"/>';
        $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"none\" stroke=\"".self::shade($c, -28).'" stroke-opacity=".55" stroke-width="3"/>';
        // Side buttons.
        $body .= '<rect x="866" y="420" width="9" height="130" rx="4" fill="'.self::shade($c, -18).'"/>';
        $body .= '<rect x="325" y="360" width="9" height="70" rx="4" fill="'.self::shade($c, -18).'"/>';
        $body .= self::camera($pro, $c, $id, $clear);

        return [$defs, $body];
    }

    private static function powerBankGroup(array $o, string $id): array
    {
        $c = $o['color'];
        $accent = $o['accent'] ?? self::shade($c, -30);
        $pattern = $o['pattern'] ?? 'smooth';
        $x = 350; $y = 330; $w = 500; $h = 800; $r = 82;
        $defs = "<clipPath id=\"{$id}clip\"><rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\"/></clipPath>"
            ."<linearGradient id=\"{$id}sheen\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"1\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\".2\"/>"
            .'<stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/></linearGradient>';

        $body = '<rect x="'.($x + 18).'" y="'.($y + 20).'" width="'.$w.'" height="'.$h.'" rx="'.$r.'" fill="'.self::shade($c, -32).'"/>';
        $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"{$c}\"/>";
        [$pd, $pb] = self::pattern($pattern, $id, $c, $accent, $o, $x, $y, $w, $h);
        $defs .= $pd;
        $body .= "<g clip-path=\"url(#{$id}clip)\">{$pb}</g>";
        $body .= '<circle cx="600" cy="680" r="135" fill="none" stroke="'.self::shade($c, -14).'" stroke-opacity=".5" stroke-width="3"/>';
        $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"url(#{$id}sheen)\"/>";
        $body .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" rx=\"{$r}\" fill=\"none\" stroke=\"".self::shade($c, -28).'" stroke-opacity=".55" stroke-width="3"/>';
        // Charge indicator + USB-C port.
        $led = self::luma($c) > .5 ? '#17181C' : '#FAF7F1';
        for ($i = 0; $i < 4; $i++) {
            $body .= '<circle cx="'.(561 + $i * 26).'" cy="1050" r="5" fill="'.$led.'" fill-opacity="'.($i < 3 ? '.75' : '.2').'"/>';
        }
        $body .= '<rect x="566" y="1123" width="68" height="16" rx="8" fill="#0D0E11" fill-opacity=".8"/>';

        return [$defs, $body];
    }

    // ------------------------------------------------------------- patterns

    private static function pattern(string $p, string $id, string $c, string $a, array $o, int $x, int $y, int $w, int $h): array
    {
        $d = '';
        $b = '';
        $seed = crc32($id) % 1000;
        $rand = self::rng($seed + strlen($p));
        switch ($p) {
            case 'leather':
            case 'stitch':
                $d .= "<filter id=\"{$id}grain\" x=\"0\" y=\"0\" width=\"100%\" height=\"100%\"><feTurbulence type=\"fractalNoise\" baseFrequency=\"1.1\" numOctaves=\"2\" seed=\"{$seed}\"/>"
                    .'<feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 .55 -.2"/></filter>';
                $b .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" filter=\"url(#{$id}grain)\" opacity=\"".(self::luma($c) > .5 ? ".12" : ".3")."\"/>";
                $stitch = self::shade($c, self::luma($c) > .5 ? -22 : 30);
                $b .= '<rect x="'.($x + 26).'" y="'.($y + 26).'" width="'.($w - 52).'" height="'.($h - 52).'" rx="74" fill="none" stroke="'.$stitch.'" stroke-width="3" stroke-dasharray="14 10" opacity=".8"/>';
                if ($p === 'stitch') {
                    for ($i = 1; $i < 9; $i++) {
                        $yy = $y + 450 + $i * 70;
                        $b .= "<line x1=\"".($x + 60)."\" y1=\"{$yy}\" x2=\"".($x + $w - 60)."\" y2=\"{$yy}\" stroke=\"{$a}\" stroke-width=\"3\" stroke-dasharray=\"10 9\" opacity=\".55\"/>";
                    }
                }
                break;
            case 'quilted':
                $line = self::shade($c, -18);
                $d .= "<pattern id=\"{$id}q\" width=\"96\" height=\"96\" patternUnits=\"userSpaceOnUse\" patternTransform=\"rotate(45)\">"
                    ."<rect width=\"96\" height=\"96\" fill=\"none\"/><path d=\"M0 0H96M0 0V96\" stroke=\"{$line}\" stroke-width=\"5\"/>"
                    .'<path d="M0 6H96M6 0V96" stroke="#fff" stroke-opacity=".18" stroke-width="2"/></pattern>';
                $b .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}q)\"/>";
                break;
            case 'ribbed':
                $d .= "<pattern id=\"{$id}r\" width=\"22\" height=\"40\" patternUnits=\"userSpaceOnUse\"><rect width=\"11\" height=\"40\" fill=\"".self::shade($c, -9).'"/>'
                    .'<rect x="11" width="3" height="40" fill="#fff" fill-opacity=".14"/></pattern>';
                $b .= "<rect x=\"{$x}\" y=\"".($y + 470)."\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}r)\"/>";
                break;
            case 'croc':
                $d .= "<pattern id=\"{$id}k\" width=\"78\" height=\"56\" patternUnits=\"userSpaceOnUse\">"
                    .'<rect x="3" y="3" width="72" height="50" rx="20" fill="'.self::shade($c, 6).'" stroke="'.self::shade($c, -25).'" stroke-width="3"/>'
                    .'<rect x="-36" y="31" width="72" height="50" rx="20" fill="none" stroke="'.self::shade($c, -25).'" stroke-width="3"/></pattern>';
                $b .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}k)\"/>";
                break;
            case 'marble':
                for ($i = 0; $i < 9; $i++) {
                    $sx = $x + $rand() * $w; $sy = $y + $rand() * $h;
                    $path = "M{$sx} {$sy}";
                    for ($k = 0; $k < 4; $k++) {
                        $path .= ' q'.round(($rand() - .5) * 260).' '.round($rand() * 140 + 40).' '.round(($rand() - .5) * 220).' '.round($rand() * 200 + 80);
                    }
                    $b .= "<path d=\"{$path}\" fill=\"none\" stroke=\"{$a}\" stroke-width=\"".round(1.5 + $rand() * 5, 1).'" stroke-opacity="'.round(.18 + $rand() * .35, 2).'" stroke-linecap="round"/>';
                }
                break;
            case 'grid':
                $d .= "<pattern id=\"{$id}g\" width=\"90\" height=\"90\" patternUnits=\"userSpaceOnUse\"><rect width=\"45\" height=\"45\" fill=\"{$a}\"/><rect x=\"45\" y=\"45\" width=\"45\" height=\"45\" fill=\"{$a}\"/></pattern>";
                $b .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}g)\"/>";
                break;
            case 'stripe':
                for ($sx = $x + 40; $sx < $x + $w; $sx += 120) {
                    $b .= "<rect x=\"{$sx}\" y=\"{$y}\" width=\"46\" height=\"{$h}\" fill=\"{$a}\"/>";
                }
                break;
            case 'wave':
                for ($i = 0; $i < 16; $i++) {
                    $yy = $y + 460 + $i * 46;
                    $b .= "<path d=\"M{$x} {$yy} c90 -48 180 48 270 0 s180 -48 270 0\" fill=\"none\" stroke=\"{$a}\" stroke-width=\"4\" stroke-opacity=\".6\"/>";
                }
                break;
            case 'frame':
                $b .= '<rect x="'.($x + 46).'" y="'.($y + 470).'" width="'.($w - 92).'" height="'.($h - 520).'" rx="50" fill="none" stroke="'.$a.'" stroke-width="14"/>';
                $b .= '<rect x="'.($x + 76).'" y="'.($y + 500).'" width="'.($w - 152).'" height="'.($h - 580).'" rx="34" fill="none" stroke="'.$a.'" stroke-width="2" stroke-opacity=".7"/>';
                break;
            case 'floral':
                $palette = [$a, self::shade($a, 35), '#FAF7F1', self::shade($c, -35)];
                for ($i = 0; $i < 11; $i++) {
                    $cx = $x + 70 + $rand() * ($w - 140); $cy = $y + 480 + $rand() * ($h - 560);
                    $s = 26 + $rand() * 26; $col = $palette[$i % count($palette)];
                    $b .= "<g transform=\"translate({$cx} {$cy}) rotate(".round($rand() * 72).')">';
                    for ($k = 0; $k < 5; $k++) {
                        $b .= "<ellipse cx=\"0\" cy=\"-{$s}\" rx=\"".round($s * .55).'" ry="'.round($s * .95)."\" fill=\"{$col}\" fill-opacity=\".92\" stroke=\"".self::shade($col, -25).'" stroke-width="1.5" transform="rotate('.($k * 72).')"/>';
                    }
                    $b .= '<circle r="'.round($s * .38).'" fill="'.self::shade($c, -40).'"/><circle r="'.round($s * .2).'" fill="#FAF7F1"/></g>';
                    $b .= "<path d=\"M{$cx} ".($cy + $s * 1.6).' q'.round(($rand() - .5) * 80).' 60 '.round(($rand() - .5) * 40)." 120\" stroke=\"".self::shade($a, -30).'" stroke-width="3" fill="none" opacity=".6"/>';
                }
                break;
            case 'pearl':
                $d .= "<radialGradient id=\"{$id}pl\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#ffffff\"/><stop offset=\".55\" stop-color=\"#EFE9E0\"/><stop offset=\"1\" stop-color=\"#C9BFB1\"/></radialGradient>";
                // Pearls follow an arc and form a scattered cluster.
                for ($t = 0; $t < 26; $t++) {
                    $ang = M_PI * (0.1 + $t / 25 * 0.8);
                    $cx = 600 + cos($ang) * 230; $cy = 980 - sin($ang) * 200 + 120;
                    $b .= "<circle cx=\"".round($cx).'" cy="'.round($cy)."\" r=\"17\" fill=\"url(#{$id}pl)\" stroke=\"#000\" stroke-opacity=\".08\"/>";
                }
                for ($t = 0; $t < 18; $t++) {
                    $ang = M_PI * (0.15 + $t / 17 * 0.7);
                    $cx = 600 + cos($ang) * 150; $cy = 1100 - sin($ang) * 120 + 120;
                    $b .= "<circle cx=\"".round($cx).'" cy="'.round($cy)."\" r=\"12\" fill=\"url(#{$id}pl)\" stroke=\"#000\" stroke-opacity=\".08\"/>";
                }
                $b .= "<circle cx=\"600\" cy=\"1250\" r=\"24\" fill=\"url(#{$id}pl)\" stroke=\"#000\" stroke-opacity=\".1\"/>";
                break;
            case 'initials':
                $mono = htmlspecialchars(mb_strtoupper(mb_substr($o['monogram'] ?? 'N', 0, 2)), ENT_XML1);
                $b .= '<rect x="'.($x + 150).'" y="'.($y + 600).'" width="'.($w - 300).'" height="300" rx="10" fill="none" stroke="'.$a.'" stroke-width="2"/>';
                $b .= "<text x=\"600\" y=\"".($y + 820)."\" text-anchor=\"middle\" font-family=\"'Cormorant Garamond', Didot, Georgia, serif\" font-style=\"italic\" font-size=\"190\" fill=\"{$a}\">{$mono}</text>";
                break;
            case 'botanical':
                for ($i = 0; $i < 7; $i++) {
                    $bx = $x + 90 + $i * 62; $by = $y + $h - 60;
                    $top = $y + 520 + $rand() * 260;
                    $b .= "<path d=\"M{$bx} {$by} Q".($bx + ($rand() - .5) * 120).' '.(($by + $top) / 2)." {$bx} {$top}\" stroke=\"{$a}\" stroke-width=\"3\" fill=\"none\"/>";
                    for ($k = 0; $k < 4; $k++) {
                        $ly = $top + 60 + $k * 70;
                        $b .= "<ellipse cx=\"".($bx + 16)."\" cy=\"{$ly}\" rx=\"18\" ry=\"7\" fill=\"{$a}\" fill-opacity=\".8\" transform=\"rotate(-30 ".($bx + 16)." {$ly})\"/>";
                    }
                    $b .= "<circle cx=\"{$bx}\" cy=\"{$top}\" r=\"11\" fill=\"".self::shade($a, 45).'"/>';
                }
                break;
            case 'woven':
                $d .= "<pattern id=\"{$id}w\" width=\"60\" height=\"60\" patternUnits=\"userSpaceOnUse\">"
                    .'<rect width="30" height="30" rx="6" fill="'.self::shade($c, -12).'"/><rect x="30" y="30" width="30" height="30" rx="6" fill="'.self::shade($c, -12).'"/>'
                    .'<rect x="30" width="30" height="30" rx="6" fill="'.self::shade($c, 8).'"/><rect y="30" width="30" height="30" rx="6" fill="'.self::shade($c, 8).'"/></pattern>';
                $b .= "<rect x=\"{$x}\" y=\"{$y}\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}w)\"/>";
                break;
            case 'brush':
                $cols = [$a, self::shade($a, 40), '#17181C', self::shade($c, -25)];
                for ($i = 0; $i < 6; $i++) {
                    $sx = $x + $rand() * $w; $sy = $y + 480 + $rand() * 600;
                    $b .= "<path d=\"M{$sx} {$sy} c".round(($rand() - .5) * 300).' '.round(($rand() - .5) * 200).' '.round(($rand() - .5) * 300).' '.round($rand() * 200).' '.round(($rand() - .3) * 360).' '.round(($rand() - .5) * 160).'" fill="none" stroke="'.$cols[$i % 4].'" stroke-width="'.round(18 + $rand() * 34).'" stroke-linecap="round" stroke-opacity=".85"/>';
                }
                break;
            case 'dots':
                $pts = [];
                for ($i = 0; $i < 70; $i++) {
                    $pts[] = [$x + 40 + $rand() * ($w - 80), $y + 440 + $rand() * ($h - 480)];
                    $b .= '<circle cx="'.round($pts[$i][0]).'" cy="'.round($pts[$i][1]).'" r="'.round(2 + $rand() * 5, 1).'" fill="'.$a.'" fill-opacity="'.round(.4 + $rand() * .6, 2).'"/>';
                }
                for ($i = 0; $i < 8; $i++) {
                    [$p1, $p2] = [$pts[$i * 3], $pts[$i * 3 + 1]];
                    $b .= '<line x1="'.round($p1[0]).'" y1="'.round($p1[1]).'" x2="'.round($p2[0]).'" y2="'.round($p2[1])."\" stroke=\"{$a}\" stroke-opacity=\".35\" stroke-width=\"1.5\"/>";
                }
                break;
            case 'beads':
                $d .= "<radialGradient id=\"{$id}bd\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#fff\"/><stop offset=\".6\" stop-color=\"{$a}\"/><stop offset=\"1\" stop-color=\"".self::shade($a, -30).'"/></radialGradient>';
                for ($t = 0; $t <= 30; $t++) {
                    $bx = $x - 20 + $t * ($w + 40) / 30;
                    $by = $y + 900 + sin($t / 30 * M_PI) * 180;
                    $b .= '<circle cx="'.round($bx).'" cy="'.round($by)."\" r=\"13\" fill=\"url(#{$id}bd)\"/>";
                }
                $letters = htmlspecialchars(mb_strtoupper(mb_substr($o['monogram'] ?? 'NOIRE', 0, 5)), ENT_XML1);
                $n = mb_strlen($letters);
                for ($i = 0; $i < $n; $i++) {
                    $bx = 600 + ($i - ($n - 1) / 2) * 62; $by = $y + 1080 + sin(($bx - $x + 20) / ($w + 40) * M_PI) * 0;
                    $b .= '<rect x="'.round($bx - 26).'" y="'.round($by - 26).'" width="52" height="52" rx="10" fill="#FAF7F1" stroke="#000" stroke-opacity=".12"/>';
                    $b .= '<text x="'.round($bx).'" y="'.round($by + 13)."\" text-anchor=\"middle\" font-family=\"Manrope, Arial, sans-serif\" font-weight=\"700\" font-size=\"34\" fill=\"#17181C\">".mb_substr($letters, $i, 1).'</text>';
                }
                break;
        }

        return [$d, $b];
    }

    // -------------------------------------------------------------- details

    private static function camera(bool $pro, string $c, string $id, bool $clear): string
    {
        $plate = $clear ? '#BDB9B2' : self::shade($c, self::luma($c) > .5 ? -7 : 9);
        $edge = self::shade($c, -30);
        if ($pro) {
            $out = "<rect x=\"348\" y=\"168\" width=\"504\" height=\"262\" rx=\"78\" fill=\"{$plate}\" stroke=\"{$edge}\" stroke-opacity=\".5\" stroke-width=\"3\"/>";
            foreach ([[452, 246], [452, 354], [560, 300]] as [$lx, $ly]) {
                $out .= self::lens($lx, $ly, 50, $id);
            }
            $out .= '<circle cx="720" cy="248" r="20" fill="#F2EEE6" stroke="#9A958D" stroke-width="2"/>';
            $out .= '<circle cx="720" cy="352" r="16" fill="#1B1C20"/>';

            return $out;
        }
        $out = "<rect x=\"360\" y=\"180\" width=\"140\" height=\"262\" rx=\"70\" fill=\"{$plate}\" stroke=\"{$edge}\" stroke-opacity=\".5\" stroke-width=\"3\"/>";
        $out .= self::lens(430, 250, 50, $id).self::lens(430, 372, 50, $id);
        $out .= '<circle cx="545" cy="210" r="14" fill="#F2EEE6" stroke="#9A958D" stroke-width="2"/>';

        return $out;
    }

    private static function lensDefs(string $id): string
    {
        return "<radialGradient id=\"{$id}glass\" cx=\".4\" cy=\".35\" r=\".75\"><stop offset=\"0\" stop-color=\"#3A4656\"/><stop offset=\".5\" stop-color=\"#11141A\"/><stop offset=\"1\" stop-color=\"#050608\"/></radialGradient>";
    }

    private static function lens(int $x, int $y, int $r, string $id): string
    {
        return "<circle cx=\"{$x}\" cy=\"{$y}\" r=\"{$r}\" fill=\"#2B2C31\" stroke=\"#8E8A84\" stroke-opacity=\".6\" stroke-width=\"3\"/>"
            ."<circle cx=\"{$x}\" cy=\"{$y}\" r=\"".round($r * .66)."\" fill=\"url(#{$id}glass)\"/>"
            .'<ellipse cx="'.($x - round($r * .22)).'" cy="'.($y - round($r * .25)).'" rx="'.round($r * .16).'" ry="'.round($r * .1).'" fill="#fff" fill-opacity=".45"/>';
    }

    private static function background(int $w, int $h, string $bg, string $id): string
    {
        [$a, $b] = match ($bg) {
            'dark' => ['#24252B', '#121316'],
            'sand' => ['#EDE4D6', '#DCCDB8'],
            'stone' => ['#E7E3DC', '#CFC9BF'],
            default => ['#F6F2EB', '#E8E1D5'],
        };

        return "<linearGradient id=\"{$id}bg\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"{$a}\"/><stop offset=\"1\" stop-color=\"{$b}\"/></linearGradient>"
            ."<radialGradient id=\"{$id}glow\" cx=\".5\" cy=\".38\" r=\".6\"><stop offset=\"0\" stop-color=\"#fff\" stop-opacity=\"".($bg === 'dark' ? '.06' : '.45').'"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>'
            ."<filter id=\"{$id}blur\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"26\"/></filter>"
            ."<rect id=\"{$id}bgr\" width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$id}bg)\"/>";
    }

    /** Soft contact shadow; $root is the id whose background() defined the blur filter. */
    private static function shadow(float $cx, float $cy, float $rx, string $root): string
    {
        return "<ellipse cx=\"".round($cx).'" cy="'.round($cy).'" rx="'.round($rx).'" ry="'.round($rx * .13)."\" fill=\"#000\" fill-opacity=\".28\" filter=\"url(#{$root}blur)\"/>";
    }

    private static function svg(int $w, int $h, string $defs, string $body): string
    {
        // The background rect is declared in defs by background(); paint it first, then the glow.
        preg_match('/<rect id="([^"]+)bgr"/', $defs, $m);
        $root = $m[1] ?? '';

        return "<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 {$w} {$h}\" width=\"{$w}\" height=\"{$h}\">"
            ."<defs>{$defs}</defs><use href=\"#{$root}bgr\"/><rect width=\"{$w}\" height=\"{$h}\" fill=\"url(#{$root}glow)\"/>{$body}</svg>";
    }

    // -------------------------------------------------------------- colour

    public static function shade(string $hex, float $pct): string
    {
        $hex = ltrim($hex, '#');
        $rgb = array_map('hexdec', str_split(strlen($hex) === 3 ? preg_replace('/(.)/', '$1$1', $hex) : substr($hex, 0, 6), 2));
        $out = array_map(function ($v) use ($pct) {
            $v = $pct >= 0 ? $v + (255 - $v) * $pct / 100 : $v * (1 + $pct / 100);

            return str_pad(dechex((int) max(0, min(255, round($v)))), 2, '0', STR_PAD_LEFT);
        }, $rgb);

        return '#'.implode('', $out);
    }

    public static function luma(string $hex): float
    {
        $hex = ltrim($hex, '#');
        [$r, $g, $b] = array_map('hexdec', str_split(substr($hex, 0, 6), 2));

        return (0.2126 * $r + 0.7152 * $g + 0.0722 * $b) / 255;
    }

    private static function id(): string
    {
        return 'a'.(++self::$uid).substr(md5((string) self::$uid), 0, 4);
    }

    private static function rng(int $seed): \Closure
    {
        $state = $seed ?: 1;

        return function () use (&$state) {
            $state = ($state * 1103515245 + 12345) % 2147483648;

            return $state / 2147483648;
        };
    }
}
