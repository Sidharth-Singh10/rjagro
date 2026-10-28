'use client'
/**
 * A bar that floats on a chosen baseline, for the rate charts.
 *
 * Graphy's built-in `bar` geom always holds zero on its value axis, so a pinned
 * `domainMin` above zero (the ₹55 floor the rate cards use) is discarded with an
 * `INCOMPATIBLE_SCALE_DOMAIN` warning and every bar grows from ₹0. This geom
 * writes the visible domain floor as `yMin` instead, so the bars start at the
 * bottom of the frame exactly as the previous Recharts bars did under
 * `allowDataOverflow`, and the Y-axis zoom can pin any window.
 *
 * Everything else is the built-in bar behaviour: band x, style cascade, band
 * hover guide, rect hit-testing, legend and tooltip wiring.
 */
import {
    createGraphyKit,
    createBarBoundsReader,
    defineGeomRenderer,
    Geom,
    POSITION_VARIABLES,
    toPaintColor,
} from '@graphysdk/react';
import type {
    CartesianCoordSystem,
    GeomCompileResult,
    GeomCompilerInput,
    GeomStyleReaders,
    Observation,
    Rect,
    SceneLayer,
} from '@graphysdk/react';

interface PriceBarParams {
    /** Data value the bars rise from: the visible bottom of the Y domain. */
    base: number;
    /** Corner radius in pixels on the end away from the baseline. */
    radius: number;
    /** The bar's share of its band, as the built-in bar's `width` param. */
    width: number;
}

class PriceBarGeom extends Geom<PriceBarParams> {
    readonly type = 'priceBar' as const;
    override readonly defaultParams: PriceBarParams = { base: 0, radius: 3, width: 0.7 };
    override readonly positionRoles = [
        { axis: 'x', role: 'point', valueKind: 'value' },
        { axis: 'y', role: 'min', valueKind: 'value' },
        { axis: 'y', role: 'max', valueKind: 'value', aesthetic: 'y' },
    ] as const;
    override readonly supportedCoordTypes = ['cartesian', 'flip'] as const;
    override readonly spatialKind = 'rects' as const;

    compile({ data, params }: GeomCompilerInput): GeomCompileResult {
        const { base, width } = params as Partial<PriceBarParams>;
        const baseValue = Number(base);
        const barWidth = Number(width);
        const half = (Number.isFinite(barWidth) ? Math.min(1, Math.max(0, barWidth)) : 0.7) / 2;

        // The bar's band share: the engine turns these into the painted edges once
        // the band scale's bandwidth is known.
        let next = data.hasVariable(POSITION_VARIABLES.xMin)
            ? data
            : data.addConstantVariable(POSITION_VARIABLES.xMin, 'numeric', -half);
        next = next.hasVariable(POSITION_VARIABLES.xMax)
            ? next
            : next.addConstantVariable(POSITION_VARIABLES.xMax, 'numeric', half);

        next = next.hasVariable(POSITION_VARIABLES.yMin)
            ? next
            : next.addConstantVariable(
                POSITION_VARIABLES.yMin,
                'numeric',
                Number.isFinite(baseValue) ? baseValue : 0,
            );

        return { data: next, mapping: {} };
    }
}

const FALLBACK_FILL = '#34714a';

/** Pixel boxes come back normalised with a top-left origin; painting is in panel pixels. */
const toPixels = (bounds: Rect, panelRect: Rect) => ({
    x: bounds.x * panelRect.width,
    y: bounds.y * panelRect.height,
    width: bounds.width * panelRect.width,
    height: bounds.height * panelRect.height,
});

/**
 * Rounds only the end away from the baseline. A bar clipped by the frame keeps
 * square corners there, the way the previous chart's `radius={[4,4,0,0]}` did.
 */
const roundedBarPath = (
    box: { x: number; y: number; width: number; height: number },
    radius: number,
    horizontal: boolean,
): string => {
    const { x, y, width, height } = box;
    const limit = horizontal ? Math.min(width / 2, height / 2) : Math.min(height / 2, width / 2);
    const r = Math.max(0, Math.min(radius, limit));
    if (r <= 0.5) return `M${x} ${y}h${width}v${height}h${-width}z`;

    if (horizontal) {
        return [
            `M${x} ${y}`,
            `h${width - r}`,
            `a${r} ${r} 0 0 1 ${r} ${r}`,
            `v${height - 2 * r}`,
            `a${r} ${r} 0 0 1 ${-r} ${r}`,
            `h${-(width - r)}`,
            'z',
        ].join(' ');
    }

    return [
        `M${x} ${y + r}`,
        `a${r} ${r} 0 0 1 ${r} ${-r}`,
        `h${width - 2 * r}`,
        `a${r} ${r} 0 0 1 ${r} ${r}`,
        `v${height - r}`,
        `h${-width}`,
        'z',
    ].join(' ');
};

const readRadius = (layer: SceneLayer): number => {
    const radius = Number((layer.params as Partial<PriceBarParams>).radius);
    return Number.isFinite(radius) && radius >= 0 ? radius : 3;
};

interface BarsProps {
    layer: SceneLayer;
    coordSystem: CartesianCoordSystem;
    styleReaders: GeomStyleReaders;
    panelRect: Rect;
    radius: number;
    state?: 'hovered';
    /** Paint only this observation, for the hover repaint. */
    only?: Observation;
}

const PriceBars = ({
    layer, coordSystem, styleReaders, panelRect, radius, state, only,
}: BarsProps) => {
    const readBounds = createBarBoundsReader(layer, coordSystem.mainAxis, styleReaders, panelRect);
    const horizontal = coordSystem.mainAxis === 'y';

    return (
        <>
            {[...layer.data].map((observation: Observation, index: number) => {
                if (only !== undefined && observation !== only) return null;
                const bounds = readBounds(observation);
                if (!bounds || bounds.width <= 0 || bounds.height <= 0) return null;

                const fill = toPaintColor(styleReaders.get('fill', observation, state) ?? FALLBACK_FILL);
                const alpha = styleReaders.get('alpha', observation, state);
                const stroke = state === 'hovered'
                    ? toPaintColor(styleReaders.get('stroke', observation, state) ?? '#ffffff')
                    : toPaintColor(styleReaders.get('stroke', observation, state) ?? 'transparent');
                const strokeWidth = styleReaders.get('strokeWidth', observation, state) ?? 0;

                return (
                    <path
                        key={index}
                        d={roundedBarPath(toPixels(bounds, panelRect), radius, horizontal)}
                        fill={fill}
                        fillOpacity={alpha ?? 1}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        strokeOpacity={alpha ?? 1}
                    />
                );
            })}
        </>
    );
};

export const priceBar = defineGeomRenderer(new PriceBarGeom(), {
    coord: 'cartesian',
    guideMode: 'band',
    swatchShape: 'square',
    render: ({ layer, coordSystem, styleReaders, panelRect }) => {
        if (coordSystem.type !== 'cartesian') return null;
        return (
            <g data-geom="price-bar">
                <PriceBars
                    layer={layer}
                    coordSystem={coordSystem}
                    styleReaders={styleReaders}
                    panelRect={panelRect}
                    radius={readRadius(layer)}
                />
            </g>
        );
    },
    renderHover: ({ layer, primary, coordSystem, styleReaders, panelRect }) => {
        if (coordSystem.type !== 'cartesian') return null;
        return (
            <g data-geom="price-bar-hover" pointerEvents="none">
                <PriceBars
                    layer={layer}
                    coordSystem={coordSystem}
                    styleReaders={styleReaders}
                    panelRect={panelRect}
                    radius={readRadius(layer)}
                    state="hovered"
                    only={primary.observation}
                />
            </g>
        );
    },
    renderHoverCompanions: () => null,
});

/** Builders and the provider bound to this plugin. Create once, at module scope. */
export const graphyKit = createGraphyKit({ plugins: [priceBar] });
