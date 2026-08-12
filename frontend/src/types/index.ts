export type EventCategory = 'elite' | 'local' | 'training';
export type EventDifficulty = 'Начальный' | 'Средний' | 'Высокий' | 'Экспертный';
export type EventFormat = 'online' | 'offline' | 'hybrid';
export type MacroZone = 'central' | 'siberia' | 'far-east';

export interface EventScheduleItem {
  offsetDays: number;
  time: string;
  title: string;
  description?: string;
}

export interface LearningMaterial {
  title: string;
  description: string;
  url: string;
  level: EventDifficulty;
}

export interface CtfEvent {
  id: string;
  slug: string;
  title: string;
  shortTitle: string;
  category: EventCategory;
  difficulty: EventDifficulty;
  format: EventFormat;
  regionId: string;
  city: string;
  lat: number;
  lng: number;
  startOffsetDays: number;
  durationDays: number;
  rating: number;
  weight: number;
  organizer: string;
  url: string;
  ctftimeUrl: string;
  ctfNewsUrl: string;
  registrationUrl: string;
  description: string;
  fullDescription: string[];
  tags: string[];
  taskCategories: string[];
  schedule: EventScheduleItem[];
  teamSize: string;
  requirements: string[];
  contacts: string;
  learningMaterials?: LearningMaterial[];
}

export type Position = [number, number];
export type PolygonCoordinates = Position[][];
export type MultiPolygonCoordinates = Position[][][];

export interface RegionProperties {
  shapeName: string;
  shapeISO: string;
  shapeID: string;
  shapeGroup: string;
  shapeType: string;
}

export type RegionGeometry =
  | { type: 'Polygon'; coordinates: PolygonCoordinates }
  | { type: 'MultiPolygon'; coordinates: MultiPolygonCoordinates };

export interface RegionFeature {
  type: 'Feature';
  properties: RegionProperties;
  geometry: RegionGeometry;
}

export interface RegionFeatureCollection {
  type: 'FeatureCollection';
  features: RegionFeature[];
}

export interface EventTiming {
  start: Date;
  end: Date;
  status: 'ongoing' | 'upcoming';
}
