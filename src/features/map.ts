/** Display anchors only: fictitious groups, never real schools, clinics or residents. */
export const MAP_ANCHORS = [
  { lat: -.973, lon: -80.725 }, { lat: -.951, lon: -80.700 },
  { lat: -.954, lon: -80.732 }, { lat: -.982, lon: -80.702 },
  { lat: -.997, lon: -80.727 },
]
export const MAP_WIDTH = 780, MAP_HEIGHT = 480, MAP_ZOOM = 13
export function worldPoint(lat: number, lon: number) {
  const size = 256 * 2 ** MAP_ZOOM
  const sine = Math.sin(lat * Math.PI / 180)
  return { x: (lon + 180) / 360 * size, y: (.5 - Math.log((1 + sine) / (1 - sine)) / (4 * Math.PI)) * size }
}
const center = worldPoint(-.973, -80.722)
export const mapOrigin = { x: center.x - MAP_WIDTH / 2, y: center.y - MAP_HEIGHT / 2 }
export function mapPosition(lat: number, lon: number) {
  const point = worldPoint(lat, lon)
  return { x: point.x - mapOrigin.x, y: point.y - mapOrigin.y }
}
export const MAP_TILES = Array.from({ length: Math.ceil((mapOrigin.x % 256 + MAP_WIDTH) / 256) }, (_, dx) =>
  Array.from({ length: Math.ceil((mapOrigin.y % 256 + MAP_HEIGHT) / 256) }, (_, dy) => {
    const x = Math.floor(mapOrigin.x / 256) + dx, y = Math.floor(mapOrigin.y / 256) + dy
    return { id: x + '-' + y, x: x * 256 - mapOrigin.x, y: y * 256 - mapOrigin.y, url: 'https://tile.openstreetmap.org/' + MAP_ZOOM + '/' + x + '/' + y + '.png' }
  })).flat()
