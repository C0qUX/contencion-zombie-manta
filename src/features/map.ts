/** Display anchors only: fictitious groups, never real schools, clinics or residents. */
export const MAP_ANCHORS = [
  { lat: -.973, lon: -80.725 }, { lat: -.951, lon: -80.700 },
  { lat: -.954, lon: -80.732 }, { lat: -.982, lon: -80.702 },
  { lat: -.997, lon: -80.727 },
]
export const MAP_WIDTH = 780, MAP_HEIGHT = 480, MAP_ZOOM = 13
export function worldPoint(lat: number, lon: number, zoom = MAP_ZOOM) {
  const size = 256 * 2 ** zoom
  const sine = Math.sin(lat * Math.PI / 180)
  return { x: (lon + 180) / 360 * size, y: (.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size }
}
const center = worldPoint(-.973, -80.722)
export const mapOrigin = { x: center.x - MAP_WIDTH / 2, y: center.y - MAP_HEIGHT / 2 }
export type MapView = { zoom: number; panX: number; panY: number }
export const INITIAL_MAP_VIEW: MapView = { zoom: MAP_ZOOM, panX: 0, panY: 0 }
export function viewOrigin(view: MapView) {
  const point = worldPoint(-.973, -80.722, view.zoom)
  return { x: point.x - MAP_WIDTH / 2 + view.panX, y: point.y - MAP_HEIGHT / 2 + view.panY }
}
export function mapPosition(lat: number, lon: number, view = INITIAL_MAP_VIEW) {
  const point = worldPoint(lat, lon, view.zoom), origin = viewOrigin(view)
  return { x: point.x - origin.x, y: point.y - origin.y }
}
export function mapTiles(view: MapView) {
  const origin = viewOrigin(view)
  return Array.from({ length: Math.ceil((origin.x % 256 + MAP_WIDTH) / 256) }, (_, dx) =>
    Array.from({ length: Math.ceil((origin.y % 256 + MAP_HEIGHT) / 256) }, (_, dy) => {
      const x = Math.floor(origin.x / 256) + dx, y = Math.floor(origin.y / 256) + dy
      return { id: view.zoom + '-' + x + '-' + y, x: x * 256 - origin.x, y: y * 256 - origin.y, url: 'https://tile.openstreetmap.org/' + view.zoom + '/' + x + '/' + y + '.png' }
    })).flat()
}
export function zoomView(view: MapView, delta: number): MapView {
  const zoom = Math.max(12, Math.min(16, view.zoom + delta)), factor = 2 ** (zoom - view.zoom)
  return { zoom, panX: view.panX * factor, panY: view.panY * factor }
}
export const MAP_TILES = mapTiles(INITIAL_MAP_VIEW)
