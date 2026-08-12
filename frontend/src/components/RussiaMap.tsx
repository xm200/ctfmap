import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORY_META } from '../data/events';
import { getMacroZone, getRegionName, ZONE_COLORS, ZONE_LABELS } from '../data/regions';
import type { CtfEvent, MacroZone, Position, RegionFeature, RegionGeometry } from '../types';
import { getUrgencyLevel } from '../utils/date';

interface RussiaMapProps {
  events: CtfEvent[];
  activeZone: MacroZone | 'all';
  selectedRegion: string | null;
  onSelectRegion: (regionId: string) => void;
  onHoverEvent: (event: CtfEvent | null) => void;
  onSelectEvent: (event: CtfEvent) => void;
}

interface Point {
  x: number;
  y: number;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
}

const MAP_WIDTH = 1420;
const MAP_HEIGHT = 700;
const MAP_PADDING = 48;
const MAX_ZOOM = 4;
const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, width: MAP_WIDTH, height: MAP_HEIGHT };

const ZONE_LABEL_POINTS: Record<MacroZone, Position> = {
  central: [47, 61],
  siberia: [91, 66],
  'far-east': [136, 62.5],
};

function normalizeLongitude(longitude: number): number {
  return longitude < 0 ? longitude + 360 : longitude;
}

function rawProject([longitude, latitude]: Position): Point {
  const standardParallelA = 49 * Math.PI / 180;
  const standardParallelB = 70 * Math.PI / 180;
  const originLatitude = 56 * Math.PI / 180;
  const originLongitude = 105 * Math.PI / 180;
  const phi = latitude * Math.PI / 180;
  const lambda = normalizeLongitude(longitude) * Math.PI / 180;
  const n = Math.log(Math.cos(standardParallelA) / Math.cos(standardParallelB))
    / Math.log(
      Math.tan(Math.PI / 4 + standardParallelB / 2)
      / Math.tan(Math.PI / 4 + standardParallelA / 2),
    );
  const f = Math.cos(standardParallelA) * Math.tan(Math.PI / 4 + standardParallelA / 2) ** n / n;
  const rhoOrigin = f / Math.tan(Math.PI / 4 + originLatitude / 2) ** n;
  const rho = f / Math.tan(Math.PI / 4 + phi / 2) ** n;
  const theta = n * (lambda - originLongitude);

  return {
    x: rho * Math.sin(theta),
    y: rhoOrigin - rho * Math.cos(theta),
  };
}

function visitPositions(geometry: RegionGeometry, visitor: (position: Position) => void) {
  const walk = (coordinates: unknown): void => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === 'number' && typeof coordinates[1] === 'number') {
      visitor(coordinates as Position);
      return;
    }
    coordinates.forEach(walk);
  };

  walk(geometry.coordinates);
}

function createProjection(regions: RegionFeature[]) {
  const rawPoints: Point[] = [];
  regions.forEach((region) => visitPositions(region.geometry, (position) => rawPoints.push(rawProject(position))));

  if (rawPoints.length === 0) return (_position: Position): Point => ({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 });

  const minX = Math.min(...rawPoints.map((point) => point.x));
  const maxX = Math.max(...rawPoints.map((point) => point.x));
  const minY = Math.min(...rawPoints.map((point) => point.y));
  const maxY = Math.max(...rawPoints.map((point) => point.y));
  const scale = Math.min(
    (MAP_WIDTH - MAP_PADDING * 2) / (maxX - minX),
    (MAP_HEIGHT - MAP_PADDING * 2) / (maxY - minY),
  );
  const offsetX = (MAP_WIDTH - (maxX - minX) * scale) / 2 - minX * scale;
  // Географическая ось Y направлена на север, а SVG Y — вниз.
  // Используем maxY как верхнюю границу и инвертируем значение при выводе.
  const offsetY = (MAP_HEIGHT - (maxY - minY) * scale) / 2 + maxY * scale;

  return (position: Position): Point => {
    const point = rawProject(position);
    return { x: point.x * scale + offsetX, y: -point.y * scale + offsetY };
  };
}

function clampViewport(viewport: Viewport): Viewport {
  const overflowX = viewport.width * 0.16;
  const overflowY = viewport.height * 0.14;
  const minX = viewport.width >= MAP_WIDTH ? -MAP_WIDTH * 0.06 : -overflowX;
  const maxX = viewport.width >= MAP_WIDTH
    ? MAP_WIDTH * 0.06
    : MAP_WIDTH - viewport.width + overflowX;
  const minY = viewport.height >= MAP_HEIGHT ? -MAP_HEIGHT * 0.05 : -overflowY;
  const maxY = viewport.height >= MAP_HEIGHT
    ? MAP_HEIGHT * 0.05
    : MAP_HEIGHT - viewport.height + overflowY;

  return {
    ...viewport,
    x: Math.min(maxX, Math.max(minX, viewport.x)),
    y: Math.min(maxY, Math.max(minY, viewport.y)),
  };
}

function ringToPath(ring: Position[], project: (position: Position) => Point): string {
  return ring.map((position, index) => {
    const point = project(position);
    return `${index === 0 ? 'M' : 'L'}${point.x.toFixed(2)},${point.y.toFixed(2)}`;
  }).join(' ') + ' Z';
}

function geometryToPath(geometry: RegionGeometry, project: (position: Position) => Point): string {
  const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
  return polygons.flatMap((polygon) => polygon.map((ring) => ringToPath(ring, project))).join(' ');
}

export function RussiaMap({ events, activeZone, selectedRegion, onSelectRegion, onHoverEvent, onSelectEvent }: RussiaMapProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragRef = useRef<{
    pointerId: number;
    startClientX: number;
    startClientY: number;
    startViewport: Viewport;
    moved: boolean;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const [regions, setRegions] = useState<RegionFeature[]>([]);
  const [hoveredRegion, setHoveredRegion] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    fetch('/data/russia-regions.geojson', { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error(`Не удалось загрузить географию регионов: ${response.status}`);
        return response.json() as Promise<{ features: RegionFeature[] }>;
      })
      .then((data) => setRegions(data.features))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setRegions([]);
      });

    return () => controller.abort();
  }, []);

  const project = useMemo(() => createProjection(regions), [regions]);
  const regionPaths = useMemo(() => regions.map((region) => ({
    region,
    path: geometryToPath(region.geometry, project),
  })), [project, regions]);
  const eventPoints = useMemo(() => events.map((event) => ({
    event,
    point: project([event.lng, event.lat]),
  })), [events, project]);
  const hoveredRegionFeature = hoveredRegion
    ? regions.find((region) => region.properties.shapeISO === hoveredRegion)
    : null;
  const hoveredRegionCount = hoveredRegion
    ? events.filter((event) => event.regionId === hoveredRegion).length
    : 0;

  const zoom = MAP_WIDTH / viewport.width;

  const zoomAt = (nextZoom: number, anchorX = 0.5, anchorY = 0.5) => {
    const clampedZoom = Math.min(MAX_ZOOM, Math.max(1, nextZoom));
    setViewport((current) => {
      const nextWidth = MAP_WIDTH / clampedZoom;
      const nextHeight = MAP_HEIGHT / clampedZoom;
      const anchorMapX = current.x + current.width * anchorX;
      const anchorMapY = current.y + current.height * anchorY;

      return clampViewport({
        x: anchorMapX - nextWidth * anchorX,
        y: anchorMapY - nextHeight * anchorY,
        width: nextWidth,
        height: nextHeight,
      });
    });
  };

  const handleWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    const svg = svgRef.current;
    const matrix = svg?.getScreenCTM();
    let anchorX = 0.5;
    let anchorY = 0.5;

    if (svg && matrix) {
      const cursor = svg.createSVGPoint();
      cursor.x = event.clientX;
      cursor.y = event.clientY;
      const mapPoint = cursor.matrixTransform(matrix.inverse());
      anchorX = (mapPoint.x - viewport.x) / viewport.width;
      anchorY = (mapPoint.y - viewport.y) / viewport.height;
    }
    const factor = Math.exp(-event.deltaY * 0.0015);
    zoomAt(zoom * factor, anchorX, anchorY);
  };

  const handlePointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startViewport: viewport,
      moved: false,
    };
  };

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const clientDeltaX = event.clientX - drag.startClientX;
    const clientDeltaY = event.clientY - drag.startClientY;

    if (!drag.moved && Math.hypot(clientDeltaX, clientDeltaY) > 4) {
      drag.moved = true;
      suppressClickRef.current = true;
      event.currentTarget.setPointerCapture(event.pointerId);
      setIsDragging(true);
      setHoveredRegion(null);
      onHoverEvent(null);
    }

    if (!drag.moved) return;
    setViewport(clampViewport({
      ...drag.startViewport,
      x: drag.startViewport.x - clientDeltaX * drag.startViewport.width / bounds.width,
      y: drag.startViewport.y - clientDeltaY * drag.startViewport.height / bounds.height,
    }));
  };

  const finishPointerDrag = (event: React.PointerEvent<SVGSVGElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
    setIsDragging(false);
    window.setTimeout(() => { suppressClickRef.current = false; }, 0);
  };

  const resetViewport = () => setViewport(INITIAL_VIEWPORT);

  return (
    <section className="russia-map-stage" aria-label="Интерактивная карта CTF-соревнований России">
      {regions.length === 0 ? (
        <div className="map-loader"><i /><span>Загрузка геослоя...</span></div>
      ) : (
        <svg
          ref={svgRef}
          className={`russia-map${isDragging ? ' is-dragging' : ''}`}
          viewBox={`${viewport.x} ${viewport.y} ${viewport.width} ${viewport.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-labelledby="russia-map-title"
          onWheel={handleWheel}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishPointerDrag}
          onPointerCancel={finishPointerDrag}
        >
          <title id="russia-map-title">Карта регионов России и ближайших CTF-соревнований</title>
          <defs>
            <filter id="marker-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          <g className="map-grid" aria-hidden="true">
            {Array.from({ length: 12 }, (_, index) => <line key={`v-${index}`} x1={index * 130} y1="0" x2={index * 130} y2={MAP_HEIGHT} />)}
            {Array.from({ length: 7 }, (_, index) => <line key={`h-${index}`} x1="0" y1={index * 115} x2={MAP_WIDTH} y2={index * 115} />)}
          </g>

          <g className="region-layer">
            {regionPaths.map(({ region, path }) => {
              const regionId = region.properties.shapeISO;
              const zone = getMacroZone(regionId);
              const isDimmed = activeZone !== 'all' && activeZone !== zone;
              const isSelected = regionId === selectedRegion;
              return (
                <path
                  key={region.properties.shapeID}
                  d={path}
                  className={`map-region map-region--${zone}${isDimmed ? ' is-dimmed' : ''}${isSelected ? ' is-selected' : ''}`}
                  style={{ '--zone-color': ZONE_COLORS[zone] } as React.CSSProperties}
                  fillRule="evenodd"
                  tabIndex={isDimmed ? -1 : 0}
                  role="button"
                  aria-label={`${getRegionName(regionId, region.properties.shapeName)}: выбрать регион`}
                  onMouseEnter={() => setHoveredRegion(regionId)}
                  onMouseLeave={() => setHoveredRegion(null)}
                  onFocus={() => setHoveredRegion(regionId)}
                  onBlur={() => setHoveredRegion(null)}
                  onClick={() => {
                    if (!suppressClickRef.current) onSelectRegion(regionId);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      onSelectRegion(regionId);
                    }
                  }}
                />
              );
            })}
          </g>

          <g className="event-layer">
            {eventPoints.map(({ event, point }, index) => {
              const color = CATEGORY_META[event.category].color;
              const urgency = getUrgencyLevel(event);
              return (
                <g
                  key={event.id}
                  className={`event-marker event-marker--${urgency}`}
                  style={{ '--event-color': color, '--marker-delay': `${index * -0.16}s` } as React.CSSProperties}
                  transform={`translate(${point.x} ${point.y})`}
                  role="button"
                  tabIndex={0}
                  aria-label={`${event.title}, ${event.city}`}
                  onMouseEnter={() => onHoverEvent(event)}
                  onMouseLeave={() => onHoverEvent(null)}
                  onFocus={() => onHoverEvent(event)}
                  onBlur={() => onHoverEvent(null)}
                  onClick={(mouseEvent) => {
                    mouseEvent.stopPropagation();
                    if (!suppressClickRef.current) onSelectEvent(event);
                  }}
                  onKeyDown={(keyboardEvent) => {
                    if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                      keyboardEvent.preventDefault();
                      onSelectEvent(event);
                    }
                  }}
                >
                  <circle className="event-marker__pulse" r="10" />
                  <circle className="event-marker__base" r="3.5" />
                  <g className="event-marker__flag" filter="url(#marker-glow)">
                    <line x1="0" y1="2" x2="0" y2="-31" />
                    <path d="M1 -30 C8 -34 15 -26 23 -30 L20 -19 C14 -16 8 -23 1 -19 Z" />
                    <circle cy="-32" r="1.6" />
                  </g>
                  <text className="event-marker__code" x="8" y="11">{CATEGORY_META[event.category].short}</text>
                </g>
              );
            })}
          </g>

          <g className="zone-label-layer" aria-hidden="true">
            {(Object.keys(ZONE_LABEL_POINTS) as MacroZone[]).map((zone) => {
              const point = project(ZONE_LABEL_POINTS[zone]);
              return (
                <g key={zone} className={activeZone !== 'all' && activeZone !== zone ? 'is-dimmed' : ''} transform={`translate(${point.x} ${point.y})`}>
                  <text>{ZONE_LABELS[zone]}</text>
                </g>
              );
            })}
          </g>

        </svg>
      )}

      {regions.length > 0 && (
        <div className="map-controls" aria-label="Управление картой">
          <button type="button" onClick={() => zoomAt(zoom * 1.35)} aria-label="Приблизить карту">+</button>
          <output aria-label="Текущий масштаб">{Math.round(zoom * 100)}%</output>
          <button type="button" onClick={() => zoomAt(zoom / 1.35)} aria-label="Отдалить карту">−</button>
          <button className="map-controls__reset" type="button" onClick={resetViewport}>Сброс</button>
        </div>
      )}

      {hoveredRegionFeature && (
        <div className="map-region-tooltip" style={{ '--zone-color': ZONE_COLORS[getMacroZone(hoveredRegionFeature.properties.shapeISO)] } as React.CSSProperties}>
          <span>РЕГИОН</span>
          <strong>{getRegionName(hoveredRegionFeature.properties.shapeISO, hoveredRegionFeature.properties.shapeName)}</strong>
          <small>{hoveredRegionCount} CTF // 30 ДНЕЙ</small>
        </div>
      )}
    </section>
  );
}
